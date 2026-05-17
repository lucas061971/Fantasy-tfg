'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Auth from '@/Components/Auth';

import { Jugador, League, Rival, PartidoHistorial, Posicion, FormacionKey, Tactic } from './fantasy';
import { CONFIG_FORMACIONES, EQUIPOS_BOTS_INICIAL, CALENDARIO } from './gameData';

import { deduplicarPorNombre, obtenerStatsArea, formatCurrency, calcularPoderEquipo } from '@/lib/utils';
import { simularPartidoGenerico, calcularPuntosJugador, actualizarJugadorTrasPuntos } from '@/lib/gameEngine';

import LeagueSelectionModal from '@/Components/modals/LeagueSelectionModal';
import PlayerModal from '@/Components/modals/PlayerModal';
import MatchModal from '@/Components/modals/MatchModal';
import RivalScoutModal from '@/Components/modals/RivalScoutModal';
import Header from '@/Components/game/Header';
import TabSelector from '@/Components/game/TabSelector';
import TeamTab from '@/Components/tabs/TeamTab';
import MarketTab from '@/Components/tabs/MarketTab';
import CalendarTab from '@/Components/tabs/CalendarTab';
import HistoryTab from '@/Components/tabs/HistoryTab';
import StandingsTab from '@/Components/tabs/StandingsTab';
import NewsTab from '@/Components/tabs/NewsTab';
import StatsTab from '@/Components/tabs/StatsTab';

// ─── Utilidad local ───────────────────────────────────────────────────────────
const deduplicarJugadores = deduplicarPorNombre;

export default function App() {
  // ─── Auth & Liga ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [usuarioTieneLiga, setUsuarioTieneLiga] = useState(false);
  const [comprobandoLiga, setComprobandoLiga] = useState(true);
  const [ligasDetectadas, setLigasDetectadas] = useState<{ id: string; name: string }[]>([]);
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [showLeagueSelectionModal, setShowLeagueSelectionModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [joinLeagueCode, setJoinLeagueCode] = useState('');

  // ─── Estado del juego ────────────────────────────────────────────────────────
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [misFichajes, setMisFichajes] = useState<Jugador[]>([]);
  const [fichajesDeLaLiga, setFichajesDeLaLiga] = useState<{ jugador_id: string; user_id: string }[]>([]);
  const [presupuesto, setPresupuesto] = useState(100000000);
  const [estadoLigaBots, setEstadoLigaBots] = useState<Rival[]>([]);
  const [puntosLigaUsuario, setPuntosLigaUsuario] = useState(0);
  const [jornadaActual, setJornadaActual] = useState(1);
  const [diasHastaPartido, setDiasHastaPartido] = useState(7);
  const [historialPartidos, setHistorialPartidos] = useState<PartidoHistorial[]>([]);
  const [jugadoresBloqueadosJornada, setJugadoresBloqueadosJornada] = useState<string[]>([]);
  const [capitanId, setCapitanId] = useState<string | null>(null);
  const [noticias, setNoticias] = useState<string[]>([]);

  // ─── Equipo / Táctica ────────────────────────────────────────────────────────
  const [formacion, setFormacion] = useState<FormacionKey>('4-4-2');
  const [tactica, setTactica] = useState<Tactic>('Equilibrado');
  const [userKitHomeColor, setUserKitHomeColor] = useState('#2563eb');
  const [userKitAwayColor, setUserKitAwayColor] = useState('#ffffff');

  // ─── UI ──────────────────────────────────────────────────────────────────────
  const [tabActual, setTabActual] = useState<'equipo' | 'mercado' | 'clasificacion' | 'historial' | 'noticias' | 'stats' | 'calendario'>('equipo');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('Todos');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [matchSeleccionado, setMatchSeleccionado] = useState<PartidoHistorial['partidos'][0] | null>(null);
  const [equipoRivalSeleccionado, setEquipoRivalSeleccionado] = useState<Rival | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [simulandoDia, setSimulandoDia] = useState(false);

  const cargandoDatosRef = useRef(false);

  // ─── Derivados ───────────────────────────────────────────────────────────────
  const poderActual = calcularPoderEquipo(misFichajes);
  const statsUsuario = obtenerStatsArea(misFichajes.filter(j => j.es_titular));
  const puntosTotalesJugadores = misFichajes.reduce((acc, j) => acc + (j.puntos || 0), 0);
  const estadoForma = puntosTotalesJugadores > 50 ? 'Excelente' : puntosTotalesJugadores > 20 ? 'Bueno' : 'En construccion';

  const jugadoresFiltrados = jugadores.filter(j => {
    const yaFichado = misFichajes.some(f => f.id === j.id);
    const fichadoPorOtroHumano = fichajesDeLaLiga.some(f => f.jugador_id === j.id && f.user_id !== user?.id);
    return (
      j.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      (filtroPosicion === 'Todos' || j.posicion === (filtroPosicion as Posicion)) &&
      !yaFichado && !fichadoPorOtroHumano
    );
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const agregarNoticia = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNoticias(prev => {
      if (prev.some(n => n.endsWith(msg))) return prev;
      return [`[${time}] ${msg}`, ...prev].slice(0, 50);
    });
  }, []);

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    alert(msg);
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?join=${code}`;
    copyToClipboard(url, '¡Enlace de invitación copiado al portapapeles!');
  };

  // ─── Generación de bots ──────────────────────────────────────────────────────
  const generarPlantillasBots = useCallback((todosLosJugadores: Jugador[], fichajesDeHumanos: { jugador_id: string }[]) => {
    const idsHumanos = new Set(fichajesDeHumanos.map(f => f.jugador_id));
    let poolDisponible = todosLosJugadores.filter(j => !idsHumanos.has(j.id));
    const tactics: Tactic[] = ['Ofensivo', 'Defensivo', 'Equilibrado'];

    const botsConPlantilla = EQUIPOS_BOTS_INICIAL.map(bot => {
      const plantilla: Jugador[] = [];
      ['POR', 'DF', 'MC', 'DL'].forEach(pos => {
        const cantidad = pos === 'POR' ? 1 : pos === 'DF' ? 4 : pos === 'MC' ? 4 : 2;
        const seleccionados = [...poolDisponible.filter(j => j.posicion === pos)]
          .sort(() => 0.5 - Math.random())
          .slice(0, cantidad);
        plantilla.push(...seleccionados);
        const ids = new Set(seleccionados.map(s => s.id));
        poolDisponible = poolDisponible.filter(p => !ids.has(p.id));
      });
      const areaStats = obtenerStatsArea(plantilla);
      return {
        ...bot,
        plantilla,
        tactica: tactics[Math.floor(Math.random() * tactics.length)],
        ...areaStats,
        fuerza: Math.round((areaStats.ataque + areaStats.medio + areaStats.defensa) / 3),
      };
    });
    setEstadoLigaBots(botsConPlantilla);
  }, []);

  // ─── Guardado automático ─────────────────────────────────────────────────────
  useEffect(() => {
    if (currentLeagueId && estadoLigaBots.length > 0) {
      const progress = {
        jornadaActual, puntosLigaUsuario, estadoLigaBots, historialPartidos,
        misFichajes, presupuesto, diasHastaPartido, jugadoresBloqueadosJornada,
        userKitHomeColor, userKitAwayColor,
      };
      try {
        localStorage.setItem(`progress_${currentLeagueId}`, JSON.stringify(progress));
      } catch { /* QuotaExceededError silenciado */ }
    }
  }, [jornadaActual, puntosLigaUsuario, estadoLigaBots, historialPartidos, misFichajes, presupuesto, currentLeagueId, diasHastaPartido, jugadoresBloqueadosJornada, userKitHomeColor, userKitAwayColor]);

  // ─── Detector de ligas existentes ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setComprobandoLiga(true);
    supabase.from('leagues').select('id, name').eq('owner_id', user.id).then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        setUsuarioTieneLiga(true);
        setLigasDetectadas(data);
      } else {
        setUsuarioTieneLiga(false);
        setLigasDetectadas([]);
      }
      setComprobandoLiga(false);
    });
  }, [user]);

  // ─── Recuperar progress al cambiar de liga ───────────────────────────────────
  useEffect(() => {
    if (!currentLeagueId) return;
    const saved = localStorage.getItem(`progress_${currentLeagueId}`);
    if (saved) {
      const p = JSON.parse(saved);
      setJornadaActual(p.jornadaActual || 1);
      setPuntosLigaUsuario(p.puntosLigaUsuario || 0);
      setEstadoLigaBots(p.estadoLigaBots || []);
      setHistorialPartidos(p.historialPartidos || []);
      setMisFichajes(p.misFichajes || []);
      setPresupuesto(p.presupuesto ?? 100000000);
      setDiasHastaPartido(p.diasHastaPartido ?? 3);
      setJugadoresBloqueadosJornada(p.jugadoresBloqueadosJornada || []);
      setUserKitHomeColor(p.userKitHomeColor || '#2563eb');
      setUserKitAwayColor(p.userKitAwayColor || '#ffffff');
    } else {
      setJornadaActual(1); setPuntosLigaUsuario(0); setMisFichajes([]);
      setPresupuesto(100000000); setDiasHastaPartido(3); setJugadoresBloqueadosJornada([]);
    }
  }, [currentLeagueId]);

  // ─── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        setCargando(false);
        setCurrentLeagueId(null);
        setCurrentLeague(null);
        localStorage.removeItem('currentLeagueId');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Recuperar liga al iniciar sesión ────────────────────────────────────────
  useEffect(() => {
    const recuperarLiga = async () => {
      if (!user || currentLeagueId || showLeagueSelectionModal) return;
      setCargando(true);
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('join');
      const storedLeagueId = localStorage.getItem('currentLeagueId');

      const { data: userSignings } = await supabase.from('mis_plantillas').select('liga_id').eq('user_id', user.id);
      if (userSignings && userSignings.length > 0) {
        const ids = Array.from(new Set(userSignings.map(s => s.liga_id)));
        const { data: leaguesData } = await supabase.from('leagues').select('*').in('id', ids);
        if (leaguesData) setUserLeagues(leaguesData as League[]);
      }

      if (codeFromUrl && codeFromUrl !== 'undefined') setJoinLeagueCode(codeFromUrl.toUpperCase());

      if (storedLeagueId && storedLeagueId !== 'undefined') {
        setCurrentLeagueId(storedLeagueId);
        setCargando(false);
        return;
      }
      setShowLeagueSelectionModal(true);
      setCargando(false);
    };
    recuperarLiga();
  }, [user, currentLeagueId, showLeagueSelectionModal]);

  // ─── Cargar datos cuando tenemos user + liga ─────────────────────────────────
  const cargarDatos = useCallback(async (leagueId: string, leagueFromCaller?: League) => {
    if (!user?.id || !leagueId || (cargandoDatosRef.current && !leagueFromCaller)) {
      setCargando(false);
      return;
    }
    cargandoDatosRef.current = true;
    try {
      setCargando(true);
      const [resJugadores, resPlantilla, resComprados] = await Promise.all([
        supabase.from('jugadores').select('*'),
        supabase.from('mis_plantillas').select('jugador_id, user_id, es_titular').eq('liga_id', leagueId).not('jugador_id', 'is', null),
        supabase.from('jugadores_comprados').select('jugador_id, user_id, es_titular').eq('liga_id', leagueId),
      ]);
      const resLeague = leagueFromCaller
        ? null
        : await supabase.from('leagues').select('id, name, invite_code').eq('id', leagueId).maybeSingle();

      if (resPlantilla.error) { setCargando(false); return; }

      const allJugadores = resJugadores.data || [];
      const plantillaData = resPlantilla.data || [];
      let leagueData: League | null = leagueFromCaller || (resLeague?.data as League | null) || null;

      if (!leagueData || leagueData.id === undefined || (resLeague && resLeague.error)) {
        setCurrentLeagueId(null); setCurrentLeague(null); setMisFichajes([]);
        localStorage.removeItem('currentLeagueId'); setShowLeagueSelectionModal(true);
        return;
      }
      setCurrentLeague(leagueData);

      const jugadoresUnicos = deduplicarJugadores(allJugadores);
      const jugadoresConBase = jugadoresUnicos.map((j: Jugador) => {
        const precioBase = Number(j.precio) || 5000000;
        const mediaBase = Number(j.media) || 75;
        return {
          ...j,
          precio: precioBase,
          clausula: Math.round(precioBase * 1.5),
          media: mediaBase,
          stats: {
            ritmo: Number(j.ritmo) || mediaBase,
            tiro: Number(j.tiro) || mediaBase,
            pase: Number(j.pase) || mediaBase,
            defensa: Number(j.defensa) || mediaBase,
          },
          is_injured: false, dias_lesion: 0, goles: 0, asistencias: 0, paradas: 0, puntos: 0, puntosUltimaJornada: 0,
        };
      });

      // Combinar draft (mis_plantillas) + compras (jugadores_comprados)
      const compradosData = resComprados.data || [];
      let allSignings = [...plantillaData, ...compradosData];
      setFichajesDeLaLiga(allSignings);

      let misJugadores: Jugador[] = jugadoresConBase
        .map((j: Jugador) => {
          const info = allSignings.find((p: any) => p.jugador_id === j.id && p.user_id === user.id);
          return info ? { ...j, es_titular: info.es_titular } : null;
        })
        .filter((j: Jugador | null): j is Jugador => j !== null);

      const savedProgress = localStorage.getItem(`progress_${leagueId}`);

      if (misJugadores.length === 0 && !savedProgress) {
        const idsOcupados = new Set(allSignings.map((s: any) => s.jugador_id));
        const poolDraft = jugadoresConBase.filter((j: Jugador) => !idsOcupados.has(j.id));
        const draft: Jugador[] = [];
        const slots: Record<string, number> = { POR: 1, DF: 4, MC: 4, DL: 2 };
        for (const [pos, cant] of Object.entries(slots)) {
          const elegidos = [...poolDraft.filter((j: Jugador) => j.posicion === pos)]
            .sort(() => 0.5 - Math.random()).slice(0, cant);
          draft.push(...elegidos.map((j: Jugador) => ({ ...j, es_titular: true, puntos: 0, clausula: Math.round(j.precio * 1.5) })));
        }
        if (draft.length === 11) {
          const insertData = draft.map(j => ({ user_id: user.id, jugador_id: j.id, liga_id: leagueId, es_titular: true }));
          const { error: draftErr } = await supabase.from('mis_plantillas').insert(insertData);
          if (!draftErr) {
            misJugadores = draft;
            const { data: finalSignings } = await supabase.from('mis_plantillas').select('jugador_id, user_id').eq('liga_id', leagueId);
            if (finalSignings) setFichajesDeLaLiga(finalSignings);
            agregarNoticia('SISTEMA: ¡Draft completado! Se te han asignado 11 jugadores iniciales.');
          }
        }
      }

      if (savedProgress) {
        const p = JSON.parse(savedProgress);
        setJornadaActual(p.jornadaActual || 1);
        setPuntosLigaUsuario(p.puntosLigaUsuario || 0);
        setHistorialPartidos(p.historialPartidos || []);
        setPresupuesto(p.presupuesto ?? 100000000);
        setDiasHastaPartido(p.diasHastaPartido ?? 7);
        setNoticias(p.noticias || []);
        setJugadoresBloqueadosJornada(p.jugadoresBloqueadosJornada || []);
        setUserKitHomeColor(p.userKitHomeColor || '#2563eb');
        setUserKitAwayColor(p.userKitAwayColor || '#ffffff');
        setEstadoLigaBots((p.estadoLigaBots || []).map((bot: Rival) => ({ ...bot, tactica: bot.tactica || 'Equilibrado' })));

        // Enriquecer un jugador guardado con datos frescos de la DB
        const freshMap = new Map<string, Jugador>(jugadoresConBase.map((j: Jugador) => [j.id, j]));
        const enrichSaved = (saved: Jugador): Jugador => {
          const fresh = freshMap.get(saved.id);
          if (!fresh) return saved;
          return {
            ...fresh,
            puntos: saved.puntos || 0,
            puntosUltimaJornada: saved.puntosUltimaJornada || 0,
            precio: Number(saved.precio ?? fresh.precio),
            clausula: Math.round(Number(saved.precio ?? fresh.precio) * 1.5),
            stats: saved.stats ?? fresh.stats,
            media: saved.media ?? fresh.media,
            enVenta: saved.enVenta ?? false,
            is_injured: saved.is_injured ?? false,
            dias_lesion: saved.dias_lesion ?? 0,
            goles: saved.goles || 0,
            asistencias: saved.asistencias || 0,
            paradas: saved.paradas || 0,
            es_titular: saved.es_titular ?? false,
          };
        };
        // jugadores globales: usar datos de DB como base, enriquecer con stats guardadas
        const allSavedStats = [...(p.misFichajes || []), ...(p.estadoLigaBots?.flatMap((b: Rival) => b.plantilla) || [])];
        const savedStatsMap = new Map<string, Jugador>(allSavedStats.map((s: Jugador) => [s.id, s]));
        setJugadores(jugadoresConBase.map((j: Jugador) => {
          const saved = savedStatsMap.get(j.id);
          return saved ? enrichSaved(saved) : { ...j, puntos: 0, puntosUltimaJornada: 0, enVenta: false, goles: 0, asistencias: 0, paradas: 0 };
        }));
        // misFichajes: usar la plantilla guardada completa (incluye compras, no solo draft)
        setMisFichajes((p.misFichajes || []).map(enrichSaved));
      } else {
        setJugadores(jugadoresConBase);
        setMisFichajes(misJugadores);
        generarPlantillasBots(jugadoresConBase, allSignings);
        setJornadaActual(1); setPuntosLigaUsuario(0); setHistorialPartidos([]);
        setNoticias(['¡Bienvenidos a la nueva temporada de la Liga Fantasy!']);
        setPresupuesto(100000000);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      cargandoDatosRef.current = false;
      setCargando(false);
    }
  }, [user, generarPlantillasBots, agregarNoticia]);

  useEffect(() => {
    if (user && currentLeagueId) cargarDatos(currentLeagueId);
  }, [user, currentLeagueId, cargarDatos]);

  // ─── Acciones de liga ────────────────────────────────────────────────────────
  const handleCreateLeague = async () => {
    if (!user?.id || !newLeagueName.trim()) { alert('Por favor, introduce un nombre para la liga.'); return; }
    setCargando(true);
    try {
      const { data: existe } = await supabase.from('leagues').select('id').eq('owner_id', user.id).eq('name', newLeagueName.trim()).maybeSingle();
      if (existe) { alert(`¡Ya tienes una liga llamada "${newLeagueName.trim()}"!`); return; }
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: nuevaLiga, error } = await supabase.from('leagues').insert([{ name: newLeagueName.trim(), owner_id: user.id, invite_code: inviteCode }]).select().single();
      if (error || !nuevaLiga) throw error;

      // ── Draft inmediato ───────────────────────────────────────────────────────
      // Insertamos en jugadores_comprados (tiene liga_id en el constraint único),
      // así el mismo jugador puede estar en distintas ligas del mismo usuario.
      const { data: allJugadoresRaw } = await supabase.from('jugadores').select('*');
      const jugadoresConBase: Jugador[] = deduplicarJugadores(allJugadoresRaw || []).map((j: Jugador) => {
        const precioBase = Number(j.precio) || 5000000;
        const mediaBase = Number(j.media) || 75;
        return {
          ...j, precio: precioBase, clausula: Math.round(precioBase * 1.5), media: mediaBase,
          stats: { ritmo: Number(j.ritmo) || mediaBase, tiro: Number(j.tiro) || mediaBase, pase: Number(j.pase) || mediaBase, defensa: Number(j.defensa) || mediaBase },
          is_injured: false, dias_lesion: 0, goles: 0, asistencias: 0, paradas: 0, puntos: 0, puntosUltimaJornada: 0,
        };
      });

      const draft: Jugador[] = [];
      let poolDraft = [...jugadoresConBase];
      for (const [pos, cant] of Object.entries({ POR: 1, DF: 4, MC: 4, DL: 2 } as Record<string, number>)) {
        const elegidos = poolDraft.filter(j => j.posicion === pos).sort(() => 0.5 - Math.random()).slice(0, cant);
        draft.push(...elegidos.map(j => ({ ...j, es_titular: true })));
        const ids = new Set(elegidos.map(e => e.id));
        poolDraft = poolDraft.filter(p => !ids.has(p.id));
      }
      if (draft.length === 11) {
        await supabase.from('jugadores_comprados').insert(
          draft.map(j => ({ user_id: user.id, jugador_id: j.id, liga_id: nuevaLiga.id, es_titular: true }))
        );
      }

      // Generar bots inline (sin setState) para guardarlos en el snapshot inicial
      const tactics: Tactic[] = ['Ofensivo', 'Defensivo', 'Equilibrado'];
      const idsHumanos = new Set(draft.map(j => j.id));
      let poolBots = jugadoresConBase.filter(j => !idsHumanos.has(j.id));
      const botsGenerados: Rival[] = EQUIPOS_BOTS_INICIAL.map(bot => {
        const plantilla: Jugador[] = [];
        ['POR', 'DF', 'MC', 'DL'].forEach(pos => {
          const cantidad = pos === 'POR' ? 1 : pos === 'DF' ? 4 : pos === 'MC' ? 4 : 2;
          const sel = poolBots.filter(j => j.posicion === pos).sort(() => 0.5 - Math.random()).slice(0, cantidad);
          plantilla.push(...sel);
          const ids = new Set(sel.map(s => s.id));
          poolBots = poolBots.filter(p => !ids.has(p.id));
        });
        const areaStats = obtenerStatsArea(plantilla);
        return { ...bot, plantilla, tactica: tactics[Math.floor(Math.random() * tactics.length)], ...areaStats, fuerza: Math.round((areaStats.ataque + areaStats.medio + areaStats.defensa) / 3) };
      });

      // Guardar snapshot completo en localStorage para que cargarDatos lo restaure
      localStorage.setItem(`progress_${nuevaLiga.id}`, JSON.stringify({
        jornadaActual: 1, puntosLigaUsuario: 0, estadoLigaBots: botsGenerados,
        historialPartidos: [], misFichajes: draft, presupuesto: 100000000,
        diasHastaPartido: 7, jugadoresBloqueadosJornada: [],
        userKitHomeColor: '#2563eb', userKitAwayColor: '#ffffff',
        noticias: ['¡Bienvenidos a la nueva temporada de la Liga Fantasy!', 'SISTEMA: ¡Draft completado! Se te han asignado 11 jugadores iniciales.'],
      }));

      // Limpiar estado ANTES de cambiar liga para que el auto-save no escriba
      // datos de la liga anterior bajo el ID de la nueva.
      setEstadoLigaBots([]);
      setMisFichajes([]);
      setPresupuesto(100000000);
      setJornadaActual(1);
      setPuntosLigaUsuario(0);
      setHistorialPartidos([]);
      setDiasHastaPartido(7);
      setJugadoresBloqueadosJornada([]);
      setCapitanId(null);
      setNoticias([]);
      cargandoDatosRef.current = false;
      setCurrentLeagueId(nuevaLiga.id);
      localStorage.setItem('currentLeagueId', nuevaLiga.id);
      setShowLeagueSelectionModal(false);
      setNewLeagueName('');
      alert(`Liga "${nuevaLiga.name}" creada con éxito. ¡Draft completado con ${draft.length} jugadores!`);
    } catch { alert('Hubo un error al crear la liga.'); } finally { setCargando(false); }
  };

  const handleJoinLeague = async (nombreABuscar: string) => {
    if (!user || !nombreABuscar.trim()) { alert('Por favor, introduce el nombre de la liga.'); return; }
    try {
      const { data: ligaEncontrada, error } = await supabase.from('leagues').select('id, name').eq('name', nombreABuscar.trim()).maybeSingle();
      if (error || !ligaEncontrada) { alert(`No se ha encontrado ninguna liga con el nombre "${nombreABuscar}".`); return; }
      setEstadoLigaBots([]);
      setMisFichajes([]);
      setCurrentLeagueId(ligaEncontrada.id);
      localStorage.setItem('currentLeagueId', ligaEncontrada.id);
      setShowLeagueSelectionModal(false);
      alert(`¡Te has unido con éxito a la liga: ${ligaEncontrada.name}!`);
    } catch { console.error('Error al unirse a la liga'); }
  };

  const handleSelectLeague = (id: string) => {
    setEstadoLigaBots([]);
    setMisFichajes([]);
    setCurrentLeagueId(id);
    localStorage.setItem('currentLeagueId', id);
    setShowLeagueSelectionModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null); setCurrentLeagueId(null); setCurrentLeague(null);
    setUserLeagues([]); setMisFichajes([]);
    localStorage.removeItem('currentLeagueId');
  };

  // ─── Acciones de jugador ──────────────────────────────────────────────────────
  const ficharJugador = async (jugador: Jugador) => {
    if (!currentLeagueId || !user?.id || fichando) { alert('Selecciona una liga antes de fichar.'); return; }
    if (misFichajes.length >= 25) { alert('No puedes tener más de 25 jugadores.'); return; }
    if (jugadoresBloqueadosJornada.includes(jugador.id)) { alert('Jugador bloqueado esta jornada.'); return; }
    if (misFichajes.some(f => f.id === jugador.id || f.nombre.toLowerCase() === jugador.nombre.toLowerCase())) { alert('Ya tienes a este jugador.'); setJugadorSeleccionado(null); return; }
    if (fichajesDeLaLiga.some(f => f.jugador_id === jugador.id && f.user_id !== user.id)) { alert('Otro entrenador lo ha fichado.'); setJugadorSeleccionado(null); cargarDatos(currentLeagueId); return; }

    const botDueno = estadoLigaBots.find(b => b.plantilla.some(pj => pj.id === jugador.id));
    const precioFinal = botDueno ? jugador.clausula : jugador.precio;
    if (presupuesto < precioFinal) { alert(`No tienes suficiente presupuesto.`); return; }

    try {
      setFichando(true);
      const { error } = await supabase.from('jugadores_comprados').insert([{ user_id: user.id, jugador_id: jugador.id, es_titular: false, liga_id: currentLeagueId }]);
      if (error) {
        if (error.code === '23505') { alert('Otro entrenador acaba de fichar a ' + jugador.nombre); setJugadorSeleccionado(null); return; }
        throw error;
      }
      if (botDueno) { alert(`¡Has pagado la cláusula de ${jugador.nombre}! El ${botDueno.nombre} pierde a su jugador.`); agregarNoticia(`FICHAJE: ${jugador.nombre} del ${botDueno.nombre} por ${formatCurrency(precioFinal)}.`); }
      setEstadoLigaBots(prev => prev.map(bot => ({ ...bot, plantilla: bot.plantilla.filter(pj => pj.id !== jugador.id) })));
      setMisFichajes(prev => [...prev, { ...jugador, es_titular: false, puntos: 0 }]);
      setFichajesDeLaLiga(prev => [...prev, { jugador_id: jugador.id, user_id: user.id }]);
      setPresupuesto(prev => prev - precioFinal);
      setJugadoresBloqueadosJornada(prev => [...prev, jugador.id]);
      setJugadorSeleccionado(null);
      // No llamamos cargarDatos aquí: sobrescribiría el estado local antes de que
      // el auto-guardado tenga tiempo de persistir el fichaje.
    } catch (e: any) { alert('Error al fichar: ' + e.message); } finally { setFichando(false); }
  };

  const venderJugador = useCallback(async (jugador: Jugador, precioVenta?: number) => {
    if (!currentLeagueId || !user?.id) return;
    const finalPrice = precioVenta || Number(jugador.precio);
    if (!precioVenta && !confirm(`¿Vender a ${jugador.nombre}?`)) return;
    // El jugador puede estar en mis_plantillas (draft) o jugadores_comprados (compra) — borrar en ambas
    await supabase.from('mis_plantillas').delete().eq('user_id', user.id).eq('jugador_id', jugador.id).eq('liga_id', currentLeagueId);
    await supabase.from('jugadores_comprados').delete().eq('user_id', user.id).eq('jugador_id', jugador.id).eq('liga_id', currentLeagueId);
    agregarNoticia(`TRASPASO: Has vendido a ${jugador.nombre} por ${formatCurrency(finalPrice)}.`);
    setMisFichajes(prev => prev.filter(j => j.id !== jugador.id));
    if (capitanId === jugador.id) setCapitanId(null);
    setFichajesDeLaLiga(prev => prev.filter(f => !(f.jugador_id === jugador.id && f.user_id === user.id)));
    setPresupuesto(prev => prev + finalPrice);
    setJugadorSeleccionado(null);
    setJugadoresBloqueadosJornada(prev => [...prev, jugador.id]);
  }, [currentLeagueId, user, capitanId, agregarNoticia]);

  const toggleTitular = async (jugador: Jugador) => {
    if (!currentLeagueId || !user?.id) return;
    const titularesPosicion = misFichajes.filter(j => j.es_titular && j.posicion === jugador.posicion).length;
    const maxPermitido = CONFIG_FORMACIONES[formacion][jugador.posicion as Posicion];
    if (!jugador.es_titular && titularesPosicion >= maxPermitido) {
      alert(`Tu formación ${formacion} solo permite ${maxPermitido} en ${jugador.posicion}. Quita a uno antes.`); return;
    }
    // El jugador puede estar en mis_plantillas (draft) o jugadores_comprados (compra)
    await supabase.from('mis_plantillas').update({ es_titular: !jugador.es_titular }).eq('user_id', user.id).eq('jugador_id', jugador.id).eq('liga_id', currentLeagueId);
    await supabase.from('jugadores_comprados').update({ es_titular: !jugador.es_titular }).eq('user_id', user.id).eq('jugador_id', jugador.id).eq('liga_id', currentLeagueId);
    setMisFichajes(prev => prev.map(j => j.id === jugador.id ? { ...j, es_titular: !j.es_titular } : j));
  };

  const toggleTransferible = (jugadorId: string) => {
    setMisFichajes(prev => prev.map(j => j.id === jugadorId ? { ...j, enVenta: !j.enVenta } : j));
    setJugadorSeleccionado(prev => prev && prev.id === jugadorId ? { ...prev, enVenta: !prev.enVenta } : prev);
  };

  const subirClausula = useCallback((jugadorId: string) => {
    const jugador = misFichajes.find(j => j.id === jugadorId);
    if (!jugador) return;
    const input = prompt(`¿Cuánto presupuesto quieres invertir en blindar a ${jugador.nombre}? (La cláusula subirá el DOBLE)\nCláusula actual: ${jugador.clausula.toLocaleString()} EUR`);
    if (input === null) return;
    const coste = parseInt(input.replace(/\D/g, ''));
    if (isNaN(coste) || coste <= 0) { alert('Cantidad no válida.'); return; }
    if (presupuesto < coste) { alert(`No tienes suficiente dinero.`); return; }
    const nuevaClausula = jugador.clausula + coste * 2;
    setPresupuesto(prev => prev - coste);
    setMisFichajes(prev => prev.map(j => j.id === jugadorId ? { ...j, clausula: nuevaClausula } : j));
    setJugadores(prev => prev.map(j => j.id === jugadorId ? { ...j, clausula: nuevaClausula } : j));
    setJugadorSeleccionado(prev => prev && prev.id === jugadorId ? { ...prev, clausula: nuevaClausula } : prev);
  }, [misFichajes, presupuesto]);

  const reordenarTitular = (jugador: Jugador, direccion: 'izquierda' | 'derecha') => {
    const fila = misFichajes.filter(j => j.es_titular && j.posicion === jugador.posicion);
    const idx = fila.findIndex(j => j.id === jugador.id);
    const targetIdx = direccion === 'izquierda' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= fila.length) return;
    const vecino = fila[targetIdx];
    const newList = [...misFichajes];
    const i1 = newList.findIndex(j => j.id === jugador.id);
    const i2 = newList.findIndex(j => j.id === vecino.id);
    [newList[i1], newList[i2]] = [newList[i2], newList[i1]];
    setMisFichajes(newList);
  };

  // ─── Ofertas IA ───────────────────────────────────────────────────────────────
  const procesarOfertasIA = useCallback((probOferta: number, probClausulazo: number) => {
    const transferibles = misFichajes.filter(j => j.enVenta);
    if (transferibles.length > 0 && Math.random() < probOferta) {
      const candidato = transferibles[Math.floor(Math.random() * transferibles.length)];
      const oferta = Math.round(candidato.precio * (0.85 + Math.random() * 0.3));
      const randomClub = EQUIPOS_BOTS_INICIAL[Math.floor(Math.random() * EQUIPOS_BOTS_INICIAL.length)].nombre;
      setTimeout(() => {
        if (confirm(`OFERTA RECIBIDA: El ${randomClub} ofrece ${formatCurrency(oferta)} por ${candidato.nombre}. ¿Aceptas?`)) {
          setEstadoLigaBots(prev => prev.map(b => b.nombre === randomClub ? { ...b, plantilla: [...b.plantilla, candidato] } : b));
          venderJugador(candidato, oferta);
        }
      }, 500);
      return;
    }
    const noTransferibles = misFichajes.filter(j => !j.enVenta);
    if (noTransferibles.length > 0 && Math.random() < probClausulazo) {
      const candidato = noTransferibles[Math.floor(Math.random() * noTransferibles.length)];
      const randomClub = EQUIPOS_BOTS_INICIAL[Math.floor(Math.random() * EQUIPOS_BOTS_INICIAL.length)];
      alert(`¡CLÁUSULAZO! El ${randomClub.nombre} ha pagado la cláusula de ${candidato.nombre} (${formatCurrency(candidato.clausula)}).`);
      agregarNoticia(`¡BOMBA! El ${randomClub.nombre} paga la cláusula de ${candidato.nombre} (${formatCurrency(candidato.clausula)}).`);
      setEstadoLigaBots(prev => prev.map(b => b.nombre === randomClub.nombre ? { ...b, plantilla: [...b.plantilla, candidato] } : b));
      venderJugador(candidato, candidato.clausula);
    }
  }, [misFichajes, venderJugador, agregarNoticia]);

  // ─── Simular Día ─────────────────────────────────────────────────────────────
  const simularDia = () => {
    if (diasHastaPartido <= 0) return;
    setSimulandoDia(true);
    setTimeout(() => {
      setDiasHastaPartido(prev => prev - 1);
      const injuryChance = 0.005;
      setMisFichajes(prev => prev.map(j => {
        if (j.is_injured) {
          const newDays = (j.dias_lesion || 0) - 1;
          if (newDays <= 0) { agregarNoticia(`RECUPERACIÓN: ${j.nombre} se ha recuperado.`); return { ...j, is_injured: false, dias_lesion: 0 }; }
          return { ...j, dias_lesion: newDays };
        } else if (Math.random() < injuryChance) {
          const dur = Math.floor(Math.random() * 12) + 3;
          agregarNoticia(`LESIONADO: ${j.nombre} estará de baja ${dur} días.`);
          return { ...j, is_injured: true, dias_lesion: dur, es_titular: false };
        }
        return j;
      }));
      setEstadoLigaBots(prev => prev.map(bot => ({
        ...bot,
        plantilla: bot.plantilla.map(j => {
          if (j.is_injured) {
            const newDays = (j.dias_lesion || 0) - 1;
            return newDays <= 0 ? { ...j, is_injured: false, dias_lesion: 0 } : { ...j, dias_lesion: newDays };
          } else if (Math.random() < injuryChance) {
            return { ...j, is_injured: true, dias_lesion: Math.floor(Math.random() * 12) + 3, es_titular: false };
          }
          return j;
        }),
      })));
      procesarOfertasIA(0.2, 0.01);
      if (Math.random() < 0.4) {
        const comprador = estadoLigaBots[Math.floor(Math.random() * estadoLigaBots.length)];
        if (comprador && Math.random() < 0.6) {
          const disponibles = jugadores.filter(j => !misFichajes.some(f => f.id === j.id) && !estadoLigaBots.some(b => b.plantilla.some(pj => pj.id === j.id)) && !fichajesDeLaLiga.some(f => f.jugador_id === j.id));
          if (disponibles.length > 0) {
            const fichado = disponibles[Math.floor(Math.random() * disponibles.length)];
            agregarNoticia(`MERCADO: El ${comprador.nombre} ha fichado a ${fichado.nombre} por ${formatCurrency(fichado.precio)}.`);
            setEstadoLigaBots(prev => prev.map(b => {
              if (b.nombre !== comprador.nombre) return b;
              const nP = [...b.plantilla, fichado]; const s = obtenerStatsArea(nP);
              return { ...b, plantilla: nP, ...s, fuerza: Math.round((s.ataque + s.medio + s.defensa) / 3) };
            }));
          }
        }
      }
      setSimulandoDia(false);
    }, 600);
  };

  // ─── Jugar Jornada ────────────────────────────────────────────────────────────
  const jugarJornada = () => {
    const misTitulares = misFichajes.filter(j => j.es_titular);
    if (misTitulares.length !== 11) { alert(`Necesitas 11 titulares (tienes ${misTitulares.length}).`); return; }
    if (presupuesto < 0) { alert('No puedes jugar con presupuesto negativo.'); return; }
    if (jornadaActual > CALENDARIO.length) { alert('Temporada finalizada.'); return; }

    const infoJornada = CALENDARIO[jornadaActual - 1];
    const esLocalUser = infoJornada.esLocal;
    const rivalData = estadoLigaBots.find(b => b.nombre === infoJornada.rival);
    if (!rivalData) return;

    const notasRonda: Record<string, number> = {};
    [...jugadores, ...misFichajes, ...estadoLigaBots.flatMap(b => b.plantilla)].forEach(j => {
      notasRonda[j.id] = Math.max(0, Math.min(10, Math.round((j.media / 100) * 7 + (Math.random() * 4 - 2))));
    });

    const miEquipo = { nombre: 'Fantasía FC', fuerza: poderActual, ...statsUsuario, plantilla: misTitulares };
    const miResultado = esLocalUser
      ? simularPartidoGenerico(miEquipo, rivalData, tactica, rivalData.tactica || 'Equilibrado')
      : simularPartidoGenerico(rivalData, miEquipo, rivalData.tactica || 'Equilibrado', tactica);

    const misGoles = esLocalUser ? miResultado.golesA : miResultado.golesB;
    const susGoles = esLocalUser ? miResultado.golesB : miResultado.golesA;

    const jornadaPartidos: PartidoHistorial['partidos'] = [{
      local: esLocalUser ? 'Fantasía FC' : rivalData.nombre,
      visitante: esLocalUser ? rivalData.nombre : 'Fantasía FC',
      golesLocal: miResultado.golesA, golesVisitante: miResultado.golesB,
      eventos: miResultado.eventos, goleadoresIds: miResultado.goleadoresIds, asistentesIds: miResultado.asistentesIds,
      notas: notasRonda,
      colorLocal: esLocalUser ? userKitHomeColor : rivalData.kit_home_color,
      colorVisitante: esLocalUser ? rivalData.kit_away_color : userKitAwayColor,
      posesionLocal: miResultado.posesionA, posesionVisitante: miResultado.posesionB,
      tirosLocal: miResultado.tirosA, tirosVisitante: miResultado.tirosB,
      tirosPuertaLocal: miResultado.tirosPuertaA, tirosPuertaVisitante: miResultado.tirosPuertaB,
      paradasLocal: miResultado.paradasA, paradasVisitante: miResultado.paradasB,
      porLocalId: miResultado.porAId, porVisitanteId: miResultado.porBId,
    }];

    const shuffledBots = [...estadoLigaBots.filter(b => b.nombre !== rivalData.nombre)].sort(() => 0.5 - Math.random());
    for (let i = 0; i < shuffledBots.length; i += 2) {
      if (i + 1 < shuffledBots.length) {
        const res = simularPartidoGenerico(shuffledBots[i], shuffledBots[i + 1], shuffledBots[i].tactica || 'Equilibrado', shuffledBots[i + 1].tactica || 'Equilibrado');
        jornadaPartidos.push({
          local: shuffledBots[i].nombre, visitante: shuffledBots[i + 1].nombre,
          golesLocal: res.golesA, golesVisitante: res.golesB,
          eventos: res.eventos, goleadoresIds: res.goleadoresIds, asistentesIds: res.asistentesIds,
          notas: notasRonda,
          colorLocal: shuffledBots[i].kit_home_color, colorVisitante: shuffledBots[i + 1].kit_away_color,
          posesionLocal: res.posesionA, posesionVisitante: res.posesionB,
          tirosLocal: res.tirosA, tirosVisitante: res.tirosB,
          tirosPuertaLocal: res.tirosPuertaA, tirosPuertaVisitante: res.tirosPuertaB,
          paradasLocal: res.paradasA, paradasVisitante: res.paradasB,
          porLocalId: res.porAId, porVisitanteId: res.porBId,
        });
      }
    }

    const todosLosGoleadores = jornadaPartidos.flatMap(p => p.goleadoresIds);
    const todosLosAsistentes = jornadaPartidos.flatMap(p => p.asistentesIds || []);
    const registroParadas = jornadaPartidos.flatMap(p => [{ id: p.porLocalId, cant: p.paradasLocal || 0 }, { id: p.porVisitanteId, cant: p.paradasVisitante || 0 }]);

    const actualizarLista = (lista: Jugador[]) => lista.map(j => {
      const goles = todosLosGoleadores.filter(id => id === j.id).length;
      const asis = todosLosAsistentes.filter(id => id === j.id).length;
      const paradas = registroParadas.find(r => r.id === j.id)?.cant || 0;
      const nota = notasRonda[j.id] || 0;
      const mio = misFichajes.find(f => f.id === j.id);
      const pts = calcularPuntosJugador(j.posicion, nota, goles, asis, paradas, mio ? mio.es_titular : true, mio ? j.id === capitanId : false);
      return actualizarJugadorTrasPuntos(j, pts, goles, asis, paradas);
    });

    setJugadores(prev => actualizarLista(prev));
    setMisFichajes(prev => actualizarLista(prev));

    if (misGoles > susGoles) {
      setPuntosLigaUsuario(p => p + 3); setPresupuesto(prev => prev + 5000000);
      agregarNoticia('PREMIO JORNADA: Has recibido 5.000.000 EUR por tu victoria.');
    } else if (misGoles === susGoles) {
      setPuntosLigaUsuario(p => p + 1); setPresupuesto(prev => prev + 2000000);
      agregarNoticia('PREMIO JORNADA: Has recibido 2.000.000 EUR por el empate.');
    }

    setEstadoLigaBots(prev => prev.map(bot => {
      const partido = jornadaPartidos.find(p => p.local === bot.nombre || p.visitante === bot.nombre);
      if (!partido) return bot;
      const isLocal = partido.local === bot.nombre;
      const gL = isLocal ? partido.golesLocal : partido.golesVisitante;
      const gV = isLocal ? partido.golesVisitante : partido.golesLocal;
      const p = gL > gV ? 3 : gL === gV ? 1 : 0;
      const plantillaActualizada = actualizarLista(bot.plantilla);
      const areaStats = obtenerStatsArea(plantillaActualizada);
      return { ...bot, puntosLiga: bot.puntosLiga + p, plantilla: plantillaActualizada, ...areaStats, fuerza: Math.round((areaStats.ataque + areaStats.medio + areaStats.defensa) / 3) };
    }));

    setHistorialPartidos(prev => [{ jornada: jornadaActual, partidos: jornadaPartidos }, ...prev]);
    setJornadaActual(jornadaActual + 1);
    setDiasHastaPartido(7);
    setJugadoresBloqueadosJornada([]);
    agregarNoticia(`RESULTADO: Fantasía FC ${misGoles}-${susGoles} ${rivalData.nombre}.`);

    const resTexto = misGoles > susGoles ? '¡VICTORIA! +3 pts' : misGoles === susGoles ? 'EMPATE. +1 pt' : 'DERROTA. 0 pts';
    alert(`JORNADA ${jornadaActual}\n\n${esLocalUser ? 'Fantasía FC' : rivalData.nombre}: ${miResultado.golesA}\n${esLocalUser ? rivalData.nombre : 'Fantasía FC'}: ${miResultado.golesB}\n\n${resTexto}${misGoles > susGoles ? '\n💰 +5.000.000 EUR' : misGoles === susGoles ? '\n💰 +2.000.000 EUR' : ''}`);
    setTabActual('historial');

    if (jornadaActual === CALENDARIO.length) {
      const misPts = puntosLigaUsuario + (misGoles > susGoles ? 3 : misGoles === susGoles ? 1 : 0);
      const clasificacionFinal = [...estadoLigaBots.map(bot => {
        const p = jornadaPartidos.find(pa => pa.local === bot.nombre || pa.visitante === bot.nombre);
        let extra = 0;
        if (p) { const isL = p.local === bot.nombre; extra = (isL ? p.golesLocal : p.golesVisitante) > (isL ? p.golesVisitante : p.golesLocal) ? 3 : (isL ? p.golesLocal : p.golesVisitante) === (isL ? p.golesVisitante : p.golesLocal) ? 1 : 0; }
        return { nombre: bot.nombre, puntosLiga: bot.puntosLiga + extra };
      }), { nombre: 'FANTASÍA FC (TÚ)', puntosLiga: misPts }].sort((a, b) => b.puntosLiga - a.puntosLiga);
      const miPos = clasificacionFinal.findIndex(t => t.nombre === 'FANTASÍA FC (TÚ)') + 1;
      let msg = `🏆 ¡FIN DE LA LIGA!\n\nHas terminado en la posición #${miPos} con ${misPts} puntos.`;
      if (miPos === 1) msg += '\n\n¡INCREÍBLE! Eres el campeón de la liga! 🥇✨';
      else if (miPos <= 3) msg += '\n\n¡Gran trabajo! Has logrado el podio. 🥈🥉';
      else msg += '\n\nHas completado la temporada. ¡Sigue mejorando!';
      agregarNoticia(`FIN DE LIGA: Has quedado #${miPos} con ${misPts} puntos.`);
      setTimeout(() => alert(msg), 1500);
    }
  };

  const reiniciarLiga = async () => {
    if (!confirm('¿Seguro que quieres reiniciar la liga? Se borrará tu plantilla actual.')) return;
    if (!user?.id || !currentLeagueId) return;
    const { error: deleteErr } = await supabase.from('mis_plantillas').delete().eq('user_id', user.id).eq('liga_id', currentLeagueId).not('jugador_id', 'is', null);
    if (deleteErr) { alert('Error al limpiar la liga: ' + deleteErr.message); return; }
    await supabase.from('jugadores_comprados').delete().eq('user_id', user.id).eq('liga_id', currentLeagueId);
    const idsOcupadosOtros = new Set(fichajesDeLaLiga.filter(f => f.user_id !== user.id).map(s => s.jugador_id));
    const poolCandidatos = jugadores.filter(j => !idsOcupadosOtros.has(j.id));
    const draft: Jugador[] = [];
    const slots: Record<string, number> = { POR: 1, DF: 4, MC: 4, DL: 2 };
    for (const [pos, cant] of Object.entries(slots)) {
      const disponibles = poolCandidatos.filter(j => j.posicion === pos);
      draft.push(...disponibles.sort(() => 0.5 - Math.random()).slice(0, cant).map(j => ({ ...j, es_titular: true, puntos: 0, clausula: Math.round(j.precio * 1.5) })));
    }
    const insertData = draft.map(j => ({ user_id: user.id, jugador_id: j.id, liga_id: currentLeagueId, es_titular: true }));
    await supabase.from('mis_plantillas').insert(insertData);
    setJornadaActual(1); setHistorialPartidos([]); setJugadoresBloqueadosJornada([]);
    setPuntosLigaUsuario(0); setCapitanId(null); setPresupuesto(100000000);
    setMisFichajes(draft); setDiasHastaPartido(7);
    setNoticias(['SISTEMA: La liga ha sido reiniciada.']);
    localStorage.removeItem(`progress_${currentLeagueId}`);
    generarPlantillasBots(jugadores, insertData);
  };

  // ─── Render guards ────────────────────────────────────────────────────────────
  if (!user && !cargando) return <Auth />;

  if (showLeagueSelectionModal) {
    return (
      <LeagueSelectionModal
        comprobandoLiga={comprobandoLiga}
        usuarioTieneLiga={usuarioTieneLiga}
        ligasDetectadas={ligasDetectadas}
        cargando={cargando}
        newLeagueName={newLeagueName}
        setNewLeagueName={setNewLeagueName}
        joinLeagueCode={joinLeagueCode}
        setJoinLeagueCode={setJoinLeagueCode}
        onCreateLeague={handleCreateLeague}
        onJoinLeague={handleJoinLeague}
        onSelectLeague={handleSelectLeague}
      />
    );
  }

  if (cargando) return (
    <div className="flex h-screen items-center justify-center font-black text-blue-600 animate-pulse italic text-2xl">
      PREPARANDO VESTUARIOS...
    </div>
  );

  if (!user || !currentLeagueId) return null;

  // ─── Render principal ─────────────────────────────────────────────────────────
  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      {/* Modales */}
      <AnimatePresence>
        {jugadorSeleccionado && (
          <PlayerModal
            jugador={jugadorSeleccionado}
            onClose={() => setJugadorSeleccionado(null)}
            misFichajes={misFichajes}
            estadoLigaBots={estadoLigaBots}
            capitanId={capitanId}
            setCapitanId={setCapitanId}
            jornadaActual={jornadaActual}
            presupuesto={presupuesto}
            cargando={cargando}
            fichando={fichando}
            jugadoresBloqueadosJornada={jugadoresBloqueadosJornada}
            onToggleTitular={toggleTitular}
            onSubirClausula={subirClausula}
            onToggleTransferible={toggleTransferible}
            onFichar={ficharJugador}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchSeleccionado && (
          <MatchModal
            match={matchSeleccionado}
            onClose={() => setMatchSeleccionado(null)}
            misFichajes={misFichajes}
            estadoLigaBots={estadoLigaBots}
            jugadores={jugadores}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {equipoRivalSeleccionado && (
          <RivalScoutModal
            rival={equipoRivalSeleccionado}
            onClose={() => setEquipoRivalSeleccionado(null)}
            onSelectJugador={setJugadorSeleccionado}
          />
        )}
      </AnimatePresence>

      {/* Cabecera */}
      <Header
        currentLeague={currentLeague}
        user={user}
        poderActual={poderActual}
        statsUsuario={statsUsuario}
        presupuesto={presupuesto}
        puntosLigaUsuario={puntosLigaUsuario}
        jornadaActual={jornadaActual}
        diasHastaPartido={diasHastaPartido}
        simulandoDia={simulandoDia}
        misFichajes={misFichajes}
        historialPartidos={historialPartidos}
        onLogout={handleLogout}
        onSimularDia={simularDia}
        onJugarJornada={jugarJornada}
        onReiniciarLiga={reiniciarLiga}
        onCopyCode={code => copyToClipboard(code, '¡Código copiado!')}
        onCopyInviteLink={copyInviteLink}
      />

      {/* Selector de sección */}
      <TabSelector tabActual={tabActual} onChange={setTabActual} />

      {/* Contenido por tab */}
      <AnimatePresence mode="wait">
        {tabActual === 'equipo' && (
          <TeamTab
            misFichajes={misFichajes}
            formacion={formacion}
            setFormacion={setFormacion}
            tactica={tactica}
            setTactica={setTactica}
            userKitHomeColor={userKitHomeColor}
            setUserKitHomeColor={setUserKitHomeColor}
            userKitAwayColor={userKitAwayColor}
            setUserKitAwayColor={setUserKitAwayColor}
            capitanId={capitanId}
            estadoForma={estadoForma}
            onSelectJugador={setJugadorSeleccionado}
            onToggleTitular={toggleTitular}
            onReordenarTitular={reordenarTitular}
          />
        )}
        {tabActual === 'mercado' && (
          <MarketTab
            jugadoresFiltrados={jugadoresFiltrados}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            filtroPosicion={filtroPosicion}
            setFiltroPosicion={setFiltroPosicion}
            misFichajes={misFichajes}
            fichajesDeLaLiga={fichajesDeLaLiga}
            estadoLigaBots={estadoLigaBots}
            userId={user?.id}
            onSelectJugador={setJugadorSeleccionado}
          />
        )}
        {tabActual === 'calendario' && (
          <CalendarTab historialPartidos={historialPartidos} jornadaActual={jornadaActual} />
        )}
        {tabActual === 'historial' && (
          <HistoryTab
            historialPartidos={historialPartidos}
            misFichajes={misFichajes}
            estadoLigaBots={estadoLigaBots}
            jugadores={jugadores}
            onSelectMatch={setMatchSeleccionado}
          />
        )}
        {tabActual === 'clasificacion' && (
          <StandingsTab
            estadoLigaBots={estadoLigaBots}
            puntosLigaUsuario={puntosLigaUsuario}
            poderActual={poderActual}
            userKitHomeColor={userKitHomeColor}
            userKitAwayColor={userKitAwayColor}
            onSelectRival={setEquipoRivalSeleccionado}
          />
        )}
        {tabActual === 'noticias' && <NewsTab noticias={noticias} />}
        {tabActual === 'stats' && <StatsTab jugadores={jugadores} onSelectJugador={setJugadorSeleccionado} />}
      </AnimatePresence>
    </main>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Auth from '@/Components/Auth';
import { Stats, Jugador, League, Rival, PartidoHistorial, Posicion, FormacionKey, Tactic } from './fantasy';
import { CONFIG_FORMACIONES, EQUIPOS_BOTS_INICIAL, CALENDARIO } from './gameData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Calendar, RotateCcw, Zap, Target, Activity, Award, TrendingUp, Users, Newspaper, Plus, LogIn, Share2, Copy, Crown, ChevronLeft, ChevronRight,
} from 'lucide-react';

// Función para asegurar que solo exista un jugador por nombre en toda la liga
const deduplicarPorNombre = (jugadores: Jugador[]): Jugador[] => {
  const nombresVistos = new Set<string>();
  return jugadores.filter(j => {
    const nombreNormalizado = j.nombre.trim().toLowerCase();
    if (nombresVistos.has(nombreNormalizado)) return false;
    nombresVistos.add(nombreNormalizado);
    return true;
  });
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [presupuesto, setPresupuesto] = useState(150000000); // 150M Iniciales
  const [userKitHomeColor, setUserKitHomeColor] = useState('#2563eb'); // Azul por defecto
  const [userKitAwayColor, setUserKitAwayColor] = useState('#ffffff'); // Blanco por defecto
  const [misFichajes, setMisFichajes] = useState<Jugador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fichando, setFichando] = useState(false);
  const [fichajesDeLaLiga, setFichajesDeLaLiga] = useState<{jugador_id: string, user_id: string}[]>([]);

  const [tabActual, setTabActual] = useState<'equipo' | 'mercado' | 'clasificacion' | 'historial' | 'noticias' | 'stats' | 'calendario'>('equipo');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('Todos');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [noticias, setNoticias] = useState<string[]>([]);
  const [formacion, setFormacion] = useState<FormacionKey>('4-4-2');
  const [tactica, setTactica] = useState<Tactic>('Equilibrado');

  const [jornadaActual, setJornadaActual] = useState(1);
  const [historialPartidos, setHistorialPartidos] = useState<PartidoHistorial[]>([]);

  const [estadoLigaBots, setEstadoLigaBots] = useState<Rival[]>([]);
  const [puntosLigaUsuario, setPuntosLigaUsuario] = useState(0);
  const [capitanId, setCapitanId] = useState<string | null>(null);
  const [diasHastaPartido, setDiasHastaPartido] = useState(7);
  const [simulandoDia, setSimulandoDia] = useState(false);
  const [jugadoresBloqueadosJornada, setJugadoresBloqueadosJornada] = useState<string[]>([]);

  const [equipoRivalSeleccionado, setEquipoRivalSeleccionado] = useState<Rival | null>(null);
  const [matchSeleccionado, setMatchSeleccionado] = useState<PartidoHistorial['partidos'][0] | null>(null);

  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
  const [currentLeague, setCurrentLeague] = useState<League | null>(null);
  const [showLeagueSelectionModal, setShowLeagueSelectionModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [joinLeagueCode, setJoinLeagueCode] = useState('');

  const generarStatsRealistas = (posicion: string, precio: number): Stats => {
    // Ajustamos la escala para que los jugadores de ~70M sean los tops (factor ~1.0)
    const factorCalidad = Math.min(1.3, Math.max(0.2, precio / 70000000)); 
    const base = 72 + (factorCalidad * 22); // Cracks: ~94+ de media | Normales: ~76+
    const rng = (mod = 0) => Math.min(99, Math.max(72, Math.round(base + mod + (Math.random() * 4 - 2))));

    switch (posicion) {
      case 'POR':
        return { ritmo: rng(-5), tiro: rng(-25), pase: rng(5), defensa: rng(12) };
      case 'DF':
        return { ritmo: rng(2), tiro: rng(-10), pase: rng(5), defensa: rng(14) };
      case 'MC':
        return { ritmo: rng(5), tiro: rng(8), pase: rng(16), defensa: rng(5) };
      case 'DL':
        return { ritmo: rng(12), tiro: rng(20), pase: rng(6), defensa: rng(-10) };
      default:
        return { ritmo: 95, tiro: 95, pase: 95, defensa: 95 };
    }
  };

  const calcularMediaJugador = (stats: Stats, posicion: string): number => {
    switch (posicion) {
      case 'POR': return Math.round(stats.defensa * 0.7 + stats.pase * 0.3);
      case 'DF': return Math.round(stats.defensa * 0.6 + stats.ritmo * 0.2 + stats.pase * 0.2);
      case 'MC': return Math.round(stats.pase * 0.5 + stats.tiro * 0.2 + stats.defensa * 0.15 + stats.ritmo * 0.15);
      case 'DL': return Math.round(stats.tiro * 0.6 + stats.ritmo * 0.3 + stats.pase * 0.1);
      default: return Math.round((stats.ritmo + stats.tiro + stats.pase + stats.defensa) / 4);
    }
  };

  const obtenerStatsArea = (plantilla: Jugador[]) => {
    const avg = (players: Jugador[]) => players.length > 0 
      ? Math.round(players.reduce((acc, j) => acc + j.media, 0) / players.length) 
      : 0;

    const dl = plantilla.filter(j => j.posicion === 'DL');
    const mc = plantilla.filter(j => j.posicion === 'MC');
    const df_por = plantilla.filter(j => j.posicion === 'DF' || j.posicion === 'POR');

    return {
      ataque: avg(dl),
      medio: avg(mc),
      defensa: avg(df_por)
    };
  };

  const agregarNoticia = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNoticias(prev => {
      if (prev.some(n => n.endsWith(msg))) return prev;
      return [`[${time}] ${msg}`, ...prev].slice(0, 50);
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  const calcularPoderEquipo = useCallback(() => {
    const titulares = misFichajes.filter((j) => j.es_titular);
    if (titulares.length === 0) return 0;
    const sumaMedias = titulares.reduce((acc, j) => acc + j.media, 0);
    return Math.round(sumaMedias / titulares.length); // Calcular la media de las medias de los titulares
  }, [misFichajes]);

  const poderActual = calcularPoderEquipo();

  const statsUsuario = obtenerStatsArea(misFichajes.filter(j => j.es_titular));

  const puntosTotalesJugadores = misFichajes.reduce((acc, j) => acc + (j.puntos || 0), 0);
  const estadoForma =
    puntosTotalesJugadores > 50 ? 'Excelente' : puntosTotalesJugadores > 20 ? 'Bueno' : 'En construccion';

  const generarPlantillasBots = useCallback((todosLosJugadores: Jugador[], fichajesDeHumanos: {jugador_id: string}[]) => {
    const idsHumanos = new Set(fichajesDeHumanos.map(f => f.jugador_id));
    let poolDisponible = [...todosLosJugadores.filter((j) => !idsHumanos.has(j.id))];

    const tactics: Tactic[] = ['Ofensivo', 'Defensivo', 'Equilibrado'];

    const botsConPlantilla = EQUIPOS_BOTS_INICIAL.map((bot) => {
      const plantilla: Jugador[] = [];
      ['POR', 'DF', 'MC', 'DL'].forEach((pos: string) => {
        const porPosicion = poolDisponible.filter((j) => j.posicion === pos);
        const cantidad = pos === 'POR' ? 1 : pos === 'DF' ? 4 : pos === 'MC' ? 4 : 2;
        const shuffled = [...porPosicion].sort(() => 0.5 - Math.random());
        const seleccionados = shuffled.slice(0, cantidad); // Asegurarse de que no se seleccionen más jugadores de los disponibles
        plantilla.push(...seleccionados);
        const seleccionadosIds = new Set(seleccionados.map(s => s.id));
        poolDisponible = poolDisponible.filter(p => !seleccionadosIds.has(p.id));
      });
      
      const areaStats = obtenerStatsArea(plantilla);
      return { 
        ...bot, 
        plantilla, 
        tactica: tactics[Math.floor(Math.random() * tactics.length)],
        ...areaStats,
        fuerza: Math.round((areaStats.ataque + areaStats.medio + areaStats.defensa) / 3)
      };
    });
    setEstadoLigaBots(botsConPlantilla);
  }, []);

  const reiniciarLiga = async () => {
    if (confirm('¿Seguro que quieres reiniciar la liga? Se borrará tu plantilla actual, volverás a 100M y recibirás 11 jugadores nuevos.')) {
      if (!user?.id || !currentLeagueId) return;

      // 1. Borrar la plantilla actual del usuario en la base de datos (Supabase)
      const { error: deleteErr } = await supabase
        .from('mis_plantillas')
        .delete()
        .eq('user_id', user.id)
        .eq('liga_id', currentLeagueId);

      if (deleteErr) {
        alert("Error al limpiar la liga: " + deleteErr.message);
        return;
      }

      // 2. Draft de 11 jugadores "no top" (media baja-media)
      // Filtramos para no coger jugadores de otros humanos y ordenamos por media
      const idsOcupadosOtros = new Set(fichajesDeLaLiga.filter(f => f.user_id !== user.id).map(s => s.jugador_id));
      
      const poolCandidatos = jugadores
        .filter(j => !idsOcupadosOtros.has(j.id) && j.media <= 80);
        // Quitamos la restricción del 70% para que el equipo inicial sea de máxima calidad

      const draft: Jugador[] = [];
      const slots: Record<string, number> = { POR: 1, DF: 4, MC: 4, DL: 2 };
      
      for (const [pos, cant] of Object.entries(slots)) {
        const disponibles = poolCandidatos.filter(j => j.posicion === pos);
        const elegidos = disponibles.sort(() => 0.5 - Math.random()).slice(0, cant);
        draft.push(...elegidos.map(j => ({ 
          ...j, 
          es_titular: true, 
          puntos: 0,
          clausula: Math.round(j.precio * 1.5) // Cláusula = Valor + 50% (50M -> 75M)
        })));
      }

      const insertData = draft.map(j => ({ user_id: user.id, jugador_id: j.id, liga_id: currentLeagueId, es_titular: true }));
      await supabase.from('mis_plantillas').insert(insertData);

      // 3. Resetear estados locales
      setJornadaActual(1);
      setHistorialPartidos([]);
      setJugadoresBloqueadosJornada([]);
      setPuntosLigaUsuario(0);
      setCapitanId(null); 
      setPresupuesto(150000000); // Volver al presupuesto inicial de 150 millones
      setMisFichajes(draft);
      setJugadores(prev => prev.map(j => ({ 
        ...j, 
        puntos: 0, 
        puntosUltimaJornada: 0,
        goles: 0,
        asistencias: 0,
        paradas: 0
      })));
      setDiasHastaPartido(7);
      setNoticias(["SISTEMA: La liga ha sido reiniciada. Has recibido 100M y una plantilla de nivel base."]);
      localStorage.removeItem(`progress_${currentLeagueId}`);
      
      // Regenerar bots para que no tengan a nuestros nuevos jugadores del draft
      generarPlantillasBots(jugadores, insertData);
    }
  };

  const subirClausula = useCallback((jugadorId: string) => {
    const jugador = misFichajes.find(j => j.id === jugadorId);
    if (!jugador) return;

    const input = prompt(`¿Cuánto presupuesto quieres invertir en blindar a ${jugador.nombre}? (La cláusula subirá el DOBLE de lo invertido)\nCláusula actual: ${jugador.clausula.toLocaleString()} EUR`);
    if (input === null) return; // Cancelado por el usuario

    const coste = parseInt(input.replace(/\D/g, '')); // Extraer solo números
    if (isNaN(coste) || coste <= 0) {
      return alert("Cantidad no válida.");
    }

    if (presupuesto < coste) {
      alert(`No tienes suficiente dinero. Tu presupuesto es de ${presupuesto.toLocaleString()} EUR.`);
      return;
    }

    const aumento = coste * 2;
    const nuevaClausula = jugador.clausula + aumento;

    setPresupuesto(prev => prev - coste);
    setMisFichajes(prev => prev.map(j => j.id === jugadorId ? { ...j, clausula: nuevaClausula } : j));
    setJugadores(prev => prev.map(j => j.id === jugadorId ? { ...j, clausula: nuevaClausula } : j));
    setJugadorSeleccionado(prev => prev && prev.id === jugadorId ? { ...prev, clausula: nuevaClausula } : prev);
    setEstadoLigaBots(prev => prev.map(b => ({ ...b, plantilla: b.plantilla.map(pj => pj.id === jugadorId ? { ...pj, clausula: nuevaClausula } : pj) })));
  }, [misFichajes, presupuesto]);

  const toggleTransferible = (jugadorId: string) => {
    setMisFichajes(prev => prev.map(j => j.id === jugadorId ? { ...j, enVenta: !j.enVenta } : j));
    setJugadorSeleccionado(prev => prev && prev.id === jugadorId ? { ...prev, enVenta: !prev.enVenta } : prev);
  };

  // Guardar progreso automáticamente cuando cambie algo relevante
  useEffect(() => {
    if (currentLeagueId && estadoLigaBots.length > 0) {
      const progress = {
        jornadaActual,
        puntosLigaUsuario,
        estadoLigaBots,
        historialPartidos,
        jugadores,
        misFichajes,
        noticias,
        presupuesto,
        diasHastaPartido,
        jugadoresBloqueadosJornada
      };
      localStorage.setItem(`progress_${currentLeagueId}`, JSON.stringify(progress));
    }
  }, [jornadaActual, puntosLigaUsuario, estadoLigaBots, historialPartidos, jugadores, misFichajes, noticias, presupuesto, currentLeagueId, diasHastaPartido, jugadoresBloqueadosJornada]);

  // Función auxiliar para simular un partido entre dos equipos cualesquiera
  const simularPartidoGenerico = (
    equipoA: { nombre: string, fuerza: number, ataque: number, medio: number, defensa: number, plantilla: Jugador[] }, 
    equipoB: { nombre: string, fuerza: number, ataque: number, medio: number, defensa: number, plantilla: Jugador[] },
    tacticA: Tactic = 'Equilibrado',
    tacticB: Tactic = 'Equilibrado'
  ) => {
    const getAtkMod = (t: Tactic) => (t === 'Ofensivo' ? 1.3 : t === 'Defensivo' ? 0.7 : 1.0);
    const getMidMod = (t: Tactic) => (t === 'Ofensivo' ? 1.2 : t === 'Defensivo' ? 0.8 : 1.0);
    const getDefMod = (t: Tactic) => (t === 'Ofensivo' ? 0.75 : t === 'Defensivo' ? 1.3 : 1.0);

    // 1. Posesión: Meritocracia Pura basada en el Centro del Campo (MED)
    const midA = (equipoA.medio || equipoA.fuerza || 70) * getMidMod(tacticA);
    const midB = (equipoB.medio || equipoB.fuerza || 70) * getMidMod(tacticB);
    const diffMid = midA - midB;
    // Dominio real: Cada punto de diferencia en el medio campo otorga un 2.5% de ventaja. 
    // Con un 96 vs 75, tu posesión será del 80-85% consistentemente.
    const posesionA = Math.max(10, Math.min(90, Math.round(50 + (diffMid * 2.5) + (Math.random() * 4 - 2))));
    const posesionB = 100 - posesionA;

    // 2. Tiros: Proporción Ataque vs Defensa + Factor Posesión
    const calcTiros = (atk: number, defOpp: number, pos: number, t: Tactic) => {
      const powerAtk = (atk || 70) * getAtkMod(t);
      const wallDef = (defOpp || 70) * 0.9; // La defensa rival mitiga directamente la capacidad de crear ocasiones
      const superioridad = Math.max(2, powerAtk - wallDef);
      const factorVolumen = pos / 50; // A más tiempo con el balón, más disparos generas
      // Aumentamos el divisor para reducir la cantidad de tiros totales por partido
      return Math.max(1, Math.round((superioridad / 4.5) * factorVolumen + Math.random() * 3));
    };

    const tirosA = calcTiros(equipoA.ataque, equipoB.defensa, posesionA, tacticA);
    const tirosB = calcTiros(equipoB.ataque, equipoA.defensa, posesionB, tacticB);

    const tirosPuertaA = Math.max(0, Math.floor(tirosA * (0.35 + Math.random() * 0.15)));
    const tirosPuertaB = Math.max(0, Math.floor(tirosB * (0.35 + Math.random() * 0.15)));

    // 3. Goles y Paradas: El portero es un muro estadístico (Zamora)
    const porA_media = equipoA.plantilla?.find(j => j.posicion === 'POR')?.media || equipoA.fuerza || 70;
    const porB_media = equipoB.plantilla?.find(j => j.posicion === 'POR')?.media || equipoB.fuerza || 70;
    
    const calcGoles = (tirosP: number, mediaPOR: number) => {
      const eficaciaBase = 0.35; // Bajamos la puntería general de los delanteros
      // El portero sigue restando eficacia, lo que genera más paradas registradas
      const penalizacionPOR = Math.max(0, (mediaPOR - 55) / 110); 
      let g = 0;
      for(let i=0; i<tirosP; i++) {
        if(Math.random() < (eficaciaBase - penalizacionPOR)) g++;
      }
      return g;
    };

    const golesA = calcGoles(tirosPuertaA, porB_media);
    const golesB = calcGoles(tirosPuertaB, porA_media);

    const paradasA = tirosPuertaB - golesB;
    const paradasB = tirosPuertaA - golesA;
    const porAId = equipoA.plantilla.find(j => j.posicion === 'POR')?.id;
    const porBId = equipoB.plantilla.find(j => j.posicion === 'POR')?.id;

    const eventos: string[] = [];
    const goleadoresIds: string[] = [];
    const asistentesIds: string[] = []; // Declaración de asistentesIds aquí
    
    const generarGoles = (goles: number, equipo: { nombre: string, plantilla: Jugador[] }) => {
      for (let i = 0; i < goles; i++) {
        const pool = (equipo.plantilla || []).flatMap(j => {
          const peso = j.posicion === 'DL' ? 10 : j.posicion === 'MC' ? 4 : 1;
          return Array(peso).fill(j);
        });
        const index = Math.floor(Math.random() * pool.length);
        const goleador = pool[index];
        if (!goleador) continue;
        goleadoresIds.push(goleador.id);

        let assistString = "";
        // 70% de probabilidad de asistencia
        if (Math.random() < 0.7) {
          const poolAsist = (equipo.plantilla || []).filter(p => p.id !== goleador.id && p.posicion !== 'POR').flatMap(j => { // POR no pueden asistir
            const peso = j.posicion === 'MC' ? 10 : j.posicion === 'DL' ? 5 : j.posicion === 'DF' ? 3 : 1;
            return Array(peso).fill(j);
          });
          if (poolAsist.length > 0) {
            const asistente = poolAsist[Math.floor(Math.random() * poolAsist.length)];
            asistentesIds.push(asistente.id);
            assistString = ` [Asist: ${asistente.nombre}]`;
          }
        }
        const minuto = Math.floor(Math.random() * 90) + 1;
        eventos.push(`${minuto}' ⚽ GOL de ${goleador.nombre}${assistString} (${equipo.nombre})`);
      }
    };

    generarGoles(golesA, equipoA);
    generarGoles(golesB, equipoB);
    eventos.sort((a, b) => parseInt(a.split("'")[0] || '0') - parseInt(b.split("'")[0] || '0')); // Manejar posibles errores en el parseo

    return { golesA, golesB, eventos, goleadoresIds, asistentesIds, posesionA, posesionB, tirosA, tirosB, tirosPuertaA, tirosPuertaB, paradasA, paradasB, porAId, porBId };
  };

  const venderJugador = useCallback(async (jugador: Jugador, precioVenta?: number) => {
    if (!currentLeagueId || !user?.id) return;
    const finalPrice = precioVenta || Number(jugador.precio);
    if (!precioVenta && !confirm(`¿Vender a ${jugador.nombre}?`)) return;

    const { error } = await supabase
      .from('mis_plantillas')
      .delete()
      .eq('user_id', user.id)
      .eq('jugador_id', jugador.id)
      .eq('liga_id', currentLeagueId);

    if (error) {
      alert("Error al vender jugador: " + error.message);
      return;
    }
    
    agregarNoticia(`TRASPASO: Has vendido a ${jugador.nombre} por ${formatCurrency(finalPrice)}.`);
    setMisFichajes((prev) => prev.filter((j) => j.id !== jugador.id)); // Eliminar de mi plantilla
    if (capitanId === jugador.id) setCapitanId(null);

    setFichajesDeLaLiga((prev) => prev.filter(f => !(f.jugador_id === jugador.id && f.user_id === user.id))); // Eliminar de fichajes de liga

    setPresupuesto((prev) => prev + finalPrice);
    setJugadorSeleccionado(null);
    setJugadoresBloqueadosJornada(prev => [...prev, jugador.id]);
  }, [currentLeagueId, user, capitanId, agregarNoticia]);

  const procesarOfertasIA = useCallback((probOferta: number, probClausulazo: number) => {
    // 1. Ofertas por jugadores que TÚ has puesto a la venta (Alta probabilidad)
    const transferibles = misFichajes.filter(j => j.enVenta);
    if (transferibles.length > 0 && Math.random() < probOferta) {
      const candidato = transferibles[Math.floor(Math.random() * transferibles.length)];
      const multiplicador = 0.85 + Math.random() * 0.3;
      const oferta = Math.round(candidato.precio * multiplicador);
      const randomClub = EQUIPOS_BOTS_INICIAL[Math.floor(Math.random() * EQUIPOS_BOTS_INICIAL.length)].nombre;

      setTimeout(() => {
        if (confirm(`OFERTA RECIBIDA: El ${randomClub} ofrece ${formatCurrency(oferta)} por ${candidato.nombre}. ¿Aceptas la venta?`)) {
          setEstadoLigaBots(prev => prev.map(b => b.nombre === randomClub ? { ...b, plantilla: [...b.plantilla, candidato] } : b));
          venderJugador(candidato, oferta);
        }
      }, 500);
      return; // Solo una oferta por proceso
    }

    // 2. IA paga la cláusula de un jugador que NO está a la venta (Baja probabilidad)
    const noTransferibles = misFichajes.filter(j => !j.enVenta);
    if (noTransferibles.length > 0 && Math.random() < probClausulazo) {
      const candidato = noTransferibles[Math.floor(Math.random() * noTransferibles.length)];
      const randomClub = EQUIPOS_BOTS_INICIAL[Math.floor(Math.random() * EQUIPOS_BOTS_INICIAL.length)]; // Get the full bot object
      const randomClubName = randomClub.nombre;
      alert(`¡CLÁUSULAZO! El ${randomClubName} ha pagado la cláusula de ${candidato.nombre} (${formatCurrency(candidato.clausula)}). El jugador abandona tu club inmediatamente.`);
      agregarNoticia(`¡BOMBA! El ${randomClubName} paga la cláusula de ${candidato.nombre} (${formatCurrency(candidato.clausula)}).`);
      setEstadoLigaBots(prev => prev.map(b => b.nombre === randomClubName ? { ...b, plantilla: [...b.plantilla, candidato] } : b));
      venderJugador(candidato, candidato.clausula);
    }
  }, [misFichajes, venderJugador, agregarNoticia, setEstadoLigaBots]);

  const jugarJornada = () => {
    const misTitulares = misFichajes.filter(j => j.es_titular);
    if (misTitulares.length !== 11) return alert(`Necesitas 11 titulares (tienes ${misTitulares.length}).`);
    if (presupuesto < 0) return alert('No puedes jugar la jornada con presupuesto negativo. Vende algún jugador para equilibrar tus cuentas.');
    if (jornadaActual > CALENDARIO.length) return alert('Temporada finalizada.');

    const infoJornada = CALENDARIO[jornadaActual - 1];
    const esLocalUser = infoJornada.esLocal;
    const rivalData = estadoLigaBots.find(b => b.nombre === infoJornada.rival);
    if (!rivalData) return;

    // 1. Generar NOTA (Rating) basada en las STATS reales de Supabase
    const notasRonda: Record<string, number> = {};
    [...jugadores, ...misFichajes, ...estadoLigaBots.flatMap(b => b.plantilla)].forEach(j => {
      // Usamos la media de Supabase como base para el rendimiento en el partido
      const baseRating = j.media;

      const finalRating = Math.max(0, Math.min(10, Math.round((baseRating / 100) * 7 + (Math.random() * 4 - 2))));
      notasRonda[j.id] = finalRating;
    });

    // 2. Simular mi partido
    const miResultado = esLocalUser
      ? simularPartidoGenerico(
          { nombre: 'Fantasía FC', fuerza: poderActual, ...statsUsuario, plantilla: misTitulares },
          rivalData,
          tactica,
          rivalData.tactica || 'Equilibrado'
        )
      : simularPartidoGenerico(
          rivalData,
          { nombre: 'Fantasía FC', fuerza: poderActual, ...statsUsuario, plantilla: misTitulares },
          rivalData.tactica || 'Equilibrado',
          tactica
        );

    // Identificar mis goles y los del rival para el reparto de puntos
    const misGoles = esLocalUser ? miResultado.golesA : miResultado.golesB;
    const susGoles = esLocalUser ? miResultado.golesB : miResultado.golesA;

    // 3. Simular el resto de partidos de la liga
    const jornadaPartidos = [{ 
      local: esLocalUser ? 'Fantasía FC' : rivalData.nombre, 
      visitante: esLocalUser ? rivalData.nombre : 'Fantasía FC', 
      golesLocal: miResultado.golesA, golesVisitante: miResultado.golesB, 
      eventos: miResultado.eventos,
      goleadoresIds: miResultado.goleadoresIds,
      asistentesIds: miResultado.asistentesIds,
      notas: notasRonda, // Guardar las notas de todos los jugadores para este partido
      colorLocal: esLocalUser ? userKitHomeColor : rivalData.kit_home_color,
      colorVisitante: esLocalUser ? rivalData.kit_away_color : userKitAwayColor,
      posesionLocal: miResultado.posesionA,
      posesionVisitante: miResultado.posesionB,
      tirosLocal: miResultado.tirosA,
      tirosVisitante: miResultado.tirosB,
      tirosPuertaLocal: miResultado.tirosPuertaA,
      tirosPuertaVisitante: miResultado.tirosPuertaB,
      paradasLocal: miResultado.paradasA,
      paradasVisitante: miResultado.paradasB,
      porLocalId: miResultado.porAId,
      porVisitanteId: miResultado.porBId
    }];

    const botsRestantes = estadoLigaBots.filter(b => b.nombre !== rivalData.nombre);
    // Pasa la táctica configurada por el usuario para tu equipo, los bots usan 'Equilibrado' por defecto
    const shuffledBots = [...botsRestantes].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < shuffledBots.length; i += 2) {
      if (i + 1 < shuffledBots.length) {
        const res = simularPartidoGenerico(shuffledBots[i], shuffledBots[i+1], shuffledBots[i].tactica || 'Equilibrado', shuffledBots[i+1].tactica || 'Equilibrado'); // Los bots juegan con su táctica
        jornadaPartidos.push({
          local: shuffledBots[i].nombre, visitante: shuffledBots[i+1].nombre,
          golesLocal: res.golesA, golesVisitante: res.golesB,
          eventos: res.eventos,
          goleadoresIds: res.goleadoresIds, // Asegurarse de que los goleadores se recogen
          asistentesIds: res.asistentesIds,
          notas: notasRonda,
          colorLocal: shuffledBots[i].kit_home_color,
          colorVisitante: shuffledBots[i+1].kit_away_color,
          posesionLocal: res.posesionA,
          posesionVisitante: res.posesionB,
          tirosLocal: res.tirosA,
          tirosVisitante: res.tirosB,
          tirosPuertaLocal: res.tirosPuertaA,
          tirosPuertaVisitante: res.tirosPuertaB,
          paradasLocal: res.paradasA,
          paradasVisitante: res.paradasB,
          porLocalId: res.porAId,
          porVisitanteId: res.porBId
        });
      }
    }

    // IDs de todos los que han marcado en esta jornada
    const todosLosGoleadores = jornadaPartidos.flatMap(p => p.goleadoresIds);
    const todosLosAsistentes = jornadaPartidos.flatMap(p => p.asistentesIds || []); // Declarar aquí
    const registroParadas = jornadaPartidos.flatMap(p => [
      { id: p.porLocalId, cant: p.paradasLocal || 0 },
      { id: p.porVisitanteId, cant: p.paradasVisitante || 0 }
    ]);

    // 4. Crear un mapa de puntos por ID para evitar cálculos duplicados
    const mapaPuntosJornada: Record<string, number> = {};
    
    // Calculamos los puntos de CADA jugador una única vez
    const todosLosJugadoresMundo = [...jugadores, ...misFichajes, ...estadoLigaBots.flatMap(b => b.plantilla)];
    const idsProcesados = new Set<string>();

    todosLosJugadoresMundo.forEach(j => {
      if (idsProcesados.has(j.id)) return;
      idsProcesados.add(j.id);

      const nota = notasRonda[j.id] || 0;
      const goles = todosLosGoleadores.filter(id => id === j.id).length;
      const asis = todosLosAsistentes.filter(id => id === j.id).length;
      let puntosGoles = 0;
      if (goles > 0) {
        if (j.posicion === 'DL') puntosGoles = goles * 4;
        else if (j.posicion === 'MC') puntosGoles = goles * 5;
        else if (j.posicion === 'DF') puntosGoles = goles * 6;
        else if (j.posicion === 'POR') puntosGoles = goles * 7;

      }

      const paradas = registroParadas.find(r => r.id === j.id)?.cant || 0;

      let pts = nota + puntosGoles + (asis * 3) + (paradas * 0.5);
      const mio = misFichajes.find(f => f.id === j.id);
      if (mio) {
        if (!mio.es_titular) pts = 0;
        else if (mio.id === capitanId) pts *= 2;
      }
      mapaPuntosJornada[j.id] = pts;
    });

    // Función de transformación limpia
    const actualizarLista = (lista: Jugador[]) => lista.map(j => {
      // Actualizar goles y asistencias aquí
      const golesNuevos = todosLosGoleadores.filter(id => id === j.id).length;
      const asistenciasNuevas = todosLosAsistentes.filter(id => id === j.id).length;
      const paradasNuevas = registroParadas.find(r => r.id === j.id)?.cant || 0;
      const ptsNuevos = mapaPuntosJornada[j.id] || 0;
      let nuevoPrecio = j.precio;
      if (ptsNuevos >= 8) nuevoPrecio = Math.round(j.precio * 1.05);
      else if (ptsNuevos > 0 && ptsNuevos <= 3) nuevoPrecio = Math.round(j.precio * 0.95);
      
      const factorPrecio = j.precio > 0 ? nuevoPrecio / j.precio : 1;
      const factorEvolucion = 1 + (factorPrecio - 1) * 0.3; // Evolución de stats individuales
      const factorMedia = 1 + (factorPrecio - 1) * 0.1;    // Evolución más suave de la media global

      const nuevasStats: Stats = {
        ritmo: Math.min(99, Math.max(5, Math.round(j.stats.ritmo * factorEvolucion))),
        tiro: Math.min(99, Math.max(5, Math.round(j.stats.tiro * factorEvolucion))),
        pase: Math.min(99, Math.max(5, Math.round(j.stats.pase * factorEvolucion))),
        defensa: Math.min(99, Math.max(5, Math.round(j.stats.defensa * factorEvolucion))),
      };
      
      return { 
        ...j, 
        puntos: (j.puntos || 0) + ptsNuevos, 
        puntosUltimaJornada: ptsNuevos,
        goles: (j.goles || 0) + golesNuevos,
        asistencias: (j.asistencias || 0) + asistenciasNuevas,
        paradas: (j.paradas || 0) + paradasNuevas,
        precio: nuevoPrecio,
        clausula: Math.round(j.clausula * factorPrecio),
        media: Math.min(99, Math.max(40, Math.round(j.media * factorMedia))),
        stats: nuevasStats
      };
    });

    setJugadores(prev => actualizarLista(prev));
    setMisFichajes(prev => actualizarLista(prev));
    
    if (misGoles > susGoles) {
      setPuntosLigaUsuario(p => p + 3);
      setPresupuesto(prev => prev + 5000000);
      agregarNoticia(`PREMIO JORNADA: Has recibido 5.000.000 EUR por tu victoria.`);
    }
    else if (misGoles === susGoles) {
      setPuntosLigaUsuario(p => p + 1);
      setPresupuesto(prev => prev + 2000000);
      agregarNoticia(`PREMIO JORNADA: Has recibido 2.000.000 EUR por el empate.`);
    }

    setEstadoLigaBots(prev => prev.map(bot => {
      const partido = jornadaPartidos.find(p => p.local === bot.nombre || p.visitante === bot.nombre);
      if (!partido) return bot;
      const isLocal = partido.local === bot.nombre;
      const misGoles = isLocal ? partido.golesLocal : partido.golesVisitante;
      const susGoles = isLocal ? partido.golesVisitante : partido.golesLocal;
      let p = 0;
      if (misGoles > susGoles) p = 3; else if (misGoles === susGoles) p = 1;
      const plantillaActualizada = actualizarLista(bot.plantilla);
      const areaStats = obtenerStatsArea(plantillaActualizada);
      return { 
        ...bot, 
        puntosLiga: bot.puntosLiga + p, 
        plantilla: plantillaActualizada,
        ...areaStats,
        fuerza: Math.round((areaStats.ataque + areaStats.medio + areaStats.defensa) / 3)
      };
    }));

    setHistorialPartidos(prev => [{ jornada: jornadaActual, partidos: jornadaPartidos }, ...prev]);
    setJornadaActual(jornadaActual + 1);
    setDiasHastaPartido(7); // Reiniciar el calendario para la siguiente semana
    setJugadoresBloqueadosJornada([]);

    const misNotasResumen = misTitulares.map(j => {
      // Aquí usamos la nota del partido, no los puntos acumulados
      const nota = notasRonda[j.id] || 0;
      return `- ${j.nombre}: ${nota} Puntos`;
    }).join('\n');

    let resultadoTexto = '';
    if (misGoles > susGoles) {
      resultadoTexto = '¡VICTORIA! +3 puntos';
    } else if (misGoles === susGoles) {
      resultadoTexto = 'EMPATE. +1 punto';
    } else {
      resultadoTexto = 'DERROTA. 0 puntos';
    }

    const localName = esLocalUser ? 'Fantasía FC' : rivalData.nombre;
    const visitorName = esLocalUser ? rivalData.nombre : 'Fantasía FC';

    alert(
      `JORNADA ${jornadaActual}\n\n` +
        `${localName}: ${miResultado.golesA}\n` +
        `${visitorName}: ${miResultado.golesB}\n\n` +
        '\n\nNOTAS DE TU ONCE TITULAR:\n' +
        misNotasResumen +
        '\n\n' +
        resultadoTexto +
        (misGoles > susGoles ? '\n💰 Premio: +5.000.000 EUR' : misGoles === susGoles ? '\n💰 Premio: +2.000.000 EUR' : '') +
        '\n\n📈 El mercado ha fluctuado según los rendimientos.'
    );

    setTabActual('historial');

    agregarNoticia(`RESULTADO: Fantasía FC ${misGoles}-${susGoles} ${rivalData.nombre}.`);

    // Lógica de fin de temporada: Mensaje con la posición final
    if (jornadaActual === CALENDARIO.length) {
      // Calculamos la puntuación final de todos para determinar el ranking exacto
      const misPtsFinales = puntosLigaUsuario + (misGoles > susGoles ? 3 : misGoles === susGoles ? 1 : 0);
      
      const tablaFinal = estadoLigaBots.map(bot => {
        const partido = jornadaPartidos.find(p => p.local === bot.nombre || p.visitante === bot.nombre);
        let ptsExtra = 0;
        if (partido) {
          const isLocal = partido.local === bot.nombre;
          const misGoles = isLocal ? partido.golesLocal : partido.golesVisitante;
          const susGoles = isLocal ? partido.golesVisitante : partido.golesLocal;
          if (misGoles > susGoles) ptsExtra = 3; else if (misGoles === susGoles) ptsExtra = 1;
        }
        return { nombre: bot.nombre, puntosLiga: bot.puntosLiga + ptsExtra };
      });

      const clasificacionCompleta = [
        ...tablaFinal,
        { nombre: 'FANTASÍA FC (TÚ)', puntosLiga: misPtsFinales }
      ].sort((a, b) => b.puntosLiga - a.puntosLiga);

      const miPosicion = clasificacionCompleta.findIndex(t => t.nombre === 'FANTASÍA FC (TÚ)') + 1;
      
      let finalMsg = `🏆 ¡FIN DE LA LIGA!\n\nHas terminado la temporada en la posición #${miPosicion} con ${misPtsFinales} puntos.`;
      if (miPosicion === 1) finalMsg += "\n\n¡INCREÍBLE! Eres el campeón de la liga. ¡Enhorabuena! 🥇✨";
      else if (miPosicion <= 3) finalMsg += "\n\n¡Gran trabajo! Has logrado entrar en el podio. 🥈🥉";
      else finalMsg += "\n\nHas completado la temporada. ¡Sigue mejorando para la próxima!";

      agregarNoticia(`FIN DE LIGA: Has quedado en la posición #${miPosicion} con ${misPtsFinales} puntos.`);
      // Retrasamos un poco el alert para que se vea después del resumen del partido
      setTimeout(() => alert(finalMsg), 1500);
    }

    if (misFichajes.length > 0 && Math.random() > 0.8) {
      const candidato = misFichajes[Math.floor(Math.random() * misFichajes.length)];
      const oferta = Math.round(Number(candidato.precio) * 1.2);
      setTimeout(() => {
        if (confirm(`OFERTA: El rival ofrece ${oferta.toLocaleString()} por ${candidato.nombre}. ¿Aceptas?`)) {
          venderJugador(candidato, oferta);
        }
      }, 500);
    }
  };

  const simularDia = () => {
    if (diasHastaPartido > 0) {
      setSimulandoDia(true);
      setTimeout(() => {
        setDiasHastaPartido(prev => prev - 1);

        // --- INICIO LÓGICA DE LESIONES ---
        const injuryChance = 0.005; // 0.5% chance per player per day
        const minInjuryDays = 3;
        const maxInjuryDays = 14;

        // Process user's players
        setMisFichajes(prevMisFichajes => prevMisFichajes.map(j => {
          if (j.is_injured) {
            const newDays = (j.dias_lesion || 0) - 1;
            if (newDays <= 0) {
              agregarNoticia(`RECUPERACIÓN: ${j.nombre} se ha recuperado de su lesión.`);
              return { ...j, is_injured: false, dias_lesion: 0 };
            }
            return { ...j, dias_lesion: newDays };
          } else if (Math.random() < injuryChance) {
            const injuryDuration = Math.floor(Math.random() * (maxInjuryDays - minInjuryDays + 1)) + minInjuryDays;
            agregarNoticia(`LESIONADO: ${j.nombre} se ha lesionado y estará de baja ${injuryDuration} días.`);
            return { ...j, is_injured: true, dias_lesion: injuryDuration, es_titular: false }; // Injured players cannot be titular
          }
          return j;
        }));

        // Process bot's players
        setEstadoLigaBots(prevEstadoLigaBots => prevEstadoLigaBots.map(bot => ({
          ...bot,
          plantilla: bot.plantilla.map(j => {
            if (j.is_injured) {
              const newDays = (j.dias_lesion || 0) - 1;
              if (newDays <= 0) {
                agregarNoticia(`RECUPERACIÓN: ${j.nombre} (${bot.nombre}) se ha recuperado de su lesión.`);
                return { ...j, is_injured: false, dias_lesion: 0 };
              }
              return { ...j, dias_lesion: newDays };
            } else if (Math.random() < injuryChance) {
              const injuryDuration = Math.floor(Math.random() * (maxInjuryDays - minInjuryDays + 1)) + minInjuryDays;
              agregarNoticia(`LESIONADO: ${j.nombre} (${bot.nombre}) se ha lesionado y estará de baja ${injuryDuration} días.`);
              return { ...j, is_injured: true, dias_lesion: injuryDuration, es_titular: false }; // Injured players cannot be titular
            }
            return j;
          })
        })));
        // --- FIN LÓGICA DE LESIONES ---
        // 20% de probabilidad diaria para transferibles, 1% para clausulazo
        procesarOfertasIA(0.2, 0.01);

        // Simular fichajes de la IA (Pool -> Bot o Bot -> Bot) para dar dinamismo
        if (Math.random() < 0.4) {
          const comprador = estadoLigaBots[Math.floor(Math.random() * estadoLigaBots.length)];
          
          // 60% probabilidad de fichar de libres, 40% de comprar a otro equipo IA
          if (Math.random() < 0.6) {
            const disponibles = jugadores.filter(j => 
              !misFichajes.some(f => f.id === j.id) && 
              !estadoLigaBots.some(b => b.plantilla.some(pj => pj.id === j.id)) &&
              !fichajesDeLaLiga.some(f => f.jugador_id === j.id)
            );
            if (disponibles.length > 0) {
              const fichado = disponibles[Math.floor(Math.random() * disponibles.length)];
              agregarNoticia(`MERCADO: El ${comprador.nombre} ha fichado a ${fichado.nombre} (${fichado.equipo_real}) por ${formatCurrency(fichado.precio)}.`);
              setEstadoLigaBots(prev => prev.map(b => {
                if (b.nombre === comprador.nombre) {
                  const nP = [...b.plantilla, fichado];
                  const s = obtenerStatsArea(nP);
                  return { ...b, plantilla: nP, ...s, fuerza: Math.round((s.ataque + s.medio + s.defensa) / 3) };
                }
                return b;
              }));
            }
          } else {
            // Traspaso entre equipos IA (IA -> IA)
            const vendedores = estadoLigaBots.filter(b => b.nombre !== comprador.nombre && b.plantilla.length > 12);
            if (vendedores.length > 0) {
              const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
              const fichado = vendedor.plantilla[Math.floor(Math.random() * vendedor.plantilla.length)];
              agregarNoticia(`MERCADO: ¡TRASPASO! El ${comprador.nombre} ha fichado a ${fichado.nombre} del ${vendedor.nombre} por ${formatCurrency(fichado.clausula)}.`);
              setEstadoLigaBots(prev => prev.map(b => {
                if (b.nombre === comprador.nombre) {
                  const nP = [...b.plantilla, fichado];
                  const s = obtenerStatsArea(nP);
                  return { ...b, plantilla: nP, ...s, fuerza: Math.round((s.ataque + s.medio + s.defensa) / 3) };
                }
                if (b.nombre === vendedor.nombre) {
                  const nP = b.plantilla.filter(p => p.id !== fichado.id);
                  const s = obtenerStatsArea(nP);
                  return { ...b, plantilla: nP, ...s, fuerza: Math.round((s.ataque + s.medio + s.defensa) / 3) };
                }
                return b;
              }));
            }
          }
        }

        setSimulandoDia(false);
      }, 600);
    }
  };

  const cargarDatos = useCallback(
    async (leagueId: string, leagueFromCaller?: League) => {
      if (!user?.id || !leagueId) {
        setCargando(false);
        return;
      }
      try {
        setCargando(true);

        const queries = [
          supabase.from('jugadores').select('*'),
          supabase
            .from('mis_plantillas')
            .select('jugador_id, user_id, es_titular')
            .eq('liga_id', leagueId),
        ];

        if (!leagueFromCaller) {
          // Intentamos obtener los datos de la liga para asegurar que el ID es válido
          queries.push(
            supabase
              .from('leagues')
              .select('id, name, invite_code')
              .eq('id', leagueId)
              .maybeSingle()
          );
        }

        const results = await Promise.all(queries);
        const resJugadores = results[0];
        const resPlantilla = results[1];
        const resLeague = leagueFromCaller ? null : results[2];

        const allJugadores = resJugadores.data || [];
        const plantillaData = resPlantilla.data || [];

        let leagueData: League | null =
          leagueFromCaller || (resLeague?.data as League | null) || null;

        // Si resLeague dio error o no devolvió nada, el ID es inválido
        if (!leagueData || leagueData.id === undefined || (resLeague && resLeague.error)) {
          console.error("Liga no encontrada o ID inválido:", leagueId);
          setCurrentLeagueId(null);
          setCurrentLeague(null);
          setMisFichajes([]);
          localStorage.removeItem('currentLeagueId');
          setShowLeagueSelectionModal(true);
          return; // Detenemos la carga de datos ya que la liga es inválida
        }

        setCurrentLeague(leagueData);

        // 1. Filtramos la lista maestra de la base de datos para que no haya duplicados por nombre
        const jugadoresUnicos = deduplicarPorNombre(allJugadores);

        const jugadoresConBase = jugadoresUnicos.map((j: Jugador) => {
          const precioBase = Number(j.precio) || 5000000;
          const mediaBase = Number(j.media) || 75;
          const stats: Stats = {
            ritmo: Number(j.ritmo) || mediaBase,
            tiro: Number(j.tiro) || mediaBase,
            pase: Number(j.pase) || mediaBase,
            defensa: Number(j.defensa) || mediaBase,
          };
          return {
            ...j,
            precio: precioBase,
            clausula: Math.round(precioBase * 1.5), // Inicialización base al 50% extra
            media: mediaBase,
            stats,
            is_injured: false, // Initialize as not injured
            dias_lesion: 0,    // Initialize injury days to 0
            goles: 0,          // Resetear contadores al inicio
            asistencias: 0,
            paradas: 0,
            puntos: 0,
            puntosUltimaJornada: 0
          };
        });

        let allSignings = resPlantilla.data || [];
        setFichajesDeLaLiga(allSignings);

        let misJugadoresYaFichados: Jugador[] = jugadoresConBase
          .map((j) => {
            const info = allSignings.find((p: any) => p.jugador_id === j.id && p.user_id === user.id);
            return info ? { ...j, es_titular: info.es_titular } : null;
          })
          .filter((j): j is Jugador => j !== null);

        const savedProgress = localStorage.getItem(`progress_${leagueId}`);

        // Draft inicial: Si el usuario no tiene jugadores y no hay progreso guardado, le asignamos 11 iniciales
        if (misJugadoresYaFichados.length === 0 && !savedProgress) {
          const idsOcupados = new Set(allSignings.map(s => s.jugador_id));
          // Buscamos jugadores libres con media <= 80
          let poolDraft = jugadoresConBase.filter(j => !idsOcupados.has(j.id) && j.media <= 80);
          
          const draft: Jugador[] = [];
          const slots: Record<string, number> = { POR: 1, DF: 4, MC: 4, DL: 2 };

          for (const [pos, cant] of Object.entries(slots)) {
            const disponibles = poolDraft.filter(j => j.posicion === pos);
            const elegidos = disponibles.sort(() => 0.5 - Math.random()).slice(0, cant);
            draft.push(...elegidos.map(j => ({ 
              ...j, 
              es_titular: true, 
              is_injured: false, 
              dias_lesion: 0,
              clausula: Math.round(j.precio * 1.5) // Forzamos el ratio en el draft
            })));
          }

          console.log("Draft generado:", draft.length, "jugadores");

          if (draft.length === 11) {
            const insertData = draft.map(j => ({ user_id: user.id, jugador_id: j.id, liga_id: leagueId, es_titular: true }));
            const { error: draftErr } = await supabase.from('mis_plantillas').insert(insertData);
            if (!draftErr) {
              misJugadoresYaFichados = draft;
              allSignings = [...allSignings, ...insertData];
              setFichajesDeLaLiga(allSignings);
              agregarNoticia("SISTEMA: ¡Draft completado! Se te han asignado 11 jugadores iniciales.");
            } else {
              console.error("Error en draft inicial:", draftErr);
            }
          } else {
            console.error("No se pudo completar el draft. Pool insuficiente.");
          }
        }

        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          setJornadaActual(progress.jornadaActual || 1);
          setPuntosLigaUsuario(progress.puntosLigaUsuario || 0);
          setEstadoLigaBots(progress.estadoLigaBots || []);
          setHistorialPartidos(progress.historialPartidos || []);
          setPresupuesto(progress.presupuesto ?? 150000000);
          setDiasHastaPartido(progress.diasHastaPartido ?? 7);
          setNoticias(progress.noticias || []);
          setJugadoresBloqueadosJornada(progress.jugadoresBloqueadosJornada || []);
          setUserKitHomeColor(progress.userKitHomeColor || '#2563eb');
          setUserKitAwayColor(progress.userKitAwayColor || '#ffffff');
          setEstadoLigaBots((progress.estadoLigaBots || []).map((bot: Rival) => ({ // Aseguramos que la táctica se carga para los bots
            ...bot, tactica: bot.tactica || 'Equilibrado' })));
          const mergeStats = (j: Jugador) => {
            const saved = [
              ...(progress.misFichajes || []), 
              ...(progress.estadoLigaBots?.flatMap((b: Rival) => b.plantilla) || []),
              ...(progress.jugadores || [])
            ].find((p: Jugador) => p.id === j.id);
            return saved ? { 
              ...j, 
              puntos: saved.puntos || 0, 
              puntosUltimaJornada: saved.puntosUltimaJornada || 0, 
              precio: Number(saved.precio ?? j.precio), 
              clausula: Math.round(Number(saved.precio ?? j.precio) * 1.5), // Forzamos ratio 1.5x al cargar
              stats: saved.stats ?? j.stats,
              media: saved.media ?? j.media, // Prioridad a la media guardada o la de Supabase
              enVenta: saved.enVenta ?? false,
              is_injured: saved.is_injured ?? false, // Load injury status
              dias_lesion: saved.dias_lesion ?? 0,   // Load injury days
              goles: saved.goles || 0,
              asistencias: saved.asistencias || 0,
              paradas: saved.paradas || 0
            } : { 
              ...j, 
              puntos: 0, 
              puntosUltimaJornada: 0, 
              enVenta: false, 
              media: j.media, // Usar la media definida en Supabase
              goles: 0,
              asistencias: 0,
              paradas: 0
            };
          };

          setJugadores(jugadoresConBase.map(mergeStats));
          setMisFichajes(misJugadoresYaFichados.map(mergeStats));
        } else {
          setJugadores(jugadoresConBase);
          setMisFichajes(misJugadoresYaFichados);
          generarPlantillasBots(jugadoresConBase, allSignings);
          setJornadaActual(1);
          setPuntosLigaUsuario(0); // Reiniciar puntos de liga
          setHistorialPartidos([]);
          setNoticias(["¡Bienvenidos a la nueva temporada de la Liga Fantasy!"]);
          const gastoTotal = misJugadoresYaFichados.reduce((acc: number, j: Jugador) => acc + (Number(j.precio) || 0), 0); 
          setPresupuesto(150000000 - gastoTotal);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setCargando(false);
      }
    },
    [user, generarPlantillasBots]
  );

  // 1. Escuchar cambios de autenticación (Solo se ejecuta una vez al montar)
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

  // 2. Intentar recuperar la liga del localStorage cuando el usuario se loguea
  useEffect(() => {
    if (user && !currentLeagueId && !showLeagueSelectionModal) {
      // Comprobamos si viene de un enlace de invitación (?join=XXXXXX)
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('join');

      if (codeFromUrl && codeFromUrl !== "undefined") {
        setJoinLeagueCode(codeFromUrl.toUpperCase());
        setShowLeagueSelectionModal(true);
        setCargando(false);
        // Limpiamos la URL para que no intente unirse de nuevo al recargar
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        const storedLeagueId = localStorage.getItem('currentLeagueId');
        if (storedLeagueId && storedLeagueId !== "undefined") {
          setCurrentLeagueId(storedLeagueId);
        } else {
          setShowLeagueSelectionModal(true);
          setCargando(false);
        }
      }
    }
  }, [user, currentLeagueId, showLeagueSelectionModal]);

  // 3. Cargar datos de la base de datos cuando tenemos usuario Y liga
  useEffect(() => {
    if (user && currentLeagueId) {
      cargarDatos(currentLeagueId);
    }
  }, [user, currentLeagueId, cargarDatos]);

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    alert(msg);
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?join=${code}`;
    copyToClipboard(url, '¡Enlace de invitación copiado al portapapeles!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentLeagueId(null);
    setCurrentLeague(null);
    localStorage.removeItem('currentLeagueId');
  };

  const handleCreateLeague = async () => {
    if (!user?.id || !newLeagueName.trim()) {
      alert('Por favor, introduce un nombre para la liga.');
      return;
    }
    setCargando(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('leagues')
        .insert([{ name: newLeagueName, owner_id: user.id, invite_code: inviteCode }])
        .select('id, name, invite_code')
        .single();

      if (error) throw error;

      const newLeague = data as League;
      setCurrentLeagueId(newLeague.id);
      setCurrentLeague(newLeague);
      localStorage.setItem('currentLeagueId', newLeague.id);
      setShowLeagueSelectionModal(false);
      await cargarDatos(newLeague.id, newLeague);
      alert('Liga "' + newLeague.name + '" creada con código de invitación: ' + newLeague.invite_code);
    } catch (error: any) {
      console.error('Error creating league:', error.message);
      alert('Error al crear la liga: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleJoinLeague = async () => {
    if (!user?.id || !joinLeagueCode.trim()) {
      alert('Por favor, introduce un código de invitación.');
      return;
    }
    setCargando(true);
    try {
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('id, name, invite_code')
        .eq('invite_code', joinLeagueCode.trim())
        .maybeSingle();

      if (leagueError) throw leagueError;
      if (!leagueData) throw new Error('Código de invitación inválido o liga no encontrada.');

      setCurrentLeagueId(leagueData.id);
      setCurrentLeague(leagueData as League);
      localStorage.setItem('currentLeagueId', leagueData.id);
      setShowLeagueSelectionModal(false);
      await cargarDatos(leagueData.id, leagueData as League);
      alert('Te has unido a la liga "' + leagueData.name + '".');
    } catch (error: any) {
      console.error('Error joining league:', error.message);
      alert('Error al unirse a la liga: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const ficharJugador = async (jugador: Jugador) => {
    if (!currentLeagueId || !user?.id || fichando) {
      alert('Por favor, selecciona o crea una liga antes de fichar jugadores.');
      return;
    }

    if (misFichajes.length >= 25) {
      alert('No puedes tener más de 25 jugadores en tu plantilla.');
      return;
    }

    if (jugadoresBloqueadosJornada.includes(jugador.id)) {
      alert('No puedes volver a fichar a este jugador en la misma jornada en la que ha salido de tu equipo o ha sido comprado.');
      return;
    }

    // Comprobación local previa para evitar peticiones innecesarias
    if (misFichajes.some(f => f.id === jugador.id)) {
      alert('Ya tienes a este jugador en tu equipo.');
      setJugadorSeleccionado(null);
      return;
    }

    // Comprobación de seguridad extra: Evitar duplicados por NOMBRE
    const yaHayUnoConEseNombre = misFichajes.some(f => f.nombre.toLowerCase() === jugador.nombre.toLowerCase());
    if (yaHayUnoConEseNombre) {
        alert(`¡Error! Ya tienes a ${jugador.nombre} en tu equipo.`);
        return;
    }

    // 1. Evitar duplicados con otros humanos localmente antes de ir a la DB
    const fichadoPorOtro = fichajesDeLaLiga.some(f => f.jugador_id === jugador.id && f.user_id !== user.id);
    if (fichadoPorOtro) {
      alert('Este jugador ya no está disponible, otro entrenador lo ha fichado.');
      setJugadorSeleccionado(null);
      cargarDatos(currentLeagueId); 
      return;
    }

    // Comprobamos si el jugador pertenece a un bot (se puede fichar pagando su cláusula)
    const botDueno = estadoLigaBots.find(b => b.plantilla.some(pj => pj.id === jugador.id));
    if (fichadoPorOtro) {
      alert('Este jugador ya no está disponible, otro entrenador lo ha fichado.');
      setJugadorSeleccionado(null);
      return;
    }

    const precioFinal = botDueno ? jugador.clausula : jugador.precio;

    if (presupuesto < precioFinal) {
      alert(`No tienes suficiente presupuesto. El coste total es ${precioFinal.toLocaleString()} EUR.`);
      return;
    }

    try {
      setFichando(true);
      console.log("Fichando:", jugador.nombre, "en Liga:", currentLeagueId);
      
      const { error } = await supabase
        .from('mis_plantillas')
        .insert([
          {
            user_id: user.id,
            jugador_id: jugador.id,
            es_titular: false,
            liga_id: currentLeagueId,
          },
        ]);

      if (error) {
        // Manejo del error de duplicado (Unique Constraint en SQL)
        if (error.code === '23505') {
          alert('¡Error! Otro entrenador acaba de fichar a ' + jugador.nombre + ' justo ahora.');
          setJugadorSeleccionado(null);
          cargarDatos(currentLeagueId); // Recargamos para actualizar el mercado
          return;
        }
        throw error;
      }

      setEstadoLigaBots((prev) =>
        prev.map((bot) => ({
          ...bot,
          plantilla: bot.plantilla.filter((pj) => pj.id !== jugador.id)
        }))
      );
      if (botDueno) {
        alert(`¡Has pagado la cláusula de ${jugador.nombre}! El ${botDueno.nombre} pierde a su jugador.`);
      }

      setMisFichajes((prev) => [...prev, { ...jugador, es_titular: false, puntos: 0 }]);
      setFichajesDeLaLiga((prev) => [...prev, { jugador_id: jugador.id, user_id: user.id }]);
      setPresupuesto((prev) => prev - precioFinal);
      setJugadoresBloqueadosJornada(prev => [...prev, jugador.id]);
      setJugadorSeleccionado(null);
    } catch (e: any) {
      console.error("Error completo Supabase:", e);
      alert("Error al fichar: " + e.message);
    } finally {
      setFichando(false);
    }
  };

  const reordenarTitular = (jugador: Jugador, direccion: 'izquierda' | 'derecha') => {
    const titularesPosicion = misFichajes.filter(j => j.es_titular && j.posicion === jugador.posicion);
    const indexEnFila = titularesPosicion.findIndex(j => j.id === jugador.id);

    let targetIndex = -1;
    if (direccion === 'izquierda' && indexEnFila > 0) {
      targetIndex = indexEnFila - 1;
    } else if (direccion === 'derecha' && indexEnFila < titularesPosicion.length - 1) {
      targetIndex = indexEnFila + 1;
    }

    if (targetIndex !== -1) {
      const vecino = titularesPosicion[targetIndex];
      const newMisFichajes = [...misFichajes];
      const idx1 = newMisFichajes.findIndex(j => j.id === jugador.id);
      const idx2 = newMisFichajes.findIndex(j => j.id === vecino.id);
      
      const temp = newMisFichajes[idx1];
      newMisFichajes[idx1] = newMisFichajes[idx2];
      newMisFichajes[idx2] = temp;

      setMisFichajes(newMisFichajes);
    }
  };

  const toggleTitular = async (jugador: Jugador) => {
    if (!currentLeagueId || !user?.id) return;
    const titularesPosicion = misFichajes.filter(
      (j) => j.es_titular && j.posicion === jugador.posicion
    ).length;
    const maxPermitido = CONFIG_FORMACIONES[formacion][jugador.posicion as Posicion];

    if (!jugador.es_titular && titularesPosicion >= maxPermitido) {
      alert(
        'Tu formación ' +
          formacion +
          ' solo permite ' +
          maxPermitido +
          ' jugadores en la posición ' +
          jugador.posicion +
          '. Quita a uno antes.'
      );
      return;
    }

    const { error } = await supabase
      .from('mis_plantillas')
      .update({ es_titular: !jugador.es_titular })
      .eq('user_id', user.id)
      .eq('jugador_id', jugador.id)
      .eq('liga_id', currentLeagueId);
    if (!error) {
      setMisFichajes((prev) =>
        prev.map((j) => (j.id === jugador.id ? { ...j, es_titular: !j.es_titular } : j))
      );
    }
  };

  const busquedaLower = busqueda.toLowerCase();

  const jugadoresFiltrados = jugadores.filter((j) => {
    const yaFichado = misFichajes.some((f) => f.id === j.id);
    const fichadoPorOtroHumano = fichajesDeLaLiga.some((f) => f.jugador_id === j.id && f.user_id !== user?.id);

    return (
      j.nombre.toLowerCase().includes(busquedaLower) &&
      (filtroPosicion === 'Todos' || j.posicion === (filtroPosicion as Posicion)) &&
      !yaFichado && !fichadoPorOtroHumano
    );
  });

  if (!user && !cargando) return <Auth />;

  if (showLeagueSelectionModal) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900"
        >
          <div className="bg-blue-900 p-8 text-white relative">
            <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              Selecciona tu Liga
            </h3>
            <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em] mt-2">
              Crea una nueva o únete a una existente
            </p>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Plus size={20} /> Crear Nueva Liga
              </h4>
              <input
                type="text"
                placeholder="Nombre de la Liga"
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none mb-3"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
              />
              <button
                onClick={handleCreateLeague}
                disabled={cargando}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Crear Liga
              </button>
            </div>
            <div className="border-t pt-6">
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2">
                <LogIn size={20} /> Unirse a Liga Existente
              </h4>
              <input
                type="text"
                placeholder="Código de Invitación"
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none mb-3 uppercase"
                value={joinLeagueCode}
                onChange={(e) => setJoinLeagueCode(e.target.value.toUpperCase())}
              />
              <button
                onClick={handleJoinLeague}
                disabled={cargando}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-black uppercase hover:bg-green-700 transition-all disabled:opacity-50"
              >
                Unirse a Liga
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cargando)
    return (
      <div className="flex h-screen items-center justify-center font-black text-blue-600 animate-pulse italic text-2xl">
        PREPARANDO VESTUARIOS...
      </div>
    );

  if (!user || !currentLeagueId) return null;

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      <AnimatePresence>
        {jugadorSeleccionado && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900"
            >
              <div className="bg-blue-900 p-8 text-white relative">
                <button
                  onClick={() => setJugadorSeleccionado(null)}
                  className="absolute top-4 right-4 text-2xl opacity-50 hover:opacity-100 transition-opacity"
                >
                  X
                </button>
                <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em] mb-2">
                  {jugadorSeleccionado.posicion} - {jugadorSeleccionado.equipo_real}
                </p>
                <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                  {jugadorSeleccionado.nombre}
                </h3>
                <div className="absolute top-8 right-8 bg-white text-blue-900 w-14 h-14 rounded-full flex flex-col items-center justify-center border-4 border-blue-900 shadow-xl">
                  <span className="text-2xl font-black leading-none">{jugadorSeleccionado.media}</span>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2 border border-gray-100">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-black uppercase">
                      RIT: {jugadorSeleccionado.stats?.ritmo}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2 border border-gray-100">
                    <Target size={14} className="text-red-500" />
                    <span className="text-[10px] font-black uppercase">
                      TIR: {jugadorSeleccionado.stats?.tiro}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2 border border-gray-100">
                    <Activity size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase">
                      PAS: {jugadorSeleccionado.stats?.pase}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl flex items-center gap-2 border border-gray-100">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[10px] font-black uppercase">
                      DEF: {jugadorSeleccionado.stats?.defensa}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Goles</p>
                    <p className="text-2xl font-black text-red-600">{jugadorSeleccionado.goles || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Asistencias</p>
                    <p className="text-2xl font-black text-yellow-600">{jugadorSeleccionado.asistencias || 0}</p>
                  </div>
                  {jugadorSeleccionado.posicion === 'POR' && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Paradas Totales</p>
                      <p className="text-2xl font-black text-indigo-500">{jugadorSeleccionado.paradas || 0}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Media Puntos</p>
                    <p className="text-2xl font-black text-blue-600">
                      {jornadaActual > 1 
                        ? ((jugadorSeleccionado.puntos || 0) / (jornadaActual - 1)).toFixed(1) 
                        : '0.0'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Puntos Totales</p>
                    <p className="text-2xl font-black text-green-600">{jugadorSeleccionado.puntos || 0}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex flex-col items-center gap-2 mb-4">
                    {(() => {
                      const botDueno = estadoLigaBots.find(b => b.plantilla.some((j) => j.id === jugadorSeleccionado.id));
                      const esMio = misFichajes.some(f => f.id === jugadorSeleccionado.id);
                      return (
                        <>
                          {botDueno && (
                            <p className="text-[10px] font-black text-red-500 uppercase italic">
                              Propiedad de: {botDueno.nombre}
                            </p>
                          )}
                          {jugadorSeleccionado.is_injured && (
                            <p className="text-[10px] font-black text-red-500 uppercase italic">LESIONADO: {jugadorSeleccionado.dias_lesion} DÍAS</p>
                          )}
                          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                            <TrendingUp size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">
                              Valor de Mercado: {Number(jugadorSeleccionado.precio).toLocaleString()} EUR
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-green-500" />
                            <p className="text-center font-black text-gray-800 text-xl uppercase leading-none">
                              {(botDueno || esMio)
                                ? 'CLAUSULA: ' + jugadorSeleccionado.clausula.toLocaleString() + ' EUR'
                                : 'PRECIO: ' + Number(jugadorSeleccionado.precio).toLocaleString() + ' EUR'}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {misFichajes.some(f => f.id === jugadorSeleccionado.id) && (
                    <>
                      <button
                        onClick={() => { toggleTitular(jugadorSeleccionado); setJugadorSeleccionado(null); }}
                        className={`w-full py-3 rounded-xl font-black uppercase border-2 transition-all flex items-center justify-center gap-2 mb-3 ${
                          jugadorSeleccionado.es_titular 
                          ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white' 
                          : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-600 hover:text-white shadow-lg shadow-green-100'
                        }`}
                      >
                        <RotateCcw size={16} />
                        {jugadorSeleccionado.es_titular ? 'Mover al Banquillo' : 'Mover al Once'}
                      </button>
                      <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setCapitanId(jugadorSeleccionado.id)}
                        className={`flex-1 py-3 rounded-xl font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${
                          capitanId === jugadorSeleccionado.id 
                          ? 'bg-yellow-400 border-yellow-500 text-blue-900 shadow-lg shadow-yellow-100' 
                          : 'bg-white border-gray-100 text-gray-400 hover:border-yellow-400 hover:text-yellow-600'
                        }`}
                      >
                        <Crown size={16} />
                        {capitanId === jugadorSeleccionado.id ? 'CAP' : 'CAPITÁN'}
                      </button>
                      <button
                        onClick={() => subirClausula(jugadorSeleccionado.id)}
                        className="flex-1 py-3 rounded-xl font-black uppercase border-2 bg-white border-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> CLÁUSULA
                      </button>
                    </div>
                    </>
                  )}
                  {misFichajes.some(f => f.id === jugadorSeleccionado.id) ? (
                  <button
                    onClick={() => toggleTransferible(jugadorSeleccionado.id)}
                    className={`w-full py-4 rounded-2xl font-black uppercase border-2 transition-all ${
                      jugadorSeleccionado.enVenta 
                      ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white' 
                      : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-100'
                    }`}
                  >
                    {jugadorSeleccionado.enVenta ? 'Retirar de la Lista de Venta' : 'Poner en Lista de Venta'}
                  </button>
                  ) : (
                    <button
                      onClick={() => ficharJugador(jugadorSeleccionado)}
                      disabled={cargando || fichando || jugadoresBloqueadosJornada.includes(jugadorSeleccionado.id) ||
                        (presupuesto < (
                          estadoLigaBots.find(b => 
                            b.plantilla.some(j => j.id === jugadorSeleccionado.id)
                          ) 
                          ? jugadorSeleccionado.clausula 
                          : jugadorSeleccionado.precio))
                      }
                      className="w-full py-4 rounded-2xl font-black uppercase shadow-lg transition-all disabled:opacity-30 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                    >
                      {fichando 
                        ? 'PROCESANDO...' 
                        : jugadoresBloqueadosJornada.includes(jugadorSeleccionado.id)
                          ? 'JUGADOR BLOQUEADO'
                          : estadoLigaBots.some(b => b.plantilla.some(pj => pj.id === jugadorSeleccionado.id))
                            ? 'Pagar Cláusula' 
                            : 'Fichar Estrella'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchSeleccionado && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl border-4 border-blue-900 flex flex-col max-h-[90vh]"
            >
              <div className="bg-blue-900 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black italic uppercase leading-none">Acta del Encuentro</h3>
                  <p className="text-[10px] text-blue-300 font-bold uppercase mt-1 tracking-widest">Estadísticas y Puntuaciones</p>
                </div>
                <button
                  onClick={() => setMatchSeleccionado(null)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-6 bg-gray-50 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 shrink-0 border-b-2 border-gray-100">
                <div className="text-right flex-1 flex items-center justify-end gap-4">
                  <span className="font-black uppercase text-xl text-blue-900">{matchSeleccionado.local}</span>
                  {matchSeleccionado.colorLocal && (
                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: matchSeleccionado.colorLocal }}></div>
                  )}
                </div>
                <div className="text-5xl font-black bg-gray-900 text-white px-8 py-3 rounded-3xl italic shadow-xl">
                  {matchSeleccionado.golesLocal} - {matchSeleccionado.golesVisitante}
                </div>
                <div className="text-left flex-1 flex items-center justify-start gap-4">
                  {matchSeleccionado.colorVisitante && (
                    <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: matchSeleccionado.colorVisitante }}></div>
                  )}
                  <span className="font-black uppercase text-xl text-indigo-900">{matchSeleccionado.visitante}</span>
                </div>
              </div>

              {/* Estadísticas de Posesión y Tiros */}
              <div className="p-6 bg-white border-b-2 border-gray-50">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                      <span>{matchSeleccionado.posesionLocal}%</span>
                      <span className="text-gray-300">Posesión</span>
                      <span>{matchSeleccionado.posesionVisitante}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${matchSeleccionado.posesionLocal}%` }}></div>
                      <div className="h-full bg-indigo-600 transition-all" style={{ width: `${matchSeleccionado.posesionVisitante}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 text-center items-center">
                    <div className="text-lg font-black text-blue-900">{matchSeleccionado.tirosLocal}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase leading-tight">Tiros Totales</div>
                    <div className="text-lg font-black text-indigo-900">{matchSeleccionado.tirosVisitante}</div>
                    
                    <div className="text-lg font-black text-blue-600">{matchSeleccionado.tirosPuertaLocal}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase leading-tight">A Puerta</div>
                    <div className="text-lg font-black text-indigo-600">{matchSeleccionado.tirosPuertaVisitante}</div>
                    
                    <div className="text-lg font-black text-blue-500">{matchSeleccionado.paradasLocal}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase leading-tight">Paradas Portero</div>
                    <div className="text-lg font-black text-indigo-500">{matchSeleccionado.paradasVisitante}</div>
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8 grid md:grid-cols-2 gap-10 custom-scrollbar bg-white">
                {[matchSeleccionado.local, matchSeleccionado.visitante].map((teamName, idx) => {
                  const isLocal = idx === 0;
                  const players = teamName === 'Fantasía FC' ? misFichajes.filter(j => j.es_titular) : estadoLigaBots.find(b => b.nombre === teamName)?.plantilla || [];
                  
                  return (
                    <div key={teamName} className="space-y-4">
                      <h4 className={`font-black uppercase text-xs tracking-tighter flex items-center gap-2 ${isLocal ? 'text-blue-600' : 'text-indigo-600'}`}>
                        <ShieldCheck size={14} /> {teamName}
                      </h4> {/* No se usan los colores de camiseta aquí, solo el nombre del equipo */}
                      <div className="space-y-2">
                        {players.map(p => {
                          const rating = matchSeleccionado.notas?.[p.id] || 0;
                          const matchGoals = matchSeleccionado.goleadoresIds?.filter(id => id === p.id).length || 0;
                          const matchAssists = matchSeleccionado.asistentesIds?.filter(id => id === p.id).length || 0;

                          let bonusGoles = 0;
                          if (matchGoals > 0) {
                            if (p.posicion === 'DL') bonusGoles = matchGoals * 4;
                            else if (p.posicion === 'MC') bonusGoles = matchGoals * 5;
                            else bonusGoles = matchGoals * 6;
                          }
                          const totalMatchPts = rating + bonusGoles;

                          return (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-blue-200 transition-all">
                              <div className="flex items-center gap-3">
                                <span className="font-black text-[10px] text-gray-400 w-6">{p.posicion}</span>
                                <span className="font-bold text-sm uppercase text-gray-700">{p.nombre} {matchGoals > 0 && Array(matchGoals).fill('⚽').join('')} {matchAssists > 0 && Array(matchAssists).fill('🎯').join('')}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[7px] font-black text-gray-400 uppercase leading-none">Rating</p>
                                  <p className="font-mono font-black text-sm">{rating}</p>
                                </div>
                                <div className="text-right bg-blue-600 text-white px-3 py-1 rounded-lg">
                                  <p className="text-[7px] font-black uppercase leading-none opacity-70">Puntos</p>
                                  <p className="font-mono font-black text-sm">{totalMatchPts}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {equipoRivalSeleccionado && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-indigo-900"
            >
              <div className="bg-indigo-900 p-8 text-white flex justify-between items-center">
                <div>
                  <p className="text-yellow-400 font-black text-xs uppercase tracking-widest">Informe de Scout</p>
                  <h3 className="text-3xl font-black italic uppercase">{equipoRivalSeleccionado.nombre}</h3>
                </div>
                <button
                  onClick={() => setEquipoRivalSeleccionado(null)}
                  className="text-2xl hover:rotate-90 transition-all"
                >
                  X
                </button>
              </div>
              <div className="p-8">
                <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                  <p className="font-black text-indigo-900 uppercase text-xs">Idea de Juego</p>
                  <p className="text-xl font-black text-indigo-600">{equipoRivalSeleccionado.tactica || 'Equilibrado'}</p>
                </div> {/* No se usan los colores de camiseta aquí */}
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase">ATK</p>
                    <p className="text-2xl font-black text-red-600">{equipoRivalSeleccionado.ataque}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
                    <p className="text-[10px] font-black text-green-400 uppercase">MED</p>
                    <p className="text-2xl font-black text-green-600">{equipoRivalSeleccionado.medio}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-center">
                    <p className="text-[10px] font-black text-blue-400 uppercase">DEF</p>
                    <p className="text-2xl font-black text-blue-600">{equipoRivalSeleccionado.defensa}</p>
                  </div>
                </div>

                <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Alineación Probable (11 Titulares)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {equipoRivalSeleccionado.plantilla?.map((j, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setEquipoRivalSeleccionado(null);
                        setJugadorSeleccionado(j);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-indigo-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-indigo-600 font-black text-xs w-6">{j.posicion}</span>
                        <span className="font-bold text-sm text-gray-700 uppercase">{j.nombre}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                  <p className="font-black text-indigo-900 uppercase text-xs">Fuerza Colectiva</p>
                  <p className="text-2xl font-black text-indigo-600">{equipoRivalSeleccionado.fuerza}%</p>
                </div> {/* No se usan los colores de camiseta aquí */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white p-8 rounded-[2rem] mb-6 shadow-2xl border-b-8 border-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black italic select-none">TFG</div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="text-left flex-1">
              <h1 className="text-5xl font-black italic tracking-tighter leading-none uppercase">Fantasy TFG</h1>
              {currentLeague && (
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em]">
                    Liga: {currentLeague.name}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg border border-white/10 group">
                      <span className="text-[10px] font-mono font-bold text-blue-100 uppercase">CÓDIGO: {currentLeague.invite_code}</span>
                      <button 
                        onClick={() => copyToClipboard(currentLeague.invite_code, '¡Código copiado!')}
                        className="opacity-50 hover:opacity-100 transition-opacity text-white"
                        title="Copiar Código"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <button 
                      onClick={() => copyInviteLink(currentLeague.invite_code)}
                      className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-lg text-[10px] font-black transition-all border border-yellow-500/30"
                    >
                      <Share2 size={12} /> INVITAR AMIGOS
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2">
                <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-3 border border-white/20">
                  <div className="text-left">
                    <div className="flex gap-4 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-blue-300 uppercase">Poder</span>
                        <span className="text-sm font-black">{poderActual}%</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="text-[8px] font-bold text-red-400">ATK: {statsUsuario.ataque}</span>
                        <span className="text-[8px] font-bold text-green-400">MED: {statsUsuario.medio}</span>
                        <span className="text-[8px] font-bold text-blue-400">DEF: {statsUsuario.defensa}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const numDia = 7 - i;
                        const completado = numDia > diasHastaPartido;
                        const actual = numDia === diasHastaPartido;
                        return (
                          <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black border transition-all ${
                              completado ? 'bg-green-500 border-green-600 text-white' : 
                              actual ? 'bg-yellow-400 border-yellow-600 text-blue-900 animate-pulse scale-110' : 
                              'bg-white/10 border-white/20 text-white/40'
                            }`}
                          >
                            {numDia}
                          </div>
                        );
                      })}
                      <div className={`ml-1 w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black border ${diasHastaPartido === 0 ? 'bg-red-500 border-red-700 text-white animate-bounce' : 'bg-white/10 border-white/20 text-white/40'}`}>
                        <Target size={8} />
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase text-blue-100">
                      {jornadaActual <= CALENDARIO.length
                        ? `Próximo: ${CALENDARIO[jornadaActual - 1].rival} ${CALENDARIO[jornadaActual - 1].esLocal ? '(CASA)' : '(FUERA)'}`
                        : 'FIN LIGA'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {diasHastaPartido > 0 ? (
                      <button
                        onClick={simularDia}
                        disabled={simulandoDia}
                        className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 disabled:opacity-50"
                      >
                        {simulandoDia ? 'Simulando...' : 'Avanzar Día'}
                      </button>
                    ) : (
                      <button
                        onClick={jugarJornada}
                        disabled={
                          jornadaActual > CALENDARIO.length ||
                          misFichajes.filter(j => j.es_titular).length !== 11 ||
                          presupuesto < 0
                        }
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-yellow-500/20"
                      >
                        JUGAR PARTIDO
                      </button>
                    )}
                    <button
                      onClick={reiniciarLiga}
                      title="Reiniciar Liga"
                      // Deshabilitar el botón de reiniciar si la liga ya ha terminado
                      // o si no se ha jugado ninguna jornada (para evitar reinicios accidentales al inicio)
                      disabled={
                        jornadaActual > CALENDARIO.length + 1 && historialPartidos.length === 0
                      }
                      className="bg-red-500 hover:bg-red-400 text-white p-2 rounded-lg transition-all active:rotate-180 duration-500"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-white/10"
            >
              CERRAR SESION
            </button>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-center min-w-[130px]">
              <p className="text-[10px] font-black text-yellow-400 uppercase mb-1 tracking-tighter">Puntos Liga</p>
              <p className="text-4xl font-mono font-black text-yellow-400 leading-none">{puntosLigaUsuario}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[180px]">
              <div className="flex justify-between items-end mb-2">
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-tighter">Presupuesto</p>
                <p className="text-xl font-mono font-black text-green-400 leading-none">
                  {presupuesto.toLocaleString()} EUR
                </p>
              </div>
              <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: (presupuesto / 100000000) * 100 + '%' }}
                  className="h-full bg-green-500"
                ></motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 w-full max-w-sm mx-auto lg:mx-0">
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Sección actual:</label>
        <div className="relative group">
          <select 
            value={tabActual} 
            onChange={(e) => setTabActual(e.target.value as any)}
            className="w-full p-4 rounded-2xl bg-white border-4 border-blue-100 font-black text-blue-900 shadow-xl outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer pr-12 text-sm uppercase italic"
          >
            <option value="equipo">🛡️ Mi Equipo (Once + Plantilla)</option>
            <option value="calendario">📅 Calendario Temporada</option>
            <option value="mercado">💸 Mercado de Fichajes</option>
            <option value="clasificacion">🏆 Clasificación Liga</option>
            <option value="historial">📜 Historial de Partidos</option>
            <option value="noticias">🗞️ Última Hora / Noticias</option>
            <option value="stats">📊 Estadísticas (Goles / Asistencias)</option>
          </select>
          <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-blue-600">
            <TrendingUp size={20} className="rotate-90" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tabActual === 'mercado' && (
          <motion.div 
            key="mercado"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto"
          >
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
                <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-600 rounded-full"></span> Mercado de Fichajes
                </h2>
                <input
                  type="text"
                  placeholder="Buscar estrella..."
                  className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none mb-4 font-bold transition-all"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Todos', 'POR', 'DF', 'MC', 'DL'].map(pos => (
                    <button
                      key={pos}
                      onClick={() => setFiltroPosicion(pos)}
                      className={'px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ' + (filtroPosicion === pos ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                  {jugadoresFiltrados.map(j => {
                    const yaFichado = misFichajes.some(f => f.id === j.id);
                    const fichadoPorOtro = fichajesDeLaLiga.some(f => f.jugador_id === j.id && f.user_id !== user.id);
                    const botDueno = estadoLigaBots.find(bot => bot.plantilla.some((bj) => bj.id === j.id));
                    
                    return (
                      <motion.div
                        layout
                        key={j.id}
                        onClick={() => setJugadorSeleccionado(j)}
                        className={'p-4 rounded-2xl flex justify-between items-center group cursor-pointer border-2 transition-all ' + (fichadoPorOtro ? 'opacity-60 bg-gray-200' : botDueno ? 'bg-red-50/30 border-red-50 hover:border-red-200' : 'bg-gray-50 border-transparent hover:bg-blue-50 hover:border-blue-100')}
                      >
                        <div>
                          <p className="font-black text-gray-800 group-hover:text-blue-600 uppercase text-sm flex items-center gap-2">
                            <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] italic">{j.media}</span>
                            {j.nombre} {fichadoPorOtro && '🔒'}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">{j.posicion} - {j.equipo_real}</p>
                          {botDueno && <p className="text-[8px] font-black text-red-400 uppercase mt-1">Dueño: {botDueno.nombre}</p>}
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[8px] font-black text-gray-400 uppercase mb-0.5">
                            Valor: {Number(j.precio).toLocaleString()}
                          </span>
                          <p className={'text-[10px] font-black leading-none ' + (yaFichado ? 'text-green-500' : fichadoPorOtro ? 'text-gray-500' : botDueno ? 'text-orange-500' : 'text-blue-500')}>
                            {yaFichado ? 'TUYO' : fichadoPorOtro ? 'NO DISPONIBLE' : botDueno ? 'CLAU: ' + j.clausula.toLocaleString() : Number(j.precio).toLocaleString() + ' EUR'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
          </motion.div>
        )}

        {tabActual === 'calendario' && (
          <motion.div
            key="calendario"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto"
          >
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-gray-800 italic">
                <Calendar className="text-blue-600" size={24} /> Calendario de la Temporada
              </h2>
              <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {CALENDARIO.map((j) => {
                  const partidoJugado = historialPartidos.find(h => h.jornada === j.jornada)?.partidos.find(p => p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC');
                  const esPasado = j.jornada < jornadaActual;
                  const esSiguiente = j.jornada === jornadaActual;

                  return (
                    <div 
                      key={j.jornada}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${esSiguiente ? 'border-blue-400 bg-blue-50 shadow-md scale-[1.01]' : 'border-gray-50 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`font-black italic text-sm w-10 ${esPasado ? 'text-gray-400' : 'text-blue-600'}`}>J{j.jornada}</span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 uppercase">{j.rival}</span>
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-400">
                              {j.esLocal ? '🏠 CASA' : '✈️ FUERA'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {partidoJugado ? (
                          <div className="bg-gray-900 text-white px-3 py-1 rounded-lg font-mono font-black text-sm shadow-sm">
                            {partidoJugado.local === 'Fantasía FC' ? partidoJugado.golesLocal : partidoJugado.golesVisitante} - {partidoJugado.local === 'Fantasía FC' ? partidoJugado.golesVisitante : partidoJugado.golesLocal}
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black uppercase italic ${esSiguiente ? 'text-blue-600 animate-pulse' : 'text-gray-300'}`}>
                            {esSiguiente ? 'Próximo Partido' : 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}

        {tabActual === 'equipo' && (
          <motion.div
            key="equipo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto space-y-8"
          >
              {/* Selector de Colores de Equipación */}
              <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Personalización</p>
                    <p className="text-slate-900 font-black text-xl">COLORES EQUIPACIÓN</p>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">1ª Equipación</label>
                    <input 
                      type="color" 
                      value={userKitHomeColor} 
                      onChange={(e) => setUserKitHomeColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 p-1 bg-white"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">2ª Equipación</label>
                    <input 
                      type="color" 
                      value={userKitAwayColor} 
                      onChange={(e) => setUserKitAwayColor(e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 p-1 bg-white"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Táctica Activa</p>
                    <p className="text-blue-900 font-black text-xl">FORMACIÓN {formacion}</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {Object.keys(CONFIG_FORMACIONES).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormacion(f as FormacionKey)}
                      className={'px-6 py-2.5 rounded-xl font-black text-xs transition-all ' + (formacion === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
                    <Zap size={24} />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Estilo de Juego</p>
                    <p className="text-indigo-900 font-black text-xl">TÁCTICA: {tactica.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {(['Ofensivo', 'Equilibrado', 'Defensivo'] as Tactic[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTactica(t)}
                      className={'px-6 py-2.5 rounded-xl font-black text-xs transition-all ' + (tactica === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              <section className="relative bg-emerald-800 rounded-[3rem] p-8 shadow-2xl border-[12px] border-emerald-900 overflow-hidden min-h-[600px] flex flex-col justify-between">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white rounded-full"></div>
                </div>
                <div className="relative z-10 flex-grow flex flex-col-reverse justify-around py-4">
                  {[{ pos: 'POR', color: 'bg-yellow-400' }, { pos: 'DF', color: 'bg-blue-500' }, { pos: 'MC', color: 'bg-green-400' }, { pos: 'DL', color: 'bg-red-500' }].map(row => {
                    const titularesFila = misFichajes.filter(j => j.es_titular && j.posicion === row.pos);
                    return (
                      <div key={row.pos} className="flex justify-around items-center min-h-[100px]">
                        {titularesFila.map((j, idx) => (
                          <motion.div
                            layout
                            key={j.id}
                            onClick={() => setJugadorSeleccionado(j)}
                            className="text-center group transition-transform hover:scale-110 cursor-pointer relative"
                          >
                            <div className={'w-14 h-14 ' + row.color + ' rounded-full mx-auto mb-1 border-4 border-white shadow-xl flex items-center justify-center text-xl font-black text-white relative'}>
                              <div className="flex flex-col items-center">
                                <span className="text-[7px] font-bold opacity-70 mb-[-3px] uppercase">{row.pos}</span>
                                <span>{j.media}</span>
                              </div>
                              {j.id === capitanId && (
                                <div className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 p-1 rounded-full border-2 border-white shadow-sm">
                                  <Crown size={10} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-center">
                              <p className="bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-t-md max-w-[100px] truncate uppercase">{j.nombre}</p>
                              <p className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-b-md w-full border-t border-black/10">{j.puntos || 0} PTS</p>
                              
                              {/* Botones para cambiar de lado */}
                              {titularesFila.length > 1 && (
                                <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {idx > 0 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); reordenarTitular(j, 'izquierda'); }}
                                      className="bg-white/90 text-gray-800 p-0.5 rounded-md hover:bg-white shadow-sm"
                                    >
                                      <ChevronLeft size={12} />
                                    </button>
                                  )}
                                  {idx < titularesFila.length - 1 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); reordenarTitular(j, 'derecha'); }}
                                      className="bg-white/90 text-gray-800 p-0.5 rounded-md hover:bg-white shadow-sm"
                                    >
                                      <ChevronRight size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                        {Array.from({ length: Math.max(0, CONFIG_FORMACIONES[formacion][row.pos as Posicion] - titularesFila.length) }).map((_, i) => (
                          <div key={'empty-' + row.pos + '-' + i} className="w-14 h-14 rounded-full border-2 border-white/20 border-dashed flex items-center justify-center text-white/20 text-xs font-black">
                            {row.pos}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h2 className="text-xl font-black uppercase mb-6 flex justify-between items-center text-gray-800">
                  <span>Gestión de Plantilla ({misFichajes.length}/25)</span>
                  <span className="text-[10px] font-black text-blue-600 uppercase">Estado: {estadoForma}</span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {misFichajes.map(j => (
                    <motion.div
                      layout
                      key={j.id}
                      className={'p-4 border-2 rounded-2xl flex justify-between items-center transition-all ' + (j.es_titular ? 'border-green-400 bg-green-50' : 'border-gray-50 bg-gray-50 hover:bg-gray-100')}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleTitular(j)}
                          className={'text-2xl transition-all active:scale-125 ' + (j.es_titular ? 'scale-110' : 'grayscale opacity-30')}
                        >
                          T
                        </button>
                        <div onClick={() => setJugadorSeleccionado(j)} className="cursor-pointer">
                          <p className="font-black text-xs text-gray-800 uppercase leading-none flex items-center gap-2">
                            <span className="bg-gray-200 text-gray-600 px-1 rounded-[4px] text-[9px]">{j.media}</span>
                            {j.is_injured && <Zap size={10} className="text-red-500" />}
                            {j.nombre}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">{j.posicion} - REND: {j.puntos || 0}</p>
                        </div>
                      </div>
                      {j.enVenta && (
                        <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-md text-[8px] font-black uppercase">
                          En Venta
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
          </motion.div>
        )}

        {tabActual === 'historial' && (
          <motion.div
            key="historial"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto"
          >
              <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-gray-800 italic">
                  <Calendar className="text-blue-600" size={24} /> Historial de Partidos
                </h2>
                <div className="space-y-3">
                  {historialPartidos.length > 0 ? (
                    historialPartidos.map((partido, i) => (
                      <div key={i} className="mb-8">
                        <h3 className="text-sm font-black text-blue-900 mb-4 bg-blue-50 w-fit px-4 py-1 rounded-full uppercase italic">
                          Jornada {partido.jornada}
                        </h3>
                <div className="grid gap-4">
                          {partido.partidos?.map((p, idx) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                      onClick={() => setMatchSeleccionado(p)}
                              key={idx}
                      className={`p-4 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95 ${p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}
                            >
                              {(p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC') && (
                                <div className="text-[7px] font-black text-blue-600 mb-2 tracking-widest text-center border-b border-blue-100 pb-1">
                                  {p.local === 'Fantasía FC' ? '🏟️ LOCAL (CASA)' : '✈️ VISITANTE (FUERA)'}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex-1 flex items-center justify-end gap-2 pr-4 text-right">
                                  <span className="font-black text-[10px] md:text-xs uppercase">{p.local}</span>
                                  {p.colorLocal && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shadow-xs shrink-0" style={{ backgroundColor: p.colorLocal }}></div>}
                                </div>
                                <div className="bg-gray-900 text-white px-4 py-1 rounded-lg font-mono font-black text-lg min-w-[80px] text-center">
                                  {p.golesLocal} - {p.golesVisitante}
                                </div>
                                <div className="flex-1 flex items-center justify-start gap-2 pl-4 text-left">
                                  {p.colorVisitante && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shadow-xs shrink-0" style={{ backgroundColor: p.colorVisitante }}></div>}
                                  <span className="font-black text-[10px] md:text-xs uppercase">{p.visitante}</span>
                                </div>
                              </div>
                              {p.eventos?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between gap-4">
                                  {/* Goles Local (Izquierda) */}
                                  <div className="flex-1 space-y-1 text-right pr-4 border-r border-gray-50">
                                    {p.eventos.filter(ev => ev.includes(`(${p.local})`)).map((ev, evIdx) => (
                                      <div key={evIdx} className="flex flex-col items-end">
                                        <p className="text-[9px] text-gray-500 italic leading-none">
                                          {ev.split(' (')[0]}
                                        </p>
                                        {(() => {
                                          const match = ev.match(/GOL de (.*?) \(/);
                                          const nombre = match ? match[1] : '';
                                          const jugador = jugadores.find(j => j.nombre === nombre) || misFichajes.find(j => j.nombre === nombre);
                                          const nota = (jugador && p.notas) ? p.notas[jugador.id] : 0;
                                          return nota > 0 ? <span className="text-[7px] font-black text-blue-400 uppercase">Nota: {nota}</span> : null;
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Goles Visitante (Derecha) */}
                                  <div className="flex-1 space-y-1 text-left pl-4">
                                    {p.eventos.filter(ev => ev.includes(`(${p.visitante})`)).map((ev, evIdx) => (
                                      <div key={evIdx} className="flex flex-col items-start">
                                        <p className="text-[9px] text-gray-500 italic leading-none">
                                          {ev.split(' (')[0]}
                                        </p>
                                        {(() => {
                                          const match = ev.match(/GOL de (.*?) \(/);
                                          const nombre = match ? match[1] : '';
                                          const jugador = jugadores.find(j => j.nombre === nombre) || misFichajes.find(j => j.nombre === nombre);
                                          const nota = (jugador && p.notas) ? p.notas[jugador.id] : 0;
                                          return nota > 0 ? <span className="text-[7px] font-black text-blue-400 uppercase">Nota: {nota}</span> : null;
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 font-bold italic py-4">No se han jugado partidos todavía.</p>
                  )}
                </div>
              </section>
          </motion.div>
        )}

        {tabActual === 'noticias' && (
          <motion.div
            key="noticias"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-2xl mx-auto"
          >
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 min-h-[500px]">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 text-blue-900 italic">
                <Newspaper className="text-blue-600" size={28} /> Última Hora del Mercado
              </h2>
              <div className="space-y-4">
                {noticias.length > 0 ? noticias.map((nota, i) => (
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="p-4 bg-gray-50 rounded-2xl border-l-4 border-blue-600 font-bold text-sm text-gray-700"
                  >
                    {nota}
                  </motion.div>
                )) : (
                  <p className="text-center text-gray-400 font-bold italic py-10 text-lg">No hay noticias recientes en el mercado.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {tabActual === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8"
          >
            {/* Pichichi */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 text-blue-900 italic">
                <Award className="text-yellow-500" size={28} /> Máximos Goleadores
              </h2>
              <div className="space-y-3">
                {[...jugadores]
                  .sort((a, b) => (b.goles || 0) - (a.goles || 0) || b.media - a.media)
                  .slice(0, 10)
                  .map((j, i) => (
                    <div key={j.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-blue-50 transition-all cursor-pointer" onClick={() => setJugadorSeleccionado(j)}>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-gray-300 italic w-6">#{i+1}</span>
                        <div>
                          <p className="font-black text-sm uppercase text-gray-800">{j.nombre}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{j.posicion} - {j.equipo_real}</p>
                        </div>
                      </div>
                      <div className="bg-blue-600 text-white px-4 py-1 rounded-xl font-black text-lg shadow-lg shadow-blue-100">
                        {j.goles || 0} <span className="text-[10px] opacity-70">GOL</span>
                      </div>
                    </div>
                  ))}
                {jugadores.length === 0 && (
                  <p className="text-center text-gray-400 font-bold italic py-10">Cargando datos de goleadores...</p>
                )}
              </div>
            </section>

            {/* Asistentes */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 text-indigo-900 italic">
                <TrendingUp className="text-blue-500" size={28} /> Máximos Asistentes
              </h2>
              <div className="space-y-3">
                {[...jugadores]
                  .sort((a, b) => (b.asistencias || 0) - (a.asistencias || 0) || b.media - a.media)
                  .slice(0, 10)
                  .map((j, i) => (
                    <div key={j.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-indigo-50 transition-all cursor-pointer" onClick={() => setJugadorSeleccionado(j)}>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-gray-300 italic w-6">#{i+1}</span>
                        <div>
                          <p className="font-black text-sm uppercase text-gray-800">{j.nombre}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{j.posicion} - {j.equipo_real}</p>
                        </div>
                      </div>
                      <div className="bg-indigo-600 text-white px-4 py-1 rounded-xl font-black text-lg shadow-lg shadow-indigo-100">
                        {j.asistencias || 0} <span className="text-[10px] opacity-70">ASIST</span>
                      </div>
                    </div>
                  ))}
                {jugadores.length === 0 && (
                  <p className="text-center text-gray-400 font-bold italic py-10">Cargando datos de asistentes...</p>
                )}
              </div>
            </section>

            {/* Zamora / Paradas */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 text-blue-900 italic">
                <ShieldCheck className="text-blue-500" size={28} /> Mejores Porteros
              </h2>
              <div className="space-y-3">
                {[...jugadores]
                  .filter(j => j.posicion === 'POR')
                  .sort((a, b) => (b.paradas || 0) - (a.paradas || 0) || b.media - a.media)
                  .slice(0, 10)
                  .map((j, i) => (
                    <div key={j.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-blue-50 transition-all cursor-pointer" onClick={() => setJugadorSeleccionado(j)}>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-gray-300 italic w-6">#{i+1}</span>
                        <div>
                          <p className="font-black text-sm uppercase text-gray-800">{j.nombre}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{j.equipo_real}</p>
                        </div>
                      </div>
                      <div className="bg-blue-500 text-white px-4 py-1 rounded-xl font-black text-lg shadow-lg shadow-blue-100">
                        {j.paradas || 0} <span className="text-[10px] opacity-70">PAR</span>
                      </div>
                    </div>
                  ))}
                {jugadores.filter(j => j.posicion === 'POR').length === 0 && (
                  <p className="text-center text-gray-400 font-bold italic py-10">No hay porteros disponibles todavía.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {tabActual === 'clasificacion' && (
          <motion.section 
            key="clasificacion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm max-w-3xl mx-auto border border-gray-100"
          >
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-blue-900 leading-none">Clasificación de la Liga</h2>
            </div>
            <div className="space-y-4">
              {[
                ...estadoLigaBots.map(b => ({ ...b, esUser: false })), 
                { nombre: 'FANTASÍA FC (TÚ)', puntosLiga: puntosLigaUsuario, esUser: true, fuerza: poderActual, kit_home_color: userKitHomeColor, kit_away_color: userKitAwayColor }
              ]
                .sort((a, b) => b.puntosLiga - a.puntosLiga)
                .map((eq, i) => (
                  <motion.div
                    layout
                    key={i}
                    onClick={() => !eq.esUser && setEquipoRivalSeleccionado(eq as Rival)}
                    className={'flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer ' + (eq.esUser ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl scale-105 relative z-10' : `bg-gray-50 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30`)}
                  >
                    <div className="flex items-center gap-6">
                      <span className={'text-3xl font-black italic ' + (eq.esUser ? 'text-white' : 'text-gray-300')}>#{i + 1}</span>
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: (eq as any).kit_home_color }}></div>
                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: (eq as any).kit_away_color }}></div>
                      </div>
                      <div>
                        <p className={'font-black uppercase tracking-tight ' + (eq.esUser ? 'text-xl' : 'text-sm text-gray-700')}>{eq.nombre}</p>
                        
                        {!eq.esUser && <p className="text-[9px] font-bold opacity-50 uppercase italic">Fuerza actual: {eq.fuerza}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={'font-black leading-none ' + (eq.esUser ? 'text-4xl' : 'text-2xl text-gray-400')}>{eq.puntosLiga}</p>
                      <p className="text-[10px] font-bold opacity-70 uppercase">Puntos Liga</p>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

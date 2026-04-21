'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Auth from '@/Components/Auth';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [presupuesto, setPresupuesto] = useState(100000000);
  const [misFichajes, setMisFichajes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const [tabActual, setTabActual] = useState<'equipo' | 'ranking'>('equipo');
  const [busqueda, setBusqueda] = useState('');
  const [filtroPosicion, setFiltroPosicion] = useState('Todos');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<any>(null);

  const puntosTotales = misFichajes
    .filter(j => j.es_titular)
    .reduce((acc, j) => acc + (j.puntos || 0), 0);

  // LÓGICA DE "ESTADO DE FORMA" (Añadido sutil)
  const estadoForma = puntosTotales > 50 ? 'Excelente' : puntosTotales > 20 ? 'Bueno' : 'En construcción';

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (!session) setCargando(false);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setCargando(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (user?.id) cargarDatos(); }, [user]);

  const cargarDatos = async () => {
    if (!user?.id) return;
    try {
      setCargando(true);
      const [resJugadores, resPlantilla] = await Promise.all([
        supabase.from('jugadores').select('*'),
        supabase.from('mis_plantillas').select('jugador_id, es_titular').eq('user_id', user.id)
      ]);
      const allJugadores = resJugadores.data || [];
      const plantillaData = resPlantilla.data || [];
      
      const jugadoresConPuntos = allJugadores.map(j => ({
        ...j,
        puntos: Math.floor(Math.random() * 15),
        media: (Math.random() * (9 - 5) + 5).toFixed(1)
      }));

      const misJugadoresYaFichados = jugadoresConPuntos.map(j => {
        const info = plantillaData.find(p => p.jugador_id === j.id);
        return info ? { ...j, es_titular: info.es_titular } : null;
      }).filter(Boolean);

      setJugadores(jugadoresConPuntos);
      setMisFichajes(misJugadoresYaFichados);
      const gastoTotal = misJugadoresYaFichados.reduce((acc, j: any) => acc + (Number(j.precio) || 0), 0);
      setPresupuesto(100000000 - gastoTotal);
    } catch (error) { console.error(error); } finally { setCargando(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const ficharJugador = async (jugador: any) => {
    if (misFichajes.length >= 25 || presupuesto < Number(jugador.precio)) return;
    try {
      await supabase.from('mis_plantillas').insert([{ user_id: user.id, jugador_id: jugador.id, es_titular: false }]);
      setMisFichajes(prev => [...prev, { ...jugador, es_titular: false }]);
      setPresupuesto(prev => prev - Number(jugador.precio));
      setJugadorSeleccionado(null);
    } catch (e) { console.error(e); }
  };

  const toggleTitular = async (jugador: any) => {
    const titulares = misFichajes.filter(j => j.es_titular).length;
    if (!jugador.es_titular && titulares >= 11) { alert("Máximo 11 titulares"); return; }
    await supabase.from('mis_plantillas').update({ es_titular: !jugador.es_titular }).eq('user_id', user.id).eq('jugador_id', jugador.id);
    setMisFichajes(prev => prev.map(j => j.id === jugador.id ? { ...j, es_titular: !j.es_titular } : j));
  };

  const venderJugador = async (jugador: any) => {
    if (!confirm("¿Vender?")) return;
    await supabase.from('mis_plantillas').delete().eq('user_id', user.id).eq('jugador_id', jugador.id);
    setMisFichajes(prev => prev.filter(j => j.id !== jugador.id));
    setPresupuesto(prev => prev + Number(jugador.precio));
    setJugadorSeleccionado(null);
  };

  const jugadoresFiltrados = jugadores.filter(j => 
    j.nombre.toLowerCase().includes(busqueda.toLowerCase()) && 
    (filtroPosicion === 'Todos' || j.posicion === filtroPosicion)
  );

  if (!user && !cargando) return <Auth />;
  if (cargando) return <div className="flex h-screen items-center justify-center font-black text-blue-600 animate-pulse italic">PREPARANDO VESTUARIOS...</div>;

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      
      {/* MODAL DETALLES */}
      {jugadorSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900">
            <div className="bg-blue-900 p-8 text-white relative">
              <button onClick={() => setJugadorSeleccionado(null)} className="absolute top-4 right-4 text-2xl opacity-50 hover:opacity-100 transition-opacity">✕</button>
              <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em] mb-2">{jugadorSeleccionado.posicion} • {jugadorSeleccionado.equipo_real}</p>
              <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{jugadorSeleccionado.nombre}</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Rendimiento</p>
                  <p className="text-2xl font-black text-blue-600">{jugadorSeleccionado.puntos} PTS</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Valoración</p>
                  <p className="text-2xl font-black text-green-600">{jugadorSeleccionado.media} ⭐</p>
                </div>
              </div>
              <div className="border-t pt-6">
                <p className="text-center font-black text-gray-800 text-xl mb-4">{Number(jugadorSeleccionado.precio).toLocaleString()} €</p>
                {misFichajes.some(f => f.id === jugadorSeleccionado.id) ? (
                  <button onClick={() => venderJugador(jugadorSeleccionado)} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all">Vender Jugador</button>
                ) : (
                  <button onClick={() => ficharJugador(jugadorSeleccionado)} disabled={presupuesto < jugadorSeleccionado.precio} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-30 disabled:shadow-none">Fichar Estrella</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DINÁMICO */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white p-8 rounded-[2rem] mb-6 shadow-2xl border-b-8 border-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black italic select-none">TFG</div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter leading-none uppercase">Fantasy TFG</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-green-500 w-2 h-2 rounded-full animate-ping"></span>
                <p className="text-blue-300 font-bold text-xs uppercase tracking-widest">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-white/10">CERRAR SESIÓN</button>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-center min-w-[130px]">
              <p className="text-[10px] font-black text-yellow-400 uppercase mb-1 tracking-tighter">Puntos Totales</p>
              <p className="text-4xl font-mono font-black text-yellow-400 leading-none">{puntosTotales}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[180px]">
              <p className="text-[10px] font-black text-blue-200 uppercase mb-1 tracking-tighter">Presupuesto</p>
              <p className="text-3xl font-mono font-black text-green-400 leading-none">{presupuesto.toLocaleString()} €</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 bg-gray-200 p-1.5 rounded-2xl w-fit mx-auto lg:mx-0">
        <button onClick={() => setTabActual('equipo')} className={`px-8 py-2.5 rounded-xl font-black text-xs transition-all ${tabActual === 'equipo' ? 'bg-white shadow-lg text-blue-900 scale-105' : 'text-gray-500 hover:text-gray-700'}`}>MI EQUIPO</button>
        <button onClick={() => setTabActual('ranking')} className={`px-8 py-2.5 rounded-xl font-black text-xs transition-all ${tabActual === 'ranking' ? 'bg-white shadow-lg text-blue-900 scale-105' : 'text-gray-500 hover:text-gray-700'}`}>RANKING</button>
      </div>

      {tabActual === 'equipo' ? (
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* MERCADO */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
              <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full"></span> Mercado de Fichajes
              </h2>
              <input type="text" placeholder="Buscar estrella..." className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none mb-4 font-bold transition-all" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <div className="flex flex-wrap gap-2 mb-6">
                {['Todos', 'POR', 'DF', 'MC', 'DL'].map(pos => (
                  <button key={pos} onClick={() => setFiltroPosicion(pos)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filtroPosicion === pos ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{pos}</button>
                ))}
              </div>
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                {jugadoresFiltrados.map(j => {
                  const yaFichado = misFichajes.some(f => f.id === j.id);
                  return (
                    <div key={j.id} onClick={() => setJugadorSeleccionado(j)} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-100">
                      <div>
                        <p className="font-black text-gray-800 group-hover:text-blue-600 uppercase text-sm">{j.nombre}</p>
                        <p className="text-[10px] font-bold text-gray-400">{j.posicion} • {j.equipo_real}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-blue-500">{yaFichado ? 'FICHADO' : `${Number(j.precio).toLocaleString()} €`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* CAMPO Y PLANTILLA */}
          <div className="lg:col-span-8 space-y-8">
            <section className="relative bg-emerald-800 rounded-[3rem] p-8 shadow-2xl border-[12px] border-emerald-900 overflow-hidden min-h-[600px] flex flex-col justify-between">
              {/* Líneas Campo */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-24 border-2 border-white rounded-b-3xl"></div>
                <div className="absolute inset-0 border-2 border-white m-4 rounded-[2rem]"></div>
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white rounded-full"></div>
              </div>

              <div className="relative z-10 flex-grow flex flex-col justify-around py-4">
                {[ 
                  { pos: 'POR', icon: '🧤', color: 'bg-yellow-400' },
                  { pos: 'DF', icon: '🛡️', color: 'bg-blue-500' },
                  { pos: 'MC', icon: '🎯', color: 'bg-green-400' },
                  { pos: 'DL', icon: '🔥', color: 'bg-red-500' }
                ].map(row => (
                  <div key={row.pos} className="flex justify-around items-center">
                    {misFichajes.filter(j => j.es_titular && j.posicion === row.pos).map(j => (
                      <div key={j.id} onClick={() => setJugadorSeleccionado(j)} className="text-center group transition-transform hover:scale-110 cursor-pointer relative">
                        {j.puntos >= 10 && <span className="absolute -top-2 -right-2 bg-yellow-400 text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce shadow-lg">HOT</span>}
                        <div className={`w-14 h-14 ${row.color} rounded-full mx-auto mb-1 border-4 border-white shadow-xl flex items-center justify-center text-xl`}>
                          {row.icon}
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-t-md backdrop-blur-sm min-w-[80px] truncate uppercase">{j.nombre}</p>
                          <p className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-b-md w-full border-t border-black/10">{j.puntos} PTS</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="relative z-10 text-center pt-4">
                 <span className="bg-white/20 text-white px-6 py-2 rounded-full font-black text-xs backdrop-blur-md border border-white/20 uppercase tracking-widest">Titulares: {misFichajes.filter(f => f.es_titular).length} / 11</span>
              </div>
            </section>

            {/* LISTADO GESTIÓN */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h2 className="text-xl font-black uppercase mb-6 flex justify-between items-center text-gray-800">
                <span>Gestión de Plantilla</span>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-gray-400 uppercase">Estado:</span>
                   <span className="text-[10px] font-black text-blue-600 uppercase">{estadoForma}</span>
                </div>
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {misFichajes.map(j => (
                  <div key={j.id} className={`p-4 border-2 rounded-2xl flex justify-between items-center transition-all ${j.es_titular ? 'border-green-400 bg-green-50' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleTitular(j)} className={`text-2xl transition-all active:scale-125 ${j.es_titular ? 'scale-110' : 'grayscale opacity-30 hover:opacity-100'}`} title="Cambiar titularidad">👕</button>
                      <div onClick={() => setJugadorSeleccionado(j)} className="cursor-pointer">
                        <p className="font-black text-xs text-gray-800 uppercase leading-none">{j.nombre}</p>
                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">{j.posicion} • {j.puntos} PUNTOS</p>
                      </div>
                    </div>
                    <button onClick={() => venderJugador(j)} className="text-[10px] text-red-300 hover:text-red-500 font-black uppercase transition-colors">Vender</button>
                  </div>
                ))}
                {misFichajes.length === 0 && <p className="col-span-2 text-center py-10 text-gray-400 font-bold italic">Tu plantilla está vacía. ¡Ve al mercado!</p>}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* VISTA RANKING */
        <section className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm max-w-3xl mx-auto border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-blue-900 leading-none">Clasificación Global</h2>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">Temporada Regular TFG</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2rem] shadow-xl border-4 border-blue-200 transform scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20 text-4xl">🏆</div>
              <div className="flex items-center gap-6 relative z-10">
                <span className="text-3xl font-black italic">#1</span>
                <div>
                  <p className="font-black text-xl uppercase tracking-tight">TÚ (Entrenador)</p>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Líder de la jornada</p>
                </div>
              </div>
              <div className="text-right relative z-10">
                <p className="text-4xl font-black leading-none">{puntosTotales}</p>
                <p className="text-[10px] font-bold opacity-70 uppercase">Puntos</p>
              </div>
            </div>

            {[{pos:'#2', n:'Bot_Zidane', p:48},{pos:'#3', n:'User_Beta_Test', p:35},{pos:'#4', n:'Deportivo_Supabase', p:18}].map((rival, i)=>(
              <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-6">
                  <span className="text-xl font-black text-gray-300 italic">{rival.pos}</span>
                  <p className="font-bold text-gray-700 uppercase text-xs tracking-wider">{rival.n}</p>
                </div>
                <p className="text-xl font-black text-gray-400">{rival.p} <span className="text-[10px] opacity-50">PTS</span></p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
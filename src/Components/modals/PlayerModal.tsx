'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, Activity, ShieldCheck, TrendingUp, RotateCcw, Crown, Plus } from 'lucide-react';
import { Jugador, Rival } from '@/app/fantasy';

interface Props {
  jugador: Jugador;
  onClose: () => void;
  misFichajes: Jugador[];
  estadoLigaBots: Rival[];
  capitanId: string | null;
  setCapitanId: (id: string | null) => void;
  jornadaActual: number;
  presupuesto: number;
  cargando: boolean;
  fichando: boolean;
  jugadoresBloqueadosJornada: string[];
  onToggleTitular: (j: Jugador) => void;
  onSubirClausula: (id: string) => void;
  onToggleTransferible: (id: string) => void;
  onFichar: (j: Jugador) => void;
}

export default function PlayerModal({
  jugador, onClose, misFichajes, estadoLigaBots,
  capitanId, setCapitanId, jornadaActual, presupuesto,
  cargando, fichando, jugadoresBloqueadosJornada,
  onToggleTitular, onSubirClausula, onToggleTransferible, onFichar,
}: Props) {
  const esMio = misFichajes.some(f => f.id === jugador.id);
  const botDueno = estadoLigaBots.find(b => b.plantilla.some(j => j.id === jugador.id));
  const precioFinal = botDueno ? jugador.clausula : jugador.precio;
  const bloqueado = jugadoresBloqueadosJornada.includes(jugador.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
          className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900"
        >
          <div className="bg-blue-900 p-8 text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-2xl opacity-50 hover:opacity-100 transition-opacity">X</button>
            <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em] mb-2">{jugador.posicion} - {jugador.equipo_real}</p>
            <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{jugador.nombre}</h3>
            <div className="absolute top-8 right-8 bg-white text-blue-900 w-14 h-14 rounded-full flex flex-col items-center justify-center border-4 border-blue-900 shadow-xl">
              <span className="text-2xl font-black leading-none">{jugador.media}</span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <Zap size={14} className="text-yellow-500" />, label: 'RIT', val: jugador.stats?.ritmo },
                { icon: <Target size={14} className="text-red-500" />, label: 'TIR', val: jugador.stats?.tiro },
                { icon: <Activity size={14} className="text-blue-500" />, label: 'PAS', val: jugador.stats?.pase },
                { icon: <ShieldCheck size={14} className="text-green-500" />, label: 'DEF', val: jugador.stats?.defensa },
              ].map(({ icon, label, val }) => (
                <div key={label} className="bg-gray-50 p-2 rounded-xl flex items-center gap-2 border border-gray-100">
                  {icon}<span className="text-[10px] font-black uppercase">{label}: {val}</span>
                </div>
              ))}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Goles</p>
                <p className="text-2xl font-black text-red-600">{jugador.goles || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Asistencias</p>
                <p className="text-2xl font-black text-yellow-600">{jugador.asistencias || 0}</p>
              </div>
              {jugador.posicion === 'POR' && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Paradas Totales</p>
                  <p className="text-2xl font-black text-indigo-500">{jugador.paradas || 0}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Media Puntos</p>
                <p className="text-2xl font-black text-blue-600">
                  {jornadaActual > 1 ? ((jugador.puntos || 0) / (jornadaActual - 1)).toFixed(1) : '0.0'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Puntos Totales</p>
                <p className="text-2xl font-black text-green-600">{jugador.puntos || 0}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col items-center gap-2 mb-4">
                {botDueno && <p className="text-[10px] font-black text-red-500 uppercase italic">Propiedad de: {botDueno.nombre}</p>}
                {jugador.is_injured && <p className="text-[10px] font-black text-red-500 uppercase italic">LESIONADO: {jugador.dias_lesion} DÍAS</p>}
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <TrendingUp size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Valor: {Number(jugador.precio).toLocaleString()} EUR</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-green-500" />
                  <p className="text-center font-black text-gray-800 text-xl uppercase leading-none">
                    {(botDueno || esMio) ? 'CLAUSULA: ' + jugador.clausula.toLocaleString() + ' EUR' : 'PRECIO: ' + Number(jugador.precio).toLocaleString() + ' EUR'}
                  </p>
                </div>
              </div>

              {esMio && (
                <>
                  <button onClick={() => { onToggleTitular(jugador); onClose(); }}
                    className={`w-full py-3 rounded-xl font-black uppercase border-2 transition-all flex items-center justify-center gap-2 mb-3 ${jugador.es_titular ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-600 hover:text-white shadow-lg shadow-green-100'}`}>
                    <RotateCcw size={16} />{jugador.es_titular ? 'Mover al Banquillo' : 'Mover al Once'}
                  </button>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setCapitanId(jugador.id)}
                      className={`flex-1 py-3 rounded-xl font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${capitanId === jugador.id ? 'bg-yellow-400 border-yellow-500 text-blue-900 shadow-lg shadow-yellow-100' : 'bg-white border-gray-100 text-gray-400 hover:border-yellow-400 hover:text-yellow-600'}`}>
                      <Crown size={16} />{capitanId === jugador.id ? 'CAP' : 'CAPITÁN'}
                    </button>
                    <button onClick={() => onSubirClausula(jugador.id)}
                      className="flex-1 py-3 rounded-xl font-black uppercase border-2 bg-white border-green-100 text-green-600 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2">
                      <Plus size={16} /> CLÁUSULA
                    </button>
                  </div>
                </>
              )}

              {esMio ? (
                <button onClick={() => onToggleTransferible(jugador.id)}
                  className={`w-full py-4 rounded-2xl font-black uppercase border-2 transition-all ${jugador.enVenta ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-100'}`}>
                  {jugador.enVenta ? 'Retirar de la Lista de Venta' : 'Poner en Lista de Venta'}
                </button>
              ) : (
                <button onClick={() => onFichar(jugador)} disabled={cargando || fichando || bloqueado || presupuesto < precioFinal}
                  className="w-full py-4 rounded-2xl font-black uppercase shadow-lg transition-all disabled:opacity-30 bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200">
                  {fichando ? 'PROCESANDO...' : bloqueado ? 'JUGADOR BLOQUEADO' : botDueno ? 'Pagar Cláusula' : 'Fichar Estrella'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

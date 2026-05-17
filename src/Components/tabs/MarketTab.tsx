'use client';

import { motion } from 'framer-motion';
import { Jugador, Rival } from '@/app/fantasy';

interface Props {
  jugadoresFiltrados: Jugador[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroPosicion: string;
  setFiltroPosicion: (v: string) => void;
  misFichajes: Jugador[];
  fichajesDeLaLiga: { jugador_id: string; user_id: string }[];
  estadoLigaBots: Rival[];
  userId: string | undefined;
  onSelectJugador: (j: Jugador) => void;
}

export default function MarketTab({
  jugadoresFiltrados, busqueda, setBusqueda, filtroPosicion, setFiltroPosicion,
  misFichajes, fichajesDeLaLiga, estadoLigaBots, userId, onSelectJugador,
}: Props) {
  return (
    <motion.div key="mercado" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
        <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full" /> Mercado de Fichajes
        </h2>
        <input type="text" placeholder="Buscar estrella..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none mb-4 font-bold transition-all" />
        <div className="flex flex-wrap gap-2 mb-6">
          {['Todos', 'POR', 'DF', 'MC', 'DL'].map(pos => (
            <button key={pos} onClick={() => setFiltroPosicion(pos)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${filtroPosicion === pos ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
              {pos}
            </button>
          ))}
        </div>
        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
          {jugadoresFiltrados.map(j => {
            const yaFichado = misFichajes.some(f => f.id === j.id);
            const fichadoPorOtro = fichajesDeLaLiga.some(f => f.jugador_id === j.id && f.user_id !== userId);
            const botDueno = estadoLigaBots.find(bot => bot.plantilla.some(bj => bj.id === j.id));
            return (
              <motion.div layout key={j.id} onClick={() => onSelectJugador(j)}
                className={`p-4 rounded-2xl flex justify-between items-center group cursor-pointer border-2 transition-all ${fichadoPorOtro ? 'opacity-60 bg-gray-200' : botDueno ? 'bg-red-50/30 border-red-50 hover:border-red-200' : 'bg-gray-50 border-transparent hover:bg-blue-50 hover:border-blue-100'}`}>
                <div>
                  <p className="font-black text-gray-800 group-hover:text-blue-600 uppercase text-sm flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] italic">{j.media}</span>
                    {j.nombre} {fichadoPorOtro && '🔒'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{j.posicion} - {j.equipo_real}</p>
                  {botDueno && <p className="text-[8px] font-black text-red-400 uppercase mt-1">Dueño: {botDueno.nombre}</p>}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Valor: {Number(j.precio).toLocaleString()}</span>
                  <p className={`text-[10px] font-black leading-none ${yaFichado ? 'text-green-500' : fichadoPorOtro ? 'text-gray-500' : botDueno ? 'text-orange-500' : 'text-blue-500'}`}>
                    {yaFichado ? 'TUYO' : fichadoPorOtro ? 'NO DISPONIBLE' : botDueno ? 'CLAU: ' + j.clausula.toLocaleString() : Number(j.precio).toLocaleString() + ' EUR'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

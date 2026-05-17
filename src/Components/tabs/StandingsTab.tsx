'use client';

import { motion } from 'framer-motion';
import { Rival } from '@/app/fantasy';

interface Props {
  estadoLigaBots: Rival[];
  puntosLigaUsuario: number;
  poderActual: number;
  userKitHomeColor: string;
  userKitAwayColor: string;
  onSelectRival: (r: Rival) => void;
}

export default function StandingsTab({ estadoLigaBots, puntosLigaUsuario, poderActual, userKitHomeColor, userKitAwayColor, onSelectRival }: Props) {
  const clasificacion = [
    ...estadoLigaBots.map(b => ({ ...b, esUser: false })),
    { nombre: 'FANTASÍA FC (TÚ)', puntosLiga: puntosLigaUsuario, esUser: true, fuerza: poderActual, kit_home_color: userKitHomeColor, kit_away_color: userKitAwayColor },
  ].sort((a, b) => b.puntosLiga - a.puntosLiga);

  return (
    <motion.section key="clasificacion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="bg-white p-8 md:p-12 rounded-[3rem] shadow-sm max-w-3xl mx-auto border border-gray-100">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-blue-900 leading-none">Clasificación de la Liga</h2>
      </div>
      <div className="space-y-4">
        {clasificacion.map((eq, i) => (
          <motion.div layout key={i}
            onClick={() => !eq.esUser && onSelectRival(eq as Rival)}
            className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${eq.esUser ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl scale-105 relative z-10' : 'bg-gray-50 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30'}`}>
            <div className="flex items-center gap-6">
              <span className={`text-3xl font-black italic ${eq.esUser ? 'text-white' : 'text-gray-300'}`}>#{i + 1}</span>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: (eq as any).kit_home_color }} />
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: (eq as any).kit_away_color }} />
              </div>
              <div>
                <p className={`font-black uppercase tracking-tight ${eq.esUser ? 'text-xl' : 'text-sm text-gray-700'}`}>{eq.nombre}</p>
                {!eq.esUser && <p className="text-[9px] font-bold opacity-50 uppercase italic">Fuerza actual: {eq.fuerza}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className={`font-black leading-none ${eq.esUser ? 'text-4xl' : 'text-2xl text-gray-400'}`}>{eq.puntosLiga}</p>
              <p className="text-[10px] font-bold opacity-70 uppercase">Puntos Liga</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

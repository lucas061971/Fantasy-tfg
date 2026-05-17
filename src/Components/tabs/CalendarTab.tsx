'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { PartidoHistorial } from '@/app/fantasy';
import { CALENDARIO } from '@/app/gameData';

interface Props {
  historialPartidos: PartidoHistorial[];
  jornadaActual: number;
}

export default function CalendarTab({ historialPartidos, jornadaActual }: Props) {
  return (
    <motion.div key="calendario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto">
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-gray-800 italic">
          <Calendar className="text-blue-600" size={24} /> Calendario de la Temporada
        </h2>
        <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-2">
          {CALENDARIO.map(j => {
            const partidoJugado = historialPartidos.find(h => h.jornada === j.jornada)?.partidos.find(p => p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC');
            const esPasado = j.jornada < jornadaActual;
            const esSiguiente = j.jornada === jornadaActual;
            return (
              <div key={j.jornada} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${esSiguiente ? 'border-blue-400 bg-blue-50 shadow-md scale-[1.01]' : 'border-gray-50 bg-gray-50'}`}>
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
  );
}

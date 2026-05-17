'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShieldCheck } from 'lucide-react';
import { Jugador, PartidoHistorial, Rival } from '@/app/fantasy';

interface Props {
  match: PartidoHistorial['partidos'][0];
  onClose: () => void;
  misFichajes: Jugador[];
  estadoLigaBots: Rival[];
  jugadores: Jugador[];
}

export default function MatchModal({ match, onClose, misFichajes, estadoLigaBots }: Props) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
          className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl border-4 border-blue-900 flex flex-col max-h-[90vh]">
          <div className="bg-blue-900 p-6 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-2xl font-black italic uppercase leading-none">Acta del Encuentro</h3>
              <p className="text-[10px] text-blue-300 font-bold uppercase mt-1 tracking-widest">Estadísticas y Puntuaciones</p>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          <div className="p-6 bg-gray-50 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 shrink-0 border-b-2 border-gray-100">
            <div className="text-right flex-1 flex items-center justify-end gap-4">
              <span className="font-black uppercase text-xl text-blue-900">{match.local}</span>
              {match.colorLocal && <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: match.colorLocal }} />}
            </div>
            <div className="text-5xl font-black bg-gray-900 text-white px-8 py-3 rounded-3xl italic shadow-xl">
              {match.golesLocal} - {match.golesVisitante}
            </div>
            <div className="text-left flex-1 flex items-center justify-start gap-4">
              {match.colorVisitante && <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: match.colorVisitante }} />}
              <span className="font-black uppercase text-xl text-indigo-900">{match.visitante}</span>
            </div>
          </div>

          <div className="p-6 bg-white border-b-2 border-gray-50">
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                  <span>{match.posesionLocal}%</span><span className="text-gray-300">Posesión</span><span>{match.posesionVisitante}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${match.posesionLocal}%` }} />
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${match.posesionVisitante}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 text-center items-center gap-y-1">
                {[
                  [match.tirosLocal, 'Tiros Totales', match.tirosVisitante],
                  [match.tirosPuertaLocal, 'A Puerta', match.tirosPuertaVisitante],
                  [match.paradasLocal, 'Paradas Portero', match.paradasVisitante],
                ].map(([l, label, v]) => (
                  <React.Fragment key={String(label)}>
                    <div className="text-lg font-black text-blue-900">{l}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase leading-tight">{label}</div>
                    <div className="text-lg font-black text-indigo-900">{v}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-8 grid md:grid-cols-2 gap-10 bg-white">
            {[match.local, match.visitante].map((teamName, idx) => {
              const players = teamName === 'Fantasía FC'
                ? misFichajes.filter(j => j.es_titular)
                : estadoLigaBots.find(b => b.nombre === teamName)?.plantilla || [];
              return (
                <div key={teamName} className="space-y-4">
                  <h4 className={`font-black uppercase text-xs tracking-tighter flex items-center gap-2 ${idx === 0 ? 'text-blue-600' : 'text-indigo-600'}`}>
                    <ShieldCheck size={14} /> {teamName}
                  </h4>
                  <div className="space-y-2">
                    {players.map(p => {
                      const rating = match.notas?.[p.id] || 0;
                      const matchGoals = match.goleadoresIds?.filter(id => id === p.id).length || 0;
                      const matchAssists = match.asistentesIds?.filter(id => id === p.id).length || 0;
                      let bonusGoles = 0;
                      if (matchGoals > 0) bonusGoles = p.posicion === 'DL' ? matchGoals * 4 : p.posicion === 'MC' ? matchGoals * 5 : matchGoals * 6;
                      return (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[10px] text-gray-400 w-6">{p.posicion}</span>
                            <span className="font-bold text-sm uppercase text-gray-700">
                              {p.nombre}{matchGoals > 0 && ' ' + Array(matchGoals).fill('⚽').join('')}{matchAssists > 0 && ' ' + Array(matchAssists).fill('🎯').join('')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[7px] font-black text-gray-400 uppercase leading-none">Rating</p>
                              <p className="font-mono font-black text-sm">{rating}</p>
                            </div>
                            <div className="text-right bg-blue-600 text-white px-3 py-1 rounded-lg">
                              <p className="text-[7px] font-black uppercase leading-none opacity-70">Puntos</p>
                              <p className="font-mono font-black text-sm">{rating + bonusGoles}</p>
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
    </AnimatePresence>
  );
}

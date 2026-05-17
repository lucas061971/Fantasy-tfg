'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Jugador, Rival, PartidoHistorial } from '@/app/fantasy';

interface Props {
  historialPartidos: PartidoHistorial[];
  misFichajes: Jugador[];
  estadoLigaBots: Rival[];
  jugadores: Jugador[];
  onSelectMatch: (m: PartidoHistorial['partidos'][0]) => void;
}

export default function HistoryTab({ historialPartidos, misFichajes, jugadores, onSelectMatch }: Props) {
  return (
    <motion.div key="historial" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto">
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-gray-800 italic">
          <Calendar className="text-blue-600" size={24} /> Historial de Partidos
        </h2>
        <div className="space-y-3">
          {historialPartidos.length > 0 ? historialPartidos.map((partido, i) => (
            <div key={i} className="mb-8">
              <h3 className="text-sm font-black text-blue-900 mb-4 bg-blue-50 w-fit px-4 py-1 rounded-full uppercase italic">
                Jornada {partido.jornada}
              </h3>
              <div className="grid gap-4">
                {partido.partidos?.map((p, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx}
                    onClick={() => onSelectMatch(p)}
                    className={`p-4 rounded-3xl border-2 transition-all cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-95 ${p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                    {(p.local === 'Fantasía FC' || p.visitante === 'Fantasía FC') && (
                      <div className="text-[7px] font-black text-blue-600 mb-2 tracking-widest text-center border-b border-blue-100 pb-1">
                        {p.local === 'Fantasía FC' ? '🏟️ LOCAL (CASA)' : '✈️ VISITANTE (FUERA)'}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center justify-end gap-2 pr-4 text-right">
                        <span className="font-black text-[10px] md:text-xs uppercase">{p.local}</span>
                        {p.colorLocal && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: p.colorLocal }} />}
                      </div>
                      <div className="bg-gray-900 text-white px-4 py-1 rounded-lg font-mono font-black text-lg min-w-[80px] text-center">
                        {p.golesLocal} - {p.golesVisitante}
                      </div>
                      <div className="flex-1 flex items-center justify-start gap-2 pl-4 text-left">
                        {p.colorVisitante && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: p.colorVisitante }} />}
                        <span className="font-black text-[10px] md:text-xs uppercase">{p.visitante}</span>
                      </div>
                    </div>
                    {p.eventos?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between gap-4">
                        <div className="flex-1 space-y-1 text-right pr-4 border-r border-gray-50">
                          {p.eventos.filter(ev => ev.includes(`(${p.local})`)).map((ev, evIdx) => {
                            const matchGol = ev.match(/GOL de (.*?) \(/);
                            const nombre = matchGol ? matchGol[1] : '';
                            const jugador = jugadores.find(j => j.nombre === nombre) || misFichajes.find(j => j.nombre === nombre);
                            const nota = (jugador && p.notas) ? p.notas[jugador.id] : 0;
                            return (
                              <div key={evIdx} className="flex flex-col items-end">
                                <p className="text-[9px] text-gray-500 italic leading-none">{ev.split(' (')[0]}</p>
                                {nota > 0 && <span className="text-[7px] font-black text-blue-400 uppercase">Nota: {nota}</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex-1 space-y-1 text-left pl-4">
                          {p.eventos.filter(ev => ev.includes(`(${p.visitante})`)).map((ev, evIdx) => {
                            const matchGol = ev.match(/GOL de (.*?) \(/);
                            const nombre = matchGol ? matchGol[1] : '';
                            const jugador = jugadores.find(j => j.nombre === nombre) || misFichajes.find(j => j.nombre === nombre);
                            const nota = (jugador && p.notas) ? p.notas[jugador.id] : 0;
                            return (
                              <div key={evIdx} className="flex flex-col items-start">
                                <p className="text-[9px] text-gray-500 italic leading-none">{ev.split(' (')[0]}</p>
                                {nota > 0 && <span className="text-[7px] font-black text-blue-400 uppercase">Nota: {nota}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )) : (
            <p className="text-center text-gray-400 font-bold italic py-4">No se han jugado partidos todavía.</p>
          )}
        </div>
      </section>
    </motion.div>
  );
}

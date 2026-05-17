'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Jugador, Rival } from '@/app/fantasy';

interface Props {
  rival: Rival;
  onClose: () => void;
  onSelectJugador: (j: Jugador) => void;
}

export default function RivalScoutModal({ rival, onClose, onSelectJugador }: Props) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
          className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border-4 border-indigo-900">
          <div className="bg-indigo-900 p-8 text-white flex justify-between items-center">
            <div>
              <p className="text-yellow-400 font-black text-xs uppercase tracking-widest">Informe de Scout</p>
              <h3 className="text-3xl font-black italic uppercase">{rival.nombre}</h3>
            </div>
            <button onClick={onClose} className="text-2xl hover:rotate-90 transition-all">X</button>
          </div>
          <div className="p-8">
            <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
              <p className="font-black text-indigo-900 uppercase text-xs">Idea de Juego</p>
              <p className="text-xl font-black text-indigo-600">{rival.tactica || 'Equilibrado'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[{ label: 'ATK', val: rival.ataque, c: 'red' }, { label: 'MED', val: rival.medio, c: 'green' }, { label: 'DEF', val: rival.defensa, c: 'blue' }].map(({ label, val, c }) => (
                <div key={label} className={`bg-${c}-50 p-3 rounded-2xl border border-${c}-100 text-center`}>
                  <p className={`text-[10px] font-black text-${c}-400 uppercase`}>{label}</p>
                  <p className={`text-2xl font-black text-${c}-600`}>{val}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4">Alineación Probable</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {rival.plantilla?.map((j, i) => (
                <div key={i} onClick={() => { onClose(); onSelectJugador(j); }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-indigo-50">
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-600 font-black text-xs w-6">{j.posicion}</span>
                    <span className="font-bold text-sm text-gray-700 uppercase">{j.nombre}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
              <p className="font-black text-indigo-900 uppercase text-xs">Fuerza Colectiva</p>
              <p className="text-2xl font-black text-indigo-600">{rival.fuerza}%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

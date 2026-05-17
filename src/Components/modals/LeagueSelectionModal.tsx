'use client';

import { motion } from 'framer-motion';
import { Plus, LogIn } from 'lucide-react';

interface Props {
  comprobandoLiga: boolean;
  usuarioTieneLiga: boolean;
  ligasDetectadas: { id: string; name: string }[];
  cargando: boolean;
  newLeagueName: string;
  setNewLeagueName: (v: string) => void;
  joinLeagueCode: string;
  setJoinLeagueCode: (v: string) => void;
  onCreateLeague: () => void;
  onJoinLeague: (code: string) => void;
  onSelectLeague: (id: string) => void;
}

export default function LeagueSelectionModal({
  comprobandoLiga, usuarioTieneLiga, ligasDetectadas, cargando,
  newLeagueName, setNewLeagueName, joinLeagueCode, setJoinLeagueCode,
  onCreateLeague, onJoinLeague, onSelectLeague,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900">
        <div className="bg-blue-900 p-8 text-white">
          <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Selecciona tu Liga</h3>
          <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em] mt-2">Crea una nueva o únete a una existente</p>
        </div>

        {comprobandoLiga ? (
          <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Comprobando tus ligas...</div>
        ) : usuarioTieneLiga ? (
          <div className="p-6">
            <p className="text-sm font-semibold text-gray-400 mb-2">Tus ligas en curso:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-6">
              {ligasDetectadas.map(liga => (
                <button key={liga.id} onClick={() => onSelectLeague(liga.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl flex justify-between items-center transition-all shadow-md">
                  <span>{liga.name}</span>
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded-md">Entrar ➔</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-400 mb-2">¿Quieres empezar otra?</p>
              <input type="text" placeholder="Nombre de la nueva liga..." value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-blue-500" />
              <button onClick={onCreateLeague} disabled={cargando}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                {cargando ? 'Creando...' : '➕ Crear Nueva Liga'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2"><Plus size={20} /> Crear Nueva Liga</h4>
              <input type="text" placeholder="Nombre de la Liga" value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none mb-3" />
              <button onClick={onCreateLeague} disabled={cargando}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase hover:bg-blue-700 transition-all disabled:opacity-50">
                Crear Liga
              </button>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-3 flex items-center gap-2"><LogIn size={20} /> Unirse a Liga</h4>
              <input type="text" placeholder="Código de Invitación" value={joinLeagueCode} onChange={e => setJoinLeagueCode(e.target.value.toUpperCase())}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none mb-3 uppercase" />
              <button onClick={() => onJoinLeague(joinLeagueCode)} disabled={cargando}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-black uppercase hover:bg-green-700 transition-all disabled:opacity-50">
                Unirse a Liga
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

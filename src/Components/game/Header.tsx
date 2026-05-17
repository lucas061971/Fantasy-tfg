'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Target, Share2, Copy, List } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Jugador, League, PartidoHistorial } from '@/app/fantasy';
import { CALENDARIO } from '@/app/gameData';

interface StatsArea { ataque: number; medio: number; defensa: number; }

interface Props {
  currentLeague: League | null;
  user: User;
  poderActual: number;
  statsUsuario: StatsArea;
  presupuesto: number;
  puntosLigaUsuario: number;
  jornadaActual: number;
  diasHastaPartido: number;
  simulandoDia: boolean;
  misFichajes: Jugador[];
  historialPartidos: PartidoHistorial[];
  onLogout: () => void;
  onSimularDia: () => void;
  onJugarJornada: () => void;
  onReiniciarLiga: () => void;
  onSwitchLeague: () => void;
  onCopyCode: (code: string) => void;
  onCopyInviteLink: (code: string) => void;
}

export default function Header({
  currentLeague, user, poderActual, statsUsuario, presupuesto, puntosLigaUsuario,
  jornadaActual, diasHastaPartido, simulandoDia, misFichajes, historialPartidos,
  onLogout, onSimularDia, onJugarJornada, onReiniciarLiga, onSwitchLeague, onCopyCode, onCopyInviteLink,
}: Props) {
  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white p-8 rounded-[2rem] mb-6 shadow-2xl border-b-8 border-black/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-black italic select-none">TFG</div>
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="text-left flex-1">
            <h1 className="text-5xl font-black italic tracking-tighter leading-none uppercase">Fantasy TFG</h1>
            {currentLeague && (
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2">
                  <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.2em]">Liga: {currentLeague.name}</p>
                  {user?.email && <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">| Entrenador: {user.email}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-blue-100 uppercase">CÓDIGO: {currentLeague.invite_code}</span>
                    <button onClick={() => onCopyCode(currentLeague.invite_code)} className="opacity-50 hover:opacity-100 transition-opacity text-white" title="Copiar Código">
                      <Copy size={12} />
                    </button>
                  </div>
                  <button onClick={() => onCopyInviteLink(currentLeague.invite_code)}
                    className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-lg text-[10px] font-black transition-all border border-yellow-500/30">
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
                        <div key={i} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-black border transition-all ${completado ? 'bg-green-500 border-green-600 text-white' : actual ? 'bg-yellow-400 border-yellow-600 text-blue-900 animate-pulse scale-110' : 'bg-white/10 border-white/20 text-white/40'}`}>
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
                    <button onClick={onSimularDia} disabled={simulandoDia}
                      className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 disabled:opacity-50">
                      {simulandoDia ? 'Simulando...' : 'Avanzar Día'}
                    </button>
                  ) : (
                    <button onClick={onJugarJornada}
                      disabled={jornadaActual > CALENDARIO.length || misFichajes.filter(j => j.es_titular).length !== 11 || presupuesto < 0}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-yellow-500/20">
                      JUGAR PARTIDO
                    </button>
                  )}
                  <button onClick={onReiniciarLiga} title="Reiniciar Liga"
                    disabled={jornadaActual > CALENDARIO.length + 1 && historialPartidos.length === 0}
                    className="bg-red-500 hover:bg-red-400 text-white p-2 rounded-lg transition-all active:rotate-180 duration-500">
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={onSwitchLeague} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-white/10 flex items-center gap-1.5">
              <List size={12} /> MIS LIGAS
            </button>
            <button onClick={onLogout} className="bg-white/10 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all border border-white/10">
              CERRAR SESION
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-center min-w-[130px]">
            <p className="text-[10px] font-black text-yellow-400 uppercase mb-1 tracking-tighter">Puntos Liga</p>
            <p className="text-4xl font-mono font-black text-yellow-400 leading-none">{puntosLigaUsuario}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[180px]">
            <div className="flex justify-between items-end mb-2">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-tighter">Presupuesto</p>
              <p className="text-xl font-mono font-black text-green-400 leading-none">{presupuesto.toLocaleString()} EUR</p>
            </div>
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, (presupuesto / 100000000) * 100)}%`}}
                className="h-full bg-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

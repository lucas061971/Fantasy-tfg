'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Users, Zap, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Jugador, FormacionKey, Tactic, Posicion } from '@/app/fantasy';
import { CONFIG_FORMACIONES } from '@/app/gameData';

interface Props {
  misFichajes: Jugador[];
  formacion: FormacionKey;
  setFormacion: (f: FormacionKey) => void;
  tactica: Tactic;
  setTactica: (t: Tactic) => void;
  userKitHomeColor: string;
  setUserKitHomeColor: (c: string) => void;
  userKitAwayColor: string;
  setUserKitAwayColor: (c: string) => void;
  capitanId: string | null;
  estadoForma: string;
  onSelectJugador: (j: Jugador) => void;
  onToggleTitular: (j: Jugador) => void;
  onReordenarTitular: (j: Jugador, dir: 'izquierda' | 'derecha') => void;
}

export default function TeamTab({
  misFichajes, formacion, setFormacion, tactica, setTactica,
  userKitHomeColor, setUserKitHomeColor, userKitAwayColor, setUserKitAwayColor,
  capitanId, estadoForma, onSelectJugador, onToggleTitular, onReordenarTitular,
}: Props) {
  return (
    <motion.div key="equipo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="max-w-6xl mx-auto space-y-8">

      {/* Kit colors */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg"><Users size={24} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Personalización</p>
            <p className="text-slate-900 font-black text-xl">COLORES EQUIPACIÓN</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400">1ª Equipación</label>
            <input type="color" value={userKitHomeColor} onChange={e => setUserKitHomeColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 p-1 bg-white" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400">2ª Equipación</label>
            <input type="color" value={userKitAwayColor} onChange={e => setUserKitAwayColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 p-1 bg-white" />
          </div>
        </div>
      </section>

      {/* Formación */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><ShieldCheck size={24} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Táctica Activa</p>
            <p className="text-blue-900 font-black text-xl">FORMACIÓN {formacion}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {Object.keys(CONFIG_FORMACIONES).map(f => (
            <button key={f} onClick={() => setFormacion(f as FormacionKey)}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${formacion === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Táctica */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border-2 border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg"><Zap size={24} /></div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Estilo de Juego</p>
            <p className="text-indigo-900 font-black text-xl">TÁCTICA: {tactica.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {(['Ofensivo', 'Equilibrado', 'Defensivo'] as Tactic[]).map(t => (
            <button key={t} onClick={() => setTactica(t)}
              className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${tactica === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Campo */}
      <section className="relative bg-emerald-800 rounded-[3rem] p-8 shadow-2xl border-[12px] border-emerald-900 overflow-hidden min-h-[600px] flex flex-col justify-between">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white rounded-full" />
        </div>
        <div className="relative z-10 flex-grow flex flex-col-reverse justify-around py-4">
          {[{ pos: 'POR', color: 'bg-yellow-400' }, { pos: 'DF', color: 'bg-blue-500' }, { pos: 'MC', color: 'bg-green-400' }, { pos: 'DL', color: 'bg-red-500' }].map(row => {
            const titularesFila = misFichajes.filter(j => j.es_titular && j.posicion === row.pos);
            return (
              <div key={row.pos} className="flex justify-around items-center min-h-[100px]">
                {titularesFila.map((j, idx) => (
                  <motion.div layout key={j.id} onClick={() => onSelectJugador(j)}
                    className="text-center group transition-transform hover:scale-110 cursor-pointer relative">
                    <div className={`w-14 h-14 ${row.color} rounded-full mx-auto mb-1 border-4 border-white shadow-xl flex items-center justify-center text-xl font-black text-white relative`}>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] font-bold opacity-70 mb-[-3px] uppercase">{row.pos}</span>
                        <span>{j.media}</span>
                      </div>
                      {j.id === capitanId && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 p-1 rounded-full border-2 border-white shadow-sm">
                          <Crown size={10} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="bg-black/70 text-white text-[9px] font-black px-2 py-0.5 rounded-t-md max-w-[100px] truncate uppercase">{j.nombre}</p>
                      <p className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-b-md w-full border-t border-black/10">{j.puntos || 0} PTS</p>
                      {titularesFila.length > 1 && (
                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {idx > 0 && (
                            <button onClick={e => { e.stopPropagation(); onReordenarTitular(j, 'izquierda'); }}
                              className="bg-white/90 text-gray-800 p-0.5 rounded-md hover:bg-white shadow-sm">
                              <ChevronLeft size={12} />
                            </button>
                          )}
                          {idx < titularesFila.length - 1 && (
                            <button onClick={e => { e.stopPropagation(); onReordenarTitular(j, 'derecha'); }}
                              className="bg-white/90 text-gray-800 p-0.5 rounded-md hover:bg-white shadow-sm">
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {Array.from({ length: Math.max(0, CONFIG_FORMACIONES[formacion][row.pos as Posicion] - titularesFila.length) }).map((_, i) => (
                  <div key={`empty-${row.pos}-${i}`} className="w-14 h-14 rounded-full border-2 border-white/20 border-dashed flex items-center justify-center text-white/20 text-xs font-black">
                    {row.pos}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* Lista plantilla */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h2 className="text-xl font-black uppercase mb-6 flex justify-between items-center text-gray-800">
          <span>Gestión de Plantilla ({misFichajes.length}/25)</span>
          <span className="text-[10px] font-black text-blue-600 uppercase">Estado: {estadoForma}</span>
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {misFichajes.map(j => (
            <motion.div layout key={j.id}
              className={`p-4 border-2 rounded-2xl flex justify-between items-center transition-all ${j.es_titular ? 'border-green-400 bg-green-50' : 'border-gray-50 bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => onToggleTitular(j)} className={`text-2xl transition-all active:scale-125 ${j.es_titular ? 'scale-110' : 'grayscale opacity-30'}`}>
                  T
                </button>
                <div onClick={() => onSelectJugador(j)} className="cursor-pointer">
                  <p className="font-black text-xs text-gray-800 uppercase leading-none flex items-center gap-2">
                    <span className="bg-gray-200 text-gray-600 px-1 rounded-[4px] text-[9px]">{j.media}</span>
                    {j.is_injured && <Zap size={10} className="text-red-500" />}
                    {j.nombre}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">{j.posicion} - REND: {j.puntos || 0}</p>
                </div>
              </div>
              {j.enVenta && <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-md text-[8px] font-black uppercase">En Venta</div>}
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

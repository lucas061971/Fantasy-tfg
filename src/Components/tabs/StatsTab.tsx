'use client';

import { motion } from 'framer-motion';
import { Award, TrendingUp, ShieldCheck } from 'lucide-react';
import { Jugador } from '@/app/fantasy';

interface Props {
  jugadores: Jugador[];
  onSelectJugador: (j: Jugador) => void;
}

interface RankingProps {
  title: string;
  icon: React.ReactNode;
  titleColor: string;
  items: Jugador[];
  value: (j: Jugador) => number;
  unit: string;
  badgeColor: string;
  emptyMsg: string;
  subtitle?: (j: Jugador) => string;
}

function RankingSection({ title, icon, titleColor, items, value, unit, badgeColor, emptyMsg, subtitle, onSelect }: RankingProps & { onSelect: (j: Jugador) => void }) {
  return (
    <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
      <h2 className={`text-2xl font-black uppercase mb-6 flex items-center gap-3 ${titleColor} italic`}>
        {icon} {title}
      </h2>
      <div className="space-y-3">
        {items.length > 0 ? items.map((j, i) => (
          <div key={j.id} onClick={() => onSelect(j)}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-blue-50 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-xl font-black text-gray-300 italic w-6">#{i + 1}</span>
              <div>
                <p className="font-black text-sm uppercase text-gray-800">{j.nombre}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">{subtitle ? subtitle(j) : j.equipo_real}</p>
              </div>
            </div>
            <div className={`${badgeColor} text-white px-4 py-1 rounded-xl font-black text-lg shadow-lg`}>
              {value(j)} <span className="text-[10px] opacity-70">{unit}</span>
            </div>
          </div>
        )) : (
          <p className="text-center text-gray-400 font-bold italic py-10">{emptyMsg}</p>
        )}
      </div>
    </section>
  );
}

export default function StatsTab({ jugadores, onSelectJugador }: Props) {
  const goleadores = [...jugadores].sort((a, b) => (b.goles || 0) - (a.goles || 0) || b.media - a.media).slice(0, 10);
  const asistentes = [...jugadores].sort((a, b) => (b.asistencias || 0) - (a.asistencias || 0) || b.media - a.media).slice(0, 10);
  const porteros = [...jugadores].filter(j => j.posicion === 'POR').sort((a, b) => (b.paradas || 0) - (a.paradas || 0) || b.media - a.media).slice(0, 10);

  return (
    <motion.div key="stats" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
      <RankingSection
        title="Máximos Goleadores" icon={<Award className="text-yellow-500" size={28} />} titleColor="text-blue-900"
        items={goleadores} value={j => j.goles || 0} unit="GOL" badgeColor="bg-blue-600"
        emptyMsg="Cargando datos de goleadores..." subtitle={j => `${j.posicion} - ${j.equipo_real}`}
        onSelect={onSelectJugador}
      />
      <RankingSection
        title="Máximos Asistentes" icon={<TrendingUp className="text-blue-500" size={28} />} titleColor="text-indigo-900"
        items={asistentes} value={j => j.asistencias || 0} unit="ASIST" badgeColor="bg-indigo-600"
        emptyMsg="Cargando datos de asistentes..." subtitle={j => `${j.posicion} - ${j.equipo_real}`}
        onSelect={onSelectJugador}
      />
      <RankingSection
        title="Mejores Porteros" icon={<ShieldCheck className="text-blue-500" size={28} />} titleColor="text-blue-900"
        items={porteros} value={j => j.paradas || 0} unit="PAR" badgeColor="bg-blue-500"
        emptyMsg="No hay porteros disponibles todavía." subtitle={j => j.equipo_real}
        onSelect={onSelectJugador}
      />
    </motion.div>
  );
}

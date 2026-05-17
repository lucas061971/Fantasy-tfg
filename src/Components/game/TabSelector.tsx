'use client';

import { TrendingUp } from 'lucide-react';

type Tab = 'equipo' | 'mercado' | 'clasificacion' | 'historial' | 'noticias' | 'stats' | 'calendario';

interface Props {
  tabActual: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabSelector({ tabActual, onChange }: Props) {
  return (
    <div className="mb-8 w-full max-w-sm mx-auto lg:mx-0">
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-2 tracking-widest">Sección actual:</label>
      <div className="relative group">
        <select value={tabActual} onChange={e => onChange(e.target.value as Tab)}
          className="w-full p-4 rounded-2xl bg-white border-4 border-blue-100 font-black text-blue-900 shadow-xl outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer pr-12 text-sm uppercase italic">
          <option value="equipo">🛡️ Mi Equipo (Once + Plantilla)</option>
          <option value="calendario">📅 Calendario Temporada</option>
          <option value="mercado">💸 Mercado de Fichajes</option>
          <option value="clasificacion">🏆 Clasificación Liga</option>
          <option value="historial">📜 Historial de Partidos</option>
          <option value="noticias">🗞️ Última Hora / Noticias</option>
          <option value="stats">📊 Estadísticas (Goles / Asistencias)</option>
        </select>
        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-blue-600">
          <TrendingUp size={20} className="rotate-90" />
        </div>
      </div>
    </div>
  );
}

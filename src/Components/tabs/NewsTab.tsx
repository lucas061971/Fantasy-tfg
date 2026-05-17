'use client';

import { motion } from 'framer-motion';
import { Newspaper } from 'lucide-react';

interface Props {
  noticias: string[];
}

export default function NewsTab({ noticias }: Props) {
  return (
    <motion.div key="noticias" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-2xl mx-auto">
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 min-h-[500px]">
        <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3 text-blue-900 italic">
          <Newspaper className="text-blue-600" size={28} /> Última Hora del Mercado
        </h2>
        <div className="space-y-4">
          {noticias.length > 0 ? noticias.map((nota, i) => (
            <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="p-4 bg-gray-50 rounded-2xl border-l-4 border-blue-600 font-bold text-sm text-gray-700">
              {nota}
            </motion.div>
          )) : (
            <p className="text-center text-gray-400 font-bold italic py-10 text-lg">No hay noticias recientes en el mercado.</p>
          )}
        </div>
      </section>
    </motion.div>
  );
}

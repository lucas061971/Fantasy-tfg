'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation'; 
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, ShieldAlert, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showLeagueOptions, setShowLeagueOptions] = useState(false);
  const router = useRouter(); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: leagues, error: leagueError } = await supabase
          .from('mis_plantillas')
          .select('liga_id')
          .eq('user_id', authData.user.id)
          .limit(1);

        if (leagueError) throw leagueError;

        if (leagues && leagues.length > 0) {
          setShowLeagueOptions(true);
        } else {
          router.push('/team-selection'); 
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-blue-900"
      >
        <div className="bg-blue-900 p-8 text-white">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Fantasy TFG</h1>
          <p className="text-blue-300 text-xs font-bold uppercase mt-2">Acceso Estadio</p>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!showLeagueOptions ? (
              <motion.form 
                key="login-form"
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleLogin} 
                className="space-y-4"
              >
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                    <ShieldAlert size={16} /> {error}
                  </div>
                )}
                
                {/* EMAIL */}
                <div className="relative w-full">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="w-full p-4 pl-12 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold transition-all text-gray-700 relative z-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* CONTRASEÑA + BOTÓN OJO CORREGIDO */}
                <div className="relative w-full z-10">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-20" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña"
                    /* CORRECCIÓN: Quitamos el z-0 que provocaba el solapamiento */
                    className="w-full p-4 pl-12 pr-14 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold transition-all text-gray-700 block relative"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    /* CORRECCIÓN: Ajustado posicionamiento absoluto y forzado z-30 */
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-blue-600 bg-white shadow-md rounded-lg p-1.5 z-30 flex items-center justify-center transition-all cursor-pointer border border-slate-100"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} className="text-slate-700" /> : <Eye size={18} className="text-slate-700" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
                  Entrar al Vestuario
                </button>
              </motion.form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-gray-500 font-bold mb-6 italic">¡Bienvenido de nuevo, míster!</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg hover:bg-blue-700 transition-all"
                >
                  Continuar a la Liga
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasLeagues, setHasLeagues] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('¡Registro con éxito! Por favor, verifica tu correo electrónico si has recibido un mensaje de confirmación.');
        if (signUpData?.user) router.push('/team-selection');
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) throw new Error('Debes confirmar tu correo electrónico antes de entrar al estadio.');
          throw error;
        }
        if (authData?.user) {
          const { data: userLeagues, error: leagueError } = await supabase.from('mis_plantillas').select('liga_id').eq('user_id', authData.user.id).limit(1);
          if (leagueError) throw leagueError;
          if (userLeagues && userLeagues.length > 0) { setHasLeagues(true); setShowOptions(true); }
          else router.push('/team-selection');
        }
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border-4 border-blue-900 overflow-hidden">
        <div className="bg-blue-900 p-10 text-white text-center">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-2">
            {showOptions ? 'Panel del Míster' : isSignUp ? 'Nuevo Entrenador' : 'Acceso Estadio'}
          </h1>
          <p className="text-yellow-400 font-black text-[10px] uppercase tracking-[0.2em]">
            {showOptions ? 'Elige tu próximo movimiento estratégico' : isSignUp ? 'Crea tu cuenta para empezar la liga' : 'Gestiona tu plantilla y ficha estrellas'}
          </p>
        </div>

        {showOptions && hasLeagues ? (
          <div className="p-8 space-y-4 text-center">
            <p className="text-gray-500 font-bold italic mb-2">¡Bienvenido de nuevo a la competición!</p>
            <button onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 text-sm">
              <LogIn size={20} /> Continuar mi Liga en Curso
            </button>
            <button onClick={() => { localStorage.removeItem('progress'); router.push('/team-selection'); }}
              className="w-full bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-4 rounded-2xl font-black uppercase transition-all flex items-center justify-center gap-2 text-sm">
              <UserPlus size={20} /> Crear una Nueva Liga
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleAuth} className="p-8 space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" placeholder="Correo electrónico" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold transition-all text-sm" />
              </div>
              <div className="relative w-full">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                <input type={showPassword ? 'text' : 'password'} placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold transition-all text-sm text-gray-700 relative z-0" />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-blue-600 bg-white shadow-md rounded-lg p-1.5 z-30 flex items-center justify-center transition-all cursor-pointer border border-slate-100">
                  {showPassword ? <EyeOff size={18} className="text-slate-700" /> : <Eye size={18} className="text-slate-700" />}
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {loading ? 'Procesando...' : isSignUp ? <><UserPlus size={20} /> Registrarse</> : <><LogIn size={20} /> Entrar a Jugar</>}
              </button>
            </form>
            <div className="p-8 bg-gray-50 text-center border-t border-gray-100">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline">
                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Regístrate aquí'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

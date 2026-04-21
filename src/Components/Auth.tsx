'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Función para entrar
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Error al entrar: " + error.message)
    setLoading(false)
  }

  // Función para registrarse
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      alert("Error al registrarse: " + error.message)
    } else {
      alert('¡Cuenta creada! Intenta entrar ahora.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-blue-600">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black text-blue-800 italic tracking-tighter">FANTASY TFG ⚽</h2>
          <p className="text-gray-500 font-medium">Gestiona tu equipo de estrellas</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all text-black"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all text-black"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
            >
              {loading ? 'Cargando...' : 'ENTRAR AL MERCADO'}
            </button>
            
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 p-4 rounded-xl font-bold transition-all"
            >
              Crear cuenta nueva
            </button>
          </div>
        </form>
      </div>
      <p className="mt-8 text-gray-400 text-xs uppercase tracking-widest font-bold">Proyecto TFG - 2026</p>
    </div>
  )
}
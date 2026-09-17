'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Lock, 
  Mail, 
  ShieldCheck, 
  FlaskConical, 
  UserCheck, 
  Loader2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const handleLogin = (userEmail: string, userPass: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await loginAction({ email: userEmail, password: userPass });
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Credenciales inválidas');
      }
    });
  };

  const quickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    handleLogin(roleEmail, rolePass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-2xl shadow-xl shadow-brand-500/30 text-white mb-2">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            LAB<span className="text-brand-400">CLINIC</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            ERP & Sistema de Gestión de Laboratorio Clínico
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500">Ingrese sus credenciales de acceso al sistema</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="usuario@labclinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                'Acceder al Sistema'
              )}
            </button>
          </form>

          {/* Quick Login Section */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Acceso Rápido de Prueba (Demo)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Admin */}
              <button
                type="button"
                onClick={() => quickLogin('admin@labclinic.com', 'admin123')}
                className="p-2.5 bg-slate-100 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-xl text-left transition-all group"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
                <span className="font-bold text-[11px] text-slate-800 block group-hover:text-brand-700">
                  Admin
                </span>
                <span className="text-[9px] text-slate-400 block">Total</span>
              </button>

              {/* Bioanalista */}
              <button
                type="button"
                onClick={() => quickLogin('bio@labclinic.com', 'bio123')}
                className="p-2.5 bg-slate-100 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-xl text-left transition-all group"
              >
                <FlaskConical className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-bold text-[11px] text-slate-800 block group-hover:text-brand-700">
                  Bioanalista
                </span>
                <span className="text-[9px] text-slate-400 block">Laboratorio</span>
              </button>

              {/* Recepcionista */}
              <button
                type="button"
                onClick={() => quickLogin('recepcion@labclinic.com', 'recepcion123')}
                className="p-2.5 bg-slate-100 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-xl text-left transition-all group"
              >
                <UserCheck className="w-4 h-4 text-brand-600 mb-1" />
                <span className="font-bold text-[11px] text-slate-800 block group-hover:text-brand-700">
                  Recepción
                </span>
                <span className="text-[9px] text-slate-400 block">Caja</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

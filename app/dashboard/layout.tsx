import React from 'react';
import Link from 'next/link';
import { 
  UserPlus, 
  FlaskConical, 
  ClipboardList, 
  Receipt, 
  Activity,
  LogOut,
  ShieldCheck,
  UserCheck,
  Settings
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const role = session.rol;

  // Filtrado de navegación según el rol del usuario
  const allNavItems = [
    {
      name: 'Nueva Recepción',
      href: '/dashboard/recepcion/nueva',
      icon: UserPlus,
      badge: 'Caja',
      roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    },
    {
      name: 'Órdenes de Pacientes',
      href: '/dashboard/recepcion',
      icon: ClipboardList,
      roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'BIOANALISTA'],
    },
    {
      name: 'Laboratorio Clínico',
      href: '/dashboard/laboratorio',
      icon: FlaskConical,
      roles: ['ADMINISTRADOR', 'BIOANALISTA'],
    },
    {
      name: 'Arqueo de Caja',
      href: '/dashboard/caja',
      icon: Receipt,
      badge: 'Admin',
      roles: ['ADMINISTRADOR'],
    },
    {
      name: 'Configuración',
      href: '/dashboard/configuracion',
      icon: Settings,
      roles: ['ADMINISTRADOR'],
    },
  ];

  const allowedNavItems = allNavItems.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100/70">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 shadow-xl border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl shadow-lg shadow-brand-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                LAB<span className="text-brand-400 font-extrabold">CLINIC</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">ERP & LIS Multimoneda</p>
            </div>
          </div>
        </div>

        {/* Indicator Tasa BCV */}
        <div className="mx-4 my-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-300">Tasa BCV Oficial</span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">Ref: Activa</span>
        </div>

        {/* Navigation Links filtrados por Rol */}
        <nav className="flex-1 p-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
            Módulos Habilitados
          </div>

          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-slate-300 hover:bg-slate-800 hover:text-white group"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-slate-800 text-brand-300 px-2 py-0.5 rounded-full font-semibold border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/40 flex items-center justify-center font-bold text-xs text-brand-300 shrink-0">
                {role === 'ADMINISTRADOR' ? 'ADM' : role === 'BIOANALISTA' ? 'BIO' : 'REC'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">{session.nombreCompleto}</p>
                <span className="text-[10px] font-semibold text-emerald-400 block truncate">
                  {role}
                </span>
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full py-2 px-3 bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/60 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}

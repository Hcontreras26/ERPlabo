import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ERP & LIS - Laboratorio Clínico',
  description: 'Sistema integral de gestión de laboratorio clínico y facturación multimoneda (USD / Tasa BCV)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

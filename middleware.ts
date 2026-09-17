import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'erplis_venezuela_jwt_secret_key_2026_secure_random'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('auth_session')?.value;

  let sessionUser: { id: string; email: string; nombreCompleto: string; rol: string } | null = null;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
      sessionUser = {
        id: payload.id as string,
        email: payload.email as string,
        nombreCompleto: payload.nombreCompleto as string,
        rol: payload.rol as string,
      };
    } catch (err) {
      sessionUser = null;
    }
  }

  // 1. Redirigir si ya está autenticado e intenta ir a /login
  if (pathname === '/login' && sessionUser) {
    const target =
      sessionUser.rol === 'BIOANALISTA'
        ? '/dashboard/laboratorio'
        : '/dashboard/recepcion/nueva';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 2. Proteger rutas /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    if (!sessionUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const rol = sessionUser.rol;

    // 2.1 Protección: /dashboard/caja/* y /dashboard/configuracion/* (Sólo ADMINISTRADOR)
    if (pathname.startsWith('/dashboard/caja') || pathname.startsWith('/dashboard/configuracion')) {
      if (rol !== 'ADMINISTRADOR') {
        const fallback = rol === 'BIOANALISTA' ? '/dashboard/laboratorio' : '/dashboard/recepcion';
        return NextResponse.redirect(new URL(fallback, request.url));
      }
    }

    // 2.2 Protección: /dashboard/laboratorio/* (ADMINISTRADOR y BIOANALISTA)
    if (pathname.startsWith('/dashboard/laboratorio')) {
      if (rol !== 'ADMINISTRADOR' && rol !== 'BIOANALISTA') {
        return NextResponse.redirect(new URL('/dashboard/recepcion', request.url));
      }
    }

    // 2.3 Protección: /dashboard/recepcion/* (ADMINISTRADOR y RECEPCIONISTA)
    if (pathname.startsWith('/dashboard/recepcion')) {
      if (rol !== 'ADMINISTRADOR' && rol !== 'RECEPCIONISTA') {
        return NextResponse.redirect(new URL('/dashboard/laboratorio', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};

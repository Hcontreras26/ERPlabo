'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { comparePassword, createSessionToken, getSession, AuthUser, UserRole } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Contraseña requerida'),
});

export async function loginAction(input: z.infer<typeof loginSchema>) {
  try {
    const validated = loginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return { success: false, error: 'Credenciales inválidas. Usuario no encontrado.' };
    }

    if (!user.tenant || !user.tenant.activo) {
      return { success: false, error: 'El laboratorio asignado se encuentra inactivo.' };
    }

    const isValidPassword = await comparePassword(validated.password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Contraseña incorrecta.' };
    }

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      branchId: user.branchId,
      email: user.email,
      nombreCompleto: user.nombreCompleto,
      rol: user.rol as UserRole,
    };

    const token = await createSessionToken(authUser);

    cookies().set('auth_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return {
      success: true,
      user: authUser,
      redirectTo:
        authUser.rol === 'BIOANALISTA'
          ? '/dashboard/laboratorio'
          : '/dashboard/recepcion/nueva',
    };
  } catch (error: any) {
    console.error('Error en login:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: error.message || 'Error en autenticación' };
  }
}

export async function logoutAction() {
  cookies().delete('auth_session');
  redirect('/login');
}

export async function getCurrentUserAction(): Promise<AuthUser | null> {
  return getSession();
}

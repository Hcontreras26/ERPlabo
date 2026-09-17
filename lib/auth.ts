import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'erplis_venezuela_jwt_secret_key_2026_secure_random'
);

export type UserRole = 'ADMINISTRADOR' | 'BIOANALISTA' | 'RECEPCIONISTA';

export interface AuthUser {
  id: string;
  tenantId: string;
  tenantSlug: string;
  branchId?: string | null;
  email: string;
  nombreCompleto: string;
  rol: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    branchId: user.branchId || null,
    email: user.email,
    nombreCompleto: user.nombreCompleto,
    rol: user.rol,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      tenantId: payload.tenantId as string,
      tenantSlug: payload.tenantSlug as string,
      branchId: (payload.branchId as string) || null,
      email: payload.email as string,
      nombreCompleto: payload.nombreCompleto as string,
      rol: payload.rol as UserRole,
    };
  } catch (err) {
    return null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('No autenticado. Inicie sesión para continuar.');
  }
  return session;
}

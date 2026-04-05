import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { getUserRole, getAdminApps } from "@/lib/rbac-server"

import { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: 'analytics-dash.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    callbackUrl: {
      name: 'analytics-dash.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    csrfToken: {
      name: 'analytics-dash.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      // Incoming user is defined only on initial sign in
      if (user) {
        token.role = getUserRole(user.email);
        token.adminApps = getAdminApps(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role || 'user';
        session.user.adminApps = token.adminApps || [];
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/unauthorized',
  }
};

const handler = NextAuth(authOptions);

function setRuntimeAuthUrl(req: Request) {
  // Keep NextAuth URLs aligned with the actual request host/port.
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return;

  const proto = req.headers.get('x-forwarded-proto') || 'http';
  process.env.NEXTAUTH_URL = `${proto}://${host}`;
}

export async function GET(req: Request, ctx: Parameters<typeof handler>[1]) {
  setRuntimeAuthUrl(req);
  return handler(req, ctx);
}

export async function POST(req: Request, ctx: Parameters<typeof handler>[1]) {
  setRuntimeAuthUrl(req);
  return handler(req, ctx);
}

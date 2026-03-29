import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserRole, getAdminApps } from '@/lib/rbac-server';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? 'fallback-secret-for-dev',
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = getUserRole(user.email);
        token.adminApps = getAdminApps(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || 'user';
        (session.user as any).adminApps = token.adminApps || [];
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };

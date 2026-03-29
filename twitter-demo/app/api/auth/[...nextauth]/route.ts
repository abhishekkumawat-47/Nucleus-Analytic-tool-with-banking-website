import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? 'fallback-secret-for-dev',
  session: { strategy: 'jwt' },
  cookies: {
    sessionToken: {
      name: 'twitter-demo.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    callbackUrl: {
      name: 'twitter-demo.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
    csrfToken: {
      name: 'twitter-demo.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      return token;
    },
    async session({ session, token }) {
      return session;
    }
  }
});

export { handler as GET, handler as POST };

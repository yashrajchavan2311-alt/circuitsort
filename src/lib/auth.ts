import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Demo user for portfolio purposes
const DEMO_USER = {
  id: '1',
  email: 'demo@circuitsort.app',
  name: 'CircuitSort Demo User',
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        // Demo credentials check
        if (
          credentials.email === DEMO_USER.email &&
          credentials.password === 'circuitsort1234'
        ) {
          return { ...DEMO_USER };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    // We handle login inline on the main page, so we don't redirect to a separate login page.
    // NextAuth still uses signIn/error callbacks under the hood.
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'circuitsort-portfolio-demo-secret-do-not-use-in-production',
};

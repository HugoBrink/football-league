import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isCreateRoute = nextUrl.pathname.match(/^\/dashboard\/.*\/create$/);
      
      if (isCreateRoute) {
        return isLoggedIn;
      }
      return true; // Allow access to all other routes
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
import type { NextAuthConfig } from 'next-auth';
 
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to the dashboard after login
      return baseUrl + '/dashboard';
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isCreateRoute = nextUrl.pathname.match(/^\/dashboard\/.*\/create$/);
      const isEditRoute = nextUrl.pathname.match(/^\/dashboard\/.*\/edit$/);
      
      if (isCreateRoute || isEditRoute) {
        return isLoggedIn;
      }
      return true; // Allow access to all other routes
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
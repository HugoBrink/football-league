import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import type { User } from './app/lib/definitions';
import prisma from './app/lib/client';

async function getUser(email: string): Promise<User | undefined> {
    console.log('Attempting to fetch user with email:', email);
    try {
        const user = await prisma.users.findFirst({
            where: { email: email }
        });
        console.log('Database response:', user);
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}
 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log('Authorize called with credentials:', credentials);
       
        const parsedCredentials = z
          .object({ 
            email: z.string().email(),
            password: z.string().min(6) 
          })
          .safeParse(credentials);

        console.log('Parsed credentials success:', parsedCredentials.success);
        
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          console.log('Retrieved user:', user);
          if (!user) return null;
          const passwordsMatch = (password === user.password);
 
          if (passwordsMatch) return user;
        }
 
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});
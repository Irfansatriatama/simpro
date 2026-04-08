import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import { prisma } from '@/lib/prisma';

const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
  ].filter((v, i, a) => a.indexOf(v) === i),
  emailAndPassword: {
    enabled: true,
    /** Sign-up publik ditutup; admin pertama hanya lewat /setup atau seed. */
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'developer',
        input: false,
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
        input: false,
      },
      timezone: {
        type: 'string',
        required: false,
        defaultValue: 'Asia/Jakarta',
        input: false,
      },
    },
  },
  plugins: [username(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

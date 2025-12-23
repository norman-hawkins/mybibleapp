// lib/auth.ts
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Anything returned here becomes `user` inside callbacks.jwt on sign-in
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        } as any;
      },
    }),
  ],

  callbacks: {
    // Runs on sign-in AND on every request/session check (JWT strategy)
    async jwt({ token, user }) {
      // On first login, `user` exists (from authorize)
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }

      // 🔥 ALWAYS refresh role from DB (so promotions/demotions apply immediately)
      const userId = (token.id as string) || (token.sub as string);
      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, email: true, name: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          // optional refresh name/email too
          token.email = dbUser.email ?? token.email;
          token.name = dbUser.name ?? token.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },
};
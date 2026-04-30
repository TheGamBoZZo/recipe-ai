import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  // Use JWT so the middleware can verify sessions without hitting the DB
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      // On first sign-in, persist the user id into the token
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      // Make the user id available on the session object
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});

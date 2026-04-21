import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Middleware needs its own lightweight NextAuth instance — no Prisma adapter,
// no DB calls. It only verifies the JWT that's already in the cookie.
const { auth } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Always allow: landing page + all auth endpoints
  if (pathname === "/" || pathname.startsWith("/api/auth")) {
    // If already logged in and hitting "/", send them to /recipes
    if (pathname === "/" && isLoggedIn) {
      return Response.redirect(new URL("/recipes", req.url));
    }
    return;
  }

  // Block everything else for unauthenticated users
  if (!isLoggedIn) {
    const redirectUrl = new URL("/", req.url);
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(redirectUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)).*)",
  ],
};

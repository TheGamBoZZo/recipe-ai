import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import Nav from "@/components/Nav";
import InactivityGuard from "@/components/InactivityGuard";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "Mise — AI Recipe Planner",
  description: "Generate recipes, plan your week, shop smarter.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <Nav session={session} />
        <main style={{ minHeight: "calc(100vh - 64px)" }}>{children}</main>
        {/* Only mount the inactivity guard when a user is signed in */}
        {session && <InactivityGuard />}
        <Analytics />
      </body>
    </html>
  );
}

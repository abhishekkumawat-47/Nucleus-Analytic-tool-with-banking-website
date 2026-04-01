import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/lib/StoreProvider";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "sonner";

/**
 * Root layout with Inter font, Redux provider, and global metadata.
 * Uses Inter for a clean, professional look matching enterprise dashboards.
 */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nucleus | Feature Intelligence & Analytics",
  description:
    "Production-grade SaaS analytics dashboard for tracking feature usage, user behavior, funnel analysis, and tenant comparison with AI-powered insights.",
  keywords: [
    "analytics",
    "dashboard",
    "SaaS",
    "features",
    "metrics",
    "enterprise",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-gray-50/50">
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}

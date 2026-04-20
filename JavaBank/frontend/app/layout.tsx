import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UserContextProvider } from "@/components/context/UserContext";
import NavigationLoader from "@/components/NavigationLoader";
import ProtectedRoute from "@/components/protected";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JavaBank - Modern Banking",
  description: "Manage your finances with ease using JavaBank's secure, modern banking platform.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <UserContextProvider>
          <NavigationLoader />
          <ProtectedRoute>
            {children}
            <Toaster richColors position="top-center" />
          </ProtectedRoute>
        </UserContextProvider>
      </body>
    </html>
  );
}

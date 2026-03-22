import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

import { Navbar } from "@/components/layout/Navbar";
import ConditionalFooter from "@/components/layout/ConditionalFooter";

export const metadata: Metadata = {
  title: "SHIELD | Stay Safe",
  description: "The easiest way to stay safe in your city.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  }
};
import { Providers } from "@/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <Providers>
            <Navbar />
            {children}
            <ConditionalFooter />
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#0a0a0a',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                },
              }}
            />
        </Providers>
      </body>
    </html>
  );
}

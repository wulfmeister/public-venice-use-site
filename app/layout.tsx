import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { AppProvider } from "@/contexts/AppContext";
import { ToastProvider } from "@/contexts/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: "OpenChat — Free AI Chat Powered by Venice",
  description:
    "A free, privacy-focused AI chat assistant. Generate text, images, code, and more — powered by Venice.ai with no sign-up required.",
  openGraph: {
    title: "OpenChat — Free AI Chat Powered by Venice",
    description:
      "A free, privacy-focused AI chat assistant. Generate text, images, code, and more — no sign-up required.",
    type: "website",
    siteName: "OpenChat",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "OpenChat — Free AI Chat Powered by Venice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenChat — Free AI Chat Powered by Venice",
    description:
      "A free, privacy-focused AI chat assistant powered by Venice.ai.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <AppProvider>
            <ThemeProvider>
              <ChatProvider>{children}</ChatProvider>
            </ThemeProvider>
          </AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

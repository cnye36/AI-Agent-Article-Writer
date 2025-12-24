import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Let AI Write It! - AI-Powered Article Writer",
  description:
    "Create high-quality articles with AI-powered research, outlining, and writing tools.",
  icons: {
    icon: [
      { url: "/Letaiwriteit-logo-64px.png", sizes: "64x64", type: "image/png" },
      {
        url: "/Letaiwriteit-logo-128px.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        url: "/Letaiwriteit-logo-256px.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/Letaiwriteit-logo-256px.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { SessionProvider } from "@/lib/firebase/session";
import "./globals.css";

export const metadata: Metadata = { title: "CRMEI", description: "Entenda o dinheiro do seu negócio em um minuto por dia." };
export const viewport: Viewport = { themeColor: "#1F5A3D", width: "device-width", initialScale: 1 };

const themeScript = `try{if(localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-dvh font-sans antialiased"><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}

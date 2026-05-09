import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "RenombrAitor — Renombrado inteligente de archivos con IA",
  description: "Renombra archivos de forma masiva e inteligente usando IA. Soporta snake_case, camelCase, prefijos, fechas y más.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "RenombrAitor — Renombrado inteligente de archivos con IA",
    description: "Renombra archivos de forma masiva e inteligente usando IA. Soporta snake_case, camelCase, prefijos, fechas y más.",
    url: "https://renombraitor.vercel.app",
    siteName: "RenombrAitor",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RenombrAitor — Renombrado inteligente de archivos con IA",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RenombrAitor — Renombrado inteligente de archivos con IA",
    description: "Renombra archivos de forma masiva e inteligente usando IA. Soporta snake_case, camelCase, prefijos, fechas y más.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `try{var s=JSON.parse(localStorage.getItem('renombraitor-theme')||'{}');if(s.state&&s.state.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
            }}
          />
        </head>
        <body className="antialiased min-h-screen flex flex-col">
          {children}
          <Toaster
            theme="system"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "!bg-[hsl(var(--card))] !border-[hsl(var(--border))] !text-[hsl(var(--foreground))]",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}

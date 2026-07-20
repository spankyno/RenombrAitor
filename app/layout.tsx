import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "RenombrAitor 🛠️ — Renombrado masivo y técnico de archivos (100% Local)",
  description: "La herramienta más rápida y segura para renombrar archivos masivamente. Privacidad total (100% local), sin IA. Soporta Regex, prefijos, fechas, camelCase y más.",
  authors: [{ name: "Aitor Sánchez Gutiérrez" }],
  keywords: ["renombrar archivos", "batch rename", "renombrar masivo", "file renamer", "privacidad", "herramienta local"],
  verification: {
    google: "MEiDmnJOvnWITHUi0HCLxuoulOEm0oTM4fwQMugxoyY",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "RenombrAitor 🛠️ — Renombrado masivo y técnico de archivos (100% Local)",
    description: "Renombra archivos de forma masiva y segura sin que salgan de tu ordenador. Herramientas técnicas offline y privacidad garantizada.",
    url: "https://renombraitor.vercel.app",
    siteName: "RenombrAitor",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RenombrAitor — Herramienta técnica de renombrado masivo local",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RenombrAitor 🛠️ — Renombrado masivo y técnico de archivos",
    description: "Renombra archivos masivamente con total privacidad. 100% local, herramientas técnicas avanzadas.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_Y2xlcmsuYWNjb3VudHMuZGV2JA";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "RenombrAitor",
    "url": "https://renombraitor.vercel.app",
    "description": "Herramienta técnica de renombrado masivo de archivos local y segura.",
    "applicationCategory": "Utility",
    "operatingSystem": "All",
    "author": {
      "@type": "Person",
      "name": "Aitor Sánchez Gutiérrez",
      "url": "https://aitorsanchez.pages.dev"
    },
    "sameAs": [
      "https://aitorhub.vercel.app/"
    ]
  };

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="es" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `try{var s=JSON.parse(localStorage.getItem('renombraitor-theme')||'{}');if(s.state&&s.state.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
            }}
          />
        {/* Aitor's Analytics — tracker de visitas */}
          <script
            src="https://aitors-hub-dashboard.asanchezgu.workers.dev/tracker.js"
            data-app="renombraitor"
            data-key="ak_d91a6c75cd1b460c9860a4ff06da70e2"
            strategy="afterInteractive"
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

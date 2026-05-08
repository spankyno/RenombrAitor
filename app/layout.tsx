import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "RenombrAitor — Renombrado inteligente de archivos con IA",
  description:
    "Renombra archivos de forma masiva e inteligente usando Gemini AI. Soporta snake_case, camelCase, prefijos, fechas y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // No 'dark' class here — ThemeToggle applies it via useEffect.
    // A small inline script avoids flash-of-wrong-theme on reload.
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Restore persisted theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = JSON.parse(localStorage.getItem('renombraitor-theme') || '{}');
                if (s.state && s.state.theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
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
  );
}

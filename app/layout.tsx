import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "RenombrAitor — Renombrado inteligente de archivos con IA",
  description:
    "Renombra archivos de forma masiva e inteligente usando Gemini AI. Soporta snake_case, camelCase, prefijos, fechas y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(222 18% 11%)",
              border: "1px solid hsl(220 15% 18%)",
              color: "hsl(210 20% 92%)",
            },
          }}
        />
      </body>
    </html>
  );
}

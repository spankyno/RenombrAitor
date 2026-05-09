"use client";

import { Mail, Globe, ExternalLink } from "lucide-react";

const LINKS = [
  { label: "Contacto", href: "https://aitor-blog-contacto.vercel.app/" },
  { label: "Blog", href: "https://aitorsanchez.pages.dev/" },
  { label: "Más apps", href: "https://aitorhub.vercel.app/" },
];

export function Footer() {
  return (
    <footer
      className="mt-auto border-t py-6 px-6"
      style={{
        borderColor: "hsl(var(--border))",
        background: "hsl(var(--card))",
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
        style={{ color: "hsl(var(--muted-foreground))" }}>

        {/* Left: author + copyright */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <p className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
            Aitor Sánchez Gutiérrez
          </p>
          <p>© 2026 · Reservados todos los derechos</p>
          <a
            href="mailto:blog.cottage627@passinbox.com"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--primary))" }}
          >
            <Mail size={11} />
            blog.cottage627@passinbox.com
          </a>
        </div>

        {/* Right: links */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <Globe size={11} />
              {label}
              <ExternalLink size={9} className="opacity-50" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

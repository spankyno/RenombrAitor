"use client";

import { motion } from "framer-motion";
import {
  FolderOpen, Zap, Shield, ArrowRight, AlertTriangle,
  Wrench, Eye, Globe, LogIn, UserPlus, Info,
} from "lucide-react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/features/theme-toggle";
import { cn } from "@/lib/utils";
import { isFileSystemAccessSupported } from "@/hooks/use-file-system";
import type { UsageInfo } from "@/hooks/use-usage";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Wrench,
    title: "Toolbox de renombrado",
    desc: "8 herramientas offline: cambio de mayúsculas (snake_case, camelCase), reemplazar texto (comodines * y ?), insertar/eliminar caracteres, enumerar, fecha de modificación, nombres aleatorios y cambio de extensión.",
    color: "hsl(var(--accent))",
    badge: "Herramientas",
  },
  {
    icon: Eye,
    title: "Vista previa editable",
    desc: "Revisa cada propuesta antes de aplicar. Edita nombres individuales, detecta conflictos automáticamente y aplica solo cuando estés seguro de los cambios.",
    color: "hsl(130 60% 50%)",
    badge: "Preview",
  },
  {
    icon: Shield,
    title: "Privacidad total",
    desc: "Tus archivos nunca salen de tu ordenador. Todo el proceso de renombrado ocurre localmente en tu navegador usando la tecnología File System Access.",
    color: "hsl(45 90% 50%)",
    badge: "Local",
  },
  {
    icon: Shield,
    title: "Archivos siempre seguros",
    desc: "Los originales nunca se modifican. La app copia los archivos renombrados a una subcarpeta «_Renamed» creada automáticamente.",
    color: "hsl(215 90% 55%)",
    badge: "Seguro",
  },
];

const STACK = [
  { label: "Next.js 15",        sublabel: "App Router",         color: "hsl(var(--foreground))" },
  { label: "React 19",          sublabel: "Server Components",  color: "hsl(195 90% 50%)" },
  { label: "TypeScript 5",      sublabel: "Strict mode",        color: "hsl(215 80% 60%)" },
  { label: "Tailwind CSS v4",   sublabel: "CSS Variables",      color: "hsl(195 70% 55%)" },
  { label: "Framer Motion",     sublabel: "Animaciones",        color: "hsl(270 70% 65%)" },
  { label: "Zustand 5",         sublabel: "Estado global",      color: "hsl(45 80% 55%)" },
  { label: "Clerk",             sublabel: "Autenticación",      color: "hsl(250 80% 65%)" },
  { label: "File System API",   sublabel: "Nativa del navegador", color: "hsl(45 80% 50%)" },
];

const EXAMPLES = [
  "snake_case",
  'Prefijo "2024_"',
  "Numeración 001",
  "Eliminar espacios",
  "camelCase",
  "Extensión .jpg",
];

// ── Component ─────────────────────────────────────────────────────────────────

interface HeroScreenProps {
  onSelectFolder: () => void;
  isLoading: boolean;
  usage: UsageInfo;
}

export function HeroScreen({ onSelectFolder, isLoading, usage }: HeroScreenProps) {
  const { isSignedIn, user } = useUser();
  const isSupported = isFileSystemAccessSupported();

  const canUseToolbox = isSignedIn || usage.remaining > 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between"
        style={{ background: "hsl(var(--card)/0.9)", borderColor: "hsl(var(--border))", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--primary)/0.15)" }}>
            <Wrench size={14} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <span className="font-bold text-sm">
            <span className="gradient-text">Renombr</span><span>Aitor</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs hidden sm:block" style={{ color: "hsl(var(--muted-foreground))" }}>
                {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress}
              </span>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <SignInButton mode="modal">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}>
                  <LogIn size={12} /> Iniciar sesión
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <UserPlus size={12} /> Registrarse
                </button>
              </SignUpButton>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center py-24 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary)/0.06) 0%, transparent 70%)" }} />

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-4">
          <span className="gradient-text">Renombr</span>
          <span style={{ color: "hsl(var(--foreground))" }}>Aitor</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg sm:text-xl mb-8 max-w-2xl"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          Herramienta técnica para el renombrado masivo de archivos.<br />
          <strong className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
            Sin servidores, sin IA, 100% privacidad local.
          </strong>
        </motion.p>

        {/* Example chips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2 justify-center mb-10 max-w-xl">
          {EXAMPLES.map((ex, i) => (
            <motion.span key={ex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              className="text-xs px-2.5 py-1 rounded-full border font-mono"
              style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              {ex}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-3">

          {!isSupported ? (
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border text-sm"
              style={{ background: "hsl(30 80% 50%/0.08)", borderColor: "hsl(30 80% 50%/0.3)", color: "hsl(30 60% 45%)" }}>
              <AlertTriangle size={18} />
              <div className="text-left">
                <p className="font-semibold">Navegador no compatible</p>
                <p className="text-xs opacity-80 mt-0.5">Usa Chrome 86+ o Edge 86+ para acceder al sistema de archivos</p>
              </div>
            </div>
          ) : !canUseToolbox ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border text-sm"
                style={{ background: "hsl(0 70% 50%/0.08)", borderColor: "hsl(0 70% 50%/0.3)", color: "hsl(0 60% 45%)" }}>
                <AlertTriangle size={18} />
                <p>Has alcanzado el límite diario como invitado. Regístrate para uso ilimitado.</p>
              </div>
              <SignUpButton mode="modal">
                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm hover:scale-105 active:scale-95 transition-all"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <UserPlus size={16} /> Crear cuenta gratuita
                </button>
              </SignUpButton>
            </div>
          ) : (
            <button onClick={onSelectFolder} disabled={isLoading}
              className={cn("group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed glow-primary")}
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))", color: "hsl(var(--primary-foreground))" }}>
              {isLoading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                  Leyendo archivos...
                </>
              ) : (
                <>
                  <FolderOpen size={20} />
                  Seleccionar Carpeta Origen
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}

          {!isSignedIn && canUseToolbox && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              <Info size={12} />
              <span>Límite de invitado: {usage.remaining}/{2} usos hoy · máx. {usage.maxFiles} archivos</span>
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Potencia técnica, privacidad total</h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
              RenombrAitor combina lo mejor de las herramientas clásicas de escritorio con la agilidad de la web, manteniendo tus datos siempre locales.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-2xl border"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}18` }}>
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-bold">{f.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${f.color}18`, color: f.color }}>{f.badge}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ── */}
      <section className="py-16 px-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-3"
              style={{ background: "hsl(var(--accent)/0.08)", borderColor: "hsl(var(--accent)/0.2)", color: "hsl(var(--accent))" }}>
              <Globe size={11} /> Stack tecnológico
            </div>
            <h2 className="text-2xl font-bold">Construido con tecnología moderna</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STACK.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: "hsl(var(--foreground))" }}>{s.label}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{s.sublabel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

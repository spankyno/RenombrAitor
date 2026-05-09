"use client";

import { motion } from "framer-motion";
import {
  FolderOpen, Sparkles, Zap, Shield, ArrowRight, AlertTriangle,
  Bot, Wrench, Eye, Brain, Globe, LogIn, UserPlus, Info,
} from "lucide-react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/features/theme-toggle";
import { cn } from "@/lib/utils";
import { isFileSystemAccessSupported } from "@/hooks/use-file-system";
import type { UsageInfo } from "@/hooks/use-usage";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Bot,
    title: "IA multiproveedor",
    desc: "Chat en lenguaje natural con DeepSeek, Gemini 1.5 Flash, OpenRouter (Llama 3.1 8B) o Grok 3 Mini. Solo se envían nombres de archivo — nunca el contenido — para no agotar las cuotas.",
    color: "hsl(var(--primary))",
    badge: "IA",
  },
  {
    icon: Wrench,
    title: "Toolbox sin IA",
    desc: "8 herramientas offline: cambio de mayúsculas, reemplazar texto (comodines * y ?), insertar/eliminar caracteres, enumerar, fecha de modificación, nombres aleatorios y cambio de extensión.",
    color: "hsl(var(--accent))",
    badge: "Offline",
  },
  {
    icon: Eye,
    title: "Vista previa editable",
    desc: "Revisa cada propuesta antes de aplicar. Edita nombres individuales, detecta conflictos automáticamente y aplica solo cuando estés seguro.",
    color: "hsl(130 60% 50%)",
    badge: "Preview",
  },
  {
    icon: Shield,
    title: "Archivos siempre seguros",
    desc: "Los originales nunca se modifican. La app copia los archivos renombrados a una carpeta «_Renamed» creada automáticamente dentro de la carpeta origen.",
    color: "hsl(45 90% 50%)",
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
  { label: "DeepSeek Chat",     sublabel: "IA · Default",       color: "hsl(215 90% 60%)" },
  { label: "Gemini 1.5 Flash",  sublabel: "IA · Google",        color: "hsl(130 60% 50%)" },
  { label: "Llama 3.1 8B",      sublabel: "IA · OpenRouter",    color: "hsl(270 60% 60%)" },
  { label: "Grok 3 Mini",       sublabel: "IA · xAI",           color: "hsl(0 60% 60%)" },
  { label: "File System API",   sublabel: "Nativa del navegador", color: "hsl(45 80% 50%)" },
];

const AI_MODELS = [
  { name: "DeepSeek Chat",    tag: "Defecto",   color: "hsl(215 90% 60%)" },
  { name: "Gemini 1.5 Flash", tag: "Google",    color: "hsl(130 60% 50%)" },
  { name: "Llama 3.1 8B",     tag: "OpenRouter",color: "hsl(270 60% 60%)" },
  { name: "Grok 3 Mini",      tag: "xAI",       color: "hsl(0 60% 60%)"   },
];

const EXAMPLES = [
  "Renombra en snake_case",
  'Añade prefijo "2024_"',
  "Numera del 001 en adelante",
  "Elimina espacios",
  "Formato fecha_nombre.ext",
  "Convierte a camelCase",
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
  const canUseAI = isSignedIn;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between"
        style={{ background: "hsl(var(--card)/0.9)", borderColor: "hsl(var(--border))", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--primary)/0.15)" }}>
            <Sparkles size={14} style={{ color: "hsl(var(--primary))" }} />
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
      <section className="relative flex flex-col items-center justify-center py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary)/0.06) 0%, transparent 70%)" }} />

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ background: "hsl(var(--primary)/0.08)", borderColor: "hsl(var(--primary)/0.25)", color: "hsl(var(--primary))" }}>
            <Brain size={12} /> {AI_MODELS.map(m => m.name).join(" · ")}
          </span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-4">
          <span className="gradient-text">Renombr</span>
          <span style={{ color: "hsl(var(--foreground))" }}>Aitor</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg sm:text-xl mb-6 max-w-xl"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          Renombra archivos de forma masiva con IA o con herramientas predefinidas.<br />
          <strong className="font-medium" style={{ color: "hsl(var(--foreground))" }}>
            Solo se procesan los nombres — nunca el contenido de tus archivos.
          </strong>
        </motion.p>

        {/* Example chips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-2 justify-center mb-8 max-w-xl">
          {EXAMPLES.map((ex, i) => (
            <motion.span key={ex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              className="text-xs px-2.5 py-1 rounded-full border font-mono"
              style={{ background: "hsl(var(--muted))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              &quot;{ex}&quot;
            </motion.span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-col items-center gap-3">

          {/* Guest limit banner */}
          {!isSignedIn && !usage.isLoading && (
            <div className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border"
              style={{ background: "hsl(45 80% 50%/0.08)", borderColor: "hsl(45 80% 50%/0.3)", color: "hsl(45 60% 45%)" }}>
              <Info size={13} />
              <span>
                Sin cuenta: solo Toolbox · {usage.remaining}/{2} usos hoy · máx. {usage.maxFiles} archivos por sesión
              </span>
            </div>
          )}

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
                <p>Has alcanzado el límite diario de 2 usos. Regístrate para uso ilimitado.</p>
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

          {/* AI restriction notice for guests */}
          {!isSignedIn && canUseToolbox && (
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Como invitado solo tendrás acceso al Toolbox.{" "}
              <SignInButton mode="modal">
                <button className="underline hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--primary))" }}>
                  Inicia sesión
                </button>
              </SignInButton>{" "}
              para usar la IA.
            </p>
          )}
        </motion.div>
      </section>

      {/* ── AI Models ── */}
      <section className="py-12 px-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-3"
              style={{ background: "hsl(var(--primary)/0.08)", borderColor: "hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }}>
              <Zap size={11} /> Modelos de IA disponibles
            </div>
            <h2 className="text-2xl font-bold mb-2">Elige tu motor de IA</h2>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              La IA solo recibe los <strong>nombres</strong> de tus archivos, nunca su contenido — consumo de tokens mínimo.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AI_MODELS.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${m.color}22`, color: m.color }}>
                  {m.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-12 px-6 border-t" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-2xl font-bold text-center mb-8">Funcionalidades</motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-xl border"
                style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${f.color}18` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
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
      <section className="py-12 px-6 border-t" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border mb-3"
              style={{ background: "hsl(var(--accent)/0.08)", borderColor: "hsl(var(--accent)/0.2)", color: "hsl(var(--accent))" }}>
              <Globe size={11} /> Stack tecnológico
            </div>
            <h2 className="text-2xl font-bold">Construido con lo mejor de 2026</h2>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

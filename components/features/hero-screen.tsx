"use client";

import { motion } from "framer-motion";
import { FolderOpen, Sparkles, Zap, Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFileSystemAccessSupported } from "@/hooks/use-file-system";

interface HeroScreenProps {
  onSelectFolder: () => void;
  isLoading: boolean;
}

const features = [
  {
    icon: Sparkles,
    label: "IA Gemini 2.5 Pro",
    desc: "Renombrado inteligente con instrucciones en lenguaje natural",
  },
  {
    icon: Zap,
    label: "Procesamiento local",
    desc: "Los archivos nunca salen de tu ordenador",
  },
  {
    icon: Shield,
    label: "Carpeta destino segura",
    desc: "Los originales siempre se mantienen intactos",
  },
];

const examples = [
  "Renombra en snake_case y minúsculas",
  "Añade el prefijo 2024_ a todos",
  "Formato: autor_título_fecha.ext",
  "Numera del 001 al 999",
  "Elimina espacios y caracteres especiales",
  "Convierte a camelCase",
];

export function HeroScreen({ onSelectFolder, isLoading }: HeroScreenProps) {
  const isSupported = isFileSystemAccessSupported();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(195 100% 55% / 0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, hsl(270 80% 65% / 0.05) 0%, transparent 60%)",
        }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: "hsl(195 100% 55% / 0.04)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: "hsl(270 80% 65% / 0.04)" }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              background: "hsl(195 100% 55% / 0.08)",
              borderColor: "hsl(195 100% 55% / 0.25)",
              color: "hsl(195 100% 65%)",
            }}
          >
            <Sparkles size={12} />
            Powered by Gemini 2.5 Pro
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-4"
        >
          <span className="gradient-text">Renombr</span>
          <span style={{ color: "hsl(210 20% 92%)" }}>Aitor</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl mb-3 max-w-xl"
          style={{ color: "hsl(215 15% 60%)" }}
        >
          Renombra archivos de forma masiva e inteligente.
          <br />
          Describe cómo quieres renombrarlos y la IA se encarga.
        </motion.p>

        {/* Example chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="flex flex-wrap gap-2 justify-center mb-10 max-w-2xl"
        >
          {examples.map((ex, i) => (
            <motion.span
              key={ex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="text-xs px-2.5 py-1 rounded-full border font-mono"
              style={{
                background: "hsl(220 15% 13%)",
                borderColor: "hsl(220 15% 20%)",
                color: "hsl(215 15% 55%)",
              }}
            >
              &quot;{ex}&quot;
            </motion.span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {!isSupported ? (
            <div
              className="flex items-center gap-3 px-6 py-4 rounded-2xl border text-sm"
              style={{
                background: "hsl(30 80% 50% / 0.08)",
                borderColor: "hsl(30 80% 50% / 0.3)",
                color: "hsl(30 80% 65%)",
              }}
            >
              <AlertTriangle size={18} />
              <div className="text-left">
                <p className="font-semibold">Navegador no compatible</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Usa Chrome 86+ o Edge 86+ para acceder al sistema de archivos
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onSelectFolder}
              disabled={isLoading}
              className={cn(
                "group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300",
                "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                "glow-primary"
              )}
              style={{
                background: "linear-gradient(135deg, hsl(195 100% 50%), hsl(195 100% 40%))",
                color: "hsl(222 20% 8%)",
              }}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                  />
                  Leyendo archivos...
                </>
              ) : (
                <>
                  <FolderOpen size={20} />
                  Seleccionar Carpeta Origen
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border"
              style={{
                background: "hsl(222 18% 10%)",
                borderColor: "hsl(220 15% 16%)",
              }}
            >
              <feat.icon
                size={20}
                style={{ color: "hsl(195 100% 60%)" }}
              />
              <p className="text-sm font-medium" style={{ color: "hsl(210 20% 85%)" }}>
                {feat.label}
              </p>
              <p className="text-xs text-center" style={{ color: "hsl(215 15% 50%)" }}>
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

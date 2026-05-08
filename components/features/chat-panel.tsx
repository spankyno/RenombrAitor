"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, ChevronRight } from "lucide-react";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { ProviderSelector } from "@/components/features/provider-selector";
import type { ProviderId } from "@/lib/ai-providers";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isGenerating: boolean;
  filesCount: number;
  providerId: ProviderId;
  onProviderChange: (id: ProviderId) => void;
}

const QUICK_PROMPTS = [
  "Renombra en snake_case y minúsculas",
  "Añade el prefijo 2024_ a todos los archivos",
  "Numera los archivos del 001 en adelante",
  "Elimina espacios y caracteres especiales",
  "Convierte los nombres a camelCase",
  "Formato: fecha_nombre.ext (usa fecha de hoy)",
  "Añade el sufijo _v1 a todos",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={i > 0 ? "mt-1" : ""}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} style={{ color: "hsl(195 100% 70%)" }}>
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
        style={{
          background: isUser
            ? "hsl(270 80% 65% / 0.2)"
            : "hsl(195 100% 55% / 0.15)",
          border: `1px solid ${isUser ? "hsl(270 80% 65% / 0.3)" : "hsl(195 100% 55% / 0.25)"}`,
        }}
      >
        {isUser ? (
          <User size={14} style={{ color: "hsl(270 80% 70%)" }} />
        ) : (
          <Bot size={14} style={{ color: "hsl(195 100% 65%)" }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
          message.isLoading && "typing-cursor"
        )}
        style={{
          background: isUser
            ? "hsl(270 80% 65% / 0.12)"
            : "hsl(222 18% 14%)",
          border: `1px solid ${isUser ? "hsl(270 80% 65% / 0.2)" : "hsl(220 15% 20%)"}`,
          color: isUser ? "hsl(210 20% 90%)" : "hsl(210 20% 85%)",
        }}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(195 100% 60%)" }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            <span style={{ color: "hsl(215 15% 55%)" }}>Analizando archivos...</span>
          </div>
        ) : (
          renderContent(message.content)
        )}
      </div>
    </motion.div>
  );
}

export function ChatPanel({
  messages,
  onSend,
  isGenerating,
  filesCount,
  providerId,
  onProviderChange,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput("");
    setShowQuickPrompts(false);
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setShowQuickPrompts(false);
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex flex-col h-full rounded-xl border overflow-hidden"
      style={{
        background: "hsl(222 18% 10%)",
        borderColor: "hsl(220 15% 16%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220 15% 16%)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(195 100% 55% / 0.15)" }}
        >
          <Sparkles size={14} style={{ color: "hsl(195 100% 65%)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Chat con IA</p>
          <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
            {filesCount} nombres listos · solo se envían nombres, no contenido
          </p>
        </div>
        <ProviderSelector value={providerId} onChange={onProviderChange} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "hsl(195 100% 55% / 0.1)" }}
            >
              <Bot size={22} style={{ color: "hsl(195 100% 65%)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "hsl(210 20% 80%)" }}>
                ¿Cómo quieres renombrar los archivos?
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(215 15% 50%)" }}>
                Describe el formato o patrón que deseas usar
              </p>
            </div>
          </motion.div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <AnimatePresence>
        {showQuickPrompts && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t overflow-hidden"
            style={{ borderColor: "hsl(220 15% 16%)" }}
          >
            <div className="p-3">
              <p
                className="text-xs mb-2 font-medium"
                style={{ color: "hsl(215 15% 50%)" }}
              >
                Sugerencias rápidas:
              </p>
              <div className="flex flex-col gap-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                    style={{ color: "hsl(215 15% 60%)" }}
                  >
                    <ChevronRight size={12} style={{ color: "hsl(195 100% 60%)", flexShrink: 0 }} />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div
        className="p-3 border-t"
        style={{ borderColor: "hsl(220 15% 16%)" }}
      >
        <div
          className="flex gap-2 items-end rounded-xl border p-2 transition-colors focus-within:border-[hsl(195_100%_55%/0.4)]"
          style={{
            background: "hsl(220 15% 13%)",
            borderColor: "hsl(220 15% 20%)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Renombra en snake_case con fecha de hoy..."
            rows={1}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-sm resize-none outline-none min-h-[36px] max-h-[120px] py-1.5 px-1 placeholder:text-[hsl(215_15%_38%)] disabled:opacity-50"
            style={{
              color: "hsl(210 20% 88%)",
              scrollbarWidth: "thin",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
              "hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            style={{
              background: input.trim()
                ? "linear-gradient(135deg, hsl(195 100% 50%), hsl(195 100% 40%))"
                : "hsl(220 15% 20%)",
              color: input.trim() ? "hsl(222 20% 8%)" : "hsl(215 15% 45%)",
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: "hsl(215 15% 38%)" }}>
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}

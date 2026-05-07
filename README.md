# RenombrAitor 🤖

> Renombrado masivo e inteligente de archivos usando Gemini AI y File System Access API

RenombrAitor es una aplicación web moderna que permite renombrar archivos de una carpeta de tu disco duro de forma masiva e inteligente, usando lenguaje natural para describir cómo quieres renombrarlos.

---

## ✨ Funcionalidades

### Principales
- **Selección de carpeta origen** con File System Access API (los archivos nunca salen de tu ordenador)
- **Carpeta destino automática** creada al mismo nivel que la carpeta origen (llamada `Destino-RenombrAitor`)
- **Chat con Gemini 2.5 Pro** para describir en lenguaje natural cómo renombrar
- **Vista previa lado a lado** de nombre actual → nombre propuesto
- **Edición individual** de cualquier nombre propuesto antes de aplicar
- **Aplicación segura**: los originales nunca se modifican, solo se copian con el nuevo nombre

### Formatos de renombrado soportados
- `snake_case` y `camelCase`
- Añadir prefijos y/o sufijos
- Numeración secuencial (`001`, `002`, ...)
- Formato fecha (`2024-01-15_nombre.ext`)
- Eliminar espacios y caracteres especiales
- Conversión a minúsculas / MAYÚSCULAS
- Cualquier instrucción en lenguaje natural

### UX/UI
- 🌑 Dark mode por defecto
- 🎞️ Animaciones suaves con Framer Motion
- 🔔 Notificaciones toast (Sonner)
- ⚡ Loading states con indicadores de progreso
- 📱 Responsive (prioriza desktop)
- 🌐 Sugerencias rápidas de renombrado

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | React 19 |
| **Lenguaje** | TypeScript 5 |
| **Estilos** | Tailwind CSS v4 |
| **Componentes** | Radix UI primitives |
| **Iconos** | Lucide React |
| **Animaciones** | Framer Motion 12 |
| **Estado global** | Zustand 5 |
| **IA** | Google Gemini 2.5 Pro (`@google/generative-ai`) |
| **Notificaciones** | Sonner 2 |
| **File System** | File System Access API (nativa del navegador) |
| **Persistencia** | IndexedDB (nombres de carpeta) |
| **Deploy** | Vercel (free tier compatible) |

---

## 🚀 Instalación y desarrollo local

### Requisitos
- Node.js 20+
- Chrome 86+ o Edge 86+ (para File System Access API)
- Cuenta en [Google AI Studio](https://aistudio.google.com/) para la API key de Gemini

### Pasos

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/renombraitor.git
cd renombraitor

# 2. Instala dependencias
npm install

# 3. Configura las variables de entorno
cp .env.example .env.local
# Edita .env.local y añade tu GEMINI_API_KEY

# 4. Inicia el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en Chrome o Edge.

---

## 🔑 Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | API Key de Google Gemini AI | ✅ Sí |

### Obtener la API Key de Gemini
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea un proyecto o selecciona uno existente
3. Genera una nueva API Key
4. Añádela a `.env.local` o a las variables de entorno de Vercel

---

## 🌐 Deploy en Vercel

### Pasos para deploy

```bash
# Opción 1: Via Vercel CLI
npm install -g vercel
vercel

# Opción 2: Conecta tu repositorio de GitHub en vercel.com
```

### Configuración en Vercel Dashboard
1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Añade `GEMINI_API_KEY` con tu clave

> ✅ **Compatible con Vercel Free Tier**: Las API routes están configuradas con `maxDuration: 30` segundos, dentro del límite gratuito.

---

## 📁 Estructura del proyecto

```
renombraitor/
├── app/
│   ├── api/
│   │   └── gemini/
│   │       └── route.ts        # Endpoint que llama a Gemini API
│   ├── globals.css             # Variables CSS, tema dark, utilidades
│   ├── layout.tsx              # Root layout con fuentes y Toaster
│   └── page.tsx                # Página principal y orquestación de estados
│
├── components/
│   └── features/
│       ├── hero-screen.tsx     # Pantalla inicial con CTA
│       ├── nav-bar.tsx         # Barra de navegación con pasos
│       ├── file-list-panel.tsx # Panel de archivos escaneados
│       ├── chat-panel.tsx      # Chat con Gemini + sugerencias rápidas
│       ├── preview-table.tsx   # Tabla de preview editable
│       └── done-screen.tsx     # Pantalla de éxito/resultados
│
├── hooks/
│   ├── use-file-system.ts      # File System Access API hooks
│   └── use-gemini.ts           # Hook para comunicarse con la API de Gemini
│
├── lib/
│   └── utils.ts                # cn() helper para clases condicionales
│
├── store/
│   └── app-store.ts            # Store global con Zustand
│
├── types/
│   └── index.ts                # Types TypeScript + utilidades
│
├── .env.example                # Ejemplo de variables de entorno
├── vercel.json                 # Configuración de Vercel
├── next.config.ts              # Configuración de Next.js
├── tailwind.config.ts          # Configuración de Tailwind
└── tsconfig.json               # Configuración de TypeScript
```

---

## 🔒 Seguridad y privacidad

- **Los archivos nunca se suben** a ningún servidor. Todo el procesamiento del sistema de archivos ocurre localmente en el navegador.
- **Solo los nombres de archivo** (y tamaño) se envían a la API de Gemini para generar propuestas.
- La API Key de Gemini se guarda en las variables de entorno del servidor y nunca se expone al cliente.
- Los originales **nunca se modifican**: la app copia los archivos con el nuevo nombre a una carpeta destino separada.

---

## 🗺️ Roadmap

- [ ] Registro de usuarios (para más de 30 archivos)
- [ ] Historial de sesiones de renombrado
- [ ] Soporte para subcarpetas (renombrado recursivo)
- [ ] Vista previa de imágenes en miniatura
- [ ] Exportar propuesta como CSV antes de aplicar
- [ ] Undo/Redo de cambios manuales
- [ ] Modo oscuro / claro toggle

---

## ⚠️ Compatibilidad de navegadores

| Navegador | Soporte |
|-----------|---------|
| Chrome 86+ | ✅ Completo |
| Edge 86+ | ✅ Completo |
| Opera 72+ | ✅ Completo |
| Firefox | ❌ No soporta File System Access API |
| Safari | ⚠️ Soporte parcial (sin escritura) |

---

## 📄 Licencia

MIT © RenombrAitor

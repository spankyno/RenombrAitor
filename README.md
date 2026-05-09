# RenombrAitor 🛠️

> Potente herramienta de renombrado masivo y técnico de archivos con privacidad total (100% local).

RenombrAitor es una aplicación web técnica diseñada para usuarios que necesitan renombrar grandes colecciones de archivos de forma rápida, segura y privada. Utiliza la API nativa de acceso al sistema de archivos para trabajar directamente en tu disco duro sin que ningún dato salga de tu navegador.

---

## ✨ Funcionalidades Principales

- **Selección de carpeta local**: Acceso directo a tu sistema de archivos (Chrome/Edge).
- **Toolbox Técnico**: 8 herramientas offline de transformación:
  - Cambiar extensiones.
  - Reemplazar texto con comodines (`*` y `?`).
  - Insertar/Eliminar texto en posiciones específicas.
  - Enumeración secuencial con ceros a la izquierda.
  - Estampado de fecha y hora de modificación.
  - Generación de nombres aleatorios (UUID, hex).
  - Transformación de formato: `snake_case`, `camelCase`, `PascalCase`, etc.
- **Vista Previa de Cambios**: Compara el nombre original con el propuesto antes de confirmar.
- **Detección de Conflictos**: Identifica automáticamente nombres duplicados antes de aplicar.
- **Edición Manual**: Edita cualquier propuesta individualmente.
- **Seguridad Inmejorable**: Los archivos originales nunca se modifican; se crean copias en una subcarpeta `_Renamed` para evitar errores.

---

## 🔒 Privacidad y Límites

- **100% Local**: No hay servidores de procesamiento de archivos ni Inteligencia Artificial. Tus nombres de archivo nunca salen de tu dispositivo.
- **Invitados**:
  - Máximo **30 archivos** por sesión.
  - Límite de **2 sesiones diarias**.
- **Usuarios Registrados**: Registro gratuito vía Clerk para eliminar todos los límites de archivos y sesiones.

---

## 🛠️ Stack Tecnológico

| Tecnología | Descripción |
| :--- | :--- |
| **Next.js 15** | Framework de React con App Router para una navegación fluida. |
| **React 19** | Biblioteca de UI optimizada. |
| **Tailwind CSS v4** | Motor de estilos ultra-rápido para un diseño moderno y responsive. |
| **Framer Motion** | Animaciones de interfaz suaves y profesionales. |
| **Zustand** | Gestión de estado global ligera y eficiente. |
| **Clerk** | Gestión de autenticación segura. |
| **File System API** | Tecnología nativa para manipulación de archivos locales. |
| **Lucide React** | Set de iconos vectoriales minimalistas. |
| **Sonner** | Sistema de notificaciones elegante. |

---

## 🚀 Despliegue y Desarrollo

### Requisitos
- **Navegador**: Chrome 86+ o Edge 86+ (requerido para el acceso al sistema de archivos).
- **Node.js**: v20 o superior.

### Instalación Local
```bash
git clone https://github.com/tu-usuario/renombraitor.git
cd renombraitor
npm install
npm run dev
```

---

## 📄 Licencia

MIT © 2026 Aitor Sánchez Gutiérrez.

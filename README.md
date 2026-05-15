<p align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&duration=2500&pause=500&color=00D4FF&center=true&vCenter=true&width=435&lines=SpaceLab+POS" alt="SpaceLab POS typing SVG" />
  </a>
</p>

<p align="center">
  <sub><b>Desarrollado por <span style="color:#0D0D0D">Raven</span><span style="color:#E60000">Corp</span></b></sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=black"/>
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
  <img src="https://img.shields.io/badge/v0.1.28-00D4FF?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/License-Restricted-E60000?style=for-the-badge"/>
</p>

<p align="center">
  <a href="https://github.com/HiperB1/pos-spacelab/actions/workflows/tauri.yml">
    <img src="https://github.com/HiperB1/pos-spacelab/actions/workflows/tauri.yml/badge.svg?branch=release"/>
  </a>
</p>

<br>

<p align="center">
  <b>SpaceLab POS</b> es una aplicación de escritorio robusta diseñada para la gestión integral de
  facturación, inventarios, contabilidad y logística de entregas. Construida con tecnologías modernas,
  ofrece una interfaz premium, oscura y altamente eficiente para <b>My Space</b> (impresión 3D).
</p>

<br>

<p align="center">
  <img src="src-tauri/icons/HIGHLIGHTS-02.png" alt="SpaceLab POS" width="100" height="100"/>
</p>

<br>

## 📖 Comandos Rápidos

| Comando | Acción |
|---|---|
| `npm run dev` | 💻 Iniciar servidor de desarrollo Vite (puerto 1420) |
| `npm run tauri dev` | 🖥️ Desarrollo completo con backend Rust hot-reload |
| `npm run build` | 🔨 Compilar TypeScript + Vite |
| `npm run tauri build` | 📦 Generar binario de producción (.exe, .dmg, .AppImage) |
| `npm run preview` | 👁️ Vista previa del build |

<br>

<details>
<summary><b>⚡ Características Principales</b></summary>
<br>

| Módulo | Descripción |
|---|---|
| 📊 **Dashboard** | Métricas en tiempo real, ventas del mes, facturas emitidas, metas diarias |
| 🧾 **Facturación** | PDF profesional, guías de envío, descuentos, búsqueda avanzada |
| 📦 **Inventario 3 niveles** | Materias primas, subproductos, productos terminados con stock mínimo |
| 🔧 **Ensamblaje** | Producción automática: descuenta componentes al armar productos finales |
| 🚚 **Logística** | Gestión de domiciliarios, control de despachos, seguimiento de entregas |
| 📈 **Contabilidad** | Reportes avanzados, gráficos dinámicos (Recharts), exportación a Excel |
| 🔄 **Auto-actualización** | Actualización automática vía Tauri updater al publicar nueva versión |
| 💾 **Backup** | Exportación e importación de copias de seguridad en formato JSON |

</details>

<br>

<details>
<summary><b>📸 Capturas de Pantalla</b></summary>
<br>

<p align="center">
  <img src="src-tauri/icons/HIGHLIGHTS-05.png" alt="Dashboard" width="45%"/>
  &nbsp;&nbsp;
  <img src="src-tauri/icons/HIGHLIGHTS-06.png" alt="Facturación" width="45%"/>
</p>

<p align="center">
  <img src="src-tauri/icons/HIGHLIGHTS-07.png" alt="Inventario" width="45%"/>
  &nbsp;&nbsp;
  <img src="src-tauri/icons/HIGHLIGHTS-08.png" alt="Reportes" width="45%"/>
</p>

</details>

<br>

<details>
<summary><b>🚀 Inicio Rápido</b></summary>
<br>

### Requisitos Previos

| Herramienta | Versión | Enlace |
|---|---|---|
| Node.js | ≥ 18 | [https://nodejs.org/](https://nodejs.org/) |
| Rust & Cargo | ≥ 1.70 | [https://rustup.rs/](https://rustup.rs/) |

### Instalación y Desarrollo

```bash
# 1. Clonar el repositorio
git clone git@github.com:HiperB1/pos-spacelab.git
cd pos-spacelab

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm run tauri dev

# 4. Compilar para producción
npm run tauri build
```

> El servidor de desarrollo Vite se ejecuta en el **puerto 1420** (requerido por Tauri).

</details>

<br>

<details>
<summary><b>🏗️ Tech Stack</b></summary>
<br>

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| **UI Framework** | React | ^19.1.0 | Interfaz de usuario |
| **Lenguaje** | TypeScript | ~5.8.3 | Tipado estático |
| **Routing** | react-router-dom | ^7.14.2 | Navegación |
| **Estilos** | Tailwind CSS | ^4.2.4 | Diseño moderno y responsive |
| **Iconos** | lucide-react | ^1.11.0 | Iconografía premium |
| **Gráficos** | Recharts | ^3.8.1 | Analytics y visualización |
| **Notificaciones** | Sonner | ^2.0.7 | Toast interactivos |
| **PDF** | pdfmake | ^0.2.7 | Generación de documentos |
| **Excel** | xlsx + file-saver | ^0.18.5 / ^2.0.5 | Exportación de reportes |
| **Desktop** | Tauri | ^2.11.0 | Empaquetado nativo |
| **Backend** | Rust (src-tauri) | — | Bindings de sistema |

</details>

<br>

<details>
<summary><b>🗄️ Modelo de Datos</b></summary>
<br>

La aplicación utiliza **localStorage** como motor de base de datos con 8 colecciones:

| Colección | Propósito |
|---|---|
| `configuracion` | Prefijo factura, datos de la empresa, numeración |
| `clientes` | Datos de clientes (nombre, NIT, teléfono, dirección) |
| `materias_primas` | Filamentos (PLA, PETG, ABS) con control por kg |
| `subproductos` | Piezas intermedias con stock y costo |
| `productos` | Productos terminados con precio de venta |
| `producto_componentes` | Relación producto ↔ subproducto (cantidad necesaria) |
| `facturas` | Facturas con numeración secuencial, IVA 19% |
| `factura_items` | Detalle de ítems por factura |

```typescript
// Ejemplo: Estructura de una Factura
interface Factura {
  id: string;
  numero: string;            // "DG-00001"
  cliente_nome: string;
  subtotal: number;
  iva: number;               // subtotal * 0.19
  total: number;
  estado: 'activa' | 'anulada';
  fecha: string;             // YYYY-MM-DD
}
```

</details>

<br>

<details>
<summary><b>📁 Estructura del Proyecto</b></summary>
<br>

```
pos-spacelab/
├── src/
│   ├── components/
│   │   ├── ui/          # Button, Input, Select, Modal, Table, Badge, Card
│   │   └── Layout.tsx   # Sidebar + navegación
│   ├── context/         # NavigationContext (tab-based routing)
│   ├── lib/
│   │   ├── database.ts  # Data store central (localStorage)
│   │   ├── types.ts     # Interfaces TypeScript
│   │   ├── facturas.ts  # CRUD facturas
│   │   ├── clientes.ts  # CRUD clientes
│   │   ├── productos.ts # CRUD productos
│   │   ├── pdf.ts       # Generación PDF
│   │   ├── export.ts    # Exportación Excel
│   │   └── backup.ts    # Backup/restore JSON
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Facturas.tsx
│   │   ├── Inventario.tsx
│   │   ├── Clientes.tsx
│   │   └── ...
│   └── App.tsx
├── src-tauri/            # Rust backend + configuración Tauri
├── public/               # Assets estáticos
└── package.json
```

</details>

<br>

<details>
<summary><b>📦 CI/CD y Auto-Update</b></summary>
<br>

### Pipeline

Cada push al branch `release` activa GitHub Actions para compilar y publicar instaladores de:

- **macOS**: Apple Silicon (aarch64) + Intel (x86_64)
- **Windows**: .exe (NSIS installer)
- **Linux**: .AppImage

### Auto-actualización

La aplicación verifica actualizaciones al iniciar usando el plugin `@tauri-apps/plugin-updater`. Cuando se publica una nueva versión en GitHub Releases, los usuarios ven un diálogo de actualización y pueden instalarla sin descargar nada manualmente.

### Publicar una nueva versión

```bash
# 1. Actualizar versión en src-tauri/tauri.conf.json
# 2. Crear PR y hacer merge a release
# 3. El workflow compila y publica automáticamente
```

</details>

<br>

<details>
<summary><b>🔐 Privacidad y Backup</b></summary>
<br>

La aplicación utiliza una **base de datos local (localStorage)** para garantizar que tus datos nunca salgan de tu equipo.

- Puedes **exportar** e **importar** copias de seguridad en formato JSON desde el menú de Configuración.
- Los respaldos almacenan las 8 colecciones en un único archivo JSON.

</details>

<br>

<details>
<summary><b>📄 Licencia</b></summary>
<br>

**SpaceLab POS — Licencia de Uso Restringido**

Este software fue desarrollado exclusivamente para **My Space**.  
No puede ser utilizado directamente por otras empresas u organizaciones.

✅ Permitido: Usar como referencia o inspiración para otros proyectos.  
❌ Prohibido: Usar, ejecutar o distribuir este software tal cual sin autorización.

Ver [LICENSE](LICENSE) para términos completos.

</details>

<br>

<details>
<summary><b>🙏 Créditos</b></summary>
<br>

Desarrollado con ❤️ para **My Space** por el equipo de RavenCorp.

</details>

<br>

~~~
                                                ___
                                               | _ \
                                               |   /
                                               |_|_\
  ____   __   ____  ____   __   ____  ____     | __ ) _   _  ___  ___  ___
 |  _ \  \ \ / /\ \/ /\ \ / /  |  _ \|  _ \    |  _ \| | | |/ _ \/ _ \/ __|
 | |_) |  \ V /  \  /  \ V /   | |_) | |_) |   | |_) | |_| |  __/  __/\__ \
 | .__/    \_/    \/    \_/    | .__/|  __/     |_.__/ \__, |\___|\___||___/
 |_|                           |_|   |_|                |___/
~~~

<p align="center">
  <b>Firmado por <span style="color:#0D0D0D">Raven</span><span style="color:#E60000">Corp</span></b>
</p>

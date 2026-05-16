# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**SpaceLab POS** is a Tauri v2 desktop app (React 19 + TypeScript + Rust) for **MySpace**, a 3D printing business. It handles invoicing, inventory (raw materials → subproducts → finished products), order management, quotes, and reporting. Data persists in `localStorage` — there is no external database.

Full architecture detail is in `AGENTS.md`.

---

## Commands

```bash
# Development
npm run dev           # Vite dev server only (port 1420)
npm run tauri dev     # Full dev with Rust backend hot-reload (use this)

# Build
npm run build         # TypeScript typecheck + Vite build
npm run tauri build   # Production desktop binary
```

**No linting or test suite.** `npm run build` is the only verification step (runs `tsc` + Vite).

---

## Architecture

```
src/lib/
  database.ts             ← Central data store (localStorage key: dg_facturacion_db)
  types.ts                ← All TypeScript interfaces
  venndelo.ts             ← Venndelo API (orders, labels, product sync)
  envio.ts                ← Shipping quote logic
  facturas.ts             ← Factura-specific CRUD helpers
  inventarioMovimientos.ts← Inventory movement audit trail
  materias_primas.ts, productos.ts, subproductos.ts  ← Entity CRUD helpers
  pdf.ts, export.ts, backup.ts, toast.ts

src/context/NavigationContext.tsx  ← Tab-based routing state (not URL-based)
src/components/Layout.tsx ← Sidebar nav + main content area
src/components/ui/        ← Button, Input, Select, Modal, Table, DataTable,
                             Badge, Card, GlobalSearch, KeyboardShortcuts
src/pages/                ← Dashboard, Facturas, Cotizaciones, NotasCredito,
                             Pedidos, Reportes, Clientes, Configuracion,
                             Disponibilidad, HistorialInventario,
                             Inventario (+ InventarioMP, InventarioSubproductos,
                             InventarioProductos, InventarioCombos)
src-tauri/src/lib.rs      ← Minimal Rust: file I/O (guide downloads), auto-updater
```

### Data Flow

1. User navigates via sidebar → `NavigationContext` switches active tab
2. Pages call CRUD functions from `database.ts` directly (no API layer)
3. `database.ts` reads/writes a single JSON blob to `localStorage`
4. PDF (`pdfmake`) and Excel (`xlsx`) generation happen client-side

### Key Collections in localStorage

`configuracion`, `clientes`, `materias_primas`, `subproductos`, `productos`, `producto_componentes`, `combos`, `combo_items`, `facturas`, `factura_items`, `cotizaciones`, `cotizacion_items`, `notas_credito`, `nota_credito_items`, `pedidos`, `domiciliarios`, `abonos`

---

## External Integrations

- **Venndelo** (`src/lib/venndelo.ts`, `src/lib/envio.ts`): national shipping logistics. Config key: `api_key_venndelo`. Auto-syncs products every 24 h on app start. Orders, labels, and shipment tracking are created from Facturas. Full API reference → `.claude/agents/venndelo-expert.md`

---

## Critical Constraints

- **Port 1420 is fixed** in `vite.config.ts` — Tauri requires it, do not change.
- **IVA is always 0** — `Factura.iva` field exists but DB layer sets it to `0`; do not assume 19%.
- **sql.js excluded from Vite deps** in `vite.config.ts` — do not remove that exclusion.
- **No URL-based routing** — navigation is controlled by `NavigationContext`, not `react-router`.
- **Ignore Docker files** (`Dockerfile`, `init.sql`) — they are unused artifacts.

---

## Code Conventions

- **Naming**: files `camelCase`, interfaces `PascalCase`, DB fields `snake_case`, TS interfaces `camelCase`
- **IDs**: `crypto.randomUUID()` (not the `uuid` package)
- **Dates**: ISO strings `YYYY-MM-DD`
- **Money**: plain `number` (no currency formatting in DB layer)
- **Toasts**: `sonner` via `src/lib/toast.ts` wrapper
- **Language**: UI text and variable names are in Spanish

### Standard page structure

```tsx
export function PageName() {
  const [data, setData] = useState<Type[]>([]);
  useEffect(() => { setData(getX()); }, []);
  return <div className="p-6">...</div>;
}
```

### Adding a new page

1. Create `src/pages/NewPage.tsx`
2. Add `{activeTab === 'newpage' && <NewPage />}` in `src/App.tsx`
3. Add `<SidebarItem>` entry in `src/components/Layout.tsx`

---

## Specialized Agents

These system prompts auto-load when spawning subagents:
- `.claude/agents/backend-dev.md` — TypeScript `src/lib/` + Rust/Tauri
- `.claude/agents/frontend-dev.md` — React pages + UI components
- `.claude/agents/venndelo-expert.md` — Venndelo API full reference

---

## Versioning Rules (before every push to `main`)

Both files must be bumped together before pushing:
- `package.json` → `version`
- `src-tauri/tauri.conf.json` → `version`

Version progression: `0.1.X` → `0.1.30` → `0.2.0` (first major release), then semantic versioning.

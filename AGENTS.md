# AGENTS.md - dg-facturacion

> **Sistema de Facturación e Inventario para MySpace**  
> Version: 0.1.16 | Last Updated: 2026-04-28

---

## Overview

Aplicación de escritorio para **MySpace** (empresa de impresión 3D).

### Funcionalidad Principal
- **Facturación**: Creación de facturas locales (no DIAN, uso interno), numeración secuencial automática,IVA 19%
- **Inventario**: Control de materias primas (filamentos), subproductos, y productos terminados con stock mínimo
- **Ensamblaje**: Sistema de ensamblaje/desensamblaje de productos desde subproductos
- **Dashboard**: Analytics con gráficos de ventas y stock (recharts)
- **Export**: PDF (pdfmake) y Excel (xlsx + file-saver)

### Colecciones de Datos (8)
```
configuracion  | clientes  | materias_primas  | subproductos
productos     | producto_componentes | facturas | factura_items
```

---

## Tech Stack

| Paquete | Version | Uso |
|--------|---------|-----|
| react | ^19.1.0 | UI Framework |
| react-router-dom | ^7.14.2 | Routing |
| typescript | ~5.8.3 | Type safety |
| tailwindcss | ^4.2.4 | Styling |
| lucide-react | ^1.11.0 | Iconos |
| recharts | ^3.8.1 | Gráficos analytics |
| sonner | ^2.0.7 | Notificaciones toast |
| pdfmake | ^0.2.7 | Generación PDFs |
| xlsx | ^0.18.5 | Export Excel |
| file-saver | ^2.0.5 | Download archivos |
| uuid | ^14.0.0 | IDs únicos |
| @tauri-apps/api | ^2 | Desktop bindings |
| @tauri-apps/plugin-shell | ^2.3.5 | Shell commands |

---

## Commands

```bash
# Development
npm run dev           # Vite dev server (port 1420)
npm run tauri dev    # Full dev con Rust backend hot-reload

# Build
npm run build        # tsc && vite build
npm run tauri build # Production desktop binary (.exe)

# Utils
npm run preview     # Vite preview
```

---

## Architecture

```
src/
├── components/
│   ├── ui/           # Button, Input, Select, Modal, Table, DataTable, Badge, Card
│   ├── Layout.tsx    # Sidebar navigation + main content area
│   └── styles.css    # Custom animations
├── context/
│   └── NavigationContext.tsx  # Tab state management
├── lib/
│   ├── database.ts          # Central data store (localStorage)
│   ├── types.ts            # TypeScript interfaces
│   ├── facturas.ts        # Factura CRUD
│   ├── clientes.ts         # Cliente CRUD
│   ├── productos.ts       # Producto CRUD
│   ├── subproductos.ts    # Subproducto CRUD
│   ├── materias_primas.ts  # MateriaPrima CRUD
│   ├── inventarioMovimientos.ts  # Audit trail
│   ├── pdf.ts            # PDF generation
│   ├── export.ts         # Excel export
│   ├── backup.ts         # Backup/restore
│   └── toast.ts          # sonner wrapper
├── pages/
│   ├── Dashboard.tsx         # Analytics charts
│   ├── Inventario.tsx        # Tabs: MP, Subproductos, Productos
│   ├── InventarioMP.tsx      # Materias primas management
│   ├── InventarioSubproductos.tsx
│   ├── InventarioProductos.tsx
│   ├── Disponibilidad.tsx   # Stock alerts & availability
│   ├── Clientes.tsx         # Cliente management
│   ├── Facturas.tsx         # Factura creation & list
│   ├── HistorialInventario.tsx  # Movement audit
│   └── ConfiguracionPage.tsx    # Company settings
├── App.tsx              # Main router & providers
└── main.tsx            # Entry point

src-tauri/               # Rust backend (minimal)
├── src/main.rs
└── tauri.conf.json     # Window, CSP, bundle config
```

---

## Data Model

### 1. Configuracion
```typescript
interface Configuracion {
  id: number;              // Always 1
  prefijo: string;         // e.g., "DG-"
  empresa_nome: string;
  empresa_nit: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  siguiente_numero: number;  // Auto-increment on each factura
}
```

### 2. Cliente
```typescript
interface Cliente {
  id: string;          // crypto.randomUUID()
  nome: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  created_at?: string;
}
```

### 3. MateriaPrima
```typescript
interface MateriaPrima {
  id: string;
  nome: string;
  tipo: string;           // e.g., "PLA", "PETG", "ABS"
  color: string;
  fornecedor: string;
  quantidade_kg: number;
  preco_kg: number;
  stock_minimo?: number;  // Alert threshold
}
```

### 4. Subproducto
```typescript
interface Subproducto {
  id: string;
  nome: string;
  tipo: string;
  quantidade: number;     // Current stock
  custo: number;
  stock_minimo?: number;
}
```

### 5. Produto
```typescript
interface Produto {
  id: string;
  nome: string;
  descripcion: string;
  preco: number;
  custo: number;
  quantidade_stock?: number;  // Only if assembled
}
```

### 6. ProductoComponente
```typescript
interface ProdutoComponente {
  id: string;
  produto_id: string;
  subproduto_id: string;
  quantidade_necesaria: number;  // Required per unit
}
```

### 7. Factura
```typescript
interface Factura {
  id: string;
  numero: string;           // e.g., "DG-00001"
  cliente_id: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_nit: string;
  cliente_direccion: string;
  fecha: string;            // YYYY-MM-DD
  subtotal: number;
  iva: number;             // subtotal * 0.19
  total: number;
  estado: 'activa' | 'anulada';
  notas?: string;
  motivo_anulacion?: string;
  fecha_anulacion?: string;
}
```

### 8. FacturaItem
```typescript
interface FacturaItem {
  id: string;
  factura_id: string;
  descripcion: string;
  quantidade: number;
  precio: number;
  total: number;            // quantidade * precio
}
```

---

## Database Layer

### Pattern
All data access goes through `src/lib/database.ts`. It uses **localStorage** (not SQL).

```typescript
// Initialize on app start
await initDatabase();

// Get all
getClientes()           // returns Cliente[]
getMateriasPrimas()     // returns MateriaPrima[]
getSubproductos()
getProdutos()
getFacturas()          // returns Factura[] with items embedded

// Get single
getCliente(id)        // returns Cliente | undefined
getSubproduto(id)
getProduto(id)
getFactura(id)        // returns Factura with items

// Create (returns created object with id)
addCliente(data)
addMateriaPrima(data)
addSubproduto(data)
addProduto(data)
createFactura(data)

// Update
updateCliente(id, data)
updateMateriaPrima(id, data)
updateSubproduto(id, data)
updateProductRow(id, data)

// Delete
deleteCliente(id)
deleteMateriaPrima(id)
deleteSubproduto(id)
deleteProductRow(id)

// Special operations
assembleProduto(produtoId, cantidad)    // Creates product from subproducts
disadjustSubproductoStock(id, amount)  // Manual stock adjust
getStockMinimo()                       // Items below threshold
getSinStock()                        // Items with zero stock
```

### Storage Key
```
dg_facturacion_db  →  JSON string of all collections
```

---

## UI Components

### Available in `src/components/ui/`

| Component | Props | Usage |
|-----------|-------|-------|
| **Button** | `variant?`, `size?`, `disabled?`, `loading?` | Primary actions |
| **Input** | `type?`, `error?`, `label?` | Form fields |
| **Select** | `options`, `value`, `onChange`, `label` | Dropdowns |
| **Modal** | `open`, `onClose`, `title` | Dialogs |
| **Table** | `columns`, `data`, `onRowClick` | Data tables |
| **DataTable** | Enhanced table with search/pagination | Advanced tables |
| **Badge** | `variant?` | Status indicators |
| **Card** | `title?`, `children` | Content containers |

### Theme Colors

```css
/* Tailwind classes */
bg-background    /* #1a1a2e */
bg-surface       /* #2d2d4a */
bg-surface-hover /* #3d3d5c */
text-primary     /* #ffffff */
text-secondary    /* #aaaaaa */
text-muted        /* #666666 */
border            /* #3d3d5c */

/* Accent */
text-primary     /* #00d4ff (primary) - use sparingly */
text-primary-hover /* #00b8e6 */
```

### Usage Example
```tsx
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';

<Button variant="primary" onClick={handleSave}>
  <Save className="w-4 h-4 mr-2" />
  Guardar
</Button>

<Input label="Nombre" value={nome} onChange={setNome} error={errors.nome} />
```

---

## Pages & Routes

| Page | Route (Tab) | Purpose |
|------|-------------|---------|
| Dashboard | `dashboard` | Analytics: ventas mensuales, productos más vendidos, stock alerts |
| Inventario | `inventario` | Tab navigation for: Materias Primas, Subproductos, Productos |
| Disponibilidad | `disponibilidad` | Alerts: stock mínimo, sin stock |
| Clientes | `clientes` | CRUD clientes |
| Facturas | `facturas` | Create/list facturas, estado tracking |
| HistorialInventario | `historial` | Auditoría de movimientos de inventario |
| Configuracion | `configuracion` | Empresa settings, numero facturación |

### Navigation
Uses custom `NavigationContext` - tab-based routing (not URL-based).

```tsx
// In Layout.tsx
<Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
```

---

## Code Conventions

### Naming
- **Files**: camelCase (`clientes.ts`, `materias_primas.ts`)
- **Interfaces**: PascalCase (`Cliente`, `MateriaPrima`)
- **Functions**: camelCase (`getClientes`, `addCliente`)
- **Collections**: Spanish (`clientes`, `facturas`, `materias_primas`)
- **Fields**: snake_case in DB, camelCase in TS interfaces

### Patterns
- **CRUD**: Each entity has `getX`, `addX`, `updateX`, `deleteX`
- **IDs**: Use `crypto.randomUUID()` (not uuid package)
- **Dates**: ISO `YYYY-MM-DD` strings
- **Money**: Numbers (no currency formatting in DB)
- **Toast**: Use `sonner` for all notifications

### Component Structure
```tsx
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { getX, addX, updateX, deleteX } from '../lib/database';

export function PageName() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(getX());
    setLoading(false);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      {/* content */}
    </div>
  );
}
```

---

## Gotchas

1. **Vite port 1420 is fixed** (`vite.config.ts:27`)
   - Tauri requires this exact port
   - Do not change

2. **sql.js excluded from deps** (`vite.config.ts:12-14`)
   - Even though in package.json
   - Do not remove exclusion

3. **src-tauri/ ignored by Vite watcher** (`vite.config.ts:38-40`)
   - Expected behavior - Rust updates separately

4. **IVA hardcoded at 19%**
   - `database.ts:287` - `const iva = subtotal * 0.19;`
   - Change here if tax rate changes

5. **No tests or lint configured**
   - TypeScript strict mode is the only verification
   - Run `npm run build` to typecheck

6. **localStorage, not PostgreSQL**
   - Ignore Docker files (`init.sql`)
   - Data persists in browser localStorage

7. **Stock decreases on factura**
   - Currently NOT implemented
   - Need to add inventory movement tracking on sale

8. **Factura numbering**
   - Auto-increments on each `createFactura()`
   - Reset manually in configuracion if needed

---

## Backup & Recovery

### Manual Backup
```typescript
// Export current state
backupToFile()  // Downloads JSON backup

// Import
importBackup(file)  // Restores from backup file
```

### Location
Backups store all 8 collections in a single JSON file.

---

## Build & Distribution

### Generate .exe
```bash
npm run tauri build
```

Output located in:
```
src-tauri/target/release/bundle/nsis/
```

### Tauri Config
Window size, CSP, and bundle settings in:
```
src-tauri/tauri.conf.json
```

---

## Adding New Features

### 1. New Page
```tsx
// src/pages/NewFeature.tsx
export function NewFeature() {
  return <div>Content</div>;
}

// src/App.tsx - add to render
{activeTab === 'newfeature' && <NewFeature />}

// src/components/Layout.tsx - add to sidebar
<SidebarItem tab="newfeature" icon={Icon} label="Label" />
```

### 2. New Entity
```typescript
// src/lib/types.ts - add interface
export interface NuevaEntidad {
  id: string;
  // fields
}

// src/lib/database.ts - add CRUD
export function getNuevaEntidades(): NuevaEntidad[] { ... }
export function addNuevaEntidad(data): NuevaEntidad { ... }
```

### 3. New UI Component
```tsx
// src/components/ui/NewComponent.tsx
import { cn } from '../../lib/utils';

interface Props {
  className?: string;
}

export function NewComponent({ className }: Props) {
  return <div className={cn("bg-surface", className)} />;
}
```

---

## Quick Reference

| Task | Command/File |
|------|--------------|
| Add new client | `addCliente(data)` |
| Create factura | `createFactura(data)` |
| Check stock alerts | `getStockMinimo()` |
| Generate PDF invoice | `generateInvoicePDF(factura)` |
| Export to Excel | `exportToExcel(data, filename)` |
| Change theme colors | `tailwind.config.js` |
| Update window size | `src-tauri/tauri.conf.json` |
| Add new page | `src/pages/NewPage.tsx` |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/database.ts` | Central data store - all CRUD operations |
| `src/lib/types.ts` | TypeScript interfaces for all entities |
| `src/pages/Dashboard.tsx` | Analytics with recharts |
| `src/pages/Facturas.tsx` | Factura creation & management |
| `src/components/Layout.tsx` | Navigation sidebar |
| `tailwind.config.js` | Theme colors & configuration |
| `src-tauri/tauri.conf.json` | Desktop window & bundle settings |
| `vite.config.ts` | Vite & Tauri port configuration |

---

## Versionado

### Reglas para push a main

1. **Verificar versión antes de push**: Antes de hacer `git push origin main`, siempre verificar que se haya aumentado la versión en:
   - `package.json`
   - `src-tauri/tauri.conf.json`

2. **Progresión de versiones**:
   - Las versiones siguen el formato `0.1.X` hasta alcanzar `0.1.30`
   - La versión `0.1.30` será seguida por `0.2.0` (首个 major release)
   - A partir de `0.2.0`, seguir semantic versioning (0.2.1, 0.2.2, ..., 0.3.0, etc.)

3. **Flujo correcto para push**:
   ```bash
   # 1. Hacer cambios y commits
   # 2. Verificar que package.json y tauri.conf.json tengan la nueva versión
   # 3. git add -A && git commit -m "mensaje"
   # 4. git push origin main
   ```
# AGENTS.md - dg-facturacion

> **Sistema de Facturación e Inventario para MySpace**  
> Version: 0.1.28 | Last Updated: 2026-05-16

---

## Overview

Aplicación de escritorio para **MySpace** (empresa de impresión 3D).

### Funcionalidad Principal
- **Facturación**: Creación de facturas locales (no DIAN, uso interno), numeración secuencial automática, IVA siempre 0
- **Inventario**: Control de materias primas (filamentos), subproductos, productos terminados y combos, con stock mínimo
- **Ensamblaje**: Sistema de ensamblaje/desensamblaje de productos desde subproductos
- **Cotizaciones**: Cotizaciones con cotización de envío en tiempo real via Venndelo
- **Notas de Crédito**: Notas vinculadas a facturas con devolución de stock
- **Pedidos**: Seguimiento de pedidos locales (domiciliarios) y nacionales (Venndelo)
- **Logística**: Integración Venndelo — órdenes, guías de envío, tracking nacional
- **Dashboard**: Analytics con gráficos de ventas y stock (recharts)
- **Export**: PDF (pdfmake) y Excel (xlsx + file-saver)

### Colecciones de Datos (17)
```
configuracion     | clientes           | materias_primas     | subproductos
productos         | producto_componentes| combos              | combo_items
facturas          | factura_items      | cotizaciones        | cotizacion_items
notas_credito     | nota_credito_items | pedidos             | domiciliarios
abonos
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
│   ├── ui/              # Button, Input, Select, Modal, Table, DataTable, Badge, Card
│   ├── Layout.tsx       # Sidebar navigation + main content area
│   ├── ChangelogModal.tsx  # Release notes modal (auto-shown after update)
│   └── styles.css       # Custom animations
├── context/
│   └── NavigationContext.tsx  # Tab state management
├── lib/
│   ├── database.ts          # Central data store (localStorage)
│   ├── types.ts            # TypeScript interfaces
│   ├── changelog.ts        # Release notes per version (VersionNota[])
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
│   ├── Dashboard.tsx             # Analytics charts
│   ├── Facturas.tsx              # Factura creation, list, Venndelo integration
│   ├── Cotizaciones.tsx          # Cotizaciones con cotización de envío en tiempo real
│   ├── NotasCredito.tsx          # Notas de crédito vinculadas a facturas
│   ├── Pedidos.tsx               # Seguimiento de pedidos y domiciliarios
│   ├── Reportes.tsx              # Reportes de ventas e inventario
│   ├── Inventario.tsx            # Tab container: MP, Subproductos, Productos, Combos
│   ├── InventarioMP.tsx
│   ├── InventarioSubproductos.tsx
│   ├── InventarioProductos.tsx
│   ├── InventarioCombos.tsx      # Gestión de combos de productos
│   ├── Disponibilidad.tsx        # Stock alerts & availability
│   ├── Clientes.tsx
│   ├── HistorialInventario.tsx   # Movement audit trail
│   └── Configuracion.tsx         # Company settings + Venndelo API key
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
  venndelo_id?: string;       // Venndelo product ID (populated on sync)
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
  tipo_identificacion?: 'CC' | 'NIT';
  fecha: string;            // YYYY-MM-DD
  subtotal: number;
  iva: number;              // Always 0 in DB layer
  total: number;
  estado: 'activa' | 'anulada';
  notas?: string;
  motivo_anulacion?: string;
  fecha_anulacion?: string;
  // Logistics
  tipo_pedido?: 'local' | 'nacional';
  ciudad_destino?: string;
  costo_envio?: number;
  payment_method_code?: 'COD' | 'EXTERNAL_PAYMENT';
  // Venndelo fields (populated after creating order)
  venndelo_order_id?: string;
  venndelo_tracking?: string;
  venndelo_label_url?: string;
  venndelo_label_local_path?: string;
  venndelo_pin?: string;
  venndelo_status?: string;
  venndelo_shipment_created?: boolean;
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
assembleProduto(produtoId, cantidad)       // Creates product from subproducts
disassembleProduto(produtoId, cantidad)   // Disassembles back to subproducts
adjustComboStock(comboId, amount)         // Adjust combo stock
despacharFactura(facturaId)              // Mark factura as dispatched
actualizarEstadoEntrega(facturaId, estado) // Update delivery state
updateFacturaVenndelo(facturaId, data)   // Update Venndelo fields on factura
getSaldosDomiciliarios()                 // Get delivery balances
addAbono(data)                          // Add payment installment
getAbonosDomiciliario(domiciliarioId)   // Get installments for driver
getStockMinimo()                        // Items below threshold
getSinStock()                           // Items with zero stock
```

### Storage Key
```
dg_facturacion_db      →  JSON string of all collections
dg_last_version_seen   →  version string last acknowledged by the user (e.g. "0.1.29")
dg_last_update         →  ISO timestamp of last installed update
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

## Venndelo Integration

Logística de envíos nacionales. Full API reference in `.claude/agents/venndelo-expert.md`.

### Config (stored in `configuracion`)
- `api_key_venndelo` — API key
- `ciudad_origen` — DANE city code (default: `11001000` = Bogotá)
- `peso_default_kg` — default package weight (default: `0.5`)

### Auto-sync
On app start (`App.tsx`): if API key is set and 24h have passed since last sync, `sincronizarProductosVenndelo()` runs silently and updates `venndelo_id` on matching products.

### Factura → Shipment flow
1. `createOrder()` → saves `venndelo_order_id`, `pin`
2. `createShipment()` if needed
3. `generateLabel()` with up to 20 retries (2 s apart)
4. Rust command `download_guide` saves PDF to `~/Documentos/MySpace/Guías/`
5. `updateFacturaVenndelo()` persists all fields to localStorage

### Key files
- `src/lib/venndelo.ts` — API calls
- `src/lib/envio.ts` — quote logic
- `src-tauri/src/lib.rs` — `download_guide` Tauri command

---

## Pages & Routes

| Page | Route (Tab) | Purpose |
|------|-------------|---------|
| Dashboard | `dashboard` | Analytics: ventas mensuales, productos más vendidos, stock alerts |
| Facturas | `facturas` | Create/list facturas, Venndelo order & label creation |
| Cotizaciones | `cotizaciones` | Cotizaciones con cotización de envío en tiempo real |
| NotasCredito | `notas_credito` | Notas de crédito vinculadas a facturas |
| Pedidos | `pedidos` | Seguimiento pedidos locales y nacionales, domiciliarios |
| Reportes | `reportes` | Reportes de ventas e inventario |
| Inventario | `inventario` | Tab container: MP, Subproductos, Productos, Combos |
| Disponibilidad | `disponibilidad` | Alerts: stock mínimo, sin stock |
| Clientes | `clientes` | CRUD clientes |
| HistorialInventario | `historial` | Auditoría de movimientos de inventario |
| Configuracion | `configuracion` | Empresa settings, Venndelo API key, auto-updater |

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

4. **IVA is always 0**
   - DB layer sets `iva = 0` — the `Factura.iva` field exists but is never calculated
   - Do not assume 19%

5. **No tests or lint configured**
   - TypeScript strict mode is the only verification
   - Run `npm run build` to typecheck

6. **localStorage, not PostgreSQL**
   - Ignore Docker files (`init.sql`)
   - Data persists in browser localStorage

7. **Stock adjustments on factura**
   - Implemented via `despacharFactura()` and inventory movement functions
   - Movements are audited in `inventario_movimientos` collection

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
| `src/lib/changelog.ts` | Release notes per version — edit here when bumping version |
| `src/components/ChangelogModal.tsx` | Modal that shows release notes to the user |
| `src/pages/Dashboard.tsx` | Analytics with recharts |
| `src/pages/Facturas.tsx` | Factura creation & management |
| `src/components/Layout.tsx` | Navigation sidebar |
| `tailwind.config.js` | Theme colors & configuration |
| `src-tauri/tauri.conf.json` | Desktop window & bundle settings |
| `vite.config.ts` | Vite & Tauri port configuration |

---

## Versionado

### Reglas para push a main

1. **Tres archivos deben actualizarse juntos** antes de cada push:
   - `package.json` → `version`
   - `src-tauri/tauri.conf.json` → `version`
   - `src/lib/changelog.ts` → agregar entrada al **inicio** del array con `version`, `fecha`, y las secciones `novedades`, `mejoras`, `correcciones` que apliquen

2. **Progresión de versiones**:
   - Las versiones siguen el formato `0.1.X` hasta alcanzar `0.1.30`
   - La versión `0.1.30` será seguida por `0.2.0` (primer major release)
   - A partir de `0.2.0`, seguir semantic versioning (0.2.1, 0.2.2, ..., 0.3.0, etc.)

3. **Flujo correcto para push**:
   ```bash
   # 1. Hacer cambios y commits
   # 2. Actualizar package.json, tauri.conf.json y changelog.ts con la nueva versión
   # 3. git add -A && git commit -m "chore: bump version to X.Y.Z"
   # 4. git push origin main
   ```

4. **Cómo funciona el modal de novedades**:
   - `App.tsx` compara la versión instalada contra `localStorage('dg_last_version_seen')` al iniciar
   - Si difieren, muestra `ChangelogModal` con las notas de `changelog.ts`
   - Al cerrar el modal se escribe la versión actual en `dg_last_version_seen`
   - También accesible desde Configuración → "Ver novedades"
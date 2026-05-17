# AGENTS.md - SpaceLab POS

> **Sistema de Facturación e Inventario para MySpace**  
> Version: 0.1.29 | Last Updated: 2026-05-16

---

## Overview

Aplicación de escritorio para **MySpace** (empresa de impresión 3D), construida con Tauri v2 + React 19 + TypeScript + Rust. Toda la persistencia es en `localStorage` — sin base de datos externa.

### Funcionalidad Principal

| Módulo | Descripción |
|--------|-------------|
| **Facturación** | Facturas internas (no DIAN), numeración secuencial, PDF pdfmake, IVA siempre 0 |
| **Inventario** | 3 niveles: materias primas (kg) → subproductos (unidades) → productos terminados |
| **Ensamblaje** | Armar/desarmar productos: consume subproductos, agrega al stock del producto |
| **Combos** | Agrupaciones de productos con su propio stock |
| **Cotizaciones** | Con cotización de envío en tiempo real via Venndelo API |
| **Notas de Crédito** | Vinculadas a facturas; revierten stock al emitirse |
| **Pedidos** | Seguimiento de pedidos locales (domiciliarios) y nacionales (Venndelo) |
| **Logística nacional** | Venndelo: crear orden, crear envío, generar guía (label PDF), tracking |
| **Domiciliarios** | Control de repartos locales, saldos pendientes, abonos |
| **Dashboard** | Analytics con recharts: ventas mensuales, productos más vendidos, stock alerts |
| **Reportes** | Exportación Excel detallada (4 hojas: Facturas, Resumen, Ítems, Por Producto) |
| **Backup** | Exportar/importar JSON con todas las colecciones |

### Colecciones de Datos (localStorage)

```
configuracion       | clientes            | materias_primas      | subproductos
productos           | producto_componentes| combos               | facturas
factura_items       | cotizaciones        | cotizacion_items     | notas_credito
nota_credito_items  | domiciliarios       | abonos
```

Todo se persiste en una sola clave: `dg_facturacion_db`.  
Los movimientos de inventario usan una clave separada: `dg_facturacion_movimientos`.

---

## Tech Stack

| Paquete | Versión | Uso |
|--------|---------|-----|
| react | ^19.1.0 | UI Framework |
| typescript | ~5.8.3 | Tipado estático |
| tailwindcss | ^4.2.4 | Estilos |
| lucide-react | ^1.11.0 | Iconos |
| recharts | ^3.8.1 | Gráficos analytics |
| sonner | ^2.0.7 | Notificaciones toast |
| pdfmake | ^0.2.7 | Generación PDFs |
| xlsx | ^0.18.5 | Export Excel |
| file-saver | ^2.0.5 | Descarga de archivos |
| @tauri-apps/api | ^2.11.0 | Desktop bindings |
| @tauri-apps/plugin-updater | ^2.10.1 | Auto-actualización |
| @tauri-apps/plugin-shell | ^2.3.5 | Shell commands (download_guide) |
| react-router-dom | ^7.14.2 | Instalado pero **no se usa** — la navegación usa `NavigationContext` |
| uuid | ^14.0.0 | Instalado pero **no se usa** — se usa `crypto.randomUUID()` nativamente |

---

## Commands

```bash
# Desarrollo
npm run dev           # Vite dev server (puerto 1420) — sin Tauri
npm run tauri dev     # Desarrollo completo con Rust hot-reload (usar esto)

# Build
npm run build         # tsc + vite build (verificación de tipos)
npm run tauri build   # Binario de producción (.AppImage, .exe)
```

**Sin suite de tests ni linter.** `npm run build` es la única verificación disponible.

---

## Architecture

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx         # Variantes: primary, secondary, ghost, danger
│   │   ├── Input.tsx          # Con soporte de label y error
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx          # Tabla simple
│   │   ├── DataTable.tsx      # Tabla con búsqueda y paginación
│   │   ├── Badge.tsx          # Estado de entidad
│   │   ├── Card.tsx
│   │   ├── GlobalSearch.tsx   # Búsqueda global (Ctrl+K)
│   │   └── KeyboardShortcuts.tsx
│   ├── Layout.tsx             # Sidebar colapsable + área de contenido
│   ├── ChangelogModal.tsx     # Modal de novedades (auto-mostrado al actualizar)
│   └── styles.css             # Animaciones custom
├── context/
│   └── NavigationContext.tsx  # Estado de tab activo (reemplaza react-router)
├── lib/
│   ├── database.ts            # Store central — todas las operaciones CRUD
│   ├── types.ts               # Interfaces TypeScript de todas las entidades
│   ├── changelog.ts           # Notas de versión (VersionNota[]); editar al versionar
│   ├── venndelo.ts            # API Venndelo: productos, ciudades, órdenes, guías
│   ├── envio.ts               # Cotización de envío vía Venndelo + lista de ciudades
│   ├── facturas.ts            # Thin wrapper sobre database.ts para facturas
│   ├── inventarioMovimientos.ts # Auditoría de movimientos (clave separada en LS)
│   ├── materias_primas.ts     # CRUD materias primas
│   ├── productos.ts           # CRUD productos
│   ├── subproductos.ts        # CRUD subproductos
│   ├── pdf.ts                 # Generación PDF de facturas y cotizaciones (pdfmake)
│   ├── export.ts              # Exportación Excel detallada (xlsx, 4 hojas)
│   ├── backup.ts              # Backup/restore JSON de toda la DB
│   └── toast.ts               # Wrapper de sonner
├── pages/
│   ├── Dashboard.tsx          # Analytics: ventas, productos top, stock alerts
│   ├── Facturas.tsx           # CRUD facturas + flujo Venndelo (orden → guía)
│   ├── Cotizaciones.tsx       # Cotizaciones con cotización de envío en tiempo real
│   ├── NotasCredito.tsx       # Notas de crédito vinculadas a facturas
│   ├── Pedidos.tsx            # Seguimiento pedidos locales y nacionales; domiciliarios
│   ├── Reportes.tsx           # Reportes contables + exportación Excel
│   ├── Inventario.tsx         # Contenedor de 4 tabs de inventario
│   ├── InventarioMP.tsx       # Materias primas (kg, proveedor, stock mínimo)
│   ├── InventarioSubproductos.tsx
│   ├── InventarioProductos.tsx # Ensamblaje/desensamblaje
│   ├── InventarioCombos.tsx   # Gestión de combos
│   ├── Disponibilidad.tsx     # Alertas de stock bajo o cero
│   ├── HistorialInventario.tsx # Auditoría de movimientos
│   └── Configuracion.tsx      # Datos empresa, API key Venndelo, auto-updater
├── App.tsx                    # Bootstrap: initDatabase, auto-sync Venndelo, shortcuts
└── main.tsx                   # Entry point React

src-tauri/
├── src/lib.rs                 # Comandos Rust: download_guide (guarda PDFs de guías)
├── capabilities/default.json  # Permisos Tauri (fs, shell, http, updater)
└── tauri.conf.json            # Ventana, CSP, bundling, update endpoint
```

---

## Data Model

### Configuracion
```typescript
interface Configuracion {
  id: number;              // Siempre 1 (singleton)
  prefijo: string;         // e.g., "DG-" — prefijo de numeración
  empresa_nome: string;
  empresa_nit: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  siguiente_numero: number;              // Autoincremental por cada factura creada
  siguiente_numero_cotizacion?: number;
  siguiente_numero_nota_credito?: number;
  meta_mensual?: number;
  dias_laborables?: number;
  api_key_venndelo?: string;
  ciudad_origen?: string;    // Código DANE, default: '11001000' (Bogotá)
  peso_default_kg?: number;  // Peso por defecto para cotizar envíos
}
```

### MateriaPrima
```typescript
interface MateriaPrima {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;            // e.g., "PLA", "PETG", "ABS"
  color: string;
  fornecedor: string;
  quantidade_kg: number;   // Stock actual en kilogramos
  preco_kg: number;        // Costo por kilogramo
  stock_minimo?: number;   // Umbral de alerta (mismo en kg)
}
```

### Subproducto
```typescript
interface Subproducto {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;
  quantidade: number;    // Stock actual en unidades
  custo: number;
  stock_minimo?: number;
}
```

### Produto (Producto Terminado)
```typescript
interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  descripcion: string;
  categoria?: string;
  tags?: string[];
  preco: number;           // Precio de venta
  custo: number;           // Costo estimado
  quantidade_stock?: number; // Stock actual (solo si fue ensamblado)
  venndelo_id?: string;    // ID en catálogo Venndelo (poblado por auto-sync)
}
```

### ProductoComponente (Receta de Ensamblaje)
```typescript
// Relación: produto_id → subproduto_id con cantidad requerida por unidad
interface ProdutoComponente {
  id: string;
  produto_id: string;
  subproduto_id: string;
  quantidade_necesaria: number;
}
```

### Combo
```typescript
interface Combo {
  id: string;
  nome: string;
  descripcion: string;
  productos: ComboProducto[];  // Lista de { produto_id, quantidade }
  preco: number;
  quantidade_stock: number;
  stock_minimo?: number;
  activo: boolean;  // Soft delete: deleteCombo() solo pone activo=false
  created_at?: string;
}
```

### Factura
```typescript
interface Factura {
  id: string;
  numero: string;          // Formato: "{prefijo}{N:05}" e.g. "DG-00001"
  cliente_id: string;
  cliente_nome: string;
  cliente_apellido?: string;
  cliente_celular: string;
  cliente_email?: string;
  cliente_nit: string;
  tipo_identificacion?: string; // 'CC' | 'NIT'
  cliente_direccion: string;
  fecha: string;           // YYYY-MM-DD
  subtotal: number;
  iva: number;             // SIEMPRE 0 — no se calcula IVA en esta aplicación
  descuento: number;
  costo_envio?: number;
  total: number;           // subtotal - descuento + costo_envio
  estado: 'activa' | 'anulada';
  notas?: string;
  motivo_anulacion?: string;
  fecha_anulacion?: string;

  // Tipo de pedido
  tipo_pedido?: 'local' | 'nacional';
  payment_method_code?: 'COD' | 'EXTERNAL_PAYMENT';
  ciudad_destino?: string; // Código DANE (solo pedidos nacionales)

  // Campos Venndelo (se llenan tras crear orden en Venndelo)
  venndelo_order_id?: string;
  venndelo_tracking?: string;
  venndelo_label_url?: string;
  venndelo_pin?: string;
  venndelo_status?: string;
  venndelo_shipment_created?: boolean;
  venndelo_label_local_path?: string; // Ruta local del PDF de guía descargado

  // Pipeline de entrega
  estado_entrega?:
    | 'pendiente'       // Recibido, esperando validación
    | 'en_validacion'   // Verificando stock
    | 'en_produccion'   // Siendo impreso
    | 'en_acabado'      // Post-proceso terminado
    | 'en_despacho'     // Con domiciliario
    | 'entregado'       // Completado
    | 'devuelto'        // Con problema
    | 'cancelado';      // Por cliente
  domiciliario_id?: string;
  domiciliario_nome?: string;
  fecha_despacho?: string;
  fecha_entrega?: string;
  pagada?: boolean;
}
```

### Cotizacion
```typescript
interface Cotizacion {
  id: string;
  numero: string;          // "{prefijo}COT-{N:05}"
  cliente_id?: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_nit: string;
  cliente_direccion: string;
  ciudad?: string;
  fecha: string;
  fecha_vencimiento: string;
  validez_dias: number;    // Default 15
  subtotal: number;
  iva: number;             // Siempre 0
  descuento: number;
  costo_envio: number;     // Cotizado via Venndelo en tiempo real
  total: number;
  estado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida';
  notas?: string;
}
```

### NotaCredito
```typescript
interface NotaCredito {
  id: string;
  numero: string;           // "{prefijo}NC-{N:05}"
  factura_afectada_id: string;
  factura_numero: string;
  cliente_nome: string;
  cliente_nit: string;
  cliente_direccion: string;
  fecha: string;
  subtotal: number;
  iva: number;              // Siempre 0
  descuento: number;
  total: number;
  motivo: string;
  observaciones?: string;
}
```

### Domiciliario & Abono
```typescript
interface Domiciliario {
  id: string;
  nome: string;
  telefono: string;
  placa?: string;
  activo: boolean;
}

interface Abono {
  id: string;
  domiciliario_id: string;
  monto: number;
  fecha: string;
  nota?: string;
  comprobante?: string;
}
```

### InventarioMovimiento (clave separada)
```typescript
// Guardado en localStorage('dg_facturacion_movimientos'), NO en dg_facturacion_db
interface InventarioMovimiento {
  id: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  tabla: 'materias_primas' | 'subproductos' | 'productos' | 'combos';
  registro_id: string;
  registro_nombre: string;
  campo: string;
  valor_anterior: string | number;
  valor_nuevo: string | number;
  cantidad?: number;
  observaciones: string;
  usuario: string;
  created_at: string;
}
```

---

## Database Layer

### Clave de almacenamiento

| Clave localStorage | Contenido |
|--------------------|-----------|
| `dg_facturacion_db` | JSON con todas las colecciones (singleton) |
| `dg_facturacion_movimientos` | Array de InventarioMovimiento (clave separada) |
| `dg_last_version_seen` | Última versión de la app que el usuario reconoció |
| `dg_last_update` | Timestamp ISO de la última actualización instalada |
| `venndelo_products_last_sync` | Timestamp ISO del último auto-sync de productos Venndelo |

### API de `database.ts`

```typescript
// Bootstrap — llamar en App.tsx antes de renderizar
await initDatabase();

// Configuración (singleton)
getConfiguracion()           → Configuracion
updateConfiguracion(partial) → void

// Clientes
getClientes()                → Cliente[]
getCliente(id)               → Cliente | undefined
addCliente(data)             → Cliente
updateCliente(id, data)      → void
deleteCliente(id)            → void

// Materias Primas
getMateriasPrimas()          → MateriaPrima[]
addMateriaPrima(data)        → MateriaPrima
updateMateriaPrima(id, data) → void
deleteMateriaPrima(id)       → void

// Subproductos
getSubproductos()            → Subproducto[]
getSubproduto(id)            → Subproducto | undefined
addSubproduto(data)          → Subproducto
updateSubproduto(id, data)   → void
deleteSubproduto(id)         → void

// Productos
getProdutos()                → Produto[]
getProduto(id)               → Produto | undefined
addProduto(data)             → Produto
updateProductRow(id, data)   → void
deleteProductRow(id)         → void  // También elimina sus componentes

// Componentes (receta de ensamblaje)
getComponentes(produtoId)    → ComponenteConNombre[]
addComponente(prodId, subprodId, cantidad) → void
removeComponente(id)         → void

// Ensamblaje / Desensamblaje
assembleProduto(produtoId, cantidad)    → { success, message }
disassembleProduto(produtoId, cantidad) → { success, message }

// Combos
getCombos(includeInactive?)  → Combo[]   // Por default filtra activos
getCombo(id)                 → Combo | undefined
addCombo(data)               → Combo
updateCombo(id, data)        → void
deleteCombo(id)              → void      // Soft delete: activo = false
adjustComboStock(id, amount) → void

// Ajustes de stock directo
adjustSubproductoStock(id, amount) → boolean  // false si quedaría negativo
adjustProdutoStock(id, amount)     → boolean

// Facturas
getFacturas()                → (Factura & { items: FacturaItem[] })[]
getFactura(id)               → (Factura & { items }) | undefined
createFactura(data)          → Factura & { items }   // Decrementa stock al crear
anularFactura(id, motivo)    → void                  // Restaura stock al anular
updateFacturaVenndelo(id, campos) → void
getSiguienteNumero()         → string   // e.g., "DG-00042"

// Seguimiento de entregas
despacharFactura(id, domiciliarioId) → void  // → estado_entrega: 'en_despacho'
actualizarEstadoEntrega(id, estado)  → void
marcarFacturaPagada(facturaId)       → void  // Toggle pagada/no pagada

// Domiciliarios & Abonos
getDomiciliarios()                          → Domiciliario[]
addDomiciliario(data)                       → Domiciliario
updateDomiciliario(id, data)                → void
deleteDomiciliario(id)                      → void
getSaldosDomiciliarios()                    → SaldoDomiciliario[]
getFacturasDomiciliario(domiciliarioId)     → Factura[]
addAbono(data)                              → Abono
getAbonosDomiciliario(domiciliarioId)       → Abono[]

// Cotizaciones
getCotizaciones()            → (Cotizacion & { items })[]
createCotizacion(data)       → Cotizacion & { items }
updateCotizacionEstado(id, estado) → void
deleteCotizacion(id)         → void

// Notas de Crédito
getNotasCredito()            → (NotaCredito & { items })[]
createNotaCredito(data)      → NotaCredito & { items }
deleteNotaCredito(id)        → void

// Alertas de stock
getStockMinimo()             → ItemBajoStock[]   // Items bajo su umbral mínimo
getSinStock()                → ItemSinStock[]    // Items con stock = 0
```

---

## Venndelo Integration

Logística de envíos nacionales. Referencia completa en `.claude/agents/venndelo-expert.md`.

### Configuración (en `configuracion`)
- `api_key_venndelo` — API key (`X-Venndelo-Api-Key`)
- `ciudad_origen` — Código DANE de la ciudad de despacho (default: `11001000` = Bogotá)
- `peso_default_kg` — Peso por defecto de paquetes para cotizar (default: `0.5`)

### Auto-sync de productos
Al iniciar la app (`App.tsx`): si hay API key y han pasado >24h desde el último sync, ejecuta `sincronizarProductosVenndelo()` silenciosamente. Upsert por `venndelo_id` primero, luego por `codigo`.

### Flujo completo: Factura → Guía física

```
1. createOrder()          → Crea orden en Venndelo. Guarda venndelo_order_id, pin.
2. createShipment()       → Solicita creación del envío (si la orden lo requiere).
3. generateLabel()        → Polling hasta 20 intentos (2 s cada uno) hasta estado SUCCESS.
                            Devuelve { labelUrl, tracking }.
4. Rust: download_guide   → Descarga el PDF de la guía a ~/Documentos/MySpace/Guías/.
5. updateFacturaVenndelo()→ Persiste todos los campos en localStorage.
```

### Archivos clave
- `src/lib/venndelo.ts` — Todas las llamadas a la API Venndelo
- `src/lib/envio.ts` — Cotización de envío (`cotizarEnvio`) + lista de ciudades con fallback
- `src-tauri/src/lib.rs` — Comando Rust `download_guide`

---

## UI Components

### Disponibles en `src/components/ui/`

| Componente | Props principales | Uso |
|------------|-------------------|-----|
| **Button** | `variant`, `size`, `disabled`, `loading` | Acciones principales |
| **Input** | `type`, `error`, `label` | Campos de formulario |
| **Select** | `options`, `value`, `onChange`, `label` | Dropdowns |
| **Modal** | `open`, `onClose`, `title` | Diálogos |
| **Table** | `columns`, `data`, `onRowClick` | Tablas simples |
| **DataTable** | Incluye búsqueda y paginación | Tablas avanzadas |
| **Badge** | `variant` | Indicadores de estado |
| **Card** | `title`, `children` | Contenedores de contenido |
| **GlobalSearch** | `open`, `onClose` | Búsqueda global (Ctrl+K) |

### Theme (Tailwind custom)

```css
bg-background      /* #0a0a1a — fondo general */
bg-surface         /* #1e1e2e — tarjetas/sidebar */
bg-surface-hover   /* hover state */
text-primary       /* blanco */
text-secondary     /* gris claro */
text-muted         /* gris oscuro */
border-border      /* separadores */
text-primary-accent /* #00d4ff — azul cian, usar con moderación */
```

---

## Pages & Routes (Tab-Based)

| Tab ID | Componente | Sidebar Label |
|--------|-----------|---------------|
| `dashboard` | Dashboard | Inicio |
| `inventario` | Inventario | Inventario |
| `disponibilidad` | Disponibilidad | Disponibilidad |
| `pedidos` | Pedidos | Pedidos |
| `cotizaciones` | Cotizaciones | Cotizaciones |
| `notas_credito` | NotasCredito | Notas Crédito |
| `facturas` | Facturas | Facturas |
| `reportes` | Reportes | Contabilidad |
| `historial` | HistorialInventario | Historial |
| `configuracion` | ConfiguracionPage | Configuración |

**No existe una página separada de Clientes.** Los clientes se buscan y crean en el flujo de creación de facturas y cotizaciones directamente.

---

## Code Conventions

### Naming
- **Archivos**: camelCase (`facturas.ts`, `materias_primas.ts`)
- **Interfaces**: PascalCase (`Cliente`, `MateriaPrima`)
- **Funciones**: camelCase (`getClientes`, `addCliente`)
- **Campos DB**: snake_case (`cliente_nome`, `siguiente_numero`)
- **UI text**: Español

### Patrones estándar

```typescript
// IDs — siempre crypto.randomUUID()
const id = crypto.randomUUID();

// Fechas — ISO string YYYY-MM-DD
const fecha = new Date().toISOString().split('T')[0];

// Dinero — number plano, sin formato en la capa de datos
// Nunca: "$ 1.000.000" en el store; sí en el render con Intl.NumberFormat

// Toasts — vía sonner
import { toast } from 'sonner';
toast.success('Guardado');
toast.error('Error al guardar');
```

### Estructura estándar de página

```tsx
export function PageName() {
  const [data, setData] = useState<Type[]>([]);

  useEffect(() => { setData(getX()); }, []);

  return <div className="p-6">...</div>;
}
```

---

## Agregar Nuevas Funcionalidades

### Nueva página

```tsx
// 1. src/pages/NewPage.tsx
export function NewPage() { return <div className="p-6">...</div>; }

// 2. src/App.tsx — agregar al bloque de tabs
{activeTab === 'newpage' && <NewPage />}

// 3. src/components/Layout.tsx — agregar al array `tabs`
{ id: 'newpage', label: 'Nueva Página', icon: SomeIcon },
```

### Nueva entidad

```typescript
// 1. src/lib/types.ts — definir interface
export interface NuevaEntidad { id: string; /* campos */ }

// 2. src/lib/database.ts — agregar al DataStore y defaultData
// 3. src/lib/database.ts — implementar get/add/update/delete
```

---

## Gotchas

| # | Problema | Causa / Solución |
|---|---------|-----------------|
| 1 | Puerto Vite fijo en **1420** | Tauri lo requiere hardcoded en `vite.config.ts`. No cambiar. |
| 2 | `sql.js` excluido de deps Vite | El exclude en `vite.config.ts` es intencional. No eliminar. |
| 3 | **IVA siempre 0** | La capa DB fija `iva = 0`. El campo existe pero no se calcula. |
| 4 | `deleteCombo` es soft-delete | Solo pone `activo = false`. Preserva el historial en facturas. |
| 5 | Stock se descuenta al **crear** la factura | No al despachar. `anularFactura` lo restaura. |
| 6 | `uuid` instalado pero **no se usa** | Los IDs usan `crypto.randomUUID()` nativo. |
| 7 | `react-router-dom` instalado pero **no se usa** | La navegación usa `NavigationContext` (tab state). |
| 8 | No existe `Clientes.tsx` como página | Los clientes se gestionan inline en facturas y cotizaciones. |
| 9 | `src-tauri/` ignorado por el watcher de Vite | Comportamiento esperado; Rust compila separadamente. |

---

## Backup & Recovery

```typescript
import { exportDatabaseToJSON, importDatabaseFromJSON } from './lib/backup';

exportDatabaseToJSON();  // Descarga JSON con todos las colecciones
importDatabaseFromJSON(data);  // Restaura desde JSON (requiere recarga de página)
```

El backup incluye: `configuracion`, `clientes`, `materias_primas`, `subproductos`, `productos`, `producto_componentes`, `facturas`, `factura_items`.

---

## Build & Distribución

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/
#   └── appimage/   *.AppImage  (Linux)
#   └── nsis/       *.exe       (Windows)
#   └── dmg/        *.dmg       (macOS)
```

La configuración de ventana, CSP y bundle está en `src-tauri/tauri.conf.json`.

---

## Versionado — Reglas para push a `main`

**Tres archivos deben actualizarse juntos** antes de cada push:

1. `package.json` → `version`
2. `src-tauri/tauri.conf.json` → `version`
3. `src/lib/changelog.ts` → agregar entrada al **inicio** del array con `version`, `fecha`, y las secciones `novedades`, `mejoras`, `correcciones`

**Progresión**: `0.1.X` → `0.1.30` → `0.2.0` (primer major release) → semver desde ahí.

**Flujo del modal de novedades**:
- `App.tsx` compara versión instalada (`@tauri-apps/api/app`) vs `localStorage('dg_last_version_seen')`
- Si difieren → muestra `ChangelogModal`
- Al cerrar → escribe la versión actual en `dg_last_version_seen`
- También accesible desde Configuración → "Ver novedades"

---

## Quick Reference

| Tarea | Función / Archivo |
|-------|------------------|
| Crear factura | `createFactura(data)` en `database.ts` |
| Anular factura (revierte stock) | `anularFactura(id, motivo)` |
| Ensamblar producto | `assembleProduto(produtoId, cantidad)` |
| Crear orden Venndelo | `createOrder(factura, items, apiKey, config)` en `venndelo.ts` |
| Cotizar envío | `cotizarEnvio(ciudadDestino, pesoKg, ...)` en `envio.ts` |
| Verificar stock bajo | `getStockMinimo()` |
| Exportar Excel | `exportContabilidadDetallada(...)` en `export.ts` |
| Generar PDF factura | `gerarPDFFactura(factura)` en `pdf.ts` |
| Backup | `exportDatabaseToJSON()` en `backup.ts` |
| Cambiar tema | `tailwind.config.js` |
| Cambiar ventana | `src-tauri/tauri.conf.json` |

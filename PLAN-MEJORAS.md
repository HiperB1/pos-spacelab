# Plan de Mejoras - dg-facturacion (My Space)

## Info General
- **Stack:** React 19 + TypeScript + Tauri + sql.js + pdfmake
- **Ruta:** `/home/juanr/Proyectos personales/myspace/dg-facturacion`

---

## AGENTE 1: UI/UX - Tailwind + Diseño Moderno

### Dependencias
- Instalar: `npm install -D tailwindcss @tailwindcss/vite`
- Crear `tailwind.config.js` y configurar
- Crear `src/index.css` con directivas Tailwind

### Tasks

1.1 **Configuración inicial Tailwind**
- Editar `vite.config.ts` para usar plugin Tailwind
- Crear `tailwind.config.js` con theme personalizado (colores, fuentes)
- Crear `src/index.css` con `@import "tailwindcss";`

1.2 **Rediseñar Layout principal**
- Modificar `src/components/Layout.tsx`
- Cambiar header horizontal por sidebar vertical moderno
- Agregar icons con `lucide-react` (`npm install lucide-react`)
- Implementar colapsable del sidebar
- Usar transiciones suaves

1.3 **Rediseñar componentes base**
- Crear `src/components/ui/` con:
  - `Button.tsx` - Variantes: primary, secondary, danger, ghost
  - `Card.tsx` - Con sombras y bordes modernos
  - `Input.tsx` - Con labels y estados
  - `Modal.tsx` - Portal-based modal
  - `Table.tsx` - Base para tablas
  - `Badge.tsx` - Tags/estados
  - `Toast.tsx` - Notificaciones

1.4 **Aplicar estilos a páginas existentes**
- Actualizar `Dashboard.tsx` con cards mejorados
- Actualizar `Clientes.tsx`, `Facturas.tsx`, etc. con nuevos componentes

---

## AGENTE 2: Dashboard Analytics

### Dependencias
- `npm install recharts`

### Tasks

2.1 **Rediseñar stats cards**
- En `Dashboard.tsx`: cards con iconos, tendencias (↑↓), gradientes

2.2 **Gráfico de ventas mensual**
- Gráfico de barras/líneas con ventas por mes
- Comparativa mes actual vs anterior

2.3 **Gráfico de productos más vendidos**
- Top 5 productos/servicios facturados
- Gráfico circular o horizontal

2.4 **Alertas de stock**
- Widget con productos con stock bajo (definir umbral)
- Link directo a inventario

2.5 **Quick actions**
- Botones: Nueva Factura, Nuevo Cliente, Añadir Producto

2.6 **Métricas adicionales**
- Total facturado este mes vs anterior
- Promedioticket
- Clientes nuevos este mes

---

## AGENTE 3: Tablas Avanzadas

### Dependencias
- `npm install @tanstack/react-table` (opcional, o implementar manualmente)

### Tasks

3.1 **Crear componente Table avanzado**
- Archivo: `src/components/ui/AdvancedTable.tsx`
- Props: data, columns, searchable, filterable, sortable, paginated, selectable

3.3 **Implementar en Cliente.tsx**
- Búsqueda por nombre, NIT
- Filtros por estado (si aplica)
- Ordenar por columna

3.4 **Implementar en Facturas.tsx** (ver también Agente 4)
- Búsqueda por numero, cliente, fecha
- Filtros por estado

3.5 **Implementar en inventario**
- InventarioMP.tsx, InventarioSubproductos.tsx, InventarioProductos.tsx
- Búsqueda por nombre, tipo
- Filtros

3.6 **Selección múltiple**
- Agregar checkboxes a tabla
- Acciones en masa (eliminar, exportar)

---

## AGENTE 4: Facturas Mejoradas

### Tasks

4.1 **Anular facturas**
- Modificar `src/lib/facturas.ts`: agregar función `anularFactura(id)`
- Modificar `Facturas.tsx`: agregar botón "Anular" con confirmación
- Actualizar `database/init.sql`: agregar columna `notas` si no existe

4.2 **Búsqueda avanzada en facturas**
- Campo búsqueda por: número, cliente, NIT
- Filtros por fecha (rango)
- Filtros por estado (activa, anulada)
- Ordenar por cualquier columna

4.3 **Exportar a Excel/CSV**
- Agregar `npm install xlsx file-saver`
- Crear función `exportToExcel(data, filename)` en `src/lib/export.ts`
- Botón exportar en Facturas.tsx

4.4 **Agregar notas/observaciones**
- Modificar schema: `ALTER TABLE facturas ADD COLUMN notas TEXT`
- Actualizar типы Factura
- Input en formulario de creación
- Mostrar en lista y detalle
- Incluir en PDF

4.5 **Mejoras visuales**
- Estado "anulada" visible con color rojo
- Fecha formateada correctamente
- Totales alineados

---

## AGENTE 5: Sistema de Alertas

### Dependencias
- `npm install sonner` (toast) o implementar propio

### Tasks

5.1 **Crear sistema de toast**
- Componente `src/components/ui/Toast.tsx` o usar librería
- Funciones: success, error, warning, info
- Posición: top-right

5.2 **Hook de notificaciones**
- Crear `src/hooks/useToast.ts`
- Integrar en todos los CRUDs

5.3 **Alertas de stock mínimo**
- Modificar `database/init.sql`: agregar `stock_minimo INTEGER DEFAULT 10` a tablas inventario
- Crear función `getProductosStockBajo()` en `src/lib/inventario.ts`
- Mostrar badge/warning en Dashboard

5.4 **Panel de alertas en dashboard**
- Nueva sección "Alertas" en Dashboard.tsx
- Listar: stock bajo, productos sin stock, facturas pendientes

5.5 **Notificaciones persistentes**
- Guardar alertas en `localStorage`
- Marcar como leídas

---

## AGENTE 6: Historial de Inventario

### Tasks

6.1 **Crear tabla movimientos**
- Modificar `database/init.sql`:
```sql
CREATE TABLE inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste'
  tabla TEXT NOT NULL, -- 'materias_primas', 'subproductos', 'productos'
  registro_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  cantidad INTEGER DEFAULT 0,
  observaciones TEXT,
  usuario TEXT DEFAULT 'sistema',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimientos_fecha ON inventario_movimientos(created_at);
CREATE INDEX idx_movimientos_registro ON inventario_movimientos(tabla, registro_id);
```

6.2 **Crear hook de tracking**
- Archivo: `src/lib/inventario_movimientos.ts`
- Funciones: `registrarMovimiento(tipo, tabla, registroId, campo, anterior, nuevo, observaciones)`

6.3 **Integrar en CRUDs de inventario**
- Modificar `materias_primas.ts`: registrar en create, update, delete
- Modificar `subproductos.ts`: igual
- Modificar `productos.ts`: igual

6.4 **Página de historial**
- Crear `src/pages/HistorialInventario.tsx`
- Tabla con filtros: por tipo, por producto, por fecha
- Mostrar usuario, timestamp, cambios

6.5 **Agregar al Layout**
- En `Layout.tsx`: agregar tab "Historial"

---

## AGENTE 7: Backup y Export

### Dependencias
- Ya tiene uuid, sql.js

### Tasks

7.1 **Exportar DB a JSON**
- Función en `src/lib/backup.ts`:
```ts
export function exportDatabaseToJSON() {
  // Export all tables to JSON
}
```
- Leer de sql.js, convertir a JSON
- Descargar archivo `dg-facturacion-backup-{date}.json`

7.2 **Importar desde JSON**
- Función en `src/lib/backup.ts`: `importDatabaseFromJSON(data)`
- Validar estructura
- Importar tabla por tabla
-confirmar antes de reemplazar

7.3 **Exportar a CSV por módulo**
- `exportToCSV(data, filename)` genérica
- Botones en: Clientes, Facturas, Productos, MP, Subproductos
- Incluir headers

7.4 **Página de configuración de backup**
- Modificar `Configuracion.tsx`
- Secciones: Exportar todo, Importar, Exportar por módulo
- Mostrar última fecha de backup

7.5 **Validación y seguridad**
- Validar JSON antes de importar
- Mensajes de error claros
- Confirmación antes de imports

---

## Dependencias entre Agentes

```
Agente 1 (UI) → debe completarse primero
Agente 2 (Dashboard) →依赖 Agente 1 (usará los nuevos estilos)
Agente 3 (Tablas) →依赖 Agente 1 (componentes UI)
Agente 4 (Facturas) →依赖 Agente 1 + Agente 3
Agente 5 (Alertas) →依赖 Agente 1
Agente 6 (Historial) → puede paralelizarse
Agente 7 (Backup) → puede paralelizarse
```

---

## Comandos de verificación

```bash
cd /home/juanr/Proyectos personales/myspace/dg-facturacion

# Instalar nuevas deps
npm install tailwindcss @tailwindcss/vite lucide-react recharts sonner xlsx file-saver

# Dev
npm run dev

# Build
npm run build

# Tauri
npm run tauri dev
npm run tauri build
```

---

## Archivos a crear/modificar

### Nuevos archivos
- `src/index.css`
- `tailwind.config.js`
- `src/components/ui/` (Button, Card, Input, Modal, Table, Badge, Toast)
- `src/lib/export.ts`
- `src/lib/backup.ts`
- `src/lib/inventario_movimientos.ts`
- `src/hooks/useToast.ts`
- `src/pages/HistorialInventario.tsx`

### Archivos a modificar
- `vite.config.ts`
- `package.json` (agregar deps)
- `src/components/Layout.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Clientes.tsx`
- `src/pages/Facturas.tsx`
- `src/pages/InventarioMP.tsx`
- `src/pages/InventarioSubproductos.tsx`
- `src/pages/InventarioProductos.tsx`
- `src/pages/Disponibilidad.tsx`
- `src/pages/Configuracion.tsx`
- `src/lib/types.ts`
- `database/init.sql`
- Todos los `src/lib/*.ts` (productos, facturas, materias_primas, subproductos, clientes)
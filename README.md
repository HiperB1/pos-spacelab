# 🚀 SpaceLab POS - Sistema de Facturación y Gestión

**SpaceLab POS** es una aplicación de escritorio robusta diseñada para la gestión integral de facturación, inventarios, contabilidad y logística de entregas. Construida con tecnologías modernas, ofrece una interfaz premium, oscura y altamente eficiente para pequeñas y medianas empresas.

![Versión](https://img.shields.io/badge/version-1.1.0-blue)
![Tech](https://img.shields.io/badge/tech-Tauri%20%7C%20React%20%7C%20TS-orange)

## ✨ Características Principales

### 📊 Dashboard de Control
- **Métricas en Tiempo Real**: Ventas del mes, facturas emitidas y más.
- **Acciones Rápidas**: Accesos directos para crear facturas, clientes y gestionar despachos.
- **Seguimiento de Metas**: Configuración de metas mensuales con cálculo automático de meta diaria y progreso visual.
- **Alertas de Stock**: Notificaciones instantáneas de insumos o productos bajos.

### 📝 Facturación Profesional
- **Generación de PDFs**: Formato de factura limpio y profesional con logo corporativo.
- **Guías de Envío**: Generación independiente de guías para logística sin precios visibles.
- **Gestión de Descuentos**: Sistema de descuento manual por factura.
- **Búsqueda Avanzada**: Filtros por cliente, fecha y estado.

### 📦 Gestión de Inventario y Producción
- **Tres Niveles de Inventario**: Materias primas, subproductos y productos terminados.
- **Módulo de Ensamblaje**: Lógica de producción que descuenta componentes automáticamente al armar productos finales.
- **Historial de Movimientos**: Registro detallado de cada entrada, salida o ajuste.

### 🚚 Logística de Pedidos
- **Gestión de Domiciliarios**: Directorio de mensajeros con datos de contacto y vehículo.
- **Control de Despachos**: Flujo para asignar pedidos a domiciliarios específicos y marcar salidas en tiempo real.
- **Estado de Entrega**: Seguimiento de pedidos pendientes vs. despachados.

### 📈 Contabilidad y Reportes
- **Reportes Avanzados**: Análisis detallado por rango de fechas y productos.
- **Gráficos Dinámicos**: Visualización de flujo de ventas y top de productos con Recharts.
- **Exportación a Excel**: Reportes profesionales con auto-ajuste de columnas, filas de totales y desglose detallado factura por factura.

## 🛠️ Tecnologías

### Frontend
- **React 18** con **TypeScript**
- **Vite** para un desarrollo ultrarrápido
- **TailwindCSS** para un diseño moderno y responsive
- **Lucide React** para iconografía premium
- **Recharts** para visualización de datos

### Desktop Core
- **Tauri** para el empaquetado nativo (ligero y seguro)
- **Rust** en el backend de sistema

### Utilidades
- **jsPDF & autoTable** para documentos PDF
- **SheetJS (XLSX)** para reportes de Excel
- **Sonner** para notificaciones interactivas

## 🚀 Instalación y Desarrollo

### Requisitos Previos
- [Node.js](https://nodejs.org/) (v16+)
- [Rust & Cargo](https://www.rust-lang.org/tools/install) (para Tauri)

### Pasos
1. **Clonar el repositorio**
   ```bash
   git clone git@github.com:HiperB1/pos-spacelab.git
   cd pos-spacelab
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en modo Desarrollo (Tauri)**
   ```bash
   npm run tauri dev
   ```

4. **Compilar para Producción**
   ```bash
   npm run tauri build
   ```

## 🔒 Privacidad y Backup
La aplicación utiliza una **base de datos local (DataStore)** para garantizar que tus datos nunca salgan de tu equipo. 
- Puedes exportar e importar **copias de seguridad en formato JSON** desde el menú de Configuración para asegurar tu información.

---
Desarrollado con ❤️ para **My Space** por el equipo de SpaceLab.

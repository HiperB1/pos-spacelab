export interface VersionNota {
  version: string;
  fecha: string;
  novedades?: string[];
  mejoras?: string[];
  correcciones?: string[];
}

export const changelog: VersionNota[] = [
  {
    version: "1.0.2",
    fecha: "2026-05-26",
    novedades: [
      "Ícono decorativo (nave espacial) en la sección de agradecimientos de la guía de envío local",
      "QR de la guía de envío local configurable desde Configuración: subir, previsualizar y eliminar la imagen",
      "Campo de barrio de Medellín en pedidos locales",
    ],
    mejoras: [
      "Nuevo ícono de la aplicación",
      "Funciones de generación de PDF convertidas a useCallback para evitar re-renders innecesarios",
    ],
    correcciones: [
      "Timeout corregido en la generación de la guía de envío local",
      "Cancelación automática del pedido en Venndelo al anular una factura nacional",
      "Regeneración de guía Venndelo corregida después de anulación",
      "Recuadro negro eliminado de la sección de agradecimientos en la guía local",
    ],
  },
  {
    version: "1.0.1",
    fecha: "2026-05-22",
    mejoras: [
      "PDFs de factura, cotización y guía de envío adaptados al tamaño exacto del papel POS: 100 × 95 mm",
      "Escala global proporcional en facturas y cotizaciones: todo el contenido se comprime automáticamente para caber en una sola página, sin importar la cantidad de ítems",
      "Tipografía más grande y legible en todos los PDFs (fuentes en negrita, color negro puro)",
      "Logo de la empresa se escala proporcionalmente con 'fit' en lugar de ancho fijo, evitando deformaciones",
      "Guía de envío local rediseñada con estética espacial y marco negro en el borde del PDF",
      "Columnas de precio y cantidad en la tabla de ítems ajustadas para aprovechar mejor el espacio",
    ],
    correcciones: [
      "PDFs ya no generan página en blanco al final cuando el contenido es pequeño",
      "Algoritmo de escala reemplazado: ahora usa escala global proporcional en lugar de reducir solo la tipografía de la tabla, logrando resultados visualmente consistentes",
      "Márgenes y espaciados internos del PDF ahora se escalan junto con las fuentes, eliminando cortes de contenido",
    ],
  },
  {
    version: "1.0.0",
    fecha: "2026-05-21",
    novedades: [
      "Sistema completo de facturación con generación de PDF",
      "Gestión de inventario multinivel: materias primas, subproductos y productos terminados",
      "Sistema de combos con descuento automático de inventario al facturar",
      "Módulo de cotizaciones con conversión directa a factura",
      "Módulo de notas de crédito vinculadas a facturas",
      "Módulo de pedidos con asignación a domiciliarios",
      "Sistema de abonos y saldos pendientes para domiciliarios con comprobantes de imagen",
      "Integración Venndelo: cotización de envío en tiempo real con dimensiones reales por producto",
      "Integración Venndelo: creación de órdenes y guías de envío desde facturas",
      "Guía de envío generada como sticker PDF 95×95 mm",
      "Sincronización bidireccional de peso y dimensiones de productos con Venndelo",
      "Auto-actualización de la aplicación desde GitHub con firma digital",
      "Exportación a Excel con desglose completo factura por factura",
      "Módulo de reportes multihojas (facturas, productos, clientes)",
      "Búsqueda global en toda la aplicación",
      "Dashboard con KPIs: ventas del día, facturas pendientes, top productos y top días",
      "Historial de movimientos de inventario con trazabilidad completa",
      "Sistema de notas de actualización: modal automático al recibir nueva versión",
      "Botón para formatear datos transaccionales en Configuración",
    ],
    mejoras: [
      "Generación de PDFs y reportes Excel funciona correctamente en macOS",
      "Los archivos se guardan en Documentos/MySpace/PDFs y Documentos/MySpace/Reportes",
      "El PDF o Excel se abre automáticamente tras generarse",
      "Hoja 'Facturas' aparece como primera pestaña en el reporte Excel",
      "Dashboard: Top Productos muestra lista ordenada en lugar de gráfico de barras",
      "Cotización de envío usa las dimensiones reales registradas por producto",
      "Cotización de envío visible en tiempo real antes de emitir la factura",
      "Codificación base64 nativa: generación de archivos prácticamente instantánea",
    ],
    correcciones: [
      "Generación de archivos corregida en macOS (WKWebView / apertura automática)",
      "Saldos pendientes de domiciliarios calculados con abonos registrados, no con checks de facturas",
      "Cotización de envío usa el método de pago real y el precio real del producto",
      "Sincronización de precios desde la API Venndelo corregida",
      "Identificación del cliente omitida en Venndelo si está vacía",
      "Typo Manuel → Manual en formulario de facturas",
    ],
  },
  {
    version: "0.1.30",
    fecha: "2026-05-16",
    correcciones: [
      "Generación de PDFs y reportes Excel ahora funciona correctamente en macOS",
      "Los archivos ya no se guardan como 'Unknown' sin extensión en macOS",
      "El permiso de apertura de archivos locales (opener) estaba bloqueando la previsualización",
    ],
    mejoras: [
      "Los archivos se guardan en Documentos/MySpace/PDFs y Documentos/MySpace/Reportes",
      "El PDF o Excel se abre automáticamente tras generarse",
      "Codificación base64 nativa: generación de archivos es ahora prácticamente instantánea",
    ],
  },
  {
    version: "0.1.29",
    fecha: "2026-05-16",
    novedades: [
      "Sistema de notas de actualización: modal automático al recibir una nueva versión",
      "Acceso al historial de versiones desde Configuración → Ver novedades",
    ],
  },
  {
    version: "0.1.28",
    fecha: "2026-05-16",
    novedades: [
      "Cotización de envío visible en tiempo real antes de emitir factura",
      "Sistema de notas de actualización: ahora puedes ver qué cambió en cada versión",
    ],
    mejoras: [
      "Cálculo de envío usa el total cotizado real (quoted_shipping_total)",
      "Validación de productos antes de cotizar envío",
    ],
    correcciones: [
      "Cotización de envío ahora usa el método de pago y precio real del producto",
      "Limpieza del payload de cotización para evitar errores de la API",
    ],
  },
];

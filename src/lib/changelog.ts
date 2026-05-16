export interface VersionNota {
  version: string;
  fecha: string;
  novedades?: string[];
  mejoras?: string[];
  correcciones?: string[];
}

export const changelog: VersionNota[] = [
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

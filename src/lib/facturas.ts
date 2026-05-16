import * as db from '../lib/database';
import type { Configuracion, Factura, FacturaItem } from './types';
import { showToast } from './toast';

export function getConfiguracion(): Configuracion {
  return db.getConfiguracion();
}

export function updateConfiguracion(data: Partial<Configuracion>): void {
  db.updateConfiguracion(data);
}

export function getAllFacturas(): (Factura & { items: FacturaItem[] })[] {
  return db.getFacturas();
}

export function getFacturaById(id: string): (Factura & { items: FacturaItem[] }) | undefined {
  return db.getFactura(id);
}

export function createFactura(data: {
  cliente_id: string;
  cliente_nome: string;
  cliente_apellido?: string;
  cliente_celular: string;
  cliente_email?: string;
  cliente_nit: string;
  tipo_identificacion?: string;
  cliente_direccion: string;
  items: { descripcion: string; quantidade: number; precio: number }[];
  notas?: string;
  descuento?: number;
  costo_envio?: number;
  tipo_pedido?: 'local' | 'nacional';
  payment_method_code?: 'COD' | 'EXTERNAL_PAYMENT';
  ciudad_destino?: string;
}): Factura & { items: FacturaItem[] } {
  const factura = db.createFactura(data);
  showToast.success('Factura creada exitosamente');
  return factura;
}

export function anularFactura(id: string, motivo: string): void {
  db.anularFactura(id, motivo);
  showToast.success('Factura anulada');
}

export function getSiguienteNumero(): string {
  return db.getSiguienteNumero();
}
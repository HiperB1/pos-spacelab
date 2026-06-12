import { saveAs } from 'file-saver';
import * as db from './database';

export interface BackupData {
  version: string;
  created_at: string;
  /** v2.0+: snapshot completo del store (todas las colecciones). */
  store?: any;
  /** Campos legacy v1.0 (colecciones planas en la raíz). Solo lectura. */
  [key: string]: any;
}

// v2.0: snapshot completo del store. v1.0 (legacy) sólo guardaba 8 colecciones
// y perdía cotizaciones, notas de crédito, abonos, domiciliarios, combos y TODOS
// los items de factura. La importación sigue leyendo backups v1.0 (ver
// normalizeLegacyStore) para no romper archivos antiguos.
const BACKUP_VERSION = '2.0';

export function exportDatabaseToJSON(): void {
  const data: BackupData = {
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    store: db.exportRawStore(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().split('T')[0];
  saveAs(blob, `dg-facturacion-backup-${date}.json`);

  localStorage.setItem('dg_facturacion_last_backup', new Date().toISOString());
}

/**
 * Reconstruye factura_items a partir de facturas con items embebidos.
 * Función pura: los backups v1.0 guardaban los items dentro de cada factura
 * (`factura.items`) y dejaban `factura_items` vacío. Sin esta reconstrucción,
 * al importar un backup antiguo TODAS las facturas quedarían sin líneas.
 */
export function reconstruirFacturaItems(facturas: any[]): any[] {
  const items: any[] = [];
  for (const f of facturas || []) {
    if (!f || !Array.isArray(f.items)) continue;
    for (const it of f.items) {
      items.push({
        id: it.id || crypto.randomUUID(),
        factura_id: f.id,
        tipo_item: it.tipo_item || 'manual',
        produto_id: it.produto_id,
        combo_id: it.combo_id,
        descripcion: it.descripcion,
        quantidade: it.quantidade,
        precio: it.precio,
        total: it.total ?? (it.quantidade * it.precio),
      });
    }
  }
  return items;
}

/**
 * Normaliza un store proveniente de un backup (v1.0 o v2.0) a la forma que
 * espera el store en memoria. Si factura_items está vacío pero las facturas
 * traen items embebidos (formato v1.0), los reconstruye. Función pura.
 */
export function normalizeLegacyStore(rawStore: any): any {
  const s = { ...rawStore };
  const sinItems = !Array.isArray(s.factura_items) || s.factura_items.length === 0;
  const tieneEmbebidos = Array.isArray(s.facturas)
    && s.facturas.some((f: any) => Array.isArray(f?.items) && f.items.length > 0);
  if (sinItems && tieneEmbebidos) {
    s.factura_items = reconstruirFacturaItems(s.facturas);
  }
  return s;
}

export function importDatabaseFromJSON(data: BackupData): { success: boolean; message: string } {
  if (!data || typeof data !== 'object' || !data.version) {
    return { success: false, message: 'Archivo de backup inválido: falta versión' };
  }

  // v2.0 trae `store`; los backups v1.0 traen las colecciones planas en la raíz.
  const rawStore = data.store ?? extractLegacyRoot(data);

  if (!rawStore.configuracion) {
    return { success: false, message: 'Archivo de backup inválido: falta configuración' };
  }
  if (!Array.isArray(rawStore.clientes)) {
    return { success: false, message: 'Archivo de backup inválido: estructura de clientes incorrecta' };
  }

  try {
    db.replaceStore(normalizeLegacyStore(rawStore));
    return { success: true, message: 'Backup importado correctamente. Recargue la página.' };
  } catch (e) {
    return { success: false, message: 'Error al importar: ' + (e as Error).message };
  }
}

/** Extrae las colecciones de un backup v1.0 (todo lo que no sean metadatos). */
function extractLegacyRoot(data: any): any {
  const { version, created_at, store, ...rest } = data;
  return rest;
}

export function exportToCSV(data: any[], filename: string, columns: { key: string; label: string }[]): void {
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

export function getLastBackupDate(): string | null {
  return localStorage.getItem('dg_facturacion_last_backup');
}
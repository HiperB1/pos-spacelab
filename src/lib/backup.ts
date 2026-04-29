import { saveAs } from 'file-saver';
import * as db from './database';

export interface BackupData {
  version: string;
  created_at: string;
  configuracion: any;
  clientes: any[];
  materias_primas: any[];
  subproductos: any[];
  productos: any[];
  producto_componentes: any[];
  facturas: any[];
  factura_items: any[];
}

const BACKUP_VERSION = '1.0';

export function exportDatabaseToJSON(): void {
  const data: BackupData = {
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    configuracion: db.getConfiguracion(),
    clientes: db.getClientes(),
    materias_primas: db.getMateriasPrimas(),
    subproductos: db.getSubproductos(),
    productos: db.getProdutos(),
    producto_componentes: (db as any).getComponentes?.() || [],
    facturas: (db as any).getFacturas?.() || [],
    factura_items: []
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().split('T')[0];
  saveAs(blob, `dg-facturacion-backup-${date}.json`);
  
  localStorage.setItem('dg_facturacion_last_backup', new Date().toISOString());
}

export function importDatabaseFromJSON(data: BackupData): { success: boolean; message: string } {
  if (!data.version) {
    return { success: false, message: 'Archivo de backup inválido: falta versión' };
  }
  if (!data.configuracion) {
    return { success: false, message: 'Archivo de backup inválido: falta configuración' };
  }
  if (!Array.isArray(data.clientes)) {
    return { success: false, message: 'Archivo de backup inválido: estructura de clientes incorrecta' };
  }

  try {
    const store: any = {
      configuracion: data.configuracion,
      clientes: data.clientes,
      materias_primas: data.materias_primas || [],
      subproductos: data.subproductos || [],
      productos: data.productos || [],
      producto_componentes: data.producto_componentes || [],
      facturas: data.facturas || [],
      factura_items: data.factura_items || []
    };

    localStorage.setItem('dg_facturacion_db', JSON.stringify(store));
    return { success: true, message: 'Backup importado correctamente. Recargue la página.' };
  } catch (e) {
    return { success: false, message: 'Error al importar: ' + (e as Error).message };
  }
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
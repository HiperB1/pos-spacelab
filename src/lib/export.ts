import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Factura, FacturaItem } from './types';

export function exportToExcel(data: any[], filename: string, options?: { title?: string; subtitle?: string; summary?: any; detail?: any[] }): void {
  const workbook = XLSX.utils.book_new();

  const topSection: any[][] = [];
  if (options?.title) { topSection.push([options.title.toUpperCase()]); topSection.push([]); }
  if (options?.summary) {
    Object.entries(options.summary).forEach(([key, value]) => { topSection.push([key, value]); });
    topSection.push([]);
  }
  if (options?.subtitle) { topSection.push([options.subtitle]); topSection.push([]); }

  const worksheet = XLSX.utils.aoa_to_sheet(topSection);
  XLSX.utils.sheet_add_json(worksheet, data, { origin: topSection.length > 0 ? -1 : 0 });

  const keys = Object.keys(data[0] || {});
  worksheet['!cols'] = keys.map(key => ({ wch: Math.max(key.length, ...data.map(row => (row[key] || '').toString().length)) + 2 }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen');

  if (options?.detail && options.detail.length > 0) {
    const detailSheet = XLSX.utils.json_to_sheet(options.detail);
    const detailKeys = Object.keys(options.detail[0] || {});
    detailSheet['!cols'] = detailKeys.map(key => ({ wch: Math.max(key.length, ...options.detail!.map(row => (row[key] || '').toString().length)) + 2 }));
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detalle de Ventas');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'array' });
  const blob = new Blob([csvBuffer], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
}

type FacturaConItems = Factura & { items: FacturaItem[] };

interface ResumenContabilidad {
  totalVentas: number;
  gananciaTotal: number;
  itemsVendidos: number;
  ticketPromedio: number;
  numFacturas: number;
  totalDescuentos: number;
  totalEnvios: number;
  tablaProductos: { name: string; quantity: number; revenue: number; cost: number }[];
}

function applyCurrencyFormat(ws: XLSX.WorkSheet, data: any[][], colIndices: number[]): void {
  data.forEach((row, r) => {
    colIndices.forEach(c => {
      if (r === 0) return; // skip headers
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
        ws[cellRef].z = '#,##0';
      }
    });
  });
}

export function exportContabilidadDetallada(
  facturas: FacturaConItems[],
  resumen: ResumenContabilidad,
  periodo: { inicio: string; fin: string; estado: string },
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(2) + '%' : '0%');

  const sorted = [...facturas].sort((a, b) => a.numero.localeCompare(b.numero));

  // ─── HOJA 1: Resumen ───────────────────────────────────────────────────
  const resumenRows: any[][] = [
    ['REPORTE DE CONTABILIDAD - SPACE LAB'],
    [],
    ['Período', `${periodo.inicio} al ${periodo.fin}`],
    ['Estado filtrado', periodo.estado],
    ['Fecha de generación', new Date().toLocaleDateString('es-CO')],
    [],
    ['MÉTRICAS DEL PERÍODO'],
    ['Ventas totales', fmt(resumen.totalVentas)],
    ['Utilidad bruta estimada', fmt(resumen.gananciaTotal)],
    ['Margen bruto', pct(resumen.gananciaTotal, resumen.totalVentas)],
    ['N° de facturas', resumen.numFacturas],
    ['Unidades vendidas', resumen.itemsVendidos],
    ['Ticket promedio', fmt(resumen.ticketPromedio)],
    ['Total descuentos aplicados', fmt(resumen.totalDescuentos)],
    ['Total costos de envío', fmt(resumen.totalEnvios)],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(resumenRows);
  ws1['!cols'] = [{ wch: 32 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // ─── HOJA 2: Facturas (una fila por factura) ───────────────────────────
  const facturaHeaders = [
    '# Factura', 'Fecha', 'Cliente', 'NIT / ID', 'Teléfono',
    'Tipo Pedido', 'Método Pago', 'Estado', 'Pagada',
    'Subtotal', 'Descuento', 'Costo Envío', 'TOTAL',
    'N° Ítems', 'Ciudad Destino', 'Notas',
  ];

  const facturaRows = sorted.map(f => [
    f.numero,
    f.fecha,
    [f.cliente_nome, f.cliente_apellido].filter(Boolean).join(' '),
    f.cliente_nit,
    f.cliente_celular,
    f.tipo_pedido === 'nacional' ? 'Nacional' : 'Local',
    f.payment_method_code === 'COD'
      ? 'Contra entrega'
      : f.payment_method_code === 'EXTERNAL_PAYMENT'
        ? 'Pago externo'
        : 'Efectivo / Transferencia',
    f.estado === 'activa' ? 'Activa' : f.estado === 'anulada' ? 'Anulada' : f.estado,
    f.pagada ? 'Sí' : 'No',
    f.subtotal,
    f.descuento || 0,
    f.costo_envio || 0,
    f.total,
    f.items.length,
    f.ciudad_destino || '',
    f.notas || '',
  ]);

  const totalesF: any[] = [
    'TOTALES', '', '', '', '', '', '', '', '',
    sorted.reduce((s, f) => s + f.subtotal, 0),
    sorted.reduce((s, f) => s + (f.descuento || 0), 0),
    sorted.reduce((s, f) => s + (f.costo_envio || 0), 0),
    sorted.reduce((s, f) => s + f.total, 0),
    sorted.reduce((s, f) => s + f.items.length, 0),
    '', '',
  ];

  const ws2Data = [facturaHeaders, ...facturaRows, [], totalesF];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 14 },
    { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 8 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
    { wch: 10 }, { wch: 20 }, { wch: 35 },
  ];
  applyCurrencyFormat(ws2, ws2Data, [9, 10, 11, 12]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Facturas');

  // ─── HOJA 3: Ítems por Factura ─────────────────────────────────────────
  const itemHeaders = [
    '# Factura', 'Fecha', 'Cliente', 'Producto / Servicio',
    'Cantidad', 'Precio Unitario', 'Total Ítem',
  ];

  const itemRows: any[][] = [];
  sorted.forEach(f => {
    f.items.forEach(item => {
      itemRows.push([
        f.numero,
        f.fecha,
        [f.cliente_nome, f.cliente_apellido].filter(Boolean).join(' '),
        item.descripcion,
        item.quantidade,
        item.precio,
        item.total,
      ]);
    });
  });

  const totalesI: any[] = [
    'TOTALES', '', '', '',
    itemRows.reduce((s, r) => s + (r[4] as number), 0),
    '',
    itemRows.reduce((s, r) => s + (r[6] as number), 0),
  ];

  const ws3Data = [itemHeaders, ...itemRows, [], totalesI];
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 38 },
    { wch: 10 }, { wch: 16 }, { wch: 16 },
  ];
  applyCurrencyFormat(ws3, ws3Data, [5, 6]);
  XLSX.utils.book_append_sheet(wb, ws3, 'Ítems por Factura');

  // ─── HOJA 4: Por Producto ──────────────────────────────────────────────
  const prodHeaders = [
    'Producto / Servicio', 'Unid. Vendidas', 'Ingresos', 'Costo Estimado', 'Utilidad', '% Margen',
  ];

  const prodRows = resumen.tablaProductos.map(p => [
    p.name,
    p.quantity,
    p.revenue,
    p.cost,
    p.revenue - p.cost,
    pct(p.revenue - p.cost, p.revenue),
  ]);

  const totalesP: any[] = [
    'TOTALES',
    resumen.tablaProductos.reduce((s, p) => s + p.quantity, 0),
    resumen.totalVentas,
    resumen.totalVentas - resumen.gananciaTotal,
    resumen.gananciaTotal,
    pct(resumen.gananciaTotal, resumen.totalVentas),
  ];

  const ws4Data = [prodHeaders, ...prodRows, [], totalesP];
  const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
  ws4['!cols'] = [
    { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
  ];
  applyCurrencyFormat(ws4, ws4Data, [2, 3, 4]);
  XLSX.utils.book_append_sheet(wb, ws4, 'Por Producto');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

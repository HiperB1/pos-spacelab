import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToExcel(data: any[], filename: string, options?: { title?: string; subtitle?: string; summary?: any; detail?: any[] }): void {
  const workbook = XLSX.utils.book_new();
  
  // SHEET 1: Summary & Product Breakdown
  const topSection: any[][] = [];
  if (options?.title) { topSection.push([options.title.toUpperCase()]); topSection.push([]); }
  if (options?.summary) {
    Object.entries(options.summary).forEach(([key, value]) => { topSection.push([key, value]); });
    topSection.push([]);
  }
  if (options?.subtitle) { topSection.push([options.subtitle]); topSection.push([]); }

  const worksheet = XLSX.utils.aoa_to_sheet(topSection);
  XLSX.utils.sheet_add_json(worksheet, data, { origin: topSection.length > 0 ? -1 : 0 });

  // Auto-width
  const keys = Object.keys(data[0] || {});
  worksheet['!cols'] = keys.map(key => ({ wch: Math.max(key.length, ...data.map(row => (row[key] || '').toString().length)) + 2 }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen');
  
  // SHEET 2: Detailed Sales (if provided)
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
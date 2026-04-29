import type { InventarioMovimiento } from './types';

const STORAGE_KEY = 'dg_facturacion_movimientos';

function getAllStored(): InventarioMovimiento[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveAll(items: InventarioMovimiento[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getMovimientos(filtros?: { tabla?: string; registroId?: string; fechaDesde?: string }): InventarioMovimiento[] {
  let items = getAllStored();
  
  if (filtros) {
    if (filtros.tabla) {
      items = items.filter(m => m.tabla === filtros.tabla);
    }
    if (filtros.registroId) {
      items = items.filter(m => m.registro_id === filtros.registroId);
    }
    if (filtros.fechaDesde) {
      items = items.filter(m => m.created_at.split('T')[0] >= filtros.fechaDesde!);
    }
  }
  
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function registrarMovimiento(data: Omit<InventarioMovimiento, 'id' | 'created_at'>): InventarioMovimiento {
  const items = getAllStored();
  const movimiento: InventarioMovimiento = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  items.push(movimiento);
  saveAll(items);
  return movimiento;
}

export function getHistorialRegistro(tabla: string, registroId: string): InventarioMovimiento[] {
  return getMovimientos({ tabla, registroId });
}
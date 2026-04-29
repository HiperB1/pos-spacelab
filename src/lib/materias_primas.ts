import { getMateriasPrimas as getMateriasPrimasDB, addMateriaPrima, updateMateriaPrima as updateMateriaPrimaDB, deleteMateriaPrima as deleteMateriaPrimaDB } from '../lib/database';
import type { MateriaPrima } from '../lib/types';
import { showToast } from './toast';

export function getAllMateriasPrimas(): MateriaPrima[] {
  return getMateriasPrimasDB();
}

export function createMateriaPrima(data: Omit<MateriaPrima, 'id'>): MateriaPrima {
  const mp = addMateriaPrima(data);
  showToast.success('Materia prima creada exitosamente');
  if (data.stock_minimo !== undefined && data.quantidade_kg <= data.stock_minimo) {
    showToast.warning(`Stock bajo: ${data.nome}`);
  }
  if (data.quantidade_kg <= 0) {
    showToast.error(`Sin stock: ${data.nome}`);
  }
  return mp;
}

export function updateMateriaPrima(id: string, data: Partial<MateriaPrima>): void {
  const existente = getMateriasPrimasDB().find(m => m.id === id);
  updateMateriaPrimaDB(id, data);
  showToast.success('Materia prima actualizada');
  if (data.quantidade_kg !== undefined) {
    if (data.quantidade_kg <= 0 && existente && existente.quantidade_kg > 0) {
      showToast.error(`Sin stock: ${existente.nome}`);
    } else if (data.stock_minimo !== undefined && data.quantidade_kg <= data.stock_minimo && existente && existente.quantidade_kg > data.stock_minimo) {
      showToast.warning(`Stock bajo: ${existente.nome}`);
    }
  }
}

export function deleteMateriaPrima(id: string): void {
  deleteMateriaPrimaDB(id);
  showToast.success('Materia prima eliminada');
}
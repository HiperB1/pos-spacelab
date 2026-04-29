import { getSubproductos as getSubproductosDB, getSubproduto, addSubproduto, updateSubproduto as updateSubprodutoDB, deleteSubproduto as deleteSubprodutoDB } from '../lib/database';
import type { Subproducto } from '../lib/types';
import { showToast } from './toast';

export function getAllSubproductos(): Subproducto[] {
  return getSubproductosDB();
}

export function getSubproductoById(id: string): Subproducto | undefined {
  return getSubproduto(id);
}

export function createSubproducto(data: Omit<Subproducto, 'id'>): Subproducto {
  const sp = addSubproduto(data);
  showToast.success('Subproducto creado exitosamente');
  if (data.stock_minimo !== undefined && data.quantidade <= data.stock_minimo) {
    showToast.warning(`Stock bajo: ${data.nome}`);
  }
  if (data.quantidade <= 0) {
    showToast.error(`Sin stock: ${data.nome}`);
  }
  return sp;
}

export function updateSubproducto(id: string, data: Partial<Subproducto>): void {
  const existente = getSubproductosDB().find(s => s.id === id);
  updateSubprodutoDB(id, data);
  showToast.success('Subproducto actualizado');
  if (data.quantidade !== undefined) {
    if (data.quantidade <= 0 && existente && existente.quantidade > 0) {
      showToast.error(`Sin stock: ${existente.nome}`);
    } else if (data.stock_minimo !== undefined && data.quantidade <= data.stock_minimo && existente && existente.quantidade > data.stock_minimo) {
      showToast.warning(`Stock bajo: ${existente.nome}`);
    }
  }
}

export function deleteSubproducto(id: string): void {
  deleteSubprodutoDB(id);
  showToast.success('Subproducto eliminado');
}
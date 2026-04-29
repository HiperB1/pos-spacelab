import { getClientes as getClientesDB, addCliente, updateCliente as updateClienteDB, deleteCliente as deleteClienteDB } from '../lib/database';
import type { Cliente } from '../lib/types';
import { showToast } from './toast';

export function getAllClientes(): Cliente[] {
  return getClientesDB();
}

export function getCliente(id: string): Cliente | undefined {
  return getClientesDB().find(c => c.id === id);
}

export function createCliente(data: Omit<Cliente, 'id'>): Cliente {
  const cliente = addCliente(data);
  showToast.success('Cliente creado exitosamente');
  return cliente;
}

export function updateCliente(id: string, data: Partial<Cliente>): void {
  updateClienteDB(id, data);
  showToast.success('Cliente actualizado');
}

export function deleteCliente(id: string): void {
  deleteClienteDB(id);
  showToast.success('Cliente eliminado');
}
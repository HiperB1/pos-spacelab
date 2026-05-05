import type { Cliente, MateriaPrima, Subproducto, Produto, Factura, FacturaItem, Configuracion, Domiciliario, Cotizacion, CotizacionItem, NotaCredito, NotaCreditoItem } from './types';

type DataStore = {
  configuracion: Configuracion;
  clientes: Cliente[];
  materias_primas: MateriaPrima[];
  subproductos: Subproducto[];
  productos: Produto[];
  producto_componentes: { id: string; produto_id: string; subproduto_id: string; quantidade_necesaria: number }[];
  facturas: Factura[];
  factura_items: FacturaItem[];
  domiciliarios: Domiciliario[];
  cotizaciones: Cotizacion[];
  cotizacion_items: CotizacionItem[];
  notas_credito: NotaCredito[];
  nota_credito_items: NotaCreditoItem[];
};

const defaultData: DataStore = {
  configuracion: {
    id: 1,
    prefijo: 'DG-',
    empresa_nome: '',
    empresa_nit: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    siguiente_numero: 1,
    siguiente_numero_cotizacion: 1,
    meta_mensual: 10000000,
    dias_laborables: 25
  },
  clientes: [],
  materias_primas: [],
  subproductos: [],
  productos: [],
  producto_componentes: [],
  facturas: [],
  factura_items: [],
  domiciliarios: [],
  cotizaciones: [],
  cotizacion_items: [],
  notas_credito: [],
  nota_credito_items: []
};

let store: DataStore = JSON.parse(JSON.stringify(defaultData));
let initialized = false;

export async function initDatabase(): Promise<void> {
  if (initialized) return;
  const saved = localStorage.getItem('dg_facturacion_db');
  if (saved) {
    try {
      const loaded = JSON.parse(saved);
      store = { ...JSON.parse(JSON.stringify(defaultData)), ...loaded };
    } catch {
      store = JSON.parse(JSON.stringify(defaultData));
    }
  }
  initialized = true;
}

function save() {
  localStorage.setItem('dg_facturacion_db', JSON.stringify(store));
}

export function getConfiguracion(): Configuracion {
  return store.configuracion;
}

export function updateConfiguracion(data: Partial<Configuracion>) {
  store.configuracion = { ...store.configuracion, ...data };
  save();
}

export function getClientes(): Cliente[] {
  return store.clientes;
}

export function getCliente(id: string): Cliente | undefined {
  return store.clientes.find(c => c.id === id);
}

export function addCliente(data: Omit<Cliente, 'id'>): Cliente {
  const id = crypto.randomUUID();
  const cliente: Cliente = { ...data, id };
  store.clientes.push(cliente);
  save();
  return cliente;
}

export function updateCliente(id: string, data: Partial<Cliente>): void {
  const idx = store.clientes.findIndex(c => c.id === id);
  if (idx >= 0) {
    store.clientes[idx] = { ...store.clientes[idx], ...data };
    save();
  }
}

export function deleteCliente(id: string): void {
  store.clientes = store.clientes.filter(c => c.id !== id);
  save();
}

export function getMateriasPrimas(): MateriaPrima[] {
  return store.materias_primas;
}

export function addMateriaPrima(data: Omit<MateriaPrima, 'id'>): MateriaPrima {
  const id = crypto.randomUUID();
  const item: MateriaPrima = { ...data, id };
  store.materias_primas.push(item);
  save();
  return item;
}

export function updateMateriaPrima(id: string, data: Partial<MateriaPrima>): void {
  const idx = store.materias_primas.findIndex(m => m.id === id);
  if (idx >= 0) {
    store.materias_primas[idx] = { ...store.materias_primas[idx], ...data };
    save();
  }
}

export function deleteMateriaPrima(id: string): void {
  store.materias_primas = store.materias_primas.filter(m => m.id !== id);
  save();
}

export function getSubproductos(): Subproducto[] {
  return store.subproductos;
}

export function getSubproduto(id: string): Subproducto | undefined {
  return store.subproductos.find(s => s.id === id);
}

export function addSubproduto(data: Omit<Subproducto, 'id'>): Subproducto {
  const id = crypto.randomUUID();
  const item: Subproducto = { ...data, id };
  store.subproductos.push(item);
  save();
  return item;
}

export function updateSubproduto(id: string, data: Partial<Subproducto>): void {
  const idx = store.subproductos.findIndex(s => s.id === id);
  if (idx >= 0) {
    store.subproductos[idx] = { ...store.subproductos[idx], ...data };
    save();
  }
}

export function deleteSubproduto(id: string): void {
  store.subproductos = store.subproductos.filter(s => s.id !== id);
  save();
}

export function getProdutos(): Produto[] {
  return store.productos;
}

export function getProduto(id: string): Produto | undefined {
  return store.productos.find(p => p.id === id);
}

export function addProduto(data: Omit<Produto, 'id'>): Produto {
  const id = crypto.randomUUID();
  const item: Produto = { ...data, id };
  store.productos.push(item);
  save();
  return item;
}

export function updateProductRow(id: string, data: Partial<Produto>): void {
  const idx = store.productos.findIndex(p => p.id === id);
  if (idx >= 0) {
    store.productos[idx] = { ...store.productos[idx], ...data };
    save();
  }
}

export function deleteProductRow(id: string): void {
  store.productos = store.productos.filter(p => p.id !== id);
  store.producto_componentes = store.producto_componentes.filter(c => c.produto_id !== id);
  save();
}

export function getComponentes(produtoId: string): any[] {
  return store.producto_componentes
    .filter(c => c.produto_id === produtoId)
    .map(c => {
      const sp = store.subproductos.find(s => s.id === c.subproduto_id);
      return {
        id: c.id,
        subproduto_id: c.subproduto_id,
        subproduto_nome: sp?.nome || '',
        quantidade_necesaria: c.quantidade_necesaria,
        subproduto_quantidade: sp?.quantidade || 0
      };
    });
}

export function addComponente(produtoId: string, subprodutoId: string, quantidade: number): void {
  store.producto_componentes.push({
    id: crypto.randomUUID(),
    produto_id: produtoId,
    subproduto_id: subprodutoId,
    quantidade_necesaria: quantidade
  });
  save();
}

export function removeComponente(id: string): void {
  store.producto_componentes = store.producto_componentes.filter(c => c.id !== id);
  save();
}

export function adjustSubproductoStock(id: string, amount: number): boolean {
  const idx = store.subproductos.findIndex(s => s.id === id);
  if (idx >= 0) {
    if (store.subproductos[idx].quantidade + amount < 0) return false;
    store.subproductos[idx].quantidade += amount;
    save();
    return true;
  }
  return false;
}

export function adjustProdutoStock(id: string, amount: number): boolean {
  const idx = store.productos.findIndex(p => p.id === id);
  if (idx >= 0) {
    if ((store.productos[idx].quantidade_stock || 0) + amount < 0) return false;
    store.productos[idx].quantidade_stock = (store.productos[idx].quantidade_stock || 0) + amount;
    save();
    return true;
  }
  return false;
}

export function assembleProduto(produtoId: string, cantidad: number): { success: boolean; message: string } {
  const componentes = getComponentes(produtoId);
  
  // Check if enough stock
  for (const comp of componentes) {
    if (comp.subproduto_quantidade < comp.quantidade_necesaria * cantidad) {
      return { success: false, message: `No hay suficiente stock de: ${comp.subproduto_nome}` };
    }
  }
  
  // Subtract from subproducts
  for (const comp of componentes) {
    adjustSubproductoStock(comp.subproduto_id, -(comp.quantidade_necesaria * cantidad));
  }
  
  // Add to product
  adjustProdutoStock(produtoId, cantidad);
  
  return { success: true, message: `Ensamblado(s) ${cantidad} unidad(es) correctamente` };
}

export function disassembleProduto(produtoId: string, cantidad: number): { success: boolean; message: string } {
  const p = getProduto(produtoId);
  if (!p || (p.quantidade_stock || 0) < cantidad) {
    return { success: false, message: 'No hay suficiente stock del producto' };
  }
  
  const componentes = getComponentes(produtoId);
  
  // Add to subproducts
  for (const comp of componentes) {
    adjustSubproductoStock(comp.subproduto_id, comp.quantidade_necesaria * cantidad);
  }
  
  // Subtract from product
  adjustProdutoStock(produtoId, -cantidad);
  
  return { success: true, message: `Desarmado(s) ${cantidad} unidad(es) correctamente` };
}

export function getFacturas(): any[] {
  return store.facturas.map(f => ({
    ...f,
    items: store.factura_items.filter(i => i.factura_id === f.id)
  }));
}

export function getFactura(id: string): any {
  const f = store.facturas.find(fa => fa.id === id);
  if (!f) return undefined;
  return { ...f, items: store.factura_items.filter(i => i.factura_id === id) };
}

export function createFactura(data: any): any {
  const id = crypto.randomUUID();
  const prefijo = store.configuracion.prefijo;
  const numero = `${prefijo}${store.configuracion.siguiente_numero.toString().padStart(5, '0')}`;
  
  const subtotal = data.items.reduce((sum: number, i: any) => sum + (i.quantidade * i.precio), 0);
  const descuento = data.descuento || 0;
  const iva = 0;
  const total = subtotal - descuento;
  
  const factura: Factura = {
    id,
    numero,
    cliente_id: data.cliente_id,
    cliente_nome: data.cliente_nome,
    cliente_celular: data.cliente_celular || '',
    cliente_nit: data.cliente_nit,
    cliente_direccion: data.cliente_direccion,
    fecha: new Date().toISOString().split('T')[0],
    subtotal,
    iva,
    descuento,
    total,
    estado: 'activa',
    notas: data.notas || '',
    estado_entrega: 'pendiente'
  };
  
  store.facturas.push(factura);
  
  const items: FacturaItem[] = data.items.map((i: any) => ({
    id: crypto.randomUUID(),
    factura_id: id,
    descripcion: i.descripcion,
    quantidade: i.quantidade,
    precio: i.precio,
    total: i.quantidade * i.precio
  }));
  
  store.factura_items.push(...items);
  
  store.configuracion.siguiente_numero++;
  save();
  
  return { ...factura, items };
}

export function anularFactura(id: string, motivo: string): void {
  const idx = store.facturas.findIndex(f => f.id === id);
  if (idx >= 0) {
    store.facturas[idx] = {
      ...store.facturas[idx],
      estado: 'anulada',
      motivo_anulacion: motivo,
      fecha_anulacion: new Date().toISOString().split('T')[0]
    };
    save();
  }
}

export function getSiguienteNumero(): string {
  const prefijo = store.configuracion.prefijo;
  const numero = store.configuracion.siguiente_numero.toString().padStart(5, '0');
  return `${prefijo}${numero}`;
}

export function getStockMinimo(): { tipo: string; id: string; nome: string; quantidade: number; stock_minimo: number }[] {
  const items: { tipo: string; id: string; nome: string; quantidade: number; stock_minimo: number }[] = [];
  
  for (const mp of store.materias_primas) {
    if (mp.stock_minimo !== undefined && mp.quantidade_kg <= mp.stock_minimo) {
      items.push({
        tipo: 'materia_prima',
        id: mp.id,
        nome: mp.nome,
        quantidade: mp.quantidade_kg,
        stock_minimo: mp.stock_minimo
      });
    }
  }
  
  for (const sp of store.subproductos) {
    if (sp.stock_minimo !== undefined && sp.quantidade <= sp.stock_minimo) {
      items.push({
        tipo: 'subproducto',
        id: sp.id,
        nome: sp.nome,
        quantidade: sp.quantidade,
        stock_minimo: sp.stock_minimo
      });
    }
  }
  
  return items;
}

export function getSinStock(): { tipo: string; id: string; nome: string }[] {
  const items: { tipo: string; id: string; nome: string }[] = [];
  
  for (const mp of store.materias_primas) {
    if (mp.quantidade_kg <= 0) {
      items.push({ tipo: 'materia_prima', id: mp.id, nome: mp.nome });
    }
  }
  
  for (const sp of store.subproductos) {
    if (sp.quantidade <= 0) {
      items.push({ tipo: 'subproducto', id: sp.id, nome: sp.nome });
    }
  }
  
  return items;
}

export function getDomiciliarios(): Domiciliario[] {
  return store.domiciliarios || [];
}

export function addDomiciliario(data: Omit<Domiciliario, 'id'>): Domiciliario {
  const id = crypto.randomUUID();
  const domi: Domiciliario = { ...data, id };
  if (!store.domiciliarios) store.domiciliarios = [];
  store.domiciliarios.push(domi);
  save();
  return domi;
}

export function updateDomiciliario(id: string, data: Partial<Domiciliario>): void {
  const idx = store.domiciliarios.findIndex(d => d.id === id);
  if (idx >= 0) {
    store.domiciliarios[idx] = { ...store.domiciliarios[idx], ...data };
    save();
  }
}

export function deleteDomiciliario(id: string): void {
  store.domiciliarios = store.domiciliarios.filter(d => d.id !== id);
  save();
}

export function despacharFactura(id: string, domiciliarioId: string): void {
  const fIdx = store.facturas.findIndex(f => f.id === id);
  const dObj = store.domiciliarios.find(d => d.id === domiciliarioId);
  
  if (fIdx >= 0 && dObj) {
    store.facturas[fIdx] = {
      ...store.facturas[fIdx],
      estado_entrega: 'en_despacho',
      domiciliario_id: domiciliarioId,
      domiciliario_nome: dObj.nome,
      fecha_despacho: new Date().toISOString()
    };
    save();
  }
}

export function actualizarEstadoEntrega(id: string, nuevoEstado: string): void {
  const fIdx = store.facturas.findIndex(f => f.id === id);
  
  if (fIdx >= 0) {
    const update: any = { estado_entrega: nuevoEstado };
    
    if (nuevoEstado === 'entregado') {
      update.fecha_entrega = new Date().toISOString();
    }
    
    store.facturas[fIdx] = {
      ...store.facturas[fIdx],
      ...update
    };
    save();
  }
}

export function getCotizaciones(): any[] {
  return (store.cotizaciones || []).map(c => ({
    ...c,
    items: (store.cotizacion_items || []).filter(i => i.cotizacion_id === c.id)
  }));
}

export function getCotizacion(id: string): any {
  const c = store.cotizaciones.find(co => co.id === id);
  if (!c) return undefined;
  return { ...c, items: store.cotizacion_items.filter(i => i.cotizacion_id === id) };
}

export function getSiguienteNumeroCotizacion(): string {
  const prefijo = store.configuracion.prefijo;
  const numero = (store.configuracion.siguiente_numero_cotizacion || 1).toString().padStart(5, '0');
  return `${prefijo}COT-${numero}`;
}

export function createCotizacion(data: any): any {
  const id = crypto.randomUUID();
  const prefijo = store.configuracion.prefijo;
  const numeroCot = (store.configuracion.siguiente_numero_cotizacion || 1).toString().padStart(5, '0');
  const numero = `${prefijo}COT-${numeroCot}`;
  
  const validezDias = data.validez_dias || 15;
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + validezDias);
  
  const subtotal = data.items.reduce((sum: number, i: any) => sum + (i.quantidade * i.precio), 0);
  const descuento = data.descuento || 0;
  const iva = 0;
  const costoEnvio = data.costo_envio || 0;
  const total = subtotal - descuento + costoEnvio;
  
  const cotizacion: Cotizacion = {
    id,
    numero,
    cliente_id: data.cliente_id,
    cliente_nome: data.cliente_nome,
    cliente_celular: data.cliente_celular || '',
    cliente_nit: data.cliente_nit,
    cliente_direccion: data.cliente_direccion,
    ciudad: data.ciudad,
    fecha: new Date().toISOString().split('T')[0],
    fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
    validez_dias: validezDias,
    subtotal,
    iva,
    descuento,
    costo_envio: costoEnvio,
    total,
    estado: 'abierta',
    notas: data.notas || ''
  };
  
  store.cotizaciones.push(cotizacion);
  
  const items: CotizacionItem[] = data.items.map((i: any) => ({
    id: crypto.randomUUID(),
    cotizacion_id: id,
    descripcion: i.descripcion,
    quantidade: i.quantidade,
    precio: i.precio,
    total: i.quantidade * i.precio
  }));
  
  store.cotizacion_items.push(...items);
  
  store.configuracion.siguiente_numero_cotizacion = (store.configuracion.siguiente_numero_cotizacion || 1) + 1;
  save();
  
  return { ...cotizacion, items };
}

export function updateCotizacionEstado(id: string, estado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida'): void {
  const idx = store.cotizaciones.findIndex(c => c.id === id);
  if (idx >= 0) {
    store.cotizaciones[idx] = { ...store.cotizaciones[idx], estado };
    save();
  }
}

export function deleteCotizacion(id: string): void {
  store.cotizaciones = store.cotizaciones.filter(c => c.id !== id);
  store.cotizacion_items = store.cotizacion_items.filter(i => i.cotizacion_id !== id);
  save();
}

export function getNotasCredito(): any[] {
  return (store.notas_credito || []).map(nc => ({
    ...nc,
    items: (store.nota_credito_items || []).filter(i => i.nota_credito_id === nc.id)
  }));
}

export function getNotaCredito(id: string): any {
  const nc = store.notas_credito.find(n => n.id === id);
  if (!nc) return undefined;
  return { ...nc, items: store.nota_credito_items.filter(i => i.nota_credito_id === id) };
}

export function getSiguienteNumeroNotaCredito(): string {
  const prefijo = store.configuracion.prefijo;
  const numero = (store.configuracion.siguiente_numero_nota_credito || 1).toString().padStart(5, '0');
  return `${prefijo}NC-${numero}`;
}

export function createNotaCredito(data: any): any {
  const id = crypto.randomUUID();
  const prefijo = store.configuracion.prefijo;
  const numeroNC = (store.configuracion.siguiente_numero_nota_credito || 1).toString().padStart(5, '0');
  const numero = `${prefijo}NC-${numeroNC}`;
  
  const subtotal = data.items.reduce((sum: number, i: any) => sum + (i.quantidade * i.precio), 0);
  const descuento = data.descuento || 0;
  const iva = 0;
  const total = subtotal - descuento;
  
  const notaCredito: NotaCredito = {
    id,
    numero,
    factura_afectada_id: data.factura_afectada_id,
    factura_numero: data.factura_numero,
    cliente_nome: data.cliente_nome,
    cliente_nit: data.cliente_nit,
    cliente_direccion: data.cliente_direccion,
    fecha: new Date().toISOString().split('T')[0],
    subtotal,
    iva,
    descuento,
    total,
    motivo: data.motivo,
    observaciones: data.observaciones || ''
  };
  
  store.notas_credito.push(notaCredito);
  
  const items: NotaCreditoItem[] = data.items.map((i: any) => ({
    id: crypto.randomUUID(),
    nota_credito_id: id,
    descripcion: i.descripcion,
    quantidade: i.quantidade,
    precio: i.precio,
    total: i.quantidade * i.precio
  }));
  
  store.nota_credito_items.push(...items);
  
  store.configuracion.siguiente_numero_nota_credito = (store.configuracion.siguiente_numero_nota_credito || 1) + 1;
  save();
  
  return { ...notaCredito, items };
}

export function deleteNotaCredito(id: string): void {
  store.notas_credito = store.notas_credito.filter(nc => nc.id !== id);
  store.nota_credito_items = store.nota_credito_items.filter(i => i.nota_credito_id !== id);
  save();
}

// Force re-export
export type { Cliente, MateriaPrima, Subproducto, Produto, Factura, FacturaItem, Configuracion, Domiciliario, Cotizacion, CotizacionItem, NotaCredito, NotaCreditoItem };
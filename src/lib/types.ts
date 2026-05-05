export interface Cliente {
  id: string;
  nome: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  created_at?: string;
}

export interface MateriaPrima {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;
  color: string;
  fornecedor: string;
  quantidade_kg: number;
  preco_kg: number;
  stock_minimo?: number;
}

export interface Subproducto {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;
  quantidade: number;
  custo: number;
  stock_minimo?: number;
}

export interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  descripcion: string;
  categoria?: string;
  tags?: string[];
  preco: number;
  custo: number;
  quantidade_stock?: number;
}

export interface Domiciliario {
  id: string;
  nome: string;
  telefono: string;
  placa?: string;
  activo: boolean;
}

export interface Factura {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_nit: string;
  cliente_direccion: string;
  fecha: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  estado: string;
  notas?: string;
  motivo_anulacion?: string;
  fecha_anulacion?: string;
  
  // Entrega / Pedidos - Estados expandidos
  estado_entrega?: 
    | 'pendiente'        // Recebido, esperando validación
    | 'en_validacion'  // Verificando stock
    | 'en_produccion'  // Siendo impresso
    | 'en_acabado'     // Post-proceso terminado
    | 'en_despacho'   // Con domiciliario
    | 'entregado'     // Completado
    | 'devuelto'       // Con problema
    | 'cancelado';   // Por cliente
  domiciliario_id?: string;
  domiciliario_nome?: string;
  fecha_despacho?: string;
  fecha_entrega?: string;
}

export interface FacturaItem {
  id: string;
  factura_id: string;
  descripcion: string;
  quantidade: number;
  precio: number;
  total: number;
}

export interface Configuracion {
  id: number;
  prefijo: string;
  empresa_nome: string;
  empresa_nit: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  siguiente_numero: number;
  siguiente_numero_cotizacion?: number;
  siguiente_numero_nota_credito?: number;
  meta_mensual?: number;
  dias_laborables?: number;
}

export interface Cotizacion {
  id: string;
  numero: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_nit: string;
  cliente_direccion: string;
  fecha: string;
  fecha_vencimiento: string;
  validez_dias: number;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  estado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida';
  notas?: string;
}

export interface CotizacionItem {
  id: string;
  cotizacion_id: string;
  descripcion: string;
  quantidade: number;
  precio: number;
  total: number;
}

export interface NotaCredito {
  id: string;
  numero: string;
  factura_afectada_id: string;
  factura_numero: string;
  cliente_nome: string;
  cliente_nit: string;
  cliente_direccion: string;
  fecha: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  motivo: string;
  observaciones?: string;
}

export interface NotaCreditoItem {
  id: string;
  nota_credito_id: string;
  descripcion: string;
  quantidade: number;
  precio: number;
  total: number;
}

export interface InventarioMovimiento {
  id: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  tabla: 'materias_primas' | 'subproductos' | 'productos';
  registro_id: string;
  registro_nombre: string;
  campo: string;
  valor_anterior: string | number;
  valor_nuevo: string | number;
  cantidad?: number;
  observaciones: string;
  usuario: string;
  created_at: string;
}
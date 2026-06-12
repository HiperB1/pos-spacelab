import { getConfiguracion, getProdutos, addProduto, updateProductRow } from './database';
import type { Factura } from './types';

const VENNDELO_API_BASE = 'https://api.venndelo.com/v1/admin';
const VENNDELO_LAST_SYNC_KEY = 'venndelo_products_last_sync';

export interface ProductoVenndelo {
  id: string;
  sku?: string;
  code?: string;
  reference?: string;
  name?: string;
  title?: string;
  description?: string;
  unit_price?: number | string;
  price?: number | string;
  sale_price?: number | string;
  base_price?: number | string;
  regular_price?: number | string;
  list_price?: number | string;
  pricing?: { price?: number | string; sale_price?: number | string };
  variants?: Array<{ price?: number | string; unit_price?: number | string }>;
  variations?: Array<{
    id?: string;
    price?: number | string;
    compare_at_price?: number | string;
    weight?: number | string;
    height?: number | string;
    width?: number | string;
    length?: number | string;
  }>;
  category?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface CiudadVenndelo {
  code: string;
  name: string;
  department: string;
  country_code?: string;
  subdivision_code?: string;
  subdivision_name?: string;
}

function getApiKey(): string | undefined {
  const config = getConfiguracion();
  return config.api_key_venndelo;
}

export async function getProductosVenndelo(): Promise<ProductoVenndelo[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key de Venndelo no configurada');

  const allProducts: ProductoVenndelo[] = [];
  let pageToken = '';

  do {
    const url = `${VENNDELO_API_BASE}/products?page_size=100${pageToken ? `&page_token=${pageToken}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Venndelo-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Venndelo /products error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const items: ProductoVenndelo[] = data.items || [];
    if (allProducts.length === 0 && items.length > 0) {
      console.log('[venndelo] raw first product fields:', Object.keys(items[0]));
      console.log('[venndelo] raw first product:', JSON.stringify(items[0]));
    }
    allProducts.push(...items);
    pageToken = data.next_page_token || '';
  } while (pageToken);

  return allProducts;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isFinite(n) ? n : 0;
}

function extractDim(val: unknown): number | undefined {
  const n = toNumber(val);
  return n > 0 ? n : undefined;
}

function extractPrice(v: ProductoVenndelo): number {
  const candidates = [
    v.unit_price,
    v.price,
    v.sale_price,
    v.base_price,
    v.regular_price,
    v.list_price,
    v.pricing?.price,
    v.pricing?.sale_price,
    v.variations?.[0]?.price,
    v.variants?.[0]?.price,
    v.variants?.[0]?.unit_price,
  ];
  for (const c of candidates) {
    const n = toNumber(c);
    if (n > 0) return n;
  }
  return 0;
}

function mapVenndeloProduct(v: ProductoVenndelo) {
  const variation = v.variations?.[0];
  const peso = extractDim(variation?.weight);
  const alto = extractDim(variation?.height);
  const ancho = extractDim(variation?.width);
  const largo = extractDim(variation?.length);

  return {
    venndelo_id: v.id,
    ...(variation?.id ? { venndelo_variation_id: variation.id } : {}),
    nome: v.name || v.title || `Producto ${v.id}`,
    descripcion: v.description || '',
    preco: extractPrice(v),
    codigo: v.sku || v.code || v.reference || undefined,
    categoria: v.category || undefined,
    tags: Array.isArray(v.tags) && v.tags.length > 0 ? v.tags : undefined,
    ...(peso !== undefined ? { peso_kg: peso } : {}),
    ...(alto !== undefined ? { alto_cm: alto } : {}),
    ...(ancho !== undefined ? { ancho_cm: ancho } : {}),
    ...(largo !== undefined ? { largo_cm: largo } : {}),
  };
}

// Upsert de productos desde Venndelo. Estrategia de coincidencia en orden de prioridad:
// 1. venndelo_id (productos ya enlazados); 2. codigo/SKU (productos locales pre-existentes).
// Solo actualiza si los datos de Venndelo difieren del registro local.
// Productos locales sin match en Venndelo no se modifican.
function productoHaCambiado(existing: ReturnType<typeof getProdutos>[0], mapped: ReturnType<typeof mapVenndeloProduct>): boolean {
  if (existing.nome !== mapped.nome) return true;
  if ((existing.descripcion ?? '') !== (mapped.descripcion ?? '')) return true;
  if (existing.preco !== mapped.preco) return true;
  if ((existing.codigo ?? undefined) !== (mapped.codigo ?? undefined)) return true;
  if ((existing.categoria ?? undefined) !== (mapped.categoria ?? undefined)) return true;
  if ((existing.venndelo_id ?? undefined) !== (mapped.venndelo_id ?? undefined)) return true;
  if ((existing.venndelo_variation_id ?? undefined) !== (mapped.venndelo_variation_id ?? undefined)) return true;
  if (mapped.peso_kg !== undefined && existing.peso_kg !== mapped.peso_kg) return true;
  if (mapped.alto_cm !== undefined && existing.alto_cm !== mapped.alto_cm) return true;
  if (mapped.ancho_cm !== undefined && existing.ancho_cm !== mapped.ancho_cm) return true;
  if (mapped.largo_cm !== undefined && existing.largo_cm !== mapped.largo_cm) return true;
  const tagsExisting = (existing.tags ?? []).slice().sort().join(',');
  const tagsMapped = (mapped.tags ?? []).slice().sort().join(',');
  if (tagsExisting !== tagsMapped) return true;
  return false;
}

export async function sincronizarProductosVenndelo(): Promise<{
  creados: number;
  actualizados: number;
  actualizadosEnVenndelo: number;
  sinCambios: number;
  total: number;
}> {
  const config = getConfiguracion();
  const remotos = await getProductosVenndelo();
  const locales = getProdutos();

  const byVenndeloId = new Map<string, typeof locales[0]>();
  const byCodigo = new Map<string, typeof locales[0]>();
  for (const p of locales) {
    if (p.venndelo_id) byVenndeloId.set(p.venndelo_id, p);
    if (p.codigo) byCodigo.set(p.codigo, p);
  }

  let creados = 0;
  let actualizados = 0;
  let actualizadosEnVenndelo = 0;
  let sinCambios = 0;

  const pushTasks: Array<() => Promise<void>> = [];

  for (const remoto of remotos) {
    const mapped = mapVenndeloProduct(remoto);
    const existing =
      byVenndeloId.get(remoto.id) ||
      (mapped.codigo ? byCodigo.get(mapped.codigo) : undefined);

    const variation = remoto.variations?.[0];
    const venndeloTieneDims = toNumber(variation?.weight) > 0;

    if (existing) {
      if (venndeloTieneDims) {
        // Fase 1: Venndelo tiene dims válidas → actualizar local si algo cambió
        if (productoHaCambiado(existing, mapped)) {
          updateProductRow(existing.id, {
            venndelo_id: mapped.venndelo_id,
            ...(mapped.venndelo_variation_id ? { venndelo_variation_id: mapped.venndelo_variation_id } : {}),
            nome: mapped.nome,
            descripcion: mapped.descripcion,
            preco: mapped.preco,
            codigo: mapped.codigo,
            categoria: mapped.categoria,
            tags: mapped.tags,
            ...(mapped.peso_kg !== undefined ? { peso_kg: mapped.peso_kg } : {}),
            ...(mapped.alto_cm !== undefined ? { alto_cm: mapped.alto_cm } : {}),
            ...(mapped.ancho_cm !== undefined ? { ancho_cm: mapped.ancho_cm } : {}),
            ...(mapped.largo_cm !== undefined ? { largo_cm: mapped.largo_cm } : {}),
          });
          actualizados++;
        } else {
          sinCambios++;
        }
      } else {
        // Fase 2: Venndelo NO tiene dims → determinar dims a usar y hacer PUT
        const variacionId = existing.venndelo_variation_id || mapped.venndelo_variation_id;
        if (variacionId) {
          const pesoFinal = (existing.peso_kg && existing.peso_kg > 0)
            ? existing.peso_kg
            : (config.peso_default_kg ?? 0.5);
          const altoFinal = (existing.alto_cm && existing.alto_cm > 0)
            ? existing.alto_cm
            : (config.alto_default_cm ?? 15);
          const anchoFinal = (existing.ancho_cm && existing.ancho_cm > 0)
            ? existing.ancho_cm
            : (config.ancho_default_cm ?? 20);
          const largoFinal = (existing.largo_cm && existing.largo_cm > 0)
            ? existing.largo_cm
            : (config.largo_default_cm ?? 20);

          // Actualizar local primero
          updateProductRow(existing.id, {
            venndelo_id: mapped.venndelo_id,
            venndelo_variation_id: variacionId,
            nome: mapped.nome,
            descripcion: mapped.descripcion,
            preco: mapped.preco,
            codigo: mapped.codigo,
            categoria: mapped.categoria,
            tags: mapped.tags,
            peso_kg: pesoFinal,
            alto_cm: altoFinal,
            ancho_cm: anchoFinal,
            largo_cm: largoFinal,
          });

          // Encolar push a Venndelo
          const productoId = remoto.id;
          const varId = variacionId;
          const precio = (mapped.preco && mapped.preco > 0) ? mapped.preco : existing.preco;
          pushTasks.push(() => updateVariacionVenndelo(productoId, varId, {
            peso_kg: pesoFinal,
            alto_cm: altoFinal,
            ancho_cm: anchoFinal,
            largo_cm: largoFinal,
            precio,
          }));
        } else {
          // Sin variation_id → solo actualizar campos básicos si cambiaron
          if (productoHaCambiado(existing, mapped)) {
            updateProductRow(existing.id, {
              venndelo_id: mapped.venndelo_id,
              ...(mapped.venndelo_variation_id ? { venndelo_variation_id: mapped.venndelo_variation_id } : {}),
              nome: mapped.nome,
              descripcion: mapped.descripcion,
              preco: mapped.preco,
              codigo: mapped.codigo,
              categoria: mapped.categoria,
              tags: mapped.tags,
            });
            actualizados++;
          } else {
            sinCambios++;
          }
        }
      }
    } else {
      addProduto({
        ...mapped,
        custo: 0,
      });
      creados++;
    }
  }

  // Ejecutar pushes a Venndelo en paralelo (lotes de 10)
  const BATCH = 10;
  for (let i = 0; i < pushTasks.length; i += BATCH) {
    const batch = pushTasks.slice(i, i + BATCH).map(fn => fn());
    const results = await Promise.allSettled(batch);
    actualizadosEnVenndelo += results.filter(r => r.status === 'fulfilled').length;
    results.forEach((r, idx) => {
      if (r.status === 'rejected') {
        console.warn(`[sync] Push dims a Venndelo falló para producto ${i + idx}:`, r.reason);
      }
    });
  }

  localStorage.setItem(VENNDELO_LAST_SYNC_KEY, new Date().toISOString());
  return { creados, actualizados, actualizadosEnVenndelo, sinCambios, total: remotos.length };
}

export function getVenndeloLastSync(): string | null {
  return localStorage.getItem(VENNDELO_LAST_SYNC_KEY);
}

export function shouldAutoSync(): boolean {
  const last = getVenndeloLastSync();
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > 24 * 60 * 60 * 1000;
}

export async function updateVariacionVenndelo(
  productoId: string,
  variacionId: string,
  data: { peso_kg: number; alto_cm: number; ancho_cm: number; largo_cm: number; precio: number }
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key de Venndelo no configurada');

  const body = {
    price: data.precio,
    weight: data.peso_kg,
    height: data.alto_cm,
    width: data.ancho_cm,
    length: data.largo_cm,
  };

  const response = await fetch(`${VENNDELO_API_BASE}/products/${productoId}/variations/${variacionId}`, {
    method: 'PUT',
    headers: {
      'X-Venndelo-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = '';
    try {
      const errJson = JSON.parse(errorText);
      detail = errJson.message || errJson.detail || errJson.error || errorText.substring(0, 200);
    } catch { detail = errorText.substring(0, 200); }
    throw new Error(`Error al actualizar variación en Venndelo (${response.status}): ${detail}`);
  }
}

export async function getCiudades(): Promise<CiudadVenndelo[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[venndelo] No API key configured, using fallback cities');
    return getCiudadesFallback();
  }

  const allCities: CiudadVenndelo[] = [];
  let pageToken = '';

  try {
    do {
      const url = `${VENNDELO_API_BASE}/region/cities?page_size=500${pageToken ? `&page_token=${pageToken}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Venndelo-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[venndelo] getCiudades error:', response.status);
        return getCiudadesFallback();
      }

      const data = await response.json();
      const items: any[] = data.items || [];

      for (const c of items) {
        allCities.push({
          code: String(c.code),
          name: c.name,
          department: c.subdivision_name || c.subdivision_code || '',
          country_code: c.country_code,
          subdivision_code: c.subdivision_code,
          subdivision_name: c.subdivision_name
        });
      }

      pageToken = data.next_page_token || '';
    } while (pageToken);

    return allCities.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } catch (error) {
    console.error('[venndelo] getCiudades error:', error);
    return getCiudadesFallback();
  }
}

export function getCiudadesFallback(): CiudadVenndelo[] {
  return [
    { code: '11001000', name: 'Bogotá', department: 'DC' },
    { code: '05001000', name: 'Medellín', department: 'ANT' },
    { code: '76001000', name: 'Cali', department: 'VAC' },
    { code: '08001000', name: 'Barranquilla', department: 'ATL' },
    { code: '68001000', name: 'Bucaramanga', department: 'SAN' },
    { code: '73001000', name: 'Ibagué', department: 'TOL' },
    { code: '50001000', name: 'Villavicencio', department: 'MET' },
    { code: '17001000', name: 'Manizales', department: 'CAL' },
    { code: '54001000', name: 'Cúcuta', department: 'NSA' },
    { code: '66001000', name: 'Pereira', department: 'RIS' },
    { code: '20001000', name: 'Valledupar', department: 'CES' },
    { code: '41001000', name: 'Neiva', department: 'HUI' },
    { code: '63001000', name: 'Armenia', department: 'QUI' },
    { code: '47001000', name: 'Santa Marta', department: 'MAG' },
    { code: '44001000', name: 'Riohacha', department: 'LAG' },
    { code: '13001000', name: 'Cartagena', department: 'BOL' },
    { code: '15001000', name: 'Tunja', department: 'BOY' },
    { code: '18001000', name: 'Florencia', department: 'CAQ' },
    { code: '85001000', name: 'Yopal', department: 'CAS' },
    { code: '19001000', name: 'Popayán', department: 'CAU' },
    { code: '27001000', name: 'Quibdó', department: 'CHO' },
    { code: '23001000', name: 'Montería', department: 'COR' },
    { code: '52001000', name: 'Pasto', department: 'NAR' },
    { code: '86001000', name: 'Mocoa', department: 'PUT' },
    { code: '70001000', name: 'Sincelejo', department: 'SUC' },
    { code: '91001000', name: 'Leticia', department: 'AMA' },
    { code: '94001000', name: 'Inírida', department: 'GUA' },
    { code: '95001000', name: 'San José del Guaviare', department: 'GUV' },
    { code: '81001000', name: 'Arauca', department: 'ARA' },
    { code: '97001000', name: 'Mitú', department: 'VAU' },
    { code: '99001000', name: 'Puerto Carreño', department: 'VIC' },
    { code: '88001000', name: 'San Andrés', department: 'SAP' },
  ];
}

export type CreateOrderResult = {
  id: string;
  status?: string;
  pin?: string;
  shipments?: Array<{ id?: string; tracking_number?: string; carrier_code?: string; status?: string }>;
  /** Flete real calculado por Venndelo al crear el pedido (fuente de verdad para el COD). */
  shippingTotal?: number;
  /** Total del pedido según Venndelo (reintegro + flete). */
  total?: number;
};

export interface OrderItemInput {
  descripcion: string;
  quantidade: number;
  precio: number;
  venndelo_id?: string;
  codigo?: string;
  peso_kg?: number;
  alto_cm?: number;
  ancho_cm?: number;
  largo_cm?: number;
}

export interface DescuentoDistribuido {
  /** Items con unit_price entero ajustado (o los originales si no aplica descuento). */
  itemsAjustados: OrderItemInput[];
  /**
   * Sobrante entero ≥ 0 que NO pudo plegarse dentro de los unit_price. Solo es > 0
   * en el caso raro de que ningún item tenga cantidad 1 y el residuo sea menor que
   * toda cantidad (ej. un único item de cantidad 7 con residuo 6). Implica que el COD
   * queda corto por esos pocos pesos; NO se emite ninguna línea extra para cubrirlo.
   */
  ajusteResiduo: number;
  /** Total que Venndelo debe cobrar (COD): subtotal − descuento. */
  targetTotal: number;
  /** Si se aplicó la distribución del descuento. */
  aplicaDescuento: boolean;
}

/**
 * Distribuye el descuento de la factura entre los unit_price de los line items.
 *
 * Venndelo recalcula el total del pedido como Σ(unit_price × quantity) y maneja el
 * precio en pesos ENTEROS (COP, sin centavos). Si se distribuye el descuento dejando
 * unit_price con decimales, Venndelo los redondea y el COD termina por debajo del total
 * facturado (discrepancia observada: app 215.000 vs Venndelo 214.600). Por eso cada
 * unit_price se trunca a entero (Math.floor) y el sobrante de redondeo se PLIEGA dentro
 * de los unit_price existentes en vez de cargarlo en una línea aparte: una línea extra
 * (incluso type VIRTUAL) hace que Venndelo marque el pedido como "Datos Incompletos"
 * porque exige peso/dimensiones para todas las líneas.
 *
 * El residuo se absorbe priorizando items de cantidad 1 (un item de cantidad 1 puede
 * absorber el residuo completo). Solo queda sobrante (`ajusteResiduo` > 0) cuando ningún
 * item tiene cantidad 1 y el residuo es menor que toda cantidad; ese sobrante (pocos
 * pesos) se deja sin cobrar. Nunca se sobre-cobra.
 *
 * Invariante: Σ(itemsAjustados.precio × quantidade) + ajusteResiduo === targetTotal,
 * con todos los precios enteros, ajusteResiduo entero ≥ 0, y ajusteResiduo === 0
 * siempre que exista algún item de cantidad 1.
 */
export function distribuirDescuento(items: OrderItemInput[], descuento: number): DescuentoDistribuido {
  const itemsTotal = items.reduce((sum, i) => sum + i.precio * i.quantidade, 0);
  const aplicaDescuento = descuento > 0 && itemsTotal > 0 && descuento < itemsTotal;
  const targetTotal = itemsTotal - (aplicaDescuento ? descuento : 0);

  if (!aplicaDescuento) {
    return { itemsAjustados: items, ajusteResiduo: 0, targetTotal, aplicaDescuento };
  }

  const itemsAjustados: OrderItemInput[] = items.map(item => {
    const lineTotal = item.precio * item.quantidade;
    const unitPrice = Math.floor((lineTotal / itemsTotal) * targetTotal / item.quantidade);
    return { ...item, precio: unitPrice };
  });

  // Residuo entero ≥ 0: los Math.floor nunca hacen superar targetTotal.
  let residuo = targetTotal - itemsAjustados.reduce((sum, i) => sum + i.precio * i.quantidade, 0);

  // Plegar el residuo dentro de los unit_price priorizando cantidades pequeñas.
  // Sumar 1 al unit_price de un item aporta `quantidade` al total, así que un item
  // de cantidad 1 absorbe el residuo completo. Se recorren los items de menor a mayor
  // cantidad para maximizar lo absorbido sin sobre-cobrar.
  const ordenPorCantidad = [...itemsAjustados].sort((a, b) => a.quantidade - b.quantidade);
  for (const item of ordenPorCantidad) {
    if (residuo <= 0) break;
    const incremento = Math.floor(residuo / item.quantidade);
    if (incremento > 0) {
      item.precio += incremento;
      residuo -= incremento * item.quantidade;
    }
  }

  return { itemsAjustados, ajusteResiduo: residuo, targetTotal, aplicaDescuento };
}

export async function createOrder(
  factura: Factura,
  items: OrderItemInput[],
  apiKey: string,
  config: { ciudad_origen: string; empresa_nome: string; empresa_telefono: string; empresa_direccion: string }
): Promise<CreateOrderResult | null> {
  const ciudades = await getCiudades();
  const ciudadDestino = ciudades.find(c => c.code === factura.ciudad_destino);

  // Si la empresa no tiene teléfono/dirección configurados, usar los datos del cliente como fallback
  const pickupPhone = config.empresa_telefono || factura.cliente_celular || '3000000000';
  const pickupAddress = config.empresa_direccion || factura.cliente_direccion || 'Dirección no especificada';

  const { itemsAjustados, targetTotal } = distribuirDescuento(items, factura.descuento || 0);

  const body = {
    pickup_info: {
      contact_name: config.empresa_nome || 'Tienda',
      contact_phone: pickupPhone,
      address_1: pickupAddress,
      city_code: config.ciudad_origen || '11001000',
      subdivision_code: '',
      country_code: 'CO',
      postal_code: ''
    },
    billing_info: {
      first_name: factura.cliente_nome,
      last_name: factura.cliente_apellido || '',
      email: factura.cliente_email || '',
      phone: factura.cliente_celular || '',
      ...(factura.cliente_nit?.trim()
        ? { identification_type: factura.tipo_identificacion || 'CC', identification: factura.cliente_nit.trim() }
        : {})
    },
    shipping_info: {
      first_name: factura.cliente_nome,
      last_name: factura.cliente_apellido || '',
      address_1: factura.cliente_direccion || '',
      city_code: factura.ciudad_destino || '',
      subdivision_code: ciudadDestino?.subdivision_code || '',
      country_code: 'CO',
      postal_code: '',
      phone: factura.cliente_celular || ''
    },
    // El residuo de redondeo del descuento ya viene plegado dentro de los unit_price
    // (ver distribuirDescuento). NO se agrega una línea de ajuste aparte: Venndelo
    // marcaría el pedido como "Datos Incompletos" al exigirle peso/dimensiones.
    line_items: itemsAjustados.map((item, idx) => ({
      ...(item.venndelo_id ? { product_id: item.venndelo_id } : {}),
      sku: item.codigo || `ITEM-${idx + 1}`,
      name: item.descripcion,
      unit_price: item.precio,
      quantity: item.quantidade,
      // Peso TOTAL de la línea (peso unitario × cantidad). Venndelo calcula el flete
      // a partir de este peso; debe coincidir con cotizarEnvio() (envio.ts), que también
      // multiplica por la cantidad. Antes enviaba solo el peso unitario → subcobro.
      weight: (item.peso_kg ?? 0.5) * item.quantidade,
      weight_unit: 'KG',
      dimensions_unit: 'CM',
      height: item.alto_cm ?? 15,
      width: item.ancho_cm ?? 20,
      length: item.largo_cm ?? 20,
      type: 'STANDARD' as const
    })),
    payment_method_code: factura.payment_method_code || 'EXTERNAL_PAYMENT',
    external_order_id: factura.numero
  };

  try {
    const response = await fetch(`${VENNDELO_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'X-Venndelo-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = '';
      try {
        const errJson = JSON.parse(errorText);
        detail = (Array.isArray(errJson.errors) && errJson.errors[0]?.message) || errJson.message || errJson.detail || errJson.error?.message || errJson.error || '';
      } catch { detail = errorText.substring(0, 300); }
      console.error('[venndelo] createOrder error:', response.status, detail);
      // Lanzamos el error con detalles para que el caller lo muestre
      throw new Error(`Venndelo respondió con error ${response.status}: ${detail}`);
    }

    const data = await response.json();
    // Venndelo puede devolver { id, ... } (objeto directo) o { items: [{ id, ... }] } (lista)
    const orderData = data.items?.[0] || data;
    const orderId = orderData?.id;

    if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
      console.error('[venndelo] createOrder response inválida:', JSON.stringify(data));
      throw new Error(
        `Venndelo no devolvió un ID de orden válido. ` +
        `Response: ${JSON.stringify(data).substring(0, 300)}. ` +
        `El pedido podría no haberse creado.`
      );
    }

    const hasShipments = Array.isArray(orderData.shipments) && orderData.shipments.length > 0;
    console.log('[venndelo] createOrder éxito:', { id: orderId, status: orderData.status, pin: orderData.pin, hasShipments });

    // Diagnóstico de discrepancia COD: comparar el total esperado por la app contra el
    // que Venndelo almacenó. Si los unit_price devueltos difieren de los enviados,
    // Venndelo está repreciando desde su catálogo (product_id) en vez de respetarlos.
    const venndeloSubtotal = orderData.subtotal;
    if (typeof venndeloSubtotal === 'number' && Math.round(venndeloSubtotal) !== Math.round(targetTotal)) {
      console.warn('[venndelo] DISCREPANCIA COD:', {
        targetTotalApp: targetTotal,
        venndeloSubtotal,
        venndeloTotal: orderData.total,
        diferencia: targetTotal - venndeloSubtotal,
        discounts: orderData.discounts,
        lineItemsEnviados: body.line_items.map(li => ({ sku: li.sku, unit_price: li.unit_price, quantity: li.quantity })),
        lineItemsVenndelo: Array.isArray(orderData.line_items)
          ? orderData.line_items.map((li: any) => ({ sku: li.sku, unit_price: li.unit_price, quantity: li.quantity }))
          : undefined,
      });
    }
    // Flete y total reales de Venndelo: la app reconcilia la factura con estos valores
    // para que el total mostrado coincida exactamente con lo que Venndelo cobrará.
    const shippingTotal = typeof orderData.shipping_total === 'number'
      ? orderData.shipping_total
      : (typeof orderData.assumed_shipping_total === 'number' ? orderData.assumed_shipping_total : undefined);
    return {
      id: orderId,
      status: orderData.status,
      pin: orderData.pin,
      shipments: orderData.shipments,
      shippingTotal,
      total: typeof orderData.total === 'number' ? orderData.total : undefined,
    };
  } catch (error) {
    // Relanzamos errores de API, atrapamos solo errores de red
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('[venndelo] createOrder network error: sin conexión a Venndelo');
      throw new Error('No se pudo conectar con Venndelo. Verifica tu conexión a internet.');
    }
    // Si ya es un Error con mensaje (nuestro throw de arriba), lo relanzamos
    if (error instanceof Error) throw error;
    throw new Error('Error desconocido al crear pedido en Venndelo');
  }
}

export async function createShipment(orderId: string, apiKey: string): Promise<void> {
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    throw new Error(`ID de orden inválido: "${orderId}". El pedido no se creó correctamente en Venndelo.`);
  }

  try {
    const response = await fetch(`${VENNDELO_API_BASE}/shipping/create-shipments`, {
      method: 'POST',
      headers: {
        'X-Venndelo-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ order_ids: [orderId] })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = '';
      try {
        const errJson = JSON.parse(errorText);
        detail = (Array.isArray(errJson.errors) && errJson.errors[0]?.message) || errJson.error?.message || errJson.message || errJson.detail || errorText;
      } catch { detail = errorText.substring(0, 300); }
      console.error('[venndelo] createShipment error:', response.status, detail);
      throw new Error(`Error al crear envío (HTTP ${response.status}): ${detail}`);
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar con Venndelo para crear el envío. Verifica tu conexión a internet.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Error desconocido al crear envío en Venndelo');
  }
}

// Venndelo genera guías de forma asíncrona (estado PROCESSING → SUCCESS/FAILED).
// Polling con hasta 20 intentos (2 s entre cada uno) antes de desistir.
export async function generateLabel(
  orderId: string,
  apiKey: string
): Promise<{ labelUrl: string; tracking: string }> {
  if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
    throw new Error(`ID de orden inválido para generar guía: "${orderId}".`);
  }

  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${VENNDELO_API_BASE}/shipping/generate-labels`, {
        method: 'POST',
        headers: {
          'X-Venndelo-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_ids: [orderId],
          format: 'LABEL_10x15',
          output: 'URL'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let detail = '';
        try {
          const errJson = JSON.parse(errorText);
          detail = (Array.isArray(errJson.errors) && errJson.errors[0]?.message) || errJson.error?.message || errJson.message || errJson.detail || errorText;
        } catch { detail = errorText.substring(0, 300); }
        console.error('[venndelo] generateLabel error:', response.status, detail);
        throw new Error(`Error al generar guía (HTTP ${response.status}): ${detail}`);
      }

      const data = await response.json();

      if (data.status === 'SUCCESS' || data.status === 'success') {
        return {
          labelUrl: data.data || data.label_url || data.url || '',
          tracking: data.tracking_number || ''
        };
      }

      if (data.status === 'FAILED' || data.status === 'failed') {
        throw new Error('Venndelo no pudo generar la guía de envío (estado: FAILED).');
      }

      // Sigue intentando (PROCESSING)
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('No se pudo conectar con Venndelo para generar la guía. Verifica tu conexión a internet.');
      }
      if (error instanceof Error) {
        if (attempt < maxAttempts && !error.message.includes('HTTP')) {
          // Errores de red/conección reintentan
          console.error('[venndelo] generateLabel attempt', attempt, 'failed, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
      throw new Error('Error desconocido al generar guía en Venndelo');
    }
  }

  throw new Error('Se agotaron los intentos de generar la guía de envío. Intenta más tarde.');
}

export async function getOrder(
  orderId: string,
  apiKey: string
): Promise<{
  id: string;
  status: string;
  pin?: string;
  tracking?: string;
  shipments?: Array<{ id: string; status: string; tracking_number?: string }>;
} | null> {
  try {
    const response = await fetch(`${VENNDELO_API_BASE}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'X-Venndelo-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[venndelo] getOrder error:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      status: data.status,
      pin: data.pin,
      tracking: data.tracking_number,
      shipments: data.shipments
    };
  } catch (error) {
    console.error('[venndelo] getOrder exception:', error);
    return null;
  }
}

export async function cancelOrder(
  orderId: string,
  apiKey: string
): Promise<{ success: boolean; alreadyCancelled?: boolean }> {
  const response = await fetch(`${VENNDELO_API_BASE}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      'X-Venndelo-Api-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) return { success: true };

  const errorText = await response.text();
  let detail = '';
  try {
    const errJson = JSON.parse(errorText);
    detail = errJson.message || errJson.detail || errJson.error || '';
  } catch { detail = errorText.substring(0, 300); }

  // Si ya estaba cancelado no es un error crítico
  if (response.status === 400 && detail.toLowerCase().includes('cancel')) {
    return { success: true, alreadyCancelled: true };
  }

  throw new Error(`HTTP ${response.status}: ${detail}`);
}

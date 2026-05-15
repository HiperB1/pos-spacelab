import { getConfiguracion } from './database';
import type { Factura } from './types';

const VENNDELO_API_BASE = 'https://api.venndelo.com/v1/admin';

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
};

export async function createOrder(
  factura: Factura,
  items: { descripcion: string; quantidade: number; precio: number }[],
  apiKey: string,
  config: { ciudad_origen: string; empresa_nome: string; empresa_telefono: string; empresa_direccion: string }
): Promise<CreateOrderResult | null> {
  const ciudades = await getCiudades();
  const ciudadDestino = ciudades.find(c => c.code === factura.ciudad_destino);

  // Si la empresa no tiene teléfono/dirección configurados, usar los datos del cliente como fallback
  const pickupPhone = config.empresa_telefono || factura.cliente_celular || '3000000000';
  const pickupAddress = config.empresa_direccion || factura.cliente_direccion || 'Dirección no especificada';

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
      identification_type: factura.tipo_identificacion || 'CC',
      identification: factura.cliente_nit || ''
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
    line_items: items.map((item, idx) => ({
      sku: `ITEM-${idx + 1}`,
      name: item.descripcion,
      unit_price: item.precio,
      quantity: item.quantidade,
      weight: 0.5,
      weight_unit: 'KG',
      dimensions_unit: 'CM',
      height: 15,
      width: 20,
      length: 20,
      type: 'STANDARD'
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
        detail = errJson.message || errJson.detail || errJson.error || '';
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
    return { id: orderId, status: orderData.status, pin: orderData.pin, shipments: orderData.shipments };
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
        detail = errJson.error?.message || errJson.message || JSON.stringify(errJson.error) || errorText;
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
          detail = errJson.error?.message || errJson.message || JSON.stringify(errJson.error) || errorText;
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

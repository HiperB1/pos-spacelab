import { getConfiguracion } from './database';
import type { Cotizacion } from './types';

const VENNDELO_API_BASE = 'https://api.venndelo.com/v1/admin';

export interface CiudadVenndelo {
  code: string;
  name: string;
  department: string;
  country_code?: string;
  subdivision_code?: string;
  subdivision_name?: string;
}

export interface CotizacionEnvioResponse {
  assumed_shipping_total: number;
  quoted_shipping_total: number;
}

export interface CotizacionEnvioResult {
  carrier: string;
  service: string;
  price: number;
  deliveryTime: string;
}

async function getApiKey(): Promise<string | undefined> {
  const config = getConfiguracion();
  return config.api_key_venndelo;
}

export async function getCiudades(): Promise<CiudadVenndelo[]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key de Venndelo no configurada');
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
        const error = await response.text();
        console.error('[getCiudades] Response:', response.status, error);
        throw new Error(`Error fetching cities: ${response.status} - ${error}`);
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
    console.error('[getCiudades] Error:', error);
    throw error;
  }
}

export async function getCiudadesCotizacion(): Promise<CiudadVenndelo[]> {
  try {
    return await getCiudades();
  } catch (error) {
    console.warn('[getCiudadesCotizacion] Using fallback cities:', error);
    return getCiudadesFallback();
  }
}

export function getCiudadesFallback(): CiudadVenndelo[] {
  return [
    // Amazonas
    { code: '91001000', name: 'Leticia', department: 'AMA', country_code: 'CO', subdivision_code: 'AMA' },
    // Antioquia
    { code: '05001000', name: 'Medellín', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05045000', name: 'Apartadó', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05088000', name: 'Bello', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05266000', name: 'Envigado', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05308000', name: 'Itagüí', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05360000', name: 'La Ceja', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05376000', name: 'La Estrella', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05440000', name: 'Manizales (Ant.)', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05615000', name: 'Rionegro', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05631000', name: 'Sabaneta', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    { code: '05837000', name: 'Turbo', department: 'ANT', country_code: 'CO', subdivision_code: 'ANT' },
    // Arauca
    { code: '81001000', name: 'Arauca', department: 'ARA', country_code: 'CO', subdivision_code: 'ARA' },
    // Atlántico
    { code: '08001000', name: 'Barranquilla', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    { code: '08433000', name: 'Malambo', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    { code: '08520000', name: 'Palmar de Varela', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    { code: '08549000', name: 'Sabanagrande', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    { code: '08606000', name: 'Sabanalarga', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    { code: '08758000', name: 'Soledad', department: 'ATL', country_code: 'CO', subdivision_code: 'ATL' },
    // Bogotá D.C.
    { code: '11001000', name: 'Bogotá', department: 'DC', country_code: 'CO', subdivision_code: 'DC' },
    // Bolívar
    { code: '13001000', name: 'Cartagena', department: 'BOL', country_code: 'CO', subdivision_code: 'BOL' },
    { code: '13300000', name: 'El Carmen de Bolívar', department: 'BOL', country_code: 'CO', subdivision_code: 'BOL' },
    { code: '13430000', name: 'Magangué', department: 'BOL', country_code: 'CO', subdivision_code: 'BOL' },
    { code: '13490000', name: 'Mompós', department: 'BOL', country_code: 'CO', subdivision_code: 'BOL' },
    // Boyacá
    { code: '15001000', name: 'Tunja', department: 'BOY', country_code: 'CO', subdivision_code: 'BOY' },
    { code: '15176000', name: 'Chiquinquirá', department: 'BOY', country_code: 'CO', subdivision_code: 'BOY' },
    { code: '15238000', name: 'Duitama', department: 'BOY', country_code: 'CO', subdivision_code: 'BOY' },
    { code: '15693000', name: 'Sogamoso', department: 'BOY', country_code: 'CO', subdivision_code: 'BOY' },
    // Caldas
    { code: '17001000', name: 'Manizales', department: 'CAL', country_code: 'CO', subdivision_code: 'CAL' },
    { code: '17380000', name: 'La Dorada', department: 'CAL', country_code: 'CO', subdivision_code: 'CAL' },
    { code: '17541000', name: 'Riosucio', department: 'CAL', country_code: 'CO', subdivision_code: 'CAL' },
    // Caquetá
    { code: '18001000', name: 'Florencia', department: 'CAQ', country_code: 'CO', subdivision_code: 'CAQ' },
    // Casanare
    { code: '85001000', name: 'Yopal', department: 'CAS', country_code: 'CO', subdivision_code: 'CAS' },
    { code: '85010000', name: 'Aguazul', department: 'CAS', country_code: 'CO', subdivision_code: 'CAS' },
    // Cauca
    { code: '19001000', name: 'Popayán', department: 'CAU', country_code: 'CO', subdivision_code: 'CAU' },
    { code: '19698000', name: 'Santander de Quilichao', department: 'CAU', country_code: 'CO', subdivision_code: 'CAU' },
    // Cesar
    { code: '20001000', name: 'Valledupar', department: 'CES', country_code: 'CO', subdivision_code: 'CES' },
    { code: '20228000', name: 'Codazzi', department: 'CES', country_code: 'CO', subdivision_code: 'CES' },
    // Chocó
    { code: '27001000', name: 'Quibdó', department: 'CHO', country_code: 'CO', subdivision_code: 'CHO' },
    // Córdoba
    { code: '23001000', name: 'Montería', department: 'COR', country_code: 'CO', subdivision_code: 'COR' },
    { code: '23162000', name: 'Cereté', department: 'COR', country_code: 'CO', subdivision_code: 'COR' },
    { code: '23417000', name: 'Lorica', department: 'COR', country_code: 'CO', subdivision_code: 'COR' },
    { code: '23672000', name: 'Sahagún', department: 'COR', country_code: 'CO', subdivision_code: 'COR' },
    // Cundinamarca
    { code: '25175000', name: 'Chía', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25245000', name: 'Facatativá', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25290000', name: 'Fusagasugá', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25307000', name: 'Girardot', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25473000', name: 'Mosquera', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25486000', name: 'Nemocón', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25513000', name: 'Soacha', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25758000', name: 'Sopó', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25785000', name: 'Tabio', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25817000', name: 'Tocancipá', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    { code: '25899000', name: 'Zipaquirá', department: 'CUN', country_code: 'CO', subdivision_code: 'CUN' },
    // Guainía
    { code: '94001000', name: 'Inírida', department: 'GUA', country_code: 'CO', subdivision_code: 'GUA' },
    // Guaviare
    { code: '95001000', name: 'San José del Guaviare', department: 'GUV', country_code: 'CO', subdivision_code: 'GUV' },
    // Huila
    { code: '41001000', name: 'Neiva', department: 'HUI', country_code: 'CO', subdivision_code: 'HUI' },
    { code: '41298000', name: 'Garzón', department: 'HUI', country_code: 'CO', subdivision_code: 'HUI' },
    { code: '41396000', name: 'La Plata', department: 'HUI', country_code: 'CO', subdivision_code: 'HUI' },
    { code: '41551000', name: 'Pitalito', department: 'HUI', country_code: 'CO', subdivision_code: 'HUI' },
    // La Guajira
    { code: '44001000', name: 'Riohacha', department: 'LAG', country_code: 'CO', subdivision_code: 'LAG' },
    { code: '44430000', name: 'Maicao', department: 'LAG', country_code: 'CO', subdivision_code: 'LAG' },
    // Magdalena
    { code: '47001000', name: 'Santa Marta', department: 'MAG', country_code: 'CO', subdivision_code: 'MAG' },
    { code: '47189000', name: 'Ciénaga', department: 'MAG', country_code: 'CO', subdivision_code: 'MAG' },
    { code: '47460000', name: 'Fundación', department: 'MAG', country_code: 'CO', subdivision_code: 'MAG' },
    // Meta
    { code: '50001000', name: 'Villavicencio', department: 'MET', country_code: 'CO', subdivision_code: 'MET' },
    { code: '50006000', name: 'Acacías', department: 'MET', country_code: 'CO', subdivision_code: 'MET' },
    { code: '50110000', name: 'Castilla la Nueva', department: 'MET', country_code: 'CO', subdivision_code: 'MET' },
    // Nariño
    { code: '52001000', name: 'Pasto', department: 'NAR', country_code: 'CO', subdivision_code: 'NAR' },
    { code: '52356000', name: 'Ipiales', department: 'NAR', country_code: 'CO', subdivision_code: 'NAR' },
    { code: '52835000', name: 'Tumaco', department: 'NAR', country_code: 'CO', subdivision_code: 'NAR' },
    // Norte de Santander
    { code: '54001000', name: 'Cúcuta', department: 'NSA', country_code: 'CO', subdivision_code: 'NSA' },
    { code: '54405000', name: 'Los Patios', department: 'NSA', country_code: 'CO', subdivision_code: 'NSA' },
    { code: '54418000', name: 'Pamplona', department: 'NSA', country_code: 'CO', subdivision_code: 'NSA' },
    { code: '54720000', name: 'Villa del Rosario', department: 'NSA', country_code: 'CO', subdivision_code: 'NSA' },
    { code: '54874000', name: 'Ocaña', department: 'NSA', country_code: 'CO', subdivision_code: 'NSA' },
    // Putumayo
    { code: '86001000', name: 'Mocoa', department: 'PUT', country_code: 'CO', subdivision_code: 'PUT' },
    // Quindío
    { code: '63001000', name: 'Armenia', department: 'QUI', country_code: 'CO', subdivision_code: 'QUI' },
    { code: '63130000', name: 'Calarcá', department: 'QUI', country_code: 'CO', subdivision_code: 'QUI' },
    // Risaralda
    { code: '66001000', name: 'Pereira', department: 'RIS', country_code: 'CO', subdivision_code: 'RIS' },
    { code: '66045000', name: 'Apía', department: 'RIS', country_code: 'CO', subdivision_code: 'RIS' },
    { code: '66170000', name: 'Dosquebradas', department: 'RIS', country_code: 'CO', subdivision_code: 'RIS' },
    // San Andrés y Providencia
    { code: '88001000', name: 'San Andrés', department: 'SAP', country_code: 'CO', subdivision_code: 'SAP' },
    // Santander
    { code: '68001000', name: 'Bucaramanga', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68081000', name: 'Barrancabermeja', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68276000', name: 'Floridablanca', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68307000', name: 'Girón', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68547000', name: 'Piedecuesta', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68679000', name: 'San Gil', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    { code: '68820000', name: 'Socorro', department: 'SAN', country_code: 'CO', subdivision_code: 'SAN' },
    // Sucre
    { code: '70001000', name: 'Sincelejo', department: 'SUC', country_code: 'CO', subdivision_code: 'SUC' },
    { code: '70233000', name: 'Corozal', department: 'SUC', country_code: 'CO', subdivision_code: 'SUC' },
    // Tolima
    { code: '73001000', name: 'Ibagué', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    { code: '73168000', name: 'Chaparral', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    { code: '73349000', name: 'Honda', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    { code: '73411000', name: 'Líbano', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    { code: '73443000', name: 'Espinal', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    { code: '73616000', name: 'San Sebastián de Mariquita', department: 'TOL', country_code: 'CO', subdivision_code: 'TOL' },
    // Valle del Cauca
    { code: '76001000', name: 'Cali', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76054000', name: 'Buga', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76109000', name: 'Buenaventura', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76111000', name: 'Guadalajara de Buga', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76122000', name: 'Caicedonia', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76147000', name: 'Cartago', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76364000', name: 'Jamundí', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76377000', name: 'La Unión', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76520000', name: 'Palmira', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76563000', name: 'Pradera', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76606000', name: 'Restrepo', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76616000', name: 'Roldanillo', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76670000', name: 'Sevilla', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76736000', name: 'Tulúa', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76834000', name: 'Yumbo', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    { code: '76845000', name: 'Zarzal', department: 'VAC', country_code: 'CO', subdivision_code: 'VAC' },
    // Vaupés
    { code: '97001000', name: 'Mitú', department: 'VAU', country_code: 'CO', subdivision_code: 'VAU' },
    // Vichada
    { code: '99001000', name: 'Puerto Carreño', department: 'VIC', country_code: 'CO', subdivision_code: 'VIC' },
  ];
}

export async function cotizarEnvio(
  ciudadDestino: string,
  pesoKg: number,
  subdivisionDestino?: string
): Promise<CotizacionEnvioResult[]> {
  const config = getConfiguracion();
  const apiKey = config.api_key_venndelo;

  if (!apiKey) {
    throw new Error('API key de Venndelo no configurada');
  }

  const ciudadOrigen = config.ciudad_origen || '11001000';
  const pesoDefault = config.peso_default_kg || 0.5;

  try {
    const response = await fetch(`${VENNDELO_API_BASE}/orders/quotation`, {
      method: 'POST',
      headers: {
        'X-Venndelo-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pickup_info: {
          city_code: ciudadOrigen,
          country_code: 'CO',
          postal_code: ''
        },
        shipping_info: {
          city_code: ciudadDestino,
          subdivision_code: subdivisionDestino || '',
          country_code: 'CO',
          postal_code: ''
        },
        line_items: [
          {
            sku: 'ITEM-001',
            name: 'Producto',
            unit_price: 0,
            free_shipping: false,
            height: 15,
            width: 20,
            length: 20,
            dimensions_unit: 'CM',
            weight: pesoKg || pesoDefault,
            weight_unit: 'KG',
            quantity: 1
          }
        ],
        payment_method_code: 'EXTERNAL_PAYMENT'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[cotizarEnvio] API Error:', response.status, error);
      throw new Error(`Error cotizando envío: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.quoted_shipping_total !== undefined) {
      return [{
        carrier: 'Venndelo',
        service: 'Envío Nacional',
        price: data.quoted_shipping_total,
        deliveryTime: '2-5 días hábiles'
      }];
    }

    return [];
  } catch (error) {
    console.error('[cotizarEnvio] Error:', error);
    throw error;
  }
}

export async function cotizarEnvioSimple(
  ciudadDestino: string,
  pesoKg?: number
): Promise<number> {
  try {
    const quotes = await cotizarEnvio(ciudadDestino, pesoKg || 0.5);
    if (quotes.length > 0) {
      return quotes[0].price;
    }
    return 0;
  } catch (error) {
    console.error('[cotizarEnvioSimple] Error:', error);
    throw error;
  }
}


export function formatCurrencyVenndelo(value: number): string {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
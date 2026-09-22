import { describe, it, expect } from 'vitest';
import {
  distribuirDescuento,
  normalizarCodigoDane,
  subdivisionDeDane,
  resolverCiudadOrigen,
  tipoLineaVenndelo,
  validarOrigenEnCiudades,
  descuentosVenndelo,
  saldoContraEntrega,
  type CiudadVenndelo,
  ERROR_CIUDAD_ORIGEN,
  type OrderItemInput,
} from './venndelo';

// Total COD que Venndelo cobrará = Σ(unit_price × quantity). El residuo ya viene
// plegado dentro de los unit_price (no hay línea de ajuste aparte).
function totalCOD(r: ReturnType<typeof distribuirDescuento>): number {
  return r.itemsAjustados.reduce((s, i) => s + i.precio * i.quantidade, 0);
}

const minCantidad = (items: OrderItemInput[]) => Math.min(...items.map(i => i.quantidade));

const item = (precio: number, quantidade: number, extra: Partial<OrderItemInput> = {}): OrderItemInput => ({
  descripcion: 'prod',
  precio,
  quantidade,
  ...extra,
});

describe('distribuirDescuento', () => {
  describe('sin descuento (o descuento inválido)', () => {
    it('descuento 0 deja los items intactos y residuo 0', () => {
      const items = [item(43000, 5), item(40000, 2)];
      const r = distribuirDescuento(items, 0);
      expect(r.aplicaDescuento).toBe(false);
      expect(r.ajusteResiduo).toBe(0);
      expect(r.itemsAjustados).toEqual(items);
      expect(r.targetTotal).toBe(295000);
      expect(totalCOD(r)).toBe(295000);
    });

    it('descuento >= subtotal no se aplica (evita precios negativos)', () => {
      const items = [item(50000, 1)];
      const r = distribuirDescuento(items, 50000);
      expect(r.aplicaDescuento).toBe(false);
      expect(r.ajusteResiduo).toBe(0);
      expect(totalCOD(r)).toBe(50000);
    });

    it('descuento negativo se ignora', () => {
      const items = [item(10000, 3)];
      const r = distribuirDescuento(items, -500);
      expect(r.aplicaDescuento).toBe(false);
      expect(totalCOD(r)).toBe(30000);
    });
  });

  describe('con descuento — invariantes', () => {
    it('el caso de la captura (dos productos cantidad 1) cuadra exacto y sin residuo', () => {
      // Soporte 95.000 + Crash 120.000 = 215.000 − descuento 17.015 = 197.985.
      // Antes generaba una línea "Ajuste de redondeo" de $1 que dejaba el pedido
      // incompleto en Venndelo; ahora el residuo se pliega en un producto.
      const items = [item(95000, 1), item(120000, 1)];
      const r = distribuirDescuento(items, 17015);
      expect(r.aplicaDescuento).toBe(true);
      expect(r.targetTotal).toBe(197985);
      expect(totalCOD(r)).toBe(197985);
      expect(r.ajusteResiduo).toBe(0); // nada que cargar en línea aparte
    });

    it('con cantidades > 1 sin item de cantidad 1, el COD queda corto < min(cantidad)', () => {
      // Subtotal 230.000 − descuento 15.000 = 215.000, cantidades 3 y 2.
      // El residuo de redondeo (1) no se puede plegar sin sobre-cobrar, así que
      // se deja sin cobrar (sub-cobro de 1 peso). Nunca se supera targetTotal.
      const items = [item(50000, 3), item(40000, 2)];
      const r = distribuirDescuento(items, 15000);
      expect(r.aplicaDescuento).toBe(true);
      expect(r.targetTotal).toBe(215000);
      expect(totalCOD(r)).toBeLessThanOrEqual(215000);
      expect(r.targetTotal - totalCOD(r)).toBe(r.ajusteResiduo);
      expect(r.ajusteResiduo).toBeLessThan(minCantidad(items));
    });

    it('todos los unit_price son enteros', () => {
      const items = [item(71667, 3), item(33333, 3), item(12500, 2)];
      const r = distribuirDescuento(items, 17000);
      for (const it of r.itemsAjustados) {
        expect(Number.isInteger(it.precio)).toBe(true);
      }
    });

    it('el residuo siempre es entero y >= 0', () => {
      const items = [item(71667, 3), item(40000, 2)];
      const r = distribuirDescuento(items, 13000);
      expect(Number.isInteger(r.ajusteResiduo)).toBe(true);
      expect(r.ajusteResiduo).toBeGreaterThanOrEqual(0);
    });

    it('Σ(unit_price × qty) nunca supera targetTotal', () => {
      const items = [item(33333, 3), item(11111, 2)];
      const r = distribuirDescuento(items, 7000);
      expect(totalCOD(r)).toBeLessThanOrEqual(r.targetTotal);
      // El faltante (no plegable) es exactamente ajusteResiduo y < min(cantidad).
      expect(r.targetTotal - totalCOD(r)).toBe(r.ajusteResiduo);
      expect(r.ajusteResiduo).toBeLessThan(minCantidad(items));
    });

    it('un item de cantidad 1 absorbe el residuo completo (COD exacto)', () => {
      // Mezcla con un item de cantidad 1: el residuo siempre se pliega → exacto.
      const items = [item(33333, 3), item(11111, 1)];
      const r = distribuirDescuento(items, 7000);
      expect(totalCOD(r)).toBe(r.targetTotal);
      expect(r.ajusteResiduo).toBe(0);
    });

    it('preserva metadata del item (venndelo_id, codigo, dimensiones)', () => {
      const items = [item(50000, 2, { venndelo_id: 'abc', codigo: 'SKU1', peso_kg: 1.2 })];
      const r = distribuirDescuento(items, 5000);
      expect(r.itemsAjustados[0].venndelo_id).toBe('abc');
      expect(r.itemsAjustados[0].codigo).toBe('SKU1');
      expect(r.itemsAjustados[0].peso_kg).toBe(1.2);
    });

    it('un solo item con cantidad > 1 no divisible deja un residuo pequeño sin cobrar', () => {
      // 99.995 − 995 = 99.000 entre 7 unidades = 14142.857… → floor 14142 × 7 = 98994, residuo 6.
      // Sin item de cantidad 1, ese residuo (6 < 7) no se puede plegar: COD = 98.994.
      // Único escenario donde el COD no es exacto; la deriva es de pocos pesos.
      const items = [item(14285, 7)]; // subtotal 99.995
      const r = distribuirDescuento(items, 995); // target 99.000
      expect(r.targetTotal).toBe(99000);
      expect(Number.isInteger(r.itemsAjustados[0].precio)).toBe(true);
      expect(totalCOD(r)).toBeLessThanOrEqual(99000);
      expect(r.targetTotal - totalCOD(r)).toBe(r.ajusteResiduo);
      expect(r.ajusteResiduo).toBeLessThan(7);
    });
  });

  describe('propiedad: cuadra exacto para casos aleatorios', () => {
    it('1000 combinaciones aleatorias mantienen el invariante de total exacto', () => {
      const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
      for (let n = 0; n < 1000; n++) {
        const numItems = rnd(1, 5);
        const items: OrderItemInput[] = Array.from({ length: numItems }, () =>
          item(rnd(1000, 200000), rnd(1, 8))
        );
        const subtotal = items.reduce((s, i) => s + i.precio * i.quantidade, 0);
        const descuento = rnd(0, subtotal + 5000); // incluye casos sin aplicar
        const r = distribuirDescuento(items, descuento);

        // Invariante 1: nunca se sobre-cobra.
        expect(totalCOD(r)).toBeLessThanOrEqual(r.targetTotal);
        // Invariante 2: el faltante es exactamente ajusteResiduo.
        expect(r.targetTotal - totalCOD(r)).toBe(r.ajusteResiduo);
        // Invariante 3: unit_price enteros.
        for (const it of r.itemsAjustados) expect(Number.isInteger(it.precio)).toBe(true);
        // Invariante 4: residuo entero >= 0 y < min(cantidad) (no plegable).
        expect(Number.isInteger(r.ajusteResiduo)).toBe(true);
        expect(r.ajusteResiduo).toBeGreaterThanOrEqual(0);
        expect(r.ajusteResiduo).toBeLessThan(minCantidad(items));
        // Invariante 5: si existe algún item de cantidad 1, el COD es exacto.
        if (items.some(i => i.quantidade === 1)) expect(r.ajusteResiduo).toBe(0);
        // Invariante 6: cuando aplica, targetTotal = subtotal − descuento.
        if (r.aplicaDescuento) expect(r.targetTotal).toBe(subtotal - descuento);
      }
    });
  });
});

describe('normalizarCodigoDane', () => {
  it('retorna null si está vacío o no definido', () => {
    expect(normalizarCodigoDane('')).toBeNull();
    expect(normalizarCodigoDane('   ')).toBeNull();
    expect(normalizarCodigoDane(undefined)).toBeNull();
    expect(normalizarCodigoDane(null)).toBeNull();
  });

  it('expande 5 dígitos a 8 (Venndelo rellena a la izquierda: 05001 → 00005001 → 404)', () => {
    expect(normalizarCodigoDane('11001')).toBe('11001000');
    expect(normalizarCodigoDane('05001')).toBe('05001000');
  });

  it('acepta 8 dígitos tal cual', () => {
    expect(normalizarCodigoDane('11001000')).toBe('11001000');
    expect(normalizarCodigoDane('05001000')).toBe('05001000');
  });

  it('recorta espacios alrededor', () => {
    expect(normalizarCodigoDane('  11001 ')).toBe('11001000');
  });

  it('antepone el 0 perdido en códigos de 4 o 7 dígitos', () => {
    expect(normalizarCodigoDane('5001')).toBe('05001000');
    expect(normalizarCodigoDane('5001000')).toBe('05001000');
  });

  it('quita separadores (espacios, puntos, guiones)', () => {
    expect(normalizarCodigoDane('11.001')).toBe('11001000');
    expect(normalizarCodigoDane('11-001-000')).toBe('11001000');
    expect(normalizarCodigoDane('11 001')).toBe('11001000');
  });

  it('rechaza letras', () => {
    expect(normalizarCodigoDane('Bogotá')).toBeNull();
    expect(normalizarCodigoDane('11O01')).toBeNull();
  });

  it('rechaza longitudes inválidas', () => {
    expect(normalizarCodigoDane('1')).toBeNull();
    expect(normalizarCodigoDane('110')).toBeNull();
    expect(normalizarCodigoDane('110010')).toBeNull();
    expect(normalizarCodigoDane('110010000')).toBeNull();
  });
});

describe('subdivisionDeDane', () => {
  it('toma los 2 primeros dígitos', () => {
    expect(subdivisionDeDane('11001')).toBe('11');
    expect(subdivisionDeDane('05001000')).toBe('05');
  });
});

describe('resolverCiudadOrigen', () => {
  it('retorna city_code normalizado y su subdivisión', () => {
    expect(resolverCiudadOrigen('05001')).toEqual({ city_code: '05001000', subdivision_code: '05' });
    expect(resolverCiudadOrigen('11001000')).toEqual({ city_code: '11001000', subdivision_code: '11' });
  });

  it('lanza error claro si no hay origen válido (sin fallback a Bogotá)', () => {
    expect(() => resolverCiudadOrigen(undefined)).toThrow(ERROR_CIUDAD_ORIGEN);
    expect(() => resolverCiudadOrigen('')).toThrow(ERROR_CIUDAD_ORIGEN);
    expect(() => resolverCiudadOrigen('abc')).toThrow(ERROR_CIUDAD_ORIGEN);
  });
});

describe('tipoLineaVenndelo', () => {
  it('usa STANDARD con variation_id numérico cuando el producto está sincronizado', () => {
    expect(tipoLineaVenndelo('1336045')).toEqual({ type: 'STANDARD', variation_id: 1336045 });
    expect(tipoLineaVenndelo(42)).toEqual({ type: 'STANDARD', variation_id: 42 });
  });

  it('usa VIRTUAL si no hay variation_id válido (Venndelo exige variation_id en STANDARD)', () => {
    expect(tipoLineaVenndelo(undefined)).toEqual({ type: 'VIRTUAL' });
    expect(tipoLineaVenndelo(null)).toEqual({ type: 'VIRTUAL' });
    expect(tipoLineaVenndelo('')).toEqual({ type: 'VIRTUAL' });
    expect(tipoLineaVenndelo('abc')).toEqual({ type: 'VIRTUAL' });
    expect(tipoLineaVenndelo('0')).toEqual({ type: 'VIRTUAL' });
  });
});

describe('validarOrigenEnCiudades', () => {
  const ciudades: CiudadVenndelo[] = [
    { code: '05001000', name: 'Medellin', department: 'Antioquia', subdivision_code: '05', subdivision_name: 'Antioquia', service_status: 'ACTIVE' },
    { code: '11001000', name: 'Bogota', department: 'Cundinamarca', subdivision_code: '25', subdivision_name: 'Cundinamarca', service_status: 'ACTIVE' },
    { code: '27001000', name: 'Quibdo', department: 'Chocó', subdivision_code: '27', service_status: 'SUSPENDED', service_unavailable_message: 'Destino suspendido temporalmente' },
    { code: '25653001', name: 'Camancha', department: 'Cundinamarca', subdivision_code: '25', service_status: 'ACTIVE' },
  ];

  it('acepta un código existente y activo, con los datos de Venndelo', () => {
    const r = validarOrigenEnCiudades('11001000', ciudades);
    expect(r.estado).toBe('ok');
    // Venndelo trata a Bogotá como departamento 25, no 11: se usa el de la lista
    if (r.estado === 'ok') expect(r.ciudad.subdivision_code).toBe('25');
  });

  it('marca como no_existe un código con formato válido que Venndelo no tiene', () => {
    expect(validarOrigenEnCiudades('05003000', ciudades).estado).toBe('no_existe');
    // Municipio sin cabecera "000" en Venndelo (San Cayetano solo tiene corregimientos)
    expect(validarOrigenEnCiudades('25653000', ciudades).estado).toBe('no_existe');
  });

  it('marca como suspendida una ciudad no activa, con el mensaje de Venndelo', () => {
    const r = validarOrigenEnCiudades('27001000', ciudades);
    expect(r.estado).toBe('suspendida');
    if (r.estado === 'suspendida') expect(r.mensaje).toContain('Destino suspendido temporalmente');
  });

  it('los mensajes de error mencionan "ciudad origen" para que la UI los reconozca', () => {
    const r = validarOrigenEnCiudades('05003000', ciudades);
    if (r.estado !== 'ok') expect(r.mensaje.toLowerCase()).toContain('ciudad origen');
  });
});

describe('descuentosVenndelo (anticipo de envío)', () => {
  it('sin anticipo no envía descuentos', () => {
    expect(descuentosVenndelo(0)).toEqual([]);
    expect(descuentosVenndelo(undefined)).toEqual([]);
    expect(descuentosVenndelo(null)).toEqual([]);
    expect(descuentosVenndelo(-500)).toEqual([]);
  });

  it('envía el anticipo como un único descuento GLOBAL en pesos enteros', () => {
    expect(descuentosVenndelo(17476)).toEqual([{ type: 'GLOBAL', amount: 17476 }]);
    expect(descuentosVenndelo(17060.07)).toEqual([{ type: 'GLOBAL', amount: 17060 }]);
  });
});

describe('saldoContraEntrega', () => {
  it('sin anticipo, se cobra el total', () => {
    expect(saldoContraEntrega(36160, 0)).toBe(36160);
    expect(saldoContraEntrega(36160, undefined)).toBe(36160);
  });

  it('la tienda recibe exactamente el valor del producto aunque el envío real cambie', () => {
    const producto = 20000;
    const anticipo = 17476; // lo que el cliente pagó según la cotización
    for (const envioReal of [17476, 16576, 16160.07, 18000]) {
      const total = producto + envioReal;
      const cobroEnPuerta = saldoContraEntrega(total, anticipo);
      const reintegro = cobroEnPuerta - envioReal; // Venndelo: reintegro = cobrado − envío
      expect(anticipo + reintegro).toBeCloseTo(producto, 6);
      // El cliente paga en total producto + envío real
      expect(anticipo + cobroEnPuerta).toBeCloseTo(producto + envioReal, 6);
    }
  });

  it('nunca es negativo', () => {
    expect(saldoContraEntrega(10000, 15000)).toBe(0);
  });
});

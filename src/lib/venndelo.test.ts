import { describe, it, expect } from 'vitest';
import { distribuirDescuento, type OrderItemInput } from './venndelo';

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

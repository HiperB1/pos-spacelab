import { describe, it, expect } from 'vitest';
import { reconstruirFacturaItems, normalizeLegacyStore } from './backup';

describe('reconstruirFacturaItems', () => {
  it('reconstruye items embebidos de varias facturas con factura_id correcto', () => {
    const facturas = [
      { id: 'f1', items: [
        { descripcion: 'A', quantidade: 2, precio: 1000, total: 2000, tipo_item: 'produto', produto_id: 'p1' },
        { descripcion: 'B', quantidade: 1, precio: 500, total: 500 },
      ] },
      { id: 'f2', items: [
        { descripcion: 'C', quantidade: 3, precio: 100, total: 300 },
      ] },
    ];
    const items = reconstruirFacturaItems(facturas);
    expect(items).toHaveLength(3);
    expect(items.filter(i => i.factura_id === 'f1')).toHaveLength(2);
    expect(items.filter(i => i.factura_id === 'f2')).toHaveLength(1);
    const a = items.find(i => i.descripcion === 'A')!;
    expect(a).toMatchObject({ factura_id: 'f1', quantidade: 2, precio: 1000, total: 2000, tipo_item: 'produto', produto_id: 'p1' });
  });

  it('deriva total cuando falta usando quantidade × precio', () => {
    const items = reconstruirFacturaItems([{ id: 'f1', items: [{ descripcion: 'X', quantidade: 4, precio: 250 }] }]);
    expect(items[0].total).toBe(1000);
  });

  it('asigna tipo_item manual por defecto y genera id si falta', () => {
    const items = reconstruirFacturaItems([{ id: 'f1', items: [{ descripcion: 'X', quantidade: 1, precio: 1 }] }]);
    expect(items[0].tipo_item).toBe('manual');
    expect(typeof items[0].id).toBe('string');
    expect(items[0].id.length).toBeGreaterThan(0);
  });

  it('ignora facturas sin array de items y entradas nulas', () => {
    expect(reconstruirFacturaItems([{ id: 'f1' }, null, { id: 'f2', items: [] }])).toEqual([]);
    expect(reconstruirFacturaItems([])).toEqual([]);
    expect(reconstruirFacturaItems(undefined as any)).toEqual([]);
  });
});

describe('normalizeLegacyStore', () => {
  it('reconstruye factura_items desde items embebidos cuando factura_items está vacío (backup v1.0)', () => {
    const legacy = {
      configuracion: { id: 1 },
      clientes: [],
      facturas: [{ id: 'f1', numero: 'DG-00001', items: [{ descripcion: 'A', quantidade: 2, precio: 1000 }] }],
      factura_items: [],
    };
    const norm = normalizeLegacyStore(legacy);
    expect(norm.factura_items).toHaveLength(1);
    expect(norm.factura_items[0]).toMatchObject({ factura_id: 'f1', total: 2000 });
  });

  it('NO sobrescribe factura_items si ya vienen poblados (backup v2.0)', () => {
    const v2 = {
      configuracion: { id: 1 },
      clientes: [],
      facturas: [{ id: 'f1', numero: 'DG-00001' }],
      factura_items: [{ id: 'orig', factura_id: 'f1', descripcion: 'A', quantidade: 2, precio: 1000, total: 2000 }],
    };
    const norm = normalizeLegacyStore(v2);
    expect(norm.factura_items).toHaveLength(1);
    expect(norm.factura_items[0].id).toBe('orig');
  });

  it('no falla si no hay facturas', () => {
    const norm = normalizeLegacyStore({ configuracion: { id: 1 }, clientes: [] });
    expect(norm.factura_items).toBeUndefined();
  });
});

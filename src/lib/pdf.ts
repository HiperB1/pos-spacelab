import pdfMake from 'pdfmake/build/pdfmake';
import type { Factura, FacturaItem } from './types';
import * as db from './database';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import chunkoBoldBase64 from './chunkoFont';

let fontsReady = false;
let fontsReadyPromise: Promise<void> | null = null;

async function initFonts(): Promise<void> {
  if (fontsReady) return;
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    try {
      const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
      (pdfMake as any).vfs = {
        ...(pdfFonts?.pdfMake?.vfs ?? {}),
        'chunko-bold.ttf': chunkoBoldBase64,
      };
    } catch {
      (pdfMake as any).vfs = { 'chunko-bold.ttf': chunkoBoldBase64 };
    }
    (pdfMake as any).fonts = {
      ...((pdfMake as any).fonts || {}),
      ChunkoBold: {
        normal: 'chunko-bold.ttf',
        bold: 'chunko-bold.ttf',
        italics: 'chunko-bold.ttf',
        bolditalics: 'chunko-bold.ttf',
      },
    };
    fontsReady = true;
  })();
  return fontsReadyPromise;
}

async function getBase64ImageFromURL(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function pdfToBase64(docDefinition: any): Promise<string> {
  return Promise.race([
    new Promise<string>((resolve, reject) => {
      try {
        // @ts-ignore - pdfmake types are broken
        const gen = pdfMake.createPdf(docDefinition);
        // @ts-ignore
        gen.getBase64((base64: string) => resolve(base64));
      } catch (e) {
        reject(e);
      }
    }),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de generación de PDF agotado')), 15000)
    ),
  ]);
}

export async function gerarPDFFactura(factura: Factura & { items: FacturaItem[] }): Promise<void> {
  const toastId = toast.loading('Generando PDF...');

  
  const config = db.getConfiguracion();
  const empresaNome = config.empresa_nome || 'My Space';
  const empresaNit = config.empresa_nit || '000000000';
  const empresaDireccion = config.empresa_direccion || '';
  const empresaTelefono = config.empresa_telefono || '';
  const empresaEmail = config.empresa_email || '';

  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromURL('/myspace-logo.png');
  } catch (e) {
    console.error('Error cargando logo:', e);
  }

  // 100mm × 95mm (dimensiones exactas del papel de la impresora POS)
  const PAGE_W = 283.46; // 100mm en puntos
  const PAGE_H = 268.98; // 95mm en puntos

  // Escala global: comprime TODO el contenido proporcionalmente para garantizar exactamente 1 página
  const n = factura.items.length;
  const CONTENT_H = PAGE_H - 16; // altura usable con márgenes 8+8

  // Estimaciones a escala=1 considerando lineHeight real de Roboto (~1.17) y
  // wrapping promedio de descripciones largas en columna estrecha:
  //   H_HEADER=42  H_INFO=94  H_TABLE_HDR=20  H_ROW=26(promedio 1-2 líneas)  H_TOTALS=29  misc=8
  const estimatedH = 42 + 94 + 20 + n * 26 + 29 + 8;
  const scale = Math.min(1.0, (CONTENT_H * 0.90) / estimatedH);

  const f = (base: number): number => Math.max(6, base * scale);
  const m = (base: number): number => Math.max(0, base * scale);

  const tfs = f(10);
  const tp  = Math.max(1, m(4));
  const headerMargin  = m(5);
  const sectionMargin = m(7);

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [8, 8, 8, 8],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [m(99), m(38)],
          } : { text: empresaNome, style: 'header', width: '*' },
          {
            stack: [
              { text: 'FACTURA DE VENTA', style: 'title', alignment: 'right' },
              { text: `No. ${factura.numero}`, style: 'invoiceNumber', alignment: 'right' },
              { text: factura.fecha, style: 'subheader', alignment: 'right' }
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, headerMargin]
      },
      {
        columns: [
          {
            stack: [
              { text: 'EMISOR', style: 'sectionTitle' },
              { text: empresaNome, style: 'empresaNome' },
              { text: `NIT: ${empresaNit}`, style: 'empresaInfo' },
              { text: empresaDireccion, style: 'empresaInfo' },
              { text: `Tel: ${empresaTelefono}`, style: 'empresaInfo' },
              { text: empresaEmail, style: 'empresaInfo' },
            ],
            width: '*'
          },
          {
            stack: [
              { text: 'CLIENTE', style: 'sectionTitle' },
              { text: factura.cliente_nome.toUpperCase(), style: 'clienteNome' },
              ...(factura.cliente_celular ? [{ text: `Tel: ${factura.cliente_celular}`, style: 'empresaInfo' }] : []),
              ...(factura.cliente_nit ? [{ text: `NIT: ${factura.cliente_nit}`, style: 'empresaInfo' }] : []),
              ...(factura.cliente_direccion ? [{ text: factura.cliente_direccion, style: 'empresaInfo' }] : [])
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, sectionMargin]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 16, 44, 44],
          body: [
            [
              { text: 'DESCRIPCIÓN', style: 'tableHeader' },
              { text: 'CANT', style: 'tableHeader', alignment: 'center' },
              { text: 'P. UNIT.', style: 'tableHeader', alignment: 'right' },
              { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
            ],
            ...factura.items.map((item) => [
              { text: item.descripcion, style: 'tableCell' },
              { text: item.quantidade.toString(), style: 'tableCell', alignment: 'center' },
              { text: formatCurrency(item.precio), style: 'tableCell', alignment: 'right' },
              { text: formatCurrency(item.total), style: 'tableCell', alignment: 'right' }
            ])
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#333' : '#eee',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => tp,
          paddingBottom: () => tp,
        },
        margin: [0, 0, 0, m(4)]
      },
      {
        columns: [
          {
            stack: [
              ...(factura.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, m(4), 0, m(2)] },
                { text: factura.notas, style: 'empresaInfo' }
              ] : [])
            ],
            width: '*'
          },
          {
            width: 130,
            stack: [
              {
                columns: [
                  { text: 'SUBTOTAL', style: 'totalLabel' },
                  { text: formatCurrency(factura.subtotal), style: 'totalValue' }
                ],
                margin: [0, 0, 0, m(3)]
              },
              ...(factura.descuento > 0 ? [{
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: formatCurrency(factura.descuento), style: 'totalValue' }
                ],
                margin: [0, 0, 0, m(3)]
              }] : []),
              ...(factura.costo_envio && factura.costo_envio > 0 ? [{
                columns: [
                  { text: 'ENVÍO', style: 'totalLabel' },
                  { text: formatCurrency(factura.costo_envio), style: 'totalValue' }
                ],
                margin: [0, 0, 0, m(3)]
              }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL A PAGAR', style: 'totalLabelBold' },
                  { text: formatCurrency(factura.total), style: 'totalValueBold' }
                ],
                margin: [0, m(4), 0, 0]
              }
            ]
          }
        ]
      },
      ...(factura.estado === 'anulada' ? [
        {
          text: '— FACTURA ANULADA —',
          style: { color: '#000', bold: true, alignment: 'center', fontSize: f(13) },
          margin: [0, m(8), 0, m(2)]
        },
        { text: `Motivo: ${factura.motivo_anulacion}`, style: 'empresaInfo', alignment: 'center' },
        { text: `Fecha anulación: ${factura.fecha_anulacion}`, style: 'empresaInfo', alignment: 'center' }
      ] : []),
    ],
    styles: {
      header: { fontSize: f(14), bold: true, color: '#000' },
      title: { fontSize: f(13), bold: true, color: '#000' },
      invoiceNumber: { fontSize: f(12), bold: true, color: '#000' },
      subheader: { fontSize: f(11), color: '#000' },
      sectionTitle: { fontSize: f(10), bold: true, color: '#000', margin: [0, 0, 0, m(2)] },
      empresaNome: { fontSize: f(11), bold: true },
      empresaInfo: { fontSize: f(10), color: '#000' },
      clienteNome: { fontSize: f(11), bold: true },
      tableHeader: { fontSize: tfs, bold: true, color: '#fff', fillColor: '#333', margin: [0, 1, 0, 1] },
      tableCell: { fontSize: tfs, margin: [0, 1, 0, 1] },
      totalLabel: { fontSize: f(10), color: '#000', alignment: 'right', margin: [0, 0, m(4), 0] },
      totalValue: { fontSize: f(10), alignment: 'right' },
      totalLabelBold: { fontSize: f(11), bold: true, alignment: 'right', margin: [0, 0, m(4), 0] },
      totalValueBold: { fontSize: f(11), bold: true, alignment: 'right', color: '#000' },
      label: { fontSize: f(10), color: '#000' }
    },
    defaultStyle: { font: 'Roboto', bold: true, color: '#000' }
  };

  try {
    await initFonts();
    const base64 = await pdfToBase64(docDefinition);
    const fileName = `factura_${factura.numero}.pdf`;
    const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
    await openPath(path);
    toast.success('PDF generado correctamente', { id: toastId });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    toast.error('Error al generar el PDF', { id: toastId });
  }
}

export async function gerarPDFGuia(factura: Factura & { items: FacturaItem[] }): Promise<void> {
  const toastId = toast.loading('Generando Guía de Envío...');
  try {
  

    const config = db.getConfiguracion();
    const empresaNome = config.empresa_nome || 'My Space';
    const qrRaw = config.qr_guia || '';
    const qrGuia = qrRaw.startsWith('data:') ? qrRaw : '';

    const PAGE_W = 283.46;
    const PAGE_H = 268.98;
    const INNER_W = PAGE_W - 32; // contenido dentro del borde (márgenes 4+borde+8 a cada lado)

    let logoBase64 = '';
    try {
      logoBase64 = await getBase64ImageFromURL('/myspace-logo.png');
    } catch (e) {
      console.error('Error cargando logo:', e);
    }

    const innerContent: any[] = [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [94.5, 39.9],
          } : { text: empresaNome, style: 'header', width: '*' },
          {
            stack: [
              { text: 'GUIA DE ENVIO LOCAL', style: 'title', alignment: 'right', fontSize: 11, bold: true },
              { text: `No. ${factura.numero}`, style: 'invoiceNumber', alignment: 'right', fontSize: 11 },
              { text: factura.fecha, style: 'subheader', alignment: 'right', fontSize: 10 }
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, 1]
      },
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: INNER_W, h: 2, color: '#000000' }
        ],
        margin: [0, 0, 0, 5]
      },
      {
        stack: [
          { text: factura.cliente_nome.toUpperCase(), style: 'clienteNome' },
          ...(factura.cliente_celular ? [{ text: `Tel: ${factura.cliente_celular}`, style: 'empresaInfo' }] : []),
          ...(factura.cliente_direccion ? [{ text: factura.cliente_direccion, style: 'empresaInfo' }] : []),
          ...(factura.barrio_medellin ? [{ text: `Barrio: ${factura.barrio_medellin}`, style: 'empresaInfo' }] : []),
        ],
        margin: [0, 0, 0, 4]
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 4, x2: INNER_W, y2: 4, lineWidth: 0.5, lineColor: '#000000' },
          { type: 'ellipse', x: 20,  y: 4, r1: 2.0, r2: 2.0, color: '#000000' },
          { type: 'ellipse', x: 58,  y: 4, r1: 1.1, r2: 1.1, color: '#000000' },
          { type: 'ellipse', x: 96,  y: 4, r1: 1.5, r2: 1.5, color: '#000000' },
          { type: 'ellipse', x: 129, y: 4, r1: 2.4, r2: 2.4, color: '#000000' },
          { type: 'ellipse', x: 163, y: 4, r1: 1.1, r2: 1.1, color: '#000000' },
          { type: 'ellipse', x: 200, y: 4, r1: 1.5, r2: 1.5, color: '#000000' },
          { type: 'ellipse', x: 239, y: 4, r1: 2.0, r2: 2.0, color: '#000000' },
        ],
        margin: [0, 0, 0, 4]
      },
      {
        table: {
          widths: qrGuia ? ['*', 105] : ['*'],
          body: [[
            {
              stack: [
                { text: 'GRACIAS', style: 'thanksTitle', characterSpacing: 4 },
                { text: 'POR SEGUIR JUGANDO', style: 'thanksSubtitle', characterSpacing: 1 },
                { text: 'Disfruta cada aventura!', style: 'thanksBody', margin: [0, 5, 0, 0] },
              ],
              margin: [8, 7, qrGuia ? 4 : 8, 7]
            },
            ...(qrGuia ? [{
              image: qrGuia,
              fit: [90, 90],
              alignment: 'center',
              margin: [4, 4, 8, 4]
            }] : [])
          ]]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0]
      },
    ];

    const docDefinition: any = {
      pageSize: { width: PAGE_W, height: PAGE_H },
      pageMargins: [4, 4, 4, 4],
      content: [
        {
          table: {
            widths: ['*'],
            heights: [PAGE_H - 8],
            body: [[{ stack: innerContent, margin: [8, 8, 8, 8] }]]
          },
          layout: {
            hLineWidth: () => 2.5,
            vLineWidth: () => 2.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          }
        }
      ],
      styles: {
        header:        { fontSize: 14, bold: true, color: '#000' },
        title:         { fontSize: 12, bold: true, color: '#000' },
        invoiceNumber: { fontSize: 11, bold: true, color: '#000' },
        subheader:     { fontSize: 10, color: '#000' },
        sectionTitle:  { fontSize: 10, bold: true, color: '#000', margin: [0, 0, 0, 2] },
        empresaNome:   { fontSize: 11, bold: true, color: '#000' },
        empresaInfo:   { fontSize: 10, color: '#000' },
        clienteNome:   { fontSize: 11, bold: true, color: '#000' },
        thanksTitle:   { fontSize: 16, bold: true, color: '#000' },
        thanksSubtitle:{ fontSize: 8.5, bold: true, color: '#000', margin: [0, 2, 0, 0] },
        thanksBody:    { fontSize: 9, color: '#000', lineHeight: 1.35 },
      },
      defaultStyle: { font: 'Roboto', color: '#000' }
    };

    await initFonts();
    const base64 = await pdfToBase64(docDefinition);
    const fileName = `guia_${factura.numero}.pdf`;
    const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
    await openPath(path);
    toast.success('Guía de envío generada', { id: toastId });
  } catch (error) {
    console.error('Error al generar guía:', error);
    toast.error(`Error al generar la guía: ${(error as any)?.message ?? error}`, { id: toastId });
  }
}

export async function gerarPDFCotizacion(cotizacion: any): Promise<void> {
  const toastId = toast.loading('Generando PDF de cotización...');

  
  const config = db.getConfiguracion();
  const empresaNome = config.empresa_nome || 'My Space';
  const empresaNit = config.empresa_nit || '000000000';
  const empresaDireccion = config.empresa_direccion || '';
  const empresaTelefono = config.empresa_telefono || '';
  const empresaEmail = config.empresa_email || '';

  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromURL('/myspace-logo.png');
  } catch (e) {
    console.error('Error cargando logo:', e);
  }

  const items = cotizacion.items || [];

  // 100mm × 95mm (dimensiones exactas del papel de la impresora POS)
  const PAGE_W = 283.46; // 100mm en puntos
  const PAGE_H = 268.98; // 95mm en puntos

  // Escala global: comprime TODO el contenido proporcionalmente para garantizar exactamente 1 página
  const n = items.length;
  const CONTENT_H = PAGE_H - 16; // altura usable con márgenes 8+8

  // Estimaciones a escala=1 considerando lineHeight real de Roboto (~1.17) y
  // wrapping promedio en columna de descripción. La cotización tiene línea extra
  // (fecha vencimiento + "DETALLE DE LA COTIZACIÓN"):
  //   H_HEADER=50  H_INFO=94  H_TABLE_HDR+DETALLE=28  H_ROW=26  H_TOTALS=29  misc=8
  const estimatedH = 50 + 94 + 28 + n * 26 + 29 + 8;
  const scale = Math.min(1.0, (CONTENT_H * 0.90) / estimatedH);

  const f = (base: number): number => Math.max(6, base * scale);
  const m = (base: number): number => Math.max(0, base * scale);

  const tfs = f(10);
  const tp  = Math.max(1, m(4));
  const headerMargin  = m(5);
  const sectionMargin = m(6);

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [8, 8, 8, 8],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [m(99), m(38)],
          } : { text: empresaNome, style: 'header', width: '*' },
          {
            stack: [
              { text: 'COTIZACIÓN', style: 'title', alignment: 'right' },
              { text: `No. ${cotizacion.numero}`, style: 'invoiceNumber', alignment: 'right' },
              { text: `Fecha: ${cotizacion.fecha}`, style: 'subheader', alignment: 'right' },
              { text: `Válido hasta: ${cotizacion.fecha_vencimiento}`, style: 'subheaderHighlight', alignment: 'right' }
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, headerMargin]
      },
      {
        columns: [
          {
            stack: [
              { text: 'EMPRESA', style: 'sectionTitle' },
              { text: empresaNome, style: 'empresaNome' },
              { text: `NIT: ${empresaNit}`, style: 'empresaInfo' },
              { text: empresaDireccion, style: 'empresaInfo' },
              { text: `Tel: ${empresaTelefono}`, style: 'empresaInfo' },
              { text: empresaEmail, style: 'empresaInfo' },
            ],
            width: '*'
          },
          {
            stack: [
              { text: 'CLIENTE', style: 'sectionTitle' },
              { text: cotizacion.cliente_nome.toUpperCase(), style: 'clienteNome' },
              ...(cotizacion.cliente_celular ? [{ text: `Tel: ${cotizacion.cliente_celular}`, style: 'empresaInfo' }] : []),
              ...(cotizacion.cliente_nit ? [{ text: `NIT: ${cotizacion.cliente_nit}`, style: 'empresaInfo' }] : []),
              ...(cotizacion.cliente_direccion ? [{ text: cotizacion.cliente_direccion, style: 'empresaInfo' }] : []),
              ...(cotizacion.ciudad ? [{ text: cotizacion.ciudad, style: 'empresaInfo' }] : [])
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, sectionMargin]
      },
      {
        text: 'DETALLE DE LA COTIZACIÓN',
        style: 'sectionTitle',
        margin: [0, 0, 0, m(2)]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 16, 44, 44],
          body: [
            [
              { text: 'DESCRIPCIÓN', style: 'tableHeader' },
              { text: 'CANT', style: 'tableHeader', alignment: 'center' },
              { text: 'P. UNIT.', style: 'tableHeader', alignment: 'right' },
              { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
            ],
            ...items.map((item: any) => [
              { text: item.descripcion, style: 'tableCell' },
              { text: item.quantidade.toString(), style: 'tableCell', alignment: 'center' },
              { text: formatCurrency(item.precio), style: 'tableCell', alignment: 'right' },
              { text: formatCurrency(item.total), style: 'tableCell', alignment: 'right' }
            ])
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? '#333' : '#eee',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => tp,
          paddingBottom: () => tp,
        },
        margin: [0, 0, 0, m(4)]
      },
      {
        columns: [
          {
            stack: [
              ...(cotizacion.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, m(4), 0, m(2)] },
                { text: cotizacion.notas, style: 'empresaInfo' }
              ] : []),
              { text: `Vigencia: ${cotizacion.validez_dias} días.`, style: 'validityNote', margin: [0, m(4), 0, 0] }
            ],
            width: '*'
          },
          {
            width: 130,
            stack: [
              {
                columns: [
                  { text: 'SUBTOTAL', style: 'totalLabel' },
                  { text: formatCurrency(cotizacion.subtotal), style: 'totalValue' }
                ],
                margin: [0, 0, 0, m(3)]
              },
              ...(cotizacion.descuento > 0 ? [{
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: '-' + formatCurrency(cotizacion.descuento), style: 'totalValueDiscount' }
                ],
                margin: [0, 0, 0, m(3)]
              }] : []),
              ...(cotizacion.costo_envio > 0 ? [{
                columns: [
                  { text: 'ENVÍO', style: 'totalLabel' },
                  { text: formatCurrency(cotizacion.costo_envio), style: 'totalValue' }
                ],
                margin: [0, 0, 0, m(3)]
              }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL', style: 'totalLabelBold' },
                  { text: formatCurrency(cotizacion.total), style: 'totalValueBold' }
                ],
                margin: [0, m(4), 0, 0]
              }
            ]
          }
        ]
      },
      ...(cotizacion.estado !== 'abierta' ? [
        {
          text: `— ${cotizacion.estado.toUpperCase()} —`,
          style: {
            fontSize: f(13),
            bold: true,
            alignment: 'center',
            color: '#000'
          },
          margin: [0, m(8), 0, 0]
        }
      ] : []),
    ],
    styles: {
      header: { fontSize: f(14), bold: true, color: '#000' },
      title: { fontSize: f(13), bold: true, color: '#000' },
      invoiceNumber: { fontSize: f(12), bold: true, color: '#000' },
      subheader: { fontSize: f(11), color: '#000' },
      subheaderHighlight: { fontSize: f(11), bold: true, color: '#000' },
      sectionTitle: { fontSize: f(10), bold: true, color: '#000', margin: [0, 0, 0, m(2)] },
      empresaNome: { fontSize: f(11), bold: true },
      empresaInfo: { fontSize: f(10), color: '#000' },
      clienteNome: { fontSize: f(11), bold: true },
      tableHeader: { fontSize: tfs, bold: true, color: '#fff', fillColor: '#333', margin: [0, 1, 0, 1] },
      tableCell: { fontSize: tfs, margin: [0, 1, 0, 1] },
      totalLabel: { fontSize: f(10), color: '#000', alignment: 'right', margin: [0, 0, m(4), 0] },
      totalValue: { fontSize: f(10), alignment: 'right' },
      totalValueDiscount: { fontSize: f(10), alignment: 'right', color: '#000' },
      totalLabelBold: { fontSize: f(11), bold: true, alignment: 'right', margin: [0, 0, m(4), 0] },
      totalValueBold: { fontSize: f(11), bold: true, alignment: 'right', color: '#000' },
      label: { fontSize: f(10), color: '#000' },
      validityNote: { fontSize: f(10), color: '#000', italics: true }
    },
    defaultStyle: { font: 'Roboto', bold: true, color: '#000' }
  };

  try {
    await initFonts();
    const base64 = await pdfToBase64(docDefinition);
    const fileName = `cotizacion_${cotizacion.numero}.pdf`;
    const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
    await openPath(path);
    toast.success('PDF de cotización generado correctamente', { id: toastId });
  } catch (error) {
    console.error('Error al generar PDF de cotización:', error);
    toast.error('Error al generar el PDF de cotización', { id: toastId });
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2
  }).format(value);
}
import pdfMake from 'pdfmake/build/pdfmake';
import type { Factura, FacturaItem } from './types';
import * as db from './database';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';

// Initialize pdfmake fonts at runtime to avoid build issues
if (typeof window !== 'undefined') {
  import('pdfmake/build/vfs_fonts').then((pdfFonts: any) => {
    try {
      if (pdfFonts?.pdfMake?.vfs) {
        (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
      }
    } catch (e) {
      console.warn('[PDF] Failed to load fonts:', e);
    }
  }).catch(e => console.warn('[PDF] Font import failed:', e));
}


async function getBase64ImageFromURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
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

  // Escala dinámica: reduce fuente/padding de la tabla para que todos los ítems quepan en una página
  const n = factura.items.length;
  const headerMargin  = n > 3 ? 3 : 7;
  const sectionMargin = n > 3 ? 4 : 10;
  const BUDGET = n > 3 ? 92 : 80; // puntos disponibles para la tabla
  let tfs = 11, tp = 5;           // table font size, table padding
  while ((tfs * 1.1 + tp * 2) * (n + 1) + 2 > BUDGET) {
    if (tp > 1) tp--;
    else { tfs = Math.max(6, tfs - 1); tp = Math.max(1, Math.floor(tfs * 0.3)); }
    if (tfs <= 6 && tp <= 1) break;
  }

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [8, 8, 8, 8],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [99, 40],
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
          widths: ['*', 22, 50, 50],
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
        margin: [0, 0, 0, 4]
      },
      {
        columns: [
          {
            stack: [
              ...(factura.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, 4, 0, 2] },
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
                margin: [0, 0, 0, 3]
              },
              ...(factura.descuento > 0 ? [{
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: formatCurrency(factura.descuento), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 3]
              }] : []),
              ...(factura.costo_envio && factura.costo_envio > 0 ? [{
                columns: [
                  { text: 'ENVÍO', style: 'totalLabel' },
                  { text: formatCurrency(factura.costo_envio), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 3]
              }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL A PAGAR', style: 'totalLabelBold' },
                  { text: formatCurrency(factura.total), style: 'totalValueBold' }
                ],
                margin: [0, 4, 0, 0]
              }
            ]
          }
        ]
      },
      ...(factura.estado === 'anulada' ? [
        {
          text: '— FACTURA ANULADA —',
          style: { color: '#000', bold: true, alignment: 'center', fontSize: 13 },
          margin: [0, 8, 0, 2]
        },
        { text: `Motivo: ${factura.motivo_anulacion}`, style: 'empresaInfo', alignment: 'center' },
        { text: `Fecha anulación: ${factura.fecha_anulacion}`, style: 'empresaInfo', alignment: 'center' }
      ] : []),
    ],
    styles: {
      header: { fontSize: 14, bold: true, color: '#000' },
      title: { fontSize: 13, bold: true, color: '#000' },
      invoiceNumber: { fontSize: 12, bold: true, color: '#000' },
      subheader: { fontSize: 11, color: '#000' },
      sectionTitle: { fontSize: 11, bold: true, color: '#000', margin: [0, 0, 0, 2] },
      empresaNome: { fontSize: 12, bold: true },
      empresaInfo: { fontSize: 11, color: '#000' },
      clienteNome: { fontSize: 12, bold: true },
      tableHeader: { fontSize: tfs, bold: true, color: '#fff', fillColor: '#333', margin: [0, 1, 0, 1] },
      tableCell: { fontSize: tfs, margin: [0, 1, 0, 1] },
      totalLabel: { fontSize: 11, color: '#000', alignment: 'right', margin: [0, 0, 4, 0] },
      totalValue: { fontSize: 11, alignment: 'right' },
      totalLabelBold: { fontSize: 12, bold: true, alignment: 'right', margin: [0, 0, 4, 0] },
      totalValueBold: { fontSize: 12, bold: true, alignment: 'right', color: '#000' },
      label: { fontSize: 11, color: '#000' }
    },
    defaultStyle: { font: 'Roboto', bold: true, color: '#000' }
  };

  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBase64(async (base64: string) => {
      const fileName = `factura_${factura.numero}.pdf`;
      const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
      await openPath(path);
      toast.success('PDF generado correctamente', { id: toastId });
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    toast.error('Error al generar el PDF', { id: toastId });
  }
}

export async function gerarPDFGuia(factura: Factura & { items: FacturaItem[] }): Promise<void> {
  const toastId = toast.loading('Generando Guía de Envío...');

  const config = db.getConfiguracion();
  const empresaNome = config.empresa_nome || 'My Space';
  const empresaTelefono = config.empresa_telefono || '';
  const empresaDireccion = config.empresa_direccion || '';

  // 100mm × 95mm (dimensiones exactas del papel de la impresora POS)
  const PAGE_W = 283.46; // 100mm en puntos
  const PAGE_H = 268.98; // 95mm en puntos

  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromURL('/myspace-logo.png');
  } catch (e) {
    console.error('Error cargando logo:', e);
  }

  // Ancho del contenido: PAGE_W - márgenes laterales (12 × 2)
  const CONTENT_W = PAGE_W - 24;

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [12, 12, 12, 12],
    // Marco negro en el límite del PDF
    background: (_page: number, pageSize: any) => ({
      canvas: [{
        type: 'rect',
        x: 4, y: 4,
        w: pageSize.width - 8,
        h: pageSize.height - 8,
        lineWidth: 2.5,
        lineColor: '#000000',
        r: 2
      }]
    }),
    content: [
      // Cabecera: logo + título
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [90, 38],
          } : { text: empresaNome, style: 'header', width: '*' },
          {
            stack: [
              { text: 'GUÍA DE ENVÍO LOCAL', style: 'title', alignment: 'right', fontSize: 12 },
              { text: `No. ${factura.numero}`, style: 'invoiceNumber', alignment: 'right', fontSize: 11 },
              { text: factura.fecha, style: 'subheader', alignment: 'right', fontSize: 10 }
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, 1]
      },
      // Línea negra decorativa bajo la cabecera
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: CONTENT_W, h: 2, r: 0, color: '#000000' }
        ],
        margin: [0, 0, 0, 5]
      },
      // Secciones remitente / destinatario
      {
        columns: [
          {
            stack: [
              { text: 'DESTINATARIO', style: 'sectionTitle' },
              { text: factura.cliente_nome.toUpperCase(), style: 'clienteNome' },
              ...(factura.cliente_celular ? [{ text: `Tel: ${factura.cliente_celular}`, style: 'empresaInfo' }] : []),
              ...(factura.cliente_direccion ? [{ text: factura.cliente_direccion, style: 'empresaInfo' }] : []),
            ],
            width: '*'
          },
          {
            stack: [
              { text: 'REMITENTE', style: 'sectionTitle', fontSize: 10 },
              { text: empresaNome, style: 'empresaNome', fontSize: 11 },
              { text: empresaDireccion, style: 'empresaInfo', fontSize: 10 },
              { text: `Tel: ${empresaTelefono}`, style: 'empresaInfo', fontSize: 10 },
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, 4]
      },
      // Separador con puntos simulando estrellas (todo en negro)
      {
        canvas: [
          { type: 'line', x1: 0, y1: 4, x2: CONTENT_W, y2: 4, lineWidth: 0.5, lineColor: '#000000' },
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
      // Bloque de agradecimiento con marco negro (sin fondo)
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: 'GRACIAS', style: 'thanksTitle', characterSpacing: 4 },
              { text: 'POR RECIBIR UN FRAGMENTO DE NUESTRO UNIVERSO', style: 'thanksSubtitle', characterSpacing: 1 },
              {
                text: 'Cada creación fue hecha con detalle, imaginación e ideas de otro mundo. Esperamos que este nuevo artefacto encuentre su lugar en tu espacio y lo haga aún más tuyo.',
                style: 'thanksBody',
                margin: [0, 5, 0, 0]
              },
            ],
            margin: [8, 7, 8, 7]
          }]]
        },
        layout: {
          hLineWidth: () => 1.5,
          vLineWidth: () => 1.5,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
        },
        margin: [0, 0, 0, 0]
      },
    ],
    styles: {
      header:       { fontSize: 14, bold: true, color: '#000' },
      title:        { fontSize: 12, bold: true, color: '#000' },
      invoiceNumber:{ fontSize: 11, bold: true, color: '#000' },
      subheader:    { fontSize: 10, color: '#000' },
      sectionTitle: { fontSize: 10, bold: true, color: '#000', margin: [0, 0, 0, 2] },
      empresaNome:  { fontSize: 11, bold: true, color: '#000' },
      empresaInfo:  { fontSize: 10, color: '#000' },
      clienteNome:  { fontSize: 11, bold: true, color: '#000' },
      thanksTitle:   { fontSize: 16, bold: true, color: '#000' },
      thanksSubtitle:{ fontSize: 8.5, bold: true, color: '#000', margin: [0, 2, 0, 0] },
      thanksBody:    { fontSize: 9, color: '#000', lineHeight: 1.35 },
    },
    defaultStyle: { font: 'Roboto', bold: true, color: '#000' }
  };

  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBase64(async (base64: string) => {
      const fileName = `guia_${factura.numero}.pdf`;
      const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
      await openPath(path);
      toast.success('Guía de envío generada', { id: toastId });
    });
  } catch (error) {
    console.error('Error al generar guía:', error);
    toast.error('Error al generar la guía', { id: toastId });
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

  // Escala dinámica: reduce fuente/padding de la tabla para que todos los ítems quepan en una página
  const n = items.length;
  const headerMargin  = n > 3 ? 3 : 7;
  const sectionMargin = n > 3 ? 2 : 4;
  const BUDGET = n > 3 ? 92 : 80;
  let tfs = 11, tp = 5;
  while ((tfs * 1.1 + tp * 2) * (n + 1) + 2 > BUDGET) {
    if (tp > 1) tp--;
    else { tfs = Math.max(6, tfs - 1); tp = Math.max(1, Math.floor(tfs * 0.3)); }
    if (tfs <= 6 && tp <= 1) break;
  }

  const docDefinition: any = {
    pageSize: { width: PAGE_W, height: PAGE_H },
    pageMargins: [8, 8, 8, 8],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            fit: [99, 40],
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
        margin: [0, 0, 0, 2]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 22, 50, 50],
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
        margin: [0, 0, 0, 4]
      },
      {
        columns: [
          {
            stack: [
              ...(cotizacion.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, 4, 0, 2] },
                { text: cotizacion.notas, style: 'empresaInfo' }
              ] : []),
              { text: `Vigencia: ${cotizacion.validez_dias} días.`, style: 'validityNote', margin: [0, 4, 0, 0] }
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
                margin: [0, 0, 0, 3]
              },
              ...(cotizacion.descuento > 0 ? [{
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: '-' + formatCurrency(cotizacion.descuento), style: 'totalValueDiscount' }
                ],
                margin: [0, 0, 0, 3]
              }] : []),
              ...(cotizacion.costo_envio > 0 ? [{
                columns: [
                  { text: 'ENVÍO', style: 'totalLabel' },
                  { text: formatCurrency(cotizacion.costo_envio), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 3]
              }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL', style: 'totalLabelBold' },
                  { text: formatCurrency(cotizacion.total), style: 'totalValueBold' }
                ],
                margin: [0, 4, 0, 0]
              }
            ]
          }
        ]
      },
      ...(cotizacion.estado !== 'abierta' ? [
        {
          text: `— ${cotizacion.estado.toUpperCase()} —`,
          style: {
            fontSize: 13,
            bold: true,
            alignment: 'center',
            color: '#000'
          },
          margin: [0, 8, 0, 0]
        }
      ] : []),
    ],
    styles: {
      header: { fontSize: 14, bold: true, color: '#000' },
      title: { fontSize: 13, bold: true, color: '#000' },
      invoiceNumber: { fontSize: 12, bold: true, color: '#000' },
      subheader: { fontSize: 11, color: '#000' },
      subheaderHighlight: { fontSize: 11, bold: true, color: '#000' },
      sectionTitle: { fontSize: 11, bold: true, color: '#000', margin: [0, 0, 0, 2] },
      empresaNome: { fontSize: 12, bold: true },
      empresaInfo: { fontSize: 11, color: '#000' },
      clienteNome: { fontSize: 12, bold: true },
      tableHeader: { fontSize: tfs, bold: true, color: '#fff', fillColor: '#333', margin: [0, 1, 0, 1] },
      tableCell: { fontSize: tfs, margin: [0, 1, 0, 1] },
      totalLabel: { fontSize: 11, color: '#000', alignment: 'right', margin: [0, 0, 4, 0] },
      totalValue: { fontSize: 11, alignment: 'right' },
      totalValueDiscount: { fontSize: 11, alignment: 'right', color: '#000' },
      totalLabelBold: { fontSize: 12, bold: true, alignment: 'right', margin: [0, 0, 4, 0] },
      totalValueBold: { fontSize: 12, bold: true, alignment: 'right', color: '#000' },
      label: { fontSize: 11, color: '#000' },
      validityNote: { fontSize: 11, color: '#000', italics: true }
    },
    defaultStyle: { font: 'Roboto', bold: true, color: '#000' }
  };
  
  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBase64(async (base64: string) => {
      const fileName = `cotizacion_${cotizacion.numero}.pdf`;
      const path = await invoke<string>('save_file', { filename: fileName, subfolder: 'PDFs', data: base64 });
      await openPath(path);
      toast.success('PDF de cotización generado correctamente', { id: toastId });
    });
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
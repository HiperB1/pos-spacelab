import pdfMake from 'pdfmake/build/pdfmake';
import type { Factura, FacturaItem } from './types';
import * as db from './database';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

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

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            width: 150,
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
        margin: [0, 0, 0, 20]
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
        margin: [0, 0, 0, 30]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 80, 80],
          body: [
            [
              { text: 'DESCRIPCIÓN', style: 'tableHeader' },
              { text: 'CANT', style: 'tableHeader', alignment: 'center' },
              { text: 'PRECIO UNIT.', style: 'tableHeader', alignment: 'right' },
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
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          { 
            stack: [
              ...(factura.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, 10, 0, 5] },
                { text: factura.notas, style: 'empresaInfo' }
              ] : [])
            ],
            width: '*' 
          },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: 'SUBTOTAL', style: 'totalLabel' },
                  { text: formatCurrency(factura.subtotal), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 5]
              },
              {
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: formatCurrency(factura.descuento || 0), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 5],
                ...(factura.descuento > 0 ? {} : { opacity: 0 })
              },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL A PAGAR', style: 'totalLabelBold' },
                  { text: formatCurrency(factura.total), style: 'totalValueBold' }
                ],
                margin: [0, 8, 0, 0]
              }
            ]
          }
        ]
      },
      ...(factura.estado === 'anulada' ? [
        { 
          absolutePosition: { x: 0, y: 300 },
          text: 'ANULADA', 
          style: { 
            fontSize: 80, 
            bold: true, 
            color: '#ff0000', 
            opacity: 0.2, 
            alignment: 'center',
            angle: 45
          } 
        },
        { 
          text: 'ESTA FACTURA HA SIDO ANULADA', 
          style: { color: 'red', bold: true, alignment: 'center' }, 
          margin: [0, 40, 0, 0] 
        },
        { text: `Motivo: ${factura.motivo_anulacion}`, style: 'empresaInfo', alignment: 'center' },
        { text: `Fecha anulación: ${factura.fecha_anulacion}`, style: 'empresaInfo', alignment: 'center' }
      ] : []),
      {
        stack: [
          { text: '_______________________________________', alignment: 'center', margin: [0, 60, 0, 5] },
          { text: 'RECIBÍ CONFORME', style: 'label', alignment: 'center' }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#333' },
      title: { fontSize: 18, bold: true, color: '#f97316' }, // Orange color matching the UI
      invoiceNumber: { fontSize: 14, bold: true, color: '#666' },
      subheader: { fontSize: 10, color: '#999' },
      sectionTitle: { fontSize: 9, bold: true, color: '#f97316', margin: [0, 0, 0, 5] },
      empresaNome: { fontSize: 11, bold: true },
      empresaInfo: { fontSize: 9, color: '#666' },
      clienteNome: { fontSize: 11, bold: true },
      tableHeader: { fontSize: 9, bold: true, color: '#fff', fillColor: '#333', margin: [0, 2, 0, 2] },
      tableCell: { fontSize: 9, margin: [0, 2, 0, 2] },
      totalLabel: { fontSize: 10, color: '#666', alignment: 'right', margin: [0, 0, 10, 0] },
      totalValue: { fontSize: 10, alignment: 'right' },
      totalLabelBold: { fontSize: 12, bold: true, alignment: 'right', margin: [0, 0, 10, 0] },
      totalValueBold: { fontSize: 12, bold: true, alignment: 'right', color: '#f97316' },
      label: { fontSize: 8, color: '#999' }
    },
    defaultStyle: { font: 'Roboto' }
  };
  
  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBlob((blob: any) => {
      const fileName = `factura_${factura.numero}.pdf`;
      saveAs(blob, fileName);
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

  let logoBase64 = '';
  try {
    logoBase64 = await getBase64ImageFromURL('/myspace-logo.png');
  } catch (e) {
    console.error('Error cargando logo:', e);
  }

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            width: 150,
          } : { text: empresaNome, style: 'header', width: '*' },
          {
            stack: [
              { text: 'GUÍA DE ENVÍO', style: 'title', alignment: 'right' },
              { text: `Ref: ${factura.numero}`, style: 'invoiceNumber', alignment: 'right' },
              { text: factura.fecha, style: 'subheader', alignment: 'right' }
            ],
            width: '*'
          }
        ],
        margin: [0, 0, 0, 30]
      },
      {
        stack: [
          { text: 'DESTINATARIO', style: 'sectionTitle' },
          { text: factura.cliente_nome.toUpperCase(), style: 'clienteNomeBig' },
          { 
            columns: [
              { text: 'DIRECCIÓN:', style: 'labelInfo', width: 80 },
              { text: factura.cliente_direccion || 'No especificada', style: 'valueInfo' }
            ],
            margin: [0, 5, 0, 2]
          },
          { 
            columns: [
              { text: 'TELÉFONO:', style: 'labelInfo', width: 80 },
              { text: factura.cliente_celular || 'No especificado', style: 'valueInfo' }
            ],
            margin: [0, 0, 0, 2]
          }
        ],
        margin: [0, 0, 0, 30],
        padding: [20, 20, 20, 20],
        background: '#f8f8f8'
      },
      { text: 'CONTENIDO DEL ENVÍO', style: 'sectionTitle', margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 100],
          body: [
            [
              { text: 'DESCRIPCIÓN DEL PRODUCTO', style: 'tableHeader' },
              { text: 'CANTIDAD', style: 'tableHeader', alignment: 'center' }
            ],
            ...factura.items.map((item) => [
              { text: item.descripcion, style: 'tableCell' },
              { text: item.quantidade.toString(), style: 'tableCell', alignment: 'center' }
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },
      ...(factura.venndelo_order_id ? [
        { text: 'DATOS DEL ENVÍO (VENNDELO)', style: 'sectionTitle', margin: [0, 10, 0, 5] },
        {
          columns: [
            { text: 'Order ID:', style: 'labelInfo', width: 80 },
            { text: factura.venndelo_order_id, style: 'valueInfo' }
          ],
          margin: [0, 5, 0, 2]
        },
        ...(factura.venndelo_tracking ? [{
          columns: [
            { text: 'Tracking:', style: 'labelInfo', width: 80 },
            { text: factura.venndelo_tracking, style: 'valueInfo' }
          ],
          margin: [0, 0, 0, 2]
        }] : []),
      ] : []),
      ...(factura.notas ? [
        { text: 'NOTAS ADICIONALES', style: 'sectionTitle', margin: [0, 10, 0, 5] },
        { text: factura.notas, style: 'empresaInfo' }
      ] : []),
      {
        stack: [
          { text: 'REMITENTE', style: 'sectionTitle', margin: [0, 40, 0, 5] },
          { text: empresaNome, style: 'empresaNome' },
          { text: config.empresa_direccion, style: 'empresaInfo' },
          { text: `Tel: ${config.empresa_telefono}`, style: 'empresaInfo' }
        ],
        alignment: 'right'
      }
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#333' },
      title: { fontSize: 20, bold: true, color: '#f97316' },
      invoiceNumber: { fontSize: 14, bold: true, color: '#666' },
      subheader: { fontSize: 10, color: '#999' },
      sectionTitle: { fontSize: 10, bold: true, color: '#f97316', border: [0, 0, 0, 1] },
      clienteNomeBig: { fontSize: 18, bold: true, margin: [0, 10, 0, 10] },
      labelInfo: { fontSize: 10, bold: true, color: '#666' },
      valueInfo: { fontSize: 12, bold: true },
      empresaNome: { fontSize: 11, bold: true },
      empresaInfo: { fontSize: 9, color: '#666' },
      tableHeader: { fontSize: 10, bold: true, color: '#fff', fillColor: '#333', margin: [0, 5, 0, 5] },
      tableCell: { fontSize: 11, margin: [0, 8, 0, 8] }
    },
    defaultStyle: { font: 'Roboto' }
  };
  
  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBlob((blob: any) => {
      saveAs(blob, `guia_${factura.numero}.pdf`);
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
  
  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        columns: [
          logoBase64 ? {
            image: logoBase64,
            width: 150,
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
        margin: [0, 0, 0, 20]
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
        margin: [0, 0, 0, 30]
      },
      {
        text: 'DETALLE DE LA COTIZACIÓN',
        style: 'sectionTitle',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 80, 80],
          body: [
            [
              { text: 'DESCRIPCIÓN', style: 'tableHeader' },
              { text: 'CANT', style: 'tableHeader', alignment: 'center' },
              { text: 'PRECIO UNIT.', style: 'tableHeader', alignment: 'right' },
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
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          { 
            stack: [
              ...(cotizacion.notas ? [
                { text: 'OBSERVACIONES', style: 'sectionTitle', margin: [0, 10, 0, 5] },
                { text: cotizacion.notas, style: 'empresaInfo' }
              ] : []),
              { text: 'Validez: Esta cotización tiene vigencia de ' + cotizacion.validez_dias + ' días.', style: 'validityNote', margin: [0, 20, 0, 0] }
            ],
            width: '*' 
          },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: 'SUBTOTAL', style: 'totalLabel' },
                  { text: formatCurrency(cotizacion.subtotal), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 5]
              },
              ...(cotizacion.descuento > 0 ? [{
                columns: [
                  { text: 'DESCUENTO', style: 'totalLabel' },
                  { text: '-' + formatCurrency(cotizacion.descuento), style: 'totalValueDiscount' }
                ],
                margin: [0, 0, 0, 5]
              }] : []),
              ...(cotizacion.costo_envio > 0 ? [{
                columns: [
                  { text: 'ENVÍO', style: 'totalLabel' },
                  { text: formatCurrency(cotizacion.costo_envio), style: 'totalValue' }
                ],
                margin: [0, 0, 0, 5]
              }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, strokeColor: '#333' }] },
              {
                columns: [
                  { text: 'TOTAL', style: 'totalLabelBold' },
                  { text: formatCurrency(cotizacion.total), style: 'totalValueBold' }
                ],
                margin: [0, 8, 0, 0]
              }
            ]
          }
        ]
      },
      ...(cotizacion.estado !== 'abierta' ? [
        { 
          absolutePosition: { x: 0, y: 300 },
          text: cotizacion.estado.toUpperCase(), 
          style: { 
            fontSize: 80, 
            bold: true, 
            color: cotizacion.estado === 'aprobada' ? '#22c55e' : cotizacion.estado === 'rechazada' ? '#ef4444' : '#eab308', 
            opacity: 0.2, 
            alignment: 'center',
            angle: 45
          } 
        }
      ] : []),
      {
        stack: [
          { text: '_______________________________________', alignment: 'center', margin: [0, 60, 0, 5] },
          { text: 'FIRMA CLIENTE', style: 'label', alignment: 'center' },
          { text: 'Aceptación de cotización', style: 'label', alignment: 'center', margin: [0, 5, 0, 0] }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      header: { fontSize: 24, bold: true, color: '#333' },
      title: { fontSize: 18, bold: true, color: '#f97316' },
      invoiceNumber: { fontSize: 14, bold: true, color: '#666' },
      subheader: { fontSize: 10, color: '#999' },
      subheaderHighlight: { fontSize: 10, bold: true, color: '#f97316' },
      sectionTitle: { fontSize: 9, bold: true, color: '#f97316', margin: [0, 0, 0, 5] },
      empresaNome: { fontSize: 11, bold: true },
      empresaInfo: { fontSize: 9, color: '#666' },
      clienteNome: { fontSize: 11, bold: true },
      tableHeader: { fontSize: 9, bold: true, color: '#fff', fillColor: '#333', margin: [0, 2, 0, 2] },
      tableCell: { fontSize: 9, margin: [0, 2, 0, 2] },
      totalLabel: { fontSize: 10, color: '#666', alignment: 'right', margin: [0, 0, 10, 0] },
      totalValue: { fontSize: 10, alignment: 'right' },
      totalValueDiscount: { fontSize: 10, alignment: 'right', color: '#22c55e' },
      totalLabelBold: { fontSize: 12, bold: true, alignment: 'right', margin: [0, 0, 10, 0] },
      totalValueBold: { fontSize: 12, bold: true, alignment: 'right', color: '#f97316' },
      label: { fontSize: 8, color: '#999' },
      validityNote: { fontSize: 9, color: '#666', italics: true }
    },
    defaultStyle: { font: 'Roboto' }
  };
  
  try {
    // @ts-ignore - pdfmake types are broken
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    // @ts-ignore
    pdfDocGenerator.getBlob((blob: any) => {
      saveAs(blob, `cotizacion_${cotizacion.numero}.pdf`);
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
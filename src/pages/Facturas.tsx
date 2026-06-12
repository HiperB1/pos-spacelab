import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllFacturas, createFactura, getSiguienteNumero, anularFactura, getConfiguracion } from '../lib/facturas';
import { getProdutos, getCombos, getClientes, updateFacturaVenndelo } from '../lib/database';
import { gerarPDFFactura, gerarPDFGuia } from '../lib/pdf';
import { getCiudades, createOrder, createShipment, generateLabel, getOrder, cancelOrder, distribuirDescuento, type CreateOrderResult } from '../lib/venndelo';
import { cotizarEnvioSimple, type ItemEnvio } from '../lib/envio';
import type { CiudadVenndelo } from '../lib/venndelo';
import { exportToExcel, exportToCSV } from '../lib/export';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { useNavigation } from '../context/NavigationContext';
import { openUrl, openPath } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import {
  ReceiptText,
  Plus,
  FileSpreadsheet,
  FileText,
  Ban,
  X,
  Search,
  Truck,
  Package,
  PackagePlus,
  Eye,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_nit: string;
  subtotal: number;
  iva: number;
  descuento?: number;
  costo_envio?: number;
  total: number;
  estado: string;
  notas?: string;
  tipo_pedido?: string;
  venndelo_order_id?: string;
  venndelo_tracking?: string;
  venndelo_label_url?: string;
  venndelo_label_local_path?: string;
  venndelo_pin?: string;
  venndelo_status?: string;
  cliente_apellido?: string;
  cliente_direccion?: string;
  payment_method_code?: string;
}


function interpretarErrorVenndelo(errMsg: string): { causa: string; solucion: string } {
  const msg = errMsg.toLowerCase();

  if (msg.includes('tarifa de transporte no localizada') || (msg.includes('422') && msg.includes('transport'))) {
    return {
      causa: 'El transportador no tiene cobertura en la ciudad de destino, o el método "Contra Entrega" no está disponible para esa ruta.',
      solucion: 'Selecciona una ciudad principal o capital de departamento. Si el destino es correcto, intenta con el método de pago "Ya Pagado".'
    };
  }
  if (msg.includes('422')) {
    return {
      causa: 'Venndelo rechazó el pedido porque algún dato no es válido para esa ruta o producto.',
      solucion: 'Revisa la ciudad de destino, el método de pago y las dimensiones del producto.'
    };
  }
  if (msg.includes('invalid values') || (msg.includes('500') && msg.includes('entity'))) {
    return {
      causa: 'Los datos del pedido no son válidos: precio cero, nombre de cliente muy corto o campos requeridos vacíos.',
      solucion: 'Verifica que el producto tenga precio mayor a $0 y que los datos del cliente (nombre, teléfono, dirección) estén completos.'
    };
  }
  if (msg.includes('500')) {
    return {
      causa: 'Error interno de Venndelo al procesar el pedido.',
      solucion: 'Intenta de nuevo en unos minutos o crea el pedido manualmente desde el panel de Venndelo.'
    };
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('api key') || msg.includes('unauthorized')) {
    return {
      causa: 'El API Key de Venndelo no es válido o no tiene los permisos necesarios.',
      solucion: 'Ve a Configuración → Integración y verifica que el API Key de Venndelo sea correcto.'
    };
  }
  if (msg.includes('no se pudo conectar') || msg.includes('failed to fetch') || msg.includes('network')) {
    return {
      causa: 'No se pudo establecer conexión con Venndelo.',
      solucion: 'Verifica tu conexión a internet e intenta de nuevo.'
    };
  }
  if (msg.includes('id de orden') || msg.includes('order') || msg.includes('id válido')) {
    return {
      causa: 'El pedido se creó en Venndelo pero no se pudo confirmar el ID de la orden.',
      solucion: 'Revisa el panel de Venndelo para confirmar si el pedido fue creado y vincúlalo manualmente si es necesario.'
    };
  }
  return {
    causa: 'Venndelo rechazó el pedido por una razón desconocida.',
    solucion: 'Puedes crear el pedido manualmente desde el panel de Venndelo o contactar al soporte.'
  };
}

interface ItemFactura {
  tipo_item: 'inventario' | 'manual';
  origen: 'produto' | 'combo';
  produto_id?: string;
  combo_id?: string;
  venndelo_id?: string;
  descripcion: string;
  quantidade: number;
  precio: number;
  peso_kg?: number;
  alto_cm?: number;
  ancho_cm?: number;
  largo_cm?: number;
}

export function Facturas() {
  const { pendingAction, setPendingAction } = useNavigation();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [dbClientes, setDbClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [showNueva, setShowNueva] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAnular, setShowAnular] = useState<any>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroFecha, setFiltroFecha] = useState('este_mes');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_nome: '',
    cliente_celular: '',
    cliente_nit: '',
    cliente_direccion: ''
  });
  const [notas, setNotas] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [items, setItems] = useState<ItemFactura[]>([
    { tipo_item: 'inventario', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }
  ]);

  const [tipoPedido, setTipoPedido] = useState<'local' | 'nacional'>('local');
  const [barrioMedellin, setBarrioMedellin] = useState('');
  const [clienteApellido, setClienteApellido] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState<'CC' | 'NIT'>('CC');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'EXTERNAL_PAYMENT'>('EXTERNAL_PAYMENT');
  const [ciudadDestino, setCiudadDestino] = useState('');
  const [ciudades, setCiudades] = useState<CiudadVenndelo[]>([]);
  const [showVenndeloSuccess, setShowVenndeloSuccess] = useState(false);
  const [venndeloResult, setVenndeloResult] = useState<{
    factura: any;
    labelUrl: string;
    tracking: string;
  } | null>(null);
  const [creatingVenndelo, setCreatingVenndelo] = useState(false);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [cargandoEnvio, setCargandoEnvio] = useState(false);
  const [envioCalculado, setEnvioCalculado] = useState(false);
  const [showVenndeloOrder, setShowVenndeloOrder] = useState(false);
  const [venndeloOrderInfo, setVenndeloOrderInfo] = useState<any>(null);
  const [venndeloOrderLoading, setVenndeloOrderLoading] = useState(false);

  useEffect(() => {
    loadData();
    if (pendingAction === 'new') {
      setShowNueva(true);
      setPendingAction(null);
    }
  }, [pendingAction]);

  useEffect(() => {
    if (showNueva) {
      getCiudades().then(setCiudades).catch(() => {});
    }
  }, [showNueva]);

  function loadData() {
    setFacturas(getAllFacturas());
    setDbClientes(getClientes());
    setProductos(getProdutos());
    setCombos(getCombos());
  }

  const getRangoFechas = (filtro: string) => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth();

    if (filtro === 'este_mes') {
      return {
        inicio: new Date(año, mes, 1).toISOString().split('T')[0],
        fin: new Date(año, mes + 1, 0).toISOString().split('T')[0]
      };
    }
    if (filtro === 'mes_pasado') {
      return {
        inicio: new Date(año, mes - 1, 1).toISOString().split('T')[0],
        fin: new Date(año, mes, 0).toISOString().split('T')[0]
      };
    }
    if (filtro === 'este_año') {
      return { inicio: `${año}-01-01`, fin: `${año}-12-31` };
    }
    return { inicio: '', fin: '' };
  };

  const facturasFiltradas = useMemo(() => {
    let result = [...facturas];

    if (busqueda) {
      const lower = busqueda.toLowerCase();
      result = result.filter(f =>
        f.numero.toLowerCase().includes(lower) ||
        f.cliente_nome.toLowerCase().includes(lower) ||
        f.cliente_nit?.toLowerCase().includes(lower)
      );
    }

    if (filtroEstado !== 'todas') {
      result = result.filter(f => f.estado === filtroEstado);
    }

    if (filtroFecha !== 'todas') {
      const range = filtroFecha === 'rango' ? { inicio: fechaInicio, fin: fechaFin } : getRangoFechas(filtroFecha);
      if (range.inicio) result = result.filter(f => f.fecha >= range.inicio);
      if (range.fin) result = result.filter(f => f.fecha <= range.fin);
    }

    return result;
  }, [facturas, busqueda, filtroEstado, filtroFecha, fechaInicio, fechaFin]);

  function handleClienteSelect(id: string) {
    if (id) {
      const cliente = dbClientes.find(c => c.id === id);
      if (cliente) {
        setFormData({
          cliente_id: id,
          cliente_nome: cliente.nome,
          cliente_celular: cliente.telefono || '',
          cliente_nit: cliente.nit || '',
          cliente_direccion: cliente.direccion || ''
        });
        setClienteApellido('');
        setClienteEmail(cliente.email || '');
      }
    } else {
      setFormData({ cliente_id: '', cliente_nome: 'Consumidor Final', cliente_celular: '', cliente_nit: '', cliente_direccion: '' });
      setClienteApellido('');
      setClienteEmail('');
    }
  }

  function addItem() {
    setItems([...items, { tipo_item: 'inventario', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  function updateItem(index: number, field: keyof ItemFactura, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function handleSelectProducto(index: number, tipo: 'inventario' | 'manual', origen?: 'produto' | 'combo', id?: string) {
    const newItems = [...items];
    newItems[index].tipo_item = tipo;
    newItems[index].origen = tipo === 'inventario' ? (origen || 'produto') : 'produto';
    newItems[index].produto_id = undefined;
    newItems[index].combo_id = undefined;
    newItems[index].descripcion = '';
    newItems[index].precio = 0;

    if (tipo === 'inventario') {
      if (newItems[index].origen === 'combo') {
        const combo = combos.find(c => c.id === id);
        newItems[index].combo_id = id;
        newItems[index].descripcion = combo ? `COMBO: ${combo.nome}` : '';
        newItems[index].precio = combo?.preco || 0;
      } else {
        const prod = productos.find(p => p.id === id);
        newItems[index].produto_id = id;
        newItems[index].descripcion = prod?.nome || '';
        newItems[index].precio = prod?.preco || 0;
        newItems[index].venndelo_id = prod?.venndelo_id;
        newItems[index].peso_kg = prod?.peso_kg;
        newItems[index].alto_cm = prod?.alto_cm;
        newItems[index].ancho_cm = prod?.ancho_cm;
        newItems[index].largo_cm = prod?.largo_cm;
      }
    }
    setItems(newItems);
  }

  // El flete de Venndelo depende del valor declarado (unit_price). Como createOrder
  // envía los precios YA descontados, la cotización debe usar esos mismos precios
  // descontados; si no, el envío mostrado al crear la factura no coincide con el real.
  function itemsParaCotizar(validos: typeof items): ItemEnvio[] {
    const orderItems = validos.map(i => ({
      descripcion: i.descripcion,
      quantidade: i.quantidade,
      precio: i.precio,
      peso_kg: i.peso_kg,
      alto_cm: i.alto_cm,
      ancho_cm: i.ancho_cm,
      largo_cm: i.largo_cm,
    }));
    return distribuirDescuento(orderItems, descuento || 0).itemsAjustados as ItemEnvio[];
  }

  async function handleCotizarEnvio() {
    const itemsValidos = items.filter(i => i.descripcion && i.quantidade > 0 && i.precio > 0);
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un producto con precio antes de cotizar el envío.');
      return;
    }
    if (!ciudadDestino) return;
    const config = getConfiguracion();
    if (!config.api_key_venndelo) {
      toast.error('API Key de Venndelo no configurada.');
      return;
    }
    setCargandoEnvio(true);
    try {
      const ciudad = ciudades.find(c => c.code === ciudadDestino);
      const subtotalActual = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
      const precio = await cotizarEnvioSimple(
        ciudadDestino,
        itemsParaCotizar(itemsValidos),
        ciudad?.subdivision_code,
        paymentMethod,
        subtotalActual
      );
      setCostoEnvio(precio);
      setEnvioCalculado(true);
      toast.success(`Envío cotizado: ${formatCurrency(precio)}`);
    } catch (e: any) {
      const errMsg = e?.message || 'Error desconocido';
      toast.error(`No se pudo cotizar el envío: ${errMsg}`);
    } finally {
      setCargandoEnvio(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.descripcion && i.quantidade > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }

    if (tipoPedido === 'nacional' && !ciudadDestino) {
      toast.error('Debe seleccionar una ciudad de destino para pedidos nacionales');
      return;
    }

    const itemsParaGuardar = validItems.map(item => ({
      tipo_item: item.tipo_item === 'inventario' ? item.origen : 'manual',
      produto_id: item.produto_id,
      combo_id: item.combo_id,
      venndelo_id: item.venndelo_id,
      descripcion: item.descripcion,
      quantidade: item.quantidade,
      precio: item.precio,
      peso_kg: item.peso_kg,
      alto_cm: item.alto_cm,
      ancho_cm: item.ancho_cm,
      largo_cm: item.largo_cm,
    }));

    let costoEnvioFinal = costoEnvio;
    if (tipoPedido === 'nacional' && !envioCalculado) {
      const itemsConPrecio = validItems.filter(i => i.precio > 0);
      if (itemsConPrecio.length > 0 && ciudadDestino) {
        const configEnvio = getConfiguracion();
        if (configEnvio.api_key_venndelo) {
          try {
            const ciudadObj = ciudades.find(c => c.code === ciudadDestino);
            const subtotalActual = validItems.reduce((sum, i) => sum + i.quantidade * i.precio, 0);
            costoEnvioFinal = await cotizarEnvioSimple(
              ciudadDestino,
              itemsParaCotizar(itemsConPrecio),
              ciudadObj?.subdivision_code,
              paymentMethod,
              subtotalActual
            );
            setCostoEnvio(costoEnvioFinal);
            setEnvioCalculado(true);
          } catch {
            // Fallo silencioso: se crea la factura con costo_envio 0
          }
        }
      }
    }

    try {
      const f = createFactura({
        ...formData,
        cliente_apellido: clienteApellido,
        cliente_email: clienteEmail,
        tipo_identificacion: tipoIdentificacion,
        items: itemsParaGuardar,
        notas,
        descuento,
        costo_envio: tipoPedido === 'nacional' ? costoEnvioFinal : 0,
        tipo_pedido: tipoPedido,
        payment_method_code: paymentMethod,
        ciudad_destino: tipoPedido === 'nacional' ? ciudadDestino : '',
        barrio_medellin: tipoPedido === 'local' ? barrioMedellin : ''
      });

      if (tipoPedido === 'nacional') {
        setCreatingVenndelo(true);
        const config = getConfiguracion();

          if (!config.api_key_venndelo) {
            toast.warning('API Key de Venndelo no configurada. La factura se creó pero no se registró el envío.');
            setCreatingVenndelo(false);
          } else if (!f.cliente_celular || !f.cliente_direccion) {
            const missing: string[] = [];
            if (!f.cliente_celular) missing.push('• Teléfono del cliente');
            if (!f.cliente_direccion) missing.push('• Dirección del cliente');
            toast.custom((t) => (
              <div className="bg-surface border border-yellow-500/20 rounded-2xl p-5 shadow-2xl max-w-md w-full" onClick={() => toast.dismiss(t)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Datos del cliente incompletos</p>
                    <p className="text-xs text-yellow-400/80 mt-1.5 leading-relaxed">
                      Para crear el pedido en Venndelo, el cliente debe tener:
                    </p>
                    <div className="text-xs text-white/70 mt-2 font-mono leading-relaxed">
                      {missing.join('\n')}
                    </div>
                    <p className="text-[11px] text-white/40 mt-2">
                      La factura se guardó localmente. Completa los datos del cliente y vuelve a intentarlo.
                    </p>
                  </div>
                </div>
              </div>
            ), { duration: 10000 });
            setCreatingVenndelo(false);
          } else if (!config.empresa_telefono || !config.empresa_direccion) {
            const missing: string[] = [];
            if (!config.empresa_telefono) missing.push('• Teléfono de la empresa');
            if (!config.empresa_direccion) missing.push('• Dirección de la empresa');
            toast.custom((t) => (
              <div className="bg-surface border border-yellow-500/20 rounded-2xl p-5 shadow-2xl max-w-md w-full" onClick={() => toast.dismiss(t)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xl">⚙️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">Configuración incompleta</p>
                    <p className="text-xs text-yellow-400/80 mt-1.5 leading-relaxed">
                      Para crear pedidos en Venndelo, necesitas configurar:
                    </p>
                    <div className="text-xs text-white/70 mt-2 font-mono leading-relaxed">
                      {missing.join('\n')}
                    </div>
                    <p className="text-[11px] text-white/40 mt-2">
                      Ve a Configuración → Datos de la Empresa y completa la información.
                    </p>
                  </div>
                </div>
              </div>
            ), { duration: 10000 });
            setCreatingVenndelo(false);
          } else {
            let order: CreateOrderResult | null = null;
            let venndeloError = false;
            try {
              order = await createOrder(f, itemsParaGuardar, config.api_key_venndelo, {
                ciudad_origen: config.ciudad_origen || '',
                empresa_nome: config.empresa_nome || '',
                empresa_telefono: config.empresa_telefono || '',
                empresa_direccion: config.empresa_direccion || ''
              });
              if (!order) {
                // createOrder returned null without throwing (shouldn't happen now, but just in case)
                venndeloError = true;
                toast.warning('Factura creada. No se pudo crear el pedido en Venndelo, puedes crearlo manualmente desde el panel.');
                setCreatingVenndelo(false);
              }
            } catch (e: any) {
              venndeloError = true;
              const errMsg = e?.message || 'Error desconocido';
              console.error('[Facturas] createOrder error:', errMsg);
              const { causa, solucion } = interpretarErrorVenndelo(errMsg);
              toast.custom((t) => (
                <div className="bg-surface border border-red-500/20 rounded-2xl p-5 shadow-2xl max-w-md w-full" onClick={() => toast.dismiss(t)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">Pedido no creado en Venndelo</p>
                      <p className="text-xs text-red-400 font-semibold mt-2">¿Por qué ocurrió?</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">{causa}</p>
                      <p className="text-xs text-yellow-400 font-semibold mt-2">¿Qué hacer?</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">{solucion}</p>
                      <p className="text-[10px] text-white/30 mt-3 font-mono border-t border-white/10 pt-2">{errMsg}</p>
                    </div>
                  </div>
                </div>
              ), { duration: 15000 });
              setCreatingVenndelo(false);
            }

            if (venndeloError) {
              // Ya se manejó arriba, no hacer nada más aquí
            } else if (order) {
              let tracking = '';
              let labelUrl = '';
              let shipmentCreated = false;

              // Verificar si Venndelo ya creó el envío automáticamente
              const orderShipments = order.shipments;
              const hasExistingShipments = Array.isArray(orderShipments) && orderShipments.length > 0;

              if (!hasExistingShipments) {
                // No hay envío aún → intentar crearlo
                try {
                  await createShipment(order.id, config.api_key_venndelo);
                  shipmentCreated = true;
                } catch (_e) {
                  // Silencioso — se puede generar desde el modal/historial
                }
              } else {
                // Ya tiene envío → extraer tracking si existe
                shipmentCreated = true;
                const existingTracking = orderShipments[0]?.tracking_number;
                if (existingTracking) tracking = existingTracking;
              }

              // Intentar generar guía si hay envío
              let localPath: string | null = null;
              if (shipmentCreated) {
                try {
                  const label = await generateLabel(order.id, config.api_key_venndelo);
                  labelUrl = label.labelUrl;
                  if (label.tracking) tracking = label.tracking;
                  // Descargar localmente
                  const filename = `guia_${f.numero}.pdf`;
                  localPath = await downloadGuideLocally(labelUrl, filename);
                } catch (_e) {
                  // Silencioso — el usuario puede generar la guía desde el botón Guía
                }
              }

              // Reconciliar el flete con el valor real que cobrará Venndelo: la cotización
              // previa (factura.costo_envio) puede diferir unos pesos del flete de creación.
              // Se adopta el de Venndelo para que el total de la factura coincida con el COD.
              const reconcilia = typeof order.shippingTotal === 'number' && Number.isFinite(order.shippingTotal) && order.shippingTotal >= 0;
              const costoEnvioReal = reconcilia ? order.shippingTotal! : (f.costo_envio ?? 0);
              const totalReal = reconcilia ? (f.subtotal - (f.descuento || 0) + costoEnvioReal) : (f.total ?? 0);

              updateFacturaVenndelo(f.id, {
                venndeloOrderId: order.id,
                tracking,
                labelUrl,
                pin: order.pin,
                status: order.status,
                shipmentCreated,
                venndeloLabelLocalPath: localPath || undefined,
                ...(reconcilia ? { costoEnvio: costoEnvioReal, total: totalReal } : {})
              });

            setVenndeloResult({
              factura: {
                ...f,
                costo_envio: costoEnvioReal,
                total: totalReal,
                venndelo_order_id: order.id,
                venndelo_tracking: tracking,
                venndelo_label_url: labelUrl,
                venndelo_label_local_path: localPath,
                venndelo_pin: order.pin,
                venndelo_status: order.status
              },
              labelUrl,
              tracking
            });
            setShowVenndeloSuccess(true);
            setCreatingVenndelo(false);
          }
        }
      }

      toast.success('Factura creada: ' + f.numero);
      setShowNueva(false);
      loadData();
      resetForm();
    } catch (e) {
      toast.error('Error al crear factura');
    }
  }

  function resetForm() {
    setFormData({ cliente_id: '', cliente_nome: '', cliente_celular: '', cliente_nit: '', cliente_direccion: '' });
    setNotas('');
    setDescuento(0);
    setItems([{ tipo_item: 'inventario', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
    setTipoPedido('local');
    setBarrioMedellin('');
    setClienteApellido('');
    setClienteEmail('');
    setTipoIdentificacion('CC');
    setPaymentMethod('EXTERNAL_PAYMENT');
    setCiudadDestino('');
    setCostoEnvio(0);
    setEnvioCalculado(false);
    setVenndeloResult(null);
    setShowVenndeloSuccess(false);
  }

  async function handleAnular() {
    if (showAnular && motivoAnulacion.trim()) {
      anularFactura(showAnular.id, motivoAnulacion);

      // Si es envío nacional, cancelar el pedido en Venndelo
      if (showAnular.tipo_pedido === 'nacional' && showAnular.venndelo_order_id) {
        const config = getConfiguracion();
        if (config.api_key_venndelo) {
          try {
            await cancelOrder(showAnular.venndelo_order_id, config.api_key_venndelo);
            updateFacturaVenndelo(showAnular.id, {
              venndeloOrderId: showAnular.venndelo_order_id,
              status: 'CANCELLED'
            });
          } catch (e: any) {
            toast.warning('Factura anulada localmente, pero no se pudo cancelar en Venndelo: ' + (e?.message || e));
          }
        }
      }

      toast.success('Factura anulada correctamente');
      setShowAnular(null);
      setMotivoAnulacion('');
      loadData();
    }
  }

  const handleViewPDF = useCallback(async (factura: any) => {
    await gerarPDFFactura(factura);
  }, []);

  async function openExternalUrl(url: string) {
    try {
      await openUrl(url);
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function downloadGuideLocally(url: string, filename: string): Promise<string | null> {
    try {
      const localPath = await invoke<string>('download_guide', { url, filename });
      console.log('[Facturas] Guía descargada localmente:', localPath);
      return localPath;
    } catch (e: any) {
      console.error('[Facturas] Error descargando guía local:', e);
      return null;
    }
  }

  async function openLocalGuide(path: string, fallbackUrl?: string) {
    try {
      await openPath(path);
      return;
    } catch {
      try {
        await openUrl('file://' + path);
        return;
      } catch {}
      if (fallbackUrl) {
        toast.warning('No se pudo abrir el archivo local. Abriendo en el navegador...');
        await openExternalUrl(fallbackUrl);
        return;
      }
      toast.error('No se pudo abrir el archivo PDF. Está guardado en: ' + path);
    }
  }

  const handleViewGuia = useCallback(async (factura: any) => {
    await gerarPDFGuia(factura);
  }, []);

  async function handleRegenerateVenndeloLabel(factura: any) {
    const config = getConfiguracion();
    if (!config.api_key_venndelo) {
      toast.error('API Key de Venndelo no configurada');
      return;
    }
    const orderId = factura.venndelo_order_id;
    if (!orderId) {
      toast.error('No hay Order ID de Venndelo para esta factura');
      return;
    }
    toast.loading('Generando guía de envío desde Venndelo...', { id: 'regen-label' });
    try {
      const label = await generateLabel(orderId, config.api_key_venndelo);
      const filename = `guia_${factura.numero}.pdf`;
      const localPath = await downloadGuideLocally(label.labelUrl, filename);
      updateFacturaVenndelo(factura.id, {
        venndeloOrderId: orderId,
        labelUrl: label.labelUrl,
        tracking: label.tracking || factura.venndelo_tracking,
        venndeloLabelLocalPath: localPath || undefined
      });
      loadData();
      toast.success('¡Guía generada!', { id: 'regen-label' });
      if (localPath) {
        await openLocalGuide(localPath, label.labelUrl);
      } else {
        await openExternalUrl(label.labelUrl);
      }
    } catch (e: any) {
      toast.error('Error al generar la guía desde Venndelo: ' + (e?.message || e), { id: 'regen-label' });
    }
  }

  const handleViewVenndeloOrder = useCallback(async (factura: any) => {
    const config = getConfiguracion();

    // Obtener la factura más actualizada desde la base de datos
    const facturaActualizada = getAllFacturas().find((f: any) => f.id === factura.id);
    const orderId = facturaActualizada?.venndelo_order_id || factura.venndelo_order_id;

    if (!orderId) {
      console.warn('[Facturas] handleViewVenndeloOrder: sin venndelo_order_id', {
        facturaId: factura.id,
        facturaNumero: factura.numero,
        facturaKeys: Object.keys(factura),
        tieneOrderId: 'venndelo_order_id' in factura,
        valorOrderId: factura.venndelo_order_id
      });

      if (!config.api_key_venndelo) {
        toast.error('API Key de Venndelo no configurada');
        return;
      }

      // Intentar buscar por external_order_id (número de factura)
      toast.loading('Buscando pedido por número de factura...', { id: 'buscar-venndelo' });
      try {
        const res = await fetch(`https://api.venndelo.com/v1/admin/orders?external_id=${factura.numero}`, {
          headers: {
            'X-Venndelo-Api-Key': config.api_key_venndelo,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length > 0) {
            const found = data.items[0];
            // Guardar el ID encontrado
            updateFacturaVenndelo(factura.id, {
              venndeloOrderId: found.id,
              status: found.status,
              pin: found.pin
            });
            loadData();
            toast.success('¡Pedido encontrado y vinculado!', { id: 'buscar-venndelo' });
            // Reabrir con datos
            setVenndeloOrderInfo({ factura: { ...factura, venndelo_order_id: found.id }, order: found });
            setShowVenndeloOrder(true);
            setVenndeloOrderLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('[Facturas] error buscando orden por external_id:', e);
      }
      toast.error('No se encontró un pedido Venndelo asociado a esta factura', { id: 'buscar-venndelo' });
      return;
    }

    setVenndeloOrderInfo(null);
    setShowVenndeloOrder(true);
    setVenndeloOrderLoading(true);

    if (!config.api_key_venndelo) {
      setVenndeloOrderInfo({
        error: true,
        message: 'API Key de Venndelo no configurada',
        factura
      });
      setVenndeloOrderLoading(false);
      return;
    }

    const order = await getOrder(orderId, config.api_key_venndelo);
    setVenndeloOrderInfo({
      factura: { ...factura, venndelo_order_id: orderId },
      order,
      error: !order,
      message: !order ? 'No se pudo obtener la información desde Venndelo.' : undefined
    });
    setVenndeloOrderLoading(false);
  }, [setVenndeloOrderInfo, setShowVenndeloOrder, setVenndeloOrderLoading]);

  async function handleExportar(formato: 'excel' | 'csv') {
    const data = facturasFiltradas.map(f => ({
      Número: f.numero,
      Fecha: f.fecha,
      Cliente: f.cliente_nome,
      NIT: f.cliente_nit,
      Total: f.total,
      Estado: f.estado
    }));

    try {
      if (formato === 'excel') await exportToExcel(data, 'facturas');
      else await exportToCSV(data, 'facturas');
      setShowExport(false);
      toast.success('Exportación generada');
    } catch {
      toast.error('Error al exportar');
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
  const iva = 0;
  const total = subtotal - descuento + costoEnvio;

  const columns: DataTableColumn<Factura>[] = useMemo(() => [
    { key: 'numero', header: 'Número', sortable: true, searchable: true },
    { key: 'fecha', header: 'Fecha', sortable: true, render: (item) => new Date(item.fecha).toLocaleDateString('es-CO') },
    { key: 'cliente_nome', header: 'Cliente', sortable: true, searchable: true },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (item) => <span className="font-bold text-white">{formatCurrency(item.total)}</span>
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <Badge variant={item.estado === 'activa' ? 'success' : 'danger'}>
          {item.estado}
        </Badge>
      )
    },
    {
      key: 'envio',
      header: 'Envío',
      render: (item) => {
        if (item.tipo_pedido !== 'nacional') return <span className="text-white/20 text-xs">—</span>;
        if (item.venndelo_tracking) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-green-400 font-medium">{item.venndelo_tracking}</span>
            </div>
          );
        }
        if (item.venndelo_order_id) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-xs text-yellow-400">Pendiente</span>
            </div>
          );
        }
        return <span className="text-white/20 text-xs">—</span>;
      }
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewPDF(item)} title="Ver Factura">
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          {item.tipo_pedido !== 'nacional' && (
            <Button variant="secondary" size="sm" onClick={() => handleViewGuia(item)} title="Generar Guía de Envío Local">
              <Truck className="w-4 h-4 mr-1" /> Guía
            </Button>
          )}
          {item.tipo_pedido === 'nacional' && (
            <Button variant="secondary" size="sm" onClick={() => handleViewVenndeloOrder(item)} title="Ver detalles del pedido Venndelo">
              <Eye className="w-4 h-4 mr-1" /> Orden
            </Button>
          )}
          {item.estado === 'activa' && (
            <Button variant="danger" size="sm" onClick={() => setShowAnular(item)} title="Anular Factura">
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [handleViewPDF, handleViewGuia, handleViewVenndeloOrder]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <ReceiptText className="w-5 h-5" />
            </div>
            <h3 className="card-title">Historial de Facturación</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowExport(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" onClick={() => setShowNueva(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nueva Factura
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 bg-white/[0.01] grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-primary/50 outline-none transition-colors"
              placeholder="Buscar por número o cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <Select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            options={[
              { value: 'todas', label: 'Todos los estados' },
              { value: 'activa', label: 'Activas' },
              { value: 'anulada', label: 'Anuladas' }
            ]}
          />
          <Select
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            options={[
              { value: 'este_mes', label: 'Este mes' },
              { value: 'mes_pasado', label: 'Mes pasado' },
              { value: 'este_año', label: 'Este año' },
              { value: 'todas', label: 'Todas las fechas' },
              { value: 'rango', label: 'Rango personalizado' }
            ]}
          />
          {filtroFecha === 'rango' && (
            <div className="flex gap-2">
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white" />
            </div>
          )}
        </div>

        <DataTable
          data={facturasFiltradas}
          columns={columns}
          keyField="id"
          sortable
          paginated
          pageSize={10}
          selectable
          onSelect={(ids) => console.log('Selected:', ids)}
        />
      </div>

      <Modal
        show={showNueva}
        onClose={() => setShowNueva(false)}
        title="Crear Nueva Factura"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Seleccionar Cliente Registrado"
                value={formData.cliente_id}
                onChange={e => handleClienteSelect(e.target.value)}
                options={[
                  { value: '', label: 'Cliente Ocasional / Manual' },
                  ...dbClientes.map(c => ({ value: c.id, label: c.nome }))
                ]}
              />
              {tipoPedido === 'local' ? (
                <Input
                  label="Nombre Cliente"
                  value={formData.cliente_nome}
                  onChange={e => setFormData({ ...formData, cliente_nome: e.target.value })}
                  required
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    value={formData.cliente_nome}
                    onChange={e => setFormData({ ...formData, cliente_nome: e.target.value })}
                    required
                  />
                  <Input
                    label="Apellido"
                    value={clienteApellido}
                    onChange={e => setClienteApellido(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Teléfono" value={formData.cliente_celular} onChange={e => setFormData({ ...formData, cliente_celular: e.target.value })} />
              <div className="md:col-span-2">
                <Input label="Dirección" value={formData.cliente_direccion} onChange={e => setFormData({ ...formData, cliente_direccion: e.target.value })} />
              </div>
            </div>
            {tipoPedido === 'local' && (
              <Input
                label="Barrio"
                value={barrioMedellin}
                onChange={e => setBarrioMedellin(e.target.value)}
                placeholder="Escribe el barrio..."
              />
            )}
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 block">
              Tipo de Pedido
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTipoPedido('local'); setCostoEnvio(0); setEnvioCalculado(false); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                  tipoPedido === 'local'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                }`}
              >
                📍 Local
              </button>
              <button
                type="button"
                onClick={() => setTipoPedido('nacional')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                  tipoPedido === 'nacional'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                }`}
              >
                🚚 Nacional
              </button>
            </div>

            {tipoPedido === 'nacional' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Tipo de Identificación"
                    value={tipoIdentificacion}
                    onChange={e => setTipoIdentificacion(e.target.value as 'CC' | 'NIT')}
                    options={[
                      { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
                      { value: 'NIT', label: 'NIT' }
                    ]}
                  />
                  <Input
                    label="Número de Identificación"
                    value={formData.cliente_nit}
                    onChange={e => setFormData({ ...formData, cliente_nit: e.target.value })}
                    placeholder={tipoIdentificacion === 'CC' ? '1234567890' : '900123456-7'}
                    required
                  />
                </div>
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={clienteEmail}
                  onChange={e => setClienteEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
                <Select
                  label="Ciudad de Destino"
                  value={ciudadDestino}
                  onChange={e => { setCiudadDestino(e.target.value); setCostoEnvio(0); setEnvioCalculado(false); }}
                  options={[
                    { value: '', label: 'Seleccionar ciudad...' },
                    ...ciudades.map(c => ({
                      value: c.code,
                      label: `${c.name}${c.department ? `, ${c.department}` : ''}`
                    }))
                  ]}
                />
                {ciudadDestino && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCotizarEnvio}
                    disabled={cargandoEnvio}
                  >
                    <Truck className={`w-4 h-4 mr-2 ${cargandoEnvio ? 'animate-pulse' : ''}`} />
                    {cargandoEnvio ? 'Cotizando...' : envioCalculado ? `Envío: ${formatCurrency(costoEnvio)}` : 'Cotizar Envío'}
                  </Button>
                )}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 block">
                    💳 Método de Pago
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setPaymentMethod('EXTERNAL_PAYMENT'); setCostoEnvio(0); setEnvioCalculado(false); }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors text-left ${
                        paymentMethod === 'EXTERNAL_PAYMENT'
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span className="block font-bold">Ya Pagado</span>
                      <span className="block text-[10px] opacity-70 mt-0.5">El cliente ya pagó por otro medio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPaymentMethod('COD'); setCostoEnvio(0); setEnvioCalculado(false); }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors text-left ${
                        paymentMethod === 'COD'
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span className="block font-bold">Contra Entrega</span>
                      <span className="block text-[10px] opacity-70 mt-0.5">El transportador cobra al entregar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Detalle de Factura</h4>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Añadir Fila
              </Button>
            </div>
            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40 tracking-widest">
                  <tr>
                    <th className="px-4 py-3 text-left">Producto/Servicio</th>
                    <th className="px-4 py-3 w-20 text-center">Cant.</th>
                    <th className="px-4 py-3 w-32">Precio</th>
                    <th className="px-4 py-3 w-32 text-right">Subtotal</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 space-y-2">
                        <select
                          value={item.tipo_item}
                          onChange={e => handleSelectProducto(idx, e.target.value as 'inventario' | 'manual')}
                          className="w-full border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 outline-none"
                        >
                          <option value="manual">✏️ Escribir manualmente</option>
                          <option value="inventario">📦 Del inventario</option>
                        </select>

                        {item.tipo_item === 'manual' ? (
                          <input
                            className="w-full bg-transparent border-b border-white/10 focus:border-primary/50 py-1 text-white text-sm"
                            placeholder="Descripción del producto o servicio"
                            value={item.descripcion}
                            onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                            required
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectProducto(idx, 'inventario', 'produto')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${item.origen === 'produto' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                              >
                                <Package className="w-3 h-3 inline mr-1" /> Productos
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectProducto(idx, 'inventario', 'combo')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${item.origen === 'combo' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                              >
                                <PackagePlus className="w-3 h-3 inline mr-1" /> Combos
                              </button>
                            </div>

                            {item.origen === 'produto' && (
                              <select
                                value={item.produto_id || ''}
                                onChange={e => handleSelectProducto(idx, 'inventario', 'produto', e.target.value)}
                                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                              >
                                <option value="">Seleccionar producto...</option>
                                {productos.filter(p => p.quantidade_stock > 0 || p.quantidade_stock === undefined || p.venndelo_id).map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome} - {formatCurrency(p.preco)} {p.quantidade_stock !== undefined ? `(Stock: ${p.quantidade_stock})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}

                            {item.origen === 'combo' && (
                              <select
                                value={item.combo_id || ''}
                                onChange={e => handleSelectProducto(idx, 'inventario', 'combo', e.target.value)}
                                className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                              >
                                <option value="">Seleccionar combo...</option>
                                {combos.filter(c => c.activo && c.quantidade_stock > 0).map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome} ({c.productos.length} productos) - {formatCurrency(c.preco)} (Stock: {c.quantidade_stock})
                                  </option>
                                ))}
                              </select>
                            )}

                            {item.descripcion && (
                              <div className="text-xs text-white/60 bg-white/5 px-3 py-2 rounded-lg">
                                {item.descripcion}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white text-center" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 0)} required /></td>
                      <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white" value={item.precio} onChange={e => updateItem(idx, 'precio', parseFloat(e.target.value) || 0)} required /></td>
                      <td className="px-4 py-2 text-right font-mono text-white">{formatCurrency(item.quantidade * item.precio)}</td>
                      <td className="p-2">
                        {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400"><X className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Observaciones</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none transition-colors" />
            </div>
            <div className="w-full md:w-72 bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-3">
              <div className="flex justify-between text-white/40 text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tipoPedido === 'nacional' && (costoEnvio > 0 || cargandoEnvio) && (
                <div className="flex justify-between text-white/40 text-sm">
                  <span>Envío:</span>
                  <span className={envioCalculado ? 'text-green-400' : 'text-white/20'}>
                    {cargandoEnvio ? 'Calculando...' : formatCurrency(costoEnvio)}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Descuento Manual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
                  <input
                    type="number"
                    value={descuento}
                    onChange={e => {
                      setDescuento(parseFloat(e.target.value) || 0);
                      // El descuento cambia el valor declarado y por tanto el flete:
                      // invalidar la cotización para que se recalcule (queda en gris).
                      if (tipoPedido === 'nacional') setEnvioCalculado(false);
                    }}
                    className="w-full pl-6 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-1">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowNueva(false)}>Cancelar</Button>
            <Button type="submit" size="lg" loading={creatingVenndelo}>
              {creatingVenndelo ? 'Creando envío...' : 'Emitir Factura'}
            </Button>
          </div>
        </form>
      </Modal>

      {showAnular && (
        <Modal show={!!showAnular} onClose={() => setShowAnular(null)} title="Anular Factura" size="md">
          <div className="space-y-4">
            <p className="text-white/60">¿Deseas anular la factura <strong>{showAnular.numero}</strong>? Esta acción es irreversible.</p>
            <Input label="Motivo de Anulación" value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} required />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowAnular(null)}>Salir</Button>
              <Button variant="danger" onClick={handleAnular}>Confirmar Anulación</Button>
            </div>
          </div>
        </Modal>
      )}

      {showExport && (
        <Modal show={showExport} onClose={() => setShowExport(false)} title="Exportar Datos" size="sm">
          <div className="grid grid-cols-1 gap-3">
            <Button variant="secondary" onClick={() => handleExportar('excel')}>Exportar a Excel (.xlsx)</Button>
            <Button variant="secondary" onClick={() => handleExportar('csv')}>Exportar a CSV (.csv)</Button>
          </div>
        </Modal>
      )}

      <Modal
        show={showVenndeloSuccess}
        onClose={() => setShowVenndeloSuccess(false)}
        title="✅ Pedido Creado en Venndelo"
        size="md"
      >
        <div className="space-y-6 text-center">
          <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-white/90 text-lg font-medium">
              Factura <strong className="text-primary">{venndeloResult?.factura?.numero}</strong> creada
              y pedido registrado en <strong>Venndelo</strong> correctamente.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-white/60">
                {venndeloResult?.factura?.payment_method_code === 'COD' ? '💰 Contra Entrega' : '💳 Ya Pagado'}
              </span>
              {venndeloResult?.tracking && (
                <span className="px-3 py-1 bg-white/10 rounded-lg text-white/60">
                  📦 Tracking: <span className="text-white font-mono">{venndeloResult.tracking}</span>
                </span>
              )}
            </div>
            {!venndeloResult?.labelUrl && venndeloResult?.factura?.venndelo_order_id && (
              <p className="text-xs text-white/50 mt-4">
                Si deseas generar la guía de envío, puedes hacerlo desde el botón <strong className="text-white/70">Guía</strong> en el historial de facturas.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => venndeloResult?.factura && gerarPDFFactura(venndeloResult.factura)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Descargar PDF Factura
            </Button>
            {venndeloResult?.labelUrl ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (venndeloResult.factura?.venndelo_label_local_path) {
                    await openLocalGuide(venndeloResult.factura.venndelo_label_local_path);
                  } else {
                    await openExternalUrl(venndeloResult.labelUrl);
                  }
                }}
              >
                <Truck className="w-4 h-4 mr-2" />
                Abrir Guía de Envío
              </Button>
            ) : venndeloResult?.factura?.venndelo_order_id ? (
              <Button
                variant="ghost"
                onClick={() => openExternalUrl('https://app.venndelo.com/orders')}
              >
                <Truck className="w-4 h-4 mr-2" />
                Ir al panel de Venndelo
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-white/30">
            Puedes cerrar esta ventana y descargar los documentos después desde el historial.
          </p>
        </div>
      </Modal>

      <Modal
        show={showVenndeloOrder}
        onClose={() => setShowVenndeloOrder(false)}
        title="📦 Detalles del Pedido Venndelo"
        size="lg"
      >
        {venndeloOrderLoading ? (
          <div className="text-center py-12 text-white/40">Cargando información del pedido...</div>
        ) : venndeloOrderInfo?.error ? (
          <div className="space-y-4">
            <p className="text-white/60">
              {venndeloOrderInfo.message || 'No se pudo obtener la información del pedido desde Venndelo.'}
            </p>
            <div className="bg-surface p-4 rounded-2xl space-y-2">
              <p className="text-sm text-white/40">Order ID local:</p>
              <p className="text-sm text-white font-mono">{venndeloOrderInfo.factura?.venndelo_order_id}</p>
              {venndeloOrderInfo.factura?.venndelo_tracking && (
                <>
                  <p className="text-sm text-white/40">Tracking:</p>
                  <p className="text-sm text-white font-mono">{venndeloOrderInfo.factura.venndelo_tracking}</p>
                </>
              )}
            </div>
            <Button variant="secondary" onClick={() => openExternalUrl('https://app.venndelo.com/orders')}>
              <ExternalLink className="w-4 h-4 mr-2" /> Ir al panel de Venndelo
            </Button>
          </div>
        ) : venndeloOrderInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">Factura</p>
                <p className="text-white font-bold">{venndeloOrderInfo.factura.numero}</p>
              </div>
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">Estado en Venndelo</p>
                <Badge variant={
                  venndeloOrderInfo.order?.status === 'CONFIRMED' || venndeloOrderInfo.order?.status === 'SUCCESS'
                    ? 'success' : 'warning'
                }>
                  {venndeloOrderInfo.order?.status || 'Desconocido'}
                </Badge>
              </div>
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">Order ID</p>
                <p className="text-sm text-white font-mono text-xs break-all">
                  {venndeloOrderInfo.order?.id || venndeloOrderInfo.factura.venndelo_order_id}
                </p>
              </div>
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">PIN</p>
                <p className="text-sm text-white font-mono">
                  {venndeloOrderInfo.order?.pin || venndeloOrderInfo.factura.venndelo_pin || '—'}
                </p>
              </div>
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">Tracking</p>
                <p className="text-sm text-white font-mono">
                  {venndeloOrderInfo.order?.tracking || venndeloOrderInfo.factura.venndelo_tracking || '—'}
                </p>
              </div>
              <div className="bg-surface p-4 rounded-2xl space-y-1">
                <p className="text-xs text-white/40">Método de Pago</p>
                <p className="text-sm text-white">
                  {venndeloOrderInfo.factura.payment_method_code === 'COD' ? '💰 Contra Entrega' : '💳 Ya Pagado'}
                </p>
              </div>
            </div>

            <div className="bg-surface p-4 rounded-2xl space-y-1">
              <p className="text-xs text-white/40">Cliente</p>
              <p className="text-white">
                {venndeloOrderInfo.factura.cliente_nome} {venndeloOrderInfo.factura.cliente_apellido || ''}
              </p>
              <p className="text-sm text-white/60">{venndeloOrderInfo.factura.cliente_direccion}</p>
            </div>

            <div className="flex flex-col gap-2">
              {venndeloOrderInfo.factura.venndelo_label_url ? (
                <Button onClick={async () => {
                  if (venndeloOrderInfo.factura.venndelo_label_local_path) {
                    await openLocalGuide(venndeloOrderInfo.factura.venndelo_label_local_path, venndeloOrderInfo.factura.venndelo_label_url);
                  } else {
                    await openExternalUrl(venndeloOrderInfo.factura.venndelo_label_url);
                  }
                }}>
                  <Truck className="w-4 h-4 mr-2" /> Abrir Guía de Envío
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => {
                  setShowVenndeloOrder(false);
                  handleRegenerateVenndeloLabel(venndeloOrderInfo.factura);
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Generar Guía de Envío
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => openExternalUrl(`https://app.venndelo.com/orders/${venndeloOrderInfo.factura.venndelo_order_id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Ver en Venndelo
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

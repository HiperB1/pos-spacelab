import { useState, useEffect, useMemo } from 'react';
import { getCotizaciones, getSiguienteNumeroCotizacion, createCotizacion, getClientes, updateCotizacionEstado, deleteCotizacion, getConfiguracion, getCotizacion, getProdutos, getCombos } from '../lib/database';
import { gerarPDFCotizacion } from '../lib/pdf';
import { cotizarEnvio, getCiudadesCotizacion, CotizacionEnvioResult } from '../lib/envio';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  X, 
  Search,
  Check,
  XCircle,
  Trash2,
  Truck,
  Loader2,
  Package,
  PackagePlus
} from 'lucide-react';

interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  fecha_vencimiento: string;
  cliente_nome: string;
  cliente_nit: string;
  ciudad?: string;
  subtotal: number;
  costo_envio: number;
  total: number;
  estado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida';
}

interface ItemCotizacion {
  tipo_item: 'inventario' | 'manual';
  origen: 'produto' | 'combo';
  produto_id?: string;
  combo_id?: string;
  descripcion: string;
  quantidade: number;
  precio: number;
}

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [dbClientes, setDbClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [showNueva, setShowNueva] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [ciudades, setCiudades] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_nome: '',
    cliente_celular: '',
    cliente_nit: '',
    cliente_direccion: ''
  });
  const [notas, setNotas] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [validezDias, setValidezDias] = useState(15);
  const [items, setItems] = useState<ItemCotizacion[]>([{ tipo_item: 'manual', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
  
  const [ciudadDestino, setCiudadDestino] = useState('');
  const [subdivisionDestino, setSubdivisionDestino] = useState('');
  const [pesoKg, setPesoKg] = useState(0.5);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [cargandoEnvio, setCargandoEnvio] = useState(false);
  const [quotesDisponibles, setQuotesDisponibles] = useState<CotizacionEnvioResult[]>([]);
  const [quoteSeleccionado, setQuoteSeleccionado] = useState<CotizacionEnvioResult | null>(null);

  useEffect(() => {
    loadData();
    loadCiudades();
  }, []);

  async function loadCiudades() {
    try {
      const cities = await getCiudadesCotizacion();
      setCiudades(cities);
    } catch (e) {
      console.warn('Error loading cities:', e);
    }
  }

  function loadData() {
    setCotizaciones(getCotizaciones());
    setDbClientes(getClientes());
    setProductos(getProdutos());
    setCombos(getCombos());
  }

  const facturasFiltradas = useMemo(() => {
    let result = [...cotizaciones];
    
    if (busqueda) {
      const lower = busqueda.toLowerCase();
      result = result.filter(c => 
        c.numero.toLowerCase().includes(lower) ||
        c.cliente_nome.toLowerCase().includes(lower) ||
        c.ciudad?.toLowerCase().includes(lower) ||
        c.cliente_nit?.toLowerCase().includes(lower)
      );
    }
    
    if (filtroEstado !== 'todas') {
      result = result.filter(c => c.estado === filtroEstado);
    }
    
    return result;
  }, [cotizaciones, busqueda, filtroEstado]);

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
      }
    } else {
      setFormData({ cliente_id: '', cliente_nome: 'Consumidor Final', cliente_celular: '', cliente_nit: '', cliente_direccion: '' });
    }
  }

  function addItem() {
    setItems([...items, { tipo_item: 'manual', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  function updateItem(index: number, field: keyof ItemCotizacion, value: any) {
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

    if (tipo === 'inventario' && id) {
      if (origen === 'combo') {
        const combo = combos.find(c => c.id === id);
        newItems[index].combo_id = id;
        newItems[index].descripcion = combo ? `COMBO: ${combo.nome}` : '';
        newItems[index].precio = combo?.preco || 0;
      } else {
        const prod = productos.find(p => p.id === id);
        newItems[index].produto_id = id;
        newItems[index].descripcion = prod?.nome || '';
        newItems[index].precio = prod?.preco || 0;
      }
    }
    setItems(newItems);
  }

  async function handleCotizarEnvio() {
    const itemsValidos = items.filter((i: any) => i.descripcion && i.quantidade > 0 && i.precio > 0);
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un producto con precio antes de cotizar el envío.');
      return;
    }

    if (!ciudadDestino) {
      toast.error('Selecciona una ciudad de destino');
      return;
    }

    const config = getConfiguracion();
    if (!config.api_key_venndelo) {
      toast.error('API key de Venndelo no configurada. Configúrala en Configuración.');
      return;
    }

    setCargandoEnvio(true);
    try {
      const subtotalActual = items.reduce((sum: number, i: any) => sum + (i.quantidade * i.precio), 0);
      const quotes = await cotizarEnvio(ciudadDestino, pesoKg, subdivisionDestino, 'EXTERNAL_PAYMENT', subtotalActual);
      setQuotesDisponibles(quotes);
      
      if (quotes.length > 0) {
        const cheapest = quotes.reduce((min, q) => q.price < min.price ? q : min, quotes[0]);
        setQuoteSeleccionado(cheapest);
        setCostoEnvio(cheapest.price);
        toast.success(`Costo de envío: ${formatCurrency(cheapest.price)}`);
      } else {
        toast.warning('No hay cotizaciones disponibles para esta ciudad');
      }
    } catch (e: any) {
      console.error('Error cotizando:', e);
      toast.error(e.message || 'Error al cotizar envío');
    } finally {
      setCargandoEnvio(false);
    }
  }

  function seleccionarQuote(quote: CotizacionEnvioResult) {
    setQuoteSeleccionado(quote);
    setCostoEnvio(quote.price);
    toast.success(`Envío seleccionado: ${quote.carrier} - ${quote.service}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.descripcion && i.quantidade > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }

    const tieneCliente = formData.cliente_id || formData.cliente_nome;
    if (!tieneCliente && !ciudadDestino) {
      toast.error('Debe seleccionar un cliente o ingresar una ciudad de destino');
      return;
    }

    const itemsParaGuardar = validItems.map(item => ({
      tipo_item: item.tipo_item === 'inventario' ? item.origen : 'manual',
      produto_id: item.produto_id,
      combo_id: item.combo_id,
      descripcion: item.descripcion,
      quantidade: item.quantidade,
      precio: item.precio
    }));

    try {
      const c = createCotizacion({
        ...formData,
        items: itemsParaGuardar,
        notas,
        descuento,
        validez_dias: validezDias,
        ciudad: ciudadDestino,
        costo_envio: costoEnvio
      });
      toast.success('Cotización creada: ' + c.numero);
      setShowNueva(false);
      loadData();
      resetForm();
    } catch (e) {
      toast.error('Error al crear cotización');
    }
  }

  function resetForm() {
    setFormData({ cliente_id: '', cliente_nome: '', cliente_celular: '', cliente_nit: '', cliente_direccion: '' });
    setNotas('');
    setDescuento(0);
    setValidezDias(15);
    setItems([{ tipo_item: 'manual', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
    setCiudadDestino('');
    setSubdivisionDestino('');
    setPesoKg(0.5);
    setCostoEnvio(0);
    setQuotesDisponibles([]);
    setQuoteSeleccionado(null);
  }

  function handleCambiarEstado(id: string, nuevoEstado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida') {
    updateCotizacionEstado(id, nuevoEstado);
    toast.success(`Cotización marcada como ${nuevoEstado}`);
    loadData();
  }

  function handleEliminar(id: string) {
    if (confirm('¿Eliminar esta cotización?')) {
      deleteCotizacion(id);
      toast.success('Cotización eliminada');
      loadData();
    }
  }

  async function handleViewPDF(cotizacion: any) {
    const cotizacionCompleta = getCotizacion(cotizacion.id);
    if (cotizacionCompleta) {
      await gerarPDFCotizacion(cotizacionCompleta);
    } else {
      toast.error('Error al obtener los datos de la cotización');
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
  const total = subtotal - descuento + costoEnvio;

  const getEstadoBadge = (estado: string) => {
    const variants = {
      abierta: 'success',
      aprobada: 'info',
      rechazada: 'danger',
      vencida: 'warning'
    } as const;
    const labels = {
      abierta: 'Abierta',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      vencida: 'Vencida'
    };
    return <Badge variant={variants[estado as keyof typeof variants]}>{labels[estado as keyof typeof labels]}</Badge>;
  };

  const columns: DataTableColumn<Cotizacion>[] = useMemo(() => [
    { key: 'numero', header: 'Número', sortable: true, searchable: true },
    { key: 'fecha', header: 'Fecha', sortable: true, render: (item) => new Date(item.fecha).toLocaleDateString('es-CO') },
    { key: 'fecha_vencimiento', header: 'Válido hasta', sortable: true, render: (item) => new Date(item.fecha_vencimiento).toLocaleDateString('es-CO') },
    { key: 'cliente_nome', header: 'Cliente', sortable: true, searchable: true },
    { key: 'ciudad', header: 'Ciudad', sortable: true, render: (item) => item.ciudad || '-' },
    { 
      key: 'subtotal', 
      header: 'Subtotal', 
      sortable: true, 
      render: (item) => formatCurrency(item.subtotal)
    },
    { 
      key: 'costo_envio', 
      header: 'Envío', 
      sortable: true, 
      render: (item) => item.costo_envio > 0 ? formatCurrency(item.costo_envio) : '-'
    },
    { 
      key: 'total', 
      header: 'Total', 
      sortable: true, 
      render: (item) => <span className="font-bold text-white">{formatCurrency(item.total)}</span>
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => getEstadoBadge(item.estado)
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewPDF(item)} title="Ver PDF">
            <FileText className="w-4 h-4" />
          </Button>
          {item.estado === 'abierta' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleCambiarEstado(item.id, 'aprobada')} title="Marcar como aprobada">
                <Check className="w-4 h-4 text-green-400" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleCambiarEstado(item.id, 'rechazada')} title="Marcar como rechazada">
                <XCircle className="w-4 h-4 text-red-400" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => handleEliminar(item.id)} title="Eliminar">
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="card-title">Cotizaciones</h3>
          </div>
          <Button size="sm" onClick={() => setShowNueva(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Cotización
          </Button>
        </div>

        <div className="p-4 border-b border-white/5 bg-white/[0.01] grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-primary/50 outline-none transition-colors"
              placeholder="Buscar por número, cliente o ciudad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <Select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            options={[
              { value: 'todas', label: 'Todos los estados' },
              { value: 'abierta', label: 'Abiertas' },
              { value: 'aprobada', label: 'Aprobadas' },
              { value: 'rechazada', label: 'Rechazadas' },
              { value: 'vencida', label: 'Vencidas' }
            ]}
          />
        </div>
        
        <DataTable
          data={facturasFiltradas}
          columns={columns}
          keyField="id"
          sortable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showNueva}
        onClose={() => setShowNueva(false)}
        title="Crear Nueva Cotización"
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
                  { value: '', label: 'Cliente Ocasional (sin registro)' },
                  ...dbClientes.map(c => ({ value: c.id, label: c.nome }))
                ]}
              />
              <Input
                label="Nombre Cliente"
                value={formData.cliente_nome}
                onChange={e => setFormData({...formData, cliente_nome: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Teléfono" value={formData.cliente_celular} onChange={e => setFormData({...formData, cliente_celular: e.target.value})} />
              <Input label="NIT" value={formData.cliente_nit} onChange={e => setFormData({...formData, cliente_nit: e.target.value})} />
              <Input label="Dirección" value={formData.cliente_direccion} onChange={e => setFormData({...formData, cliente_direccion: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <div>
                  <Select
                    label="Ciudad Destino"
                    value={ciudadDestino}
                    onChange={e => {
                      const code = e.target.value;
                      setCiudadDestino(code);
                      const ciudad = ciudades.find(c => c.code === code);
                      setSubdivisionDestino(ciudad?.subdivision_code || '');
                      setCostoEnvio(0);
                      setQuotesDisponibles([]);
                      setQuoteSeleccionado(null);
                    }}
                    options={[
                      { value: '', label: 'Seleccionar ciudad...' },
                      ...ciudades.map(c => ({ value: c.code, label: `${c.name} (${c.department})` }))
                    ]}
                  />
                </div>
                <div>
                  <Input 
                    label="Peso del envío (kg)" 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    value={pesoKg} 
                    onChange={e => setPesoKg(parseFloat(e.target.value) || 0.5)} 
                  />
                </div>
                
                {ciudadDestino && (
                  <div className="col-span-1 md:col-span-2">
                    <Button 
                      type="button"
                      variant="secondary" 
                      onClick={handleCotizarEnvio}
                      disabled={cargandoEnvio || !ciudadDestino}
                      className="w-full"
                    >
                      {cargandoEnvio ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Truck className="w-4 h-4 mr-2" />
                      )}
                      {cargandoEnvio ? 'Cotizando...' : 'Calcular Costo de Envío'}
                    </Button>
                  </div>
                )}
                
                {quotesDisponibles.length > 0 && (
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                      Opciones de envío disponibles
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {quotesDisponibles.map((quote, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => seleccionarQuote(quote)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            quoteSeleccionado?.price === quote.price
                              ? 'bg-blue-500/20 border-blue-500 text-white'
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{quote.carrier}</span>
                              <span className="text-xs ml-2 opacity-60">{quote.service}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-blue-400">{formatCurrency(quote.price)}</span>
                              <span className="text-xs block opacity-60">{quote.deliveryTime}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {costoEnvio > 0 && (
                  <div className="col-span-1 md:col-span-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-green-400">Costo de envío:</span>
                      <span className="font-bold text-green-400">{formatCurrency(costoEnvio)}</span>
                    </div>
                  </div>
                )}
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Validez (días)" 
                type="number" 
                value={validezDias} 
                onChange={e => setValidezDias(parseInt(e.target.value) || 15)} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Detalle de Cotización</h4>
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
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const prod = productos[0];
                                  if (prod) handleSelectProducto(idx, 'inventario', 'produto', prod.id);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${item.origen === 'produto' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                              >
                                <Package className="w-3 h-3 inline mr-1" /> Productos
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cb = combos[0];
                                  if (cb) handleSelectProducto(idx, 'inventario', 'combo', cb.id);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${item.origen === 'combo' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                              >
                                <PackagePlus className="w-3 h-3 inline mr-1" /> Combos
                              </button>
                            </div>

                            {item.origen === 'produto' && (
                              <select
                                value={item.produto_id || ''}
                                onChange={e => handleSelectProducto(idx, 'inventario', 'produto', e.target.value)}
                                className="w-full border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 outline-none"
                              >
                                <option value="">Seleccionar producto...</option>
                                {productos.map(p => (
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
                                className="w-full border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 outline-none"
                              >
                                <option value="">Seleccionar combo...</option>
                                {combos.filter(c => c.activo).map(c => (
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
                      <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white text-center" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 0)} /></td>
                      <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white" value={item.precio} onChange={e => updateItem(idx, 'precio', parseFloat(e.target.value) || 0)} /></td>
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
              <textarea value={notas} onChange={e => setNotas(e.target.value)} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none transition-colors" />
            </div>
            <div className="w-full md:w-72 bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10 space-y-3">
              <div className="flex justify-between text-white/40 text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {costoEnvio > 0 && (
                <div className="flex justify-between text-white/40 text-sm">
                  <span>Envío:</span>
                  <span>{formatCurrency(costoEnvio)}</span>
                </div>
              )}
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Descuento</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
                  <input 
                    type="number" 
                    value={descuento} 
                    onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-1">
                <span>Total:</span>
                <span className="text-blue-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowNueva(false)}>Cancelar</Button>
            <Button type="submit" size="lg">Crear Cotización</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
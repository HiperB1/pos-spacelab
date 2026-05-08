import { useState, useEffect, useMemo } from 'react';
import { getAllFacturas, getAllClientes, createFactura, getSiguienteNumero, anularFactura } from '../lib/facturas';
import { getProdutos, getCombos } from '../lib/database';
import { gerarPDFFactura, gerarPDFGuia } from '../lib/pdf';
import { exportToExcel, exportToCSV } from '../lib/export';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { useNavigation } from '../context/NavigationContext';
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
  PackagePlus
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
  total: number;
  estado: string;
  notas?: string;
}

interface ItemFactura {
  tipo_item: 'inventario' | 'manual';
  origen: 'produto' | 'combo';
  produto_id?: string;
  combo_id?: string;
  descripcion: string;
  quantidade: number;
  precio: number;
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
    { tipo_item: 'manual', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }
  ]);

  useEffect(() => {
    loadData();
    if (pendingAction === 'new') {
      setShowNueva(true);
      setPendingAction(null);
    }
  }, [pendingAction]);

  function loadData() {
    setFacturas(getAllFacturas());
    setDbClientes(getAllClientes());
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
      }
    }
    setItems(newItems);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.descripcion && i.quantidade > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
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
      const f = createFactura({
        ...formData,
        items: itemsParaGuardar,
        notas,
        descuento
      });
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
    setItems([{ tipo_item: 'manual', origen: 'produto', descripcion: '', quantidade: 1, precio: 0 }]);
  }

  function handleAnular() {
    if (showAnular && motivoAnulacion.trim()) {
      anularFactura(showAnular.id, motivoAnulacion);
      toast.success('Factura anulada correctamente');
      setShowAnular(null);
      setMotivoAnulacion('');
      loadData();
    }
  }

  async function handleViewPDF(factura: any) {
    await gerarPDFFactura(factura);
  }

  async function handleViewGuia(factura: any) {
    await gerarPDFGuia(factura);
  }

  function handleExportar(formato: 'excel' | 'csv') {
    const data = facturasFiltradas.map(f => ({
      Número: f.numero,
      Fecha: f.fecha,
      Cliente: f.cliente_nome,
      NIT: f.cliente_nit,
      Total: f.total,
      Estado: f.estado
    }));

    if (formato === 'excel') exportToExcel(data, 'facturas.xlsx');
    else exportToCSV(data, 'facturas.csv');

    setShowExport(false);
    toast.success('Exportación generada');
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
  const iva = 0;
  const total = subtotal - descuento;

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
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewPDF(item)} title="Ver Factura">
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleViewGuia(item)} title="Generar Guía de Envío">
            <Truck className="w-4 h-4 mr-1" /> Guía
          </Button>
          {item.estado === 'activa' && (
            <Button variant="danger" size="sm" onClick={() => setShowAnular(item)} title="Anular Factura">
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ], []);

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
                  { value: '', label: 'Cliente Ocasional / Manuel' },
                  ...dbClientes.map(c => ({ value: c.id, label: c.nome }))
                ]}
              />
              <Input
                label="Nombre Cliente"
                value={formData.cliente_nome}
                onChange={e => setFormData({ ...formData, cliente_nome: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Teléfono" value={formData.cliente_celular} onChange={e => setFormData({ ...formData, cliente_celular: e.target.value })} />
              <div className="md:col-span-2">
                <Input label="Dirección" value={formData.cliente_direccion} onChange={e => setFormData({ ...formData, cliente_direccion: e.target.value })} />
              </div>
            </div>
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
                                {productos.filter(p => p.quantidade_stock > 0 || p.quantidade_stock === undefined).map(p => (
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
              <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Descuento Manual</label>
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
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowNueva(false)}>Cancelar</Button>
            <Button type="submit" size="lg">Emitir Factura</Button>
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
    </div>
  );
}

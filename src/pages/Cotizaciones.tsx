import { useState, useEffect, useMemo } from 'react';
import { getCotizaciones, getSiguienteNumeroCotizacion, createCotizacion, getClientes, updateCotizacionEstado, deleteCotizacion } from '../lib/database';
// import { gerarPDFCotizacion } from '../lib/pdf';
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
  Clock,
  Trash2,
  Copy,
  Send
} from 'lucide-react';

interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  fecha_vencimiento: string;
  cliente_nome: string;
  cliente_nit: string;
  subtotal: number;
  total: number;
  estado: 'abierta' | 'aprobada' | 'rechazada' | 'vencida';
}

interface ItemCotizacion {
  descripcion: string;
  quantidade: number;
  precio: number;
}

export function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [dbClientes, setDbClientes] = useState<any[]>([]);
  const [showNueva, setShowNueva] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  
  console.log('[Cotizaciones] Rendering, cotizaciones:', cotizaciones.length, 'showNueva:', showNueva);
  
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
  const [items, setItems] = useState<ItemCotizacion[]>([{ descripcion: '', quantidade: 1, precio: 0 }]);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setCotizaciones(getCotizaciones());
    setDbClientes(getClientes());
  }

  const facturasFiltradas = useMemo(() => {
    let result = [...cotizaciones];
    
    if (busqueda) {
      const lower = busqueda.toLowerCase();
      result = result.filter(c => 
        c.numero.toLowerCase().includes(lower) ||
        c.cliente_nome.toLowerCase().includes(lower) ||
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
    setItems([...items, { descripcion: '', quantidade: 1, precio: 0 }]);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter(i => i.descripcion && i.quantidade > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }
    
    try {
      const c = createCotizacion({
        ...formData,
        items: validItems,
        notas,
        descuento,
        validez_dias: validezDias
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
    setItems([{ descripcion: '', quantidade: 1, precio: 0 }]);
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
    // TODO: Re-enable PDF generation when pdf.ts is fixed
    toast.info('PDF no disponible temporalmente');
    // await gerarPDFCotizacion(cotizacion);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
  const total = subtotal - descuento;

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
                  { value: '', label: 'Cliente Ocasional' },
                  ...dbClientes.map(c => ({ value: c.id, label: c.nome }))
                ]}
              />
              <Input
                label="Nombre Cliente"
                value={formData.cliente_nome}
                onChange={e => setFormData({...formData, cliente_nome: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Teléfono" value={formData.cliente_celular} onChange={e => setFormData({...formData, cliente_celular: e.target.value})} />
              <Input label="NIT" value={formData.cliente_nit} onChange={e => setFormData({...formData, cliente_nit: e.target.value})} />
              <Input label="Dirección" value={formData.cliente_direccion} onChange={e => setFormData({...formData, cliente_direccion: e.target.value})} />
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
                      <td className="p-2"><input className="w-full bg-transparent border-none focus:ring-0 text-white" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} required /></td>
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
              <textarea value={notas} onChange={e => setNotas(e.target.value)} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none transition-colors" />
            </div>
            <div className="w-full md:w-72 bg-blue-500/5 p-6 rounded-3xl border border-blue-500/10 space-y-3">
              <div className="flex justify-between text-white/40 text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
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
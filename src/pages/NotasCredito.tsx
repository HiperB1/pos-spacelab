import { useState, useEffect, useMemo } from 'react';
import { getNotasCredito, createNotaCredito, getClientes, getFacturas, deleteNotaCredito } from '../lib/database';
// import { gerarPDFNotaCredito } from '../lib/pdf';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { toast } from 'sonner';
import { 
  FileText, 
  Plus, 
  X, 
  Search,
  Trash2,
  FileDown,
  Receipt
} from 'lucide-react';

interface NotaCredito {
  id: string;
  numero: string;
  fecha: string;
  factura_numero: string;
  cliente_nome: string;
  total: number;
  motivo: string;
}

interface ItemNotaCredito {
  descripcion: string;
  quantidade: number;
  precio: number;
}

const MOTIVOS = [
  { value: 'error_precio', label: 'Error en precio' },
  { value: 'devolucion_parcial', label: 'Devolución parcial' },
  { value: 'descuento_adicional', label: 'Descuento adicional' },
  { value: 'anulacion_total', label: 'Anulación de factura' },
  { value: 'otro', label: 'Otro' }
];

export function NotasCredito() {
  const [notasCredito, setNotasCredito] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [showNueva, setShowNueva] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<any>(null);
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [items, setItems] = useState<ItemNotaCredito[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setNotasCredito(getNotasCredito());
    const facs = getFacturas().filter(f => f.estado === 'activa');
    setFacturas(facs);
  }

  const notasFiltradas = useMemo(() => {
    let result = [...notasCredito];
    
    if (busqueda) {
      const lower = busqueda.toLowerCase();
      result = result.filter(nc => 
        nc.numero.toLowerCase().includes(lower) ||
        nc.factura_numero.toLowerCase().includes(lower) ||
        nc.cliente_nome.toLowerCase().includes(lower)
      );
    }
    
    return result;
  }, [notasCredito, busqueda]);

  function handleFacturaSelect(facturaId: string) {
    if (facturaId) {
      const factura = facturas.find(f => f.id === facturaId);
      if (factura) {
        setFacturaSeleccionada(factura);
        // Pre-fill items from the selected invoice
        setItems(factura.items.map((i: any) => ({
          descripcion: i.descripcion,
          quantidade: i.quantidade,
          precio: i.precio
        })));
      }
    } else {
      setFacturaSeleccionada(null);
      setItems([]);
    }
  }

  function updateItem(index: number, field: keyof ItemNotaCredito, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!facturaSeleccionada) {
      toast.error('Debe seleccionar una factura');
      return;
    }
    
    const validItems = items.filter(i => i.descripcion && i.quantidade > 0);
    if (validItems.length === 0) {
      toast.error('Debe agregar al menos un ítem válido');
      return;
    }
    
    if (!motivo) {
      toast.error('Debe seleccionar un motivo');
      return;
    }
    
    try {
      const nc = createNotaCredito({
        factura_afectada_id: facturaSeleccionada.id,
        factura_numero: facturaSeleccionada.numero,
        cliente_nome: facturaSeleccionada.cliente_nome,
        cliente_nit: facturaSeleccionada.cliente_nit,
        cliente_direccion: facturaSeleccionada.cliente_direccion,
        items: validItems,
        motivo: MOTIVOS.find(m => m.value === motivo)?.label || motivo,
        observaciones,
        descuento
      });
      toast.success('Nota crédito creada: ' + nc.numero);
      setShowNueva(false);
      loadData();
      resetForm();
    } catch (e) {
      toast.error('Error al crear nota crédito');
    }
  }

  function resetForm() {
    setFacturaSeleccionada(null);
    setMotivo('');
    setObservaciones('');
    setDescuento(0);
    setItems([]);
  }

  function handleEliminar(id: string) {
    if (confirm('¿Eliminar esta nota crédito? Esta acción es irreversible.')) {
      deleteNotaCredito(id);
      toast.success('Nota crédito eliminada');
      loadData();
    }
  }

  async function handleViewPDF(notaCredito: any) {
    // TODO: Re-enable PDF generation when pdf.ts is fixed
    toast.info('PDF no disponible temporalmente');
    // await gerarPDFNotaCredito(notaCredito);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.precio), 0);
  const total = subtotal - descuento;

  const columns: DataTableColumn<NotaCredito>[] = useMemo(() => [
    { key: 'numero', header: 'Número', sortable: true, searchable: true },
    { key: 'fecha', header: 'Fecha', sortable: true, render: (item) => new Date(item.fecha).toLocaleDateString('es-CO') },
    { key: 'factura_numero', header: 'Factura Afectada', sortable: true, searchable: true },
    { key: 'cliente_nome', header: 'Cliente', sortable: true, searchable: true },
    { 
      key: 'total', 
      header: 'Total', 
      sortable: true, 
      render: (item) => <span className="font-bold text-red-400">-{formatCurrency(item.total)}</span>
    },
    { key: 'motivo', header: 'Motivo', sortable: true },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewPDF(item)} title="Ver PDF">
            <FileDown className="w-4 h-4" />
          </Button>
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
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="card-title">Notas Crédito</h3>
          </div>
          <Button size="sm" onClick={() => setShowNueva(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nueva Nota Crédito
          </Button>
        </div>

        <div className="p-4 border-b border-white/5 bg-white/[0.01]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-primary/50 outline-none transition-colors"
              placeholder="Buscar por número, factura o cliente..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        
        <DataTable
          data={notasFiltradas}
          columns={columns}
          keyField="id"
          sortable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showNueva}
        onClose={() => { setShowNueva(false); resetForm(); }}
        title="Crear Nota Crédito"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Factura a Afectar</h4>
            <Select
              label="Seleccionar Factura"
              value={facturaSeleccionada?.id || ''}
              onChange={e => handleFacturaSelect(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar...' },
                ...facturas.map(f => ({ value: f.id, label: `${f.numero} - ${f.cliente_nome} (${formatCurrency(f.total)})` }))
              ]}
            />
            
            {facturaSeleccionada && (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-sm text-white/60">Cliente: <span className="text-white">{facturaSeleccionada.cliente_nome}</span></p>
                <p className="text-sm text-white/60">NIT: <span className="text-white">{facturaSeleccionada.cliente_nit}</span></p>
              </div>
            )}
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Motivo</h4>
            <Select
              label="Motivo de la Nota Crédito"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              options={[
                { value: '', label: 'Seleccionar...' },
                ...MOTIVOS
              ]}
            />
            <Input
              label="Observaciones"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Detalles adicionales..."
            />
          </div>

          {facturaSeleccionada && items.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Ítems a Acreditar</h4>
              <div className="rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40 tracking-widest">
                    <tr>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 w-20 text-center">Cant.</th>
                      <th className="px-4 py-3 w-32">Precio</th>
                      <th className="px-4 py-3 w-32 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2"><input className="w-full bg-transparent border-none focus:ring-0 text-white" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} /></td>
                        <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white text-center" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 0)} /></td>
                        <td className="p-2"><input type="number" className="w-full bg-transparent border-none focus:ring-0 text-white" value={item.precio} onChange={e => updateItem(idx, 'precio', parseFloat(e.target.value) || 0)} /></td>
                        <td className="px-4 py-2 text-right font-mono text-red-400">-{formatCurrency(item.quantidade * item.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {facturaSeleccionada && (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Descripción del motivo</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-primary/50 outline-none transition-colors" />
              </div>
              <div className="w-full md:w-72 bg-red-500/5 p-6 rounded-3xl border border-red-500/10 space-y-3">
                <div className="flex justify-between text-white/40 text-sm">
                  <span>Subtotal:</span>
                  <span className="text-red-400">-{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Descuento adicional</label>
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
                  <span className="text-red-400">-{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => { setShowNueva(false); resetForm(); }}>Cancelar</Button>
            <Button type="submit">Crear Nota Crédito</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
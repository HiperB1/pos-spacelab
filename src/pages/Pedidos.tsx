import { useState, useMemo } from 'react';
import { getFacturas, getDomiciliarios, addDomiciliario, despacharFactura, deleteDomiciliario } from '../lib/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { toast } from 'sonner';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  UserPlus, 
  Trash2,
  Calendar,
  User,
  Search,
  MapPin,
  Phone
} from 'lucide-react';

export function Pedidos() {
  const [tab, setTab] = useState<'pendientes' | 'despachados'>('pendientes');
  const [showDispatchModal, setShowDispatchModal] = useState<any>(null);
  const [showDomiManager, setShowDomiManager] = useState(false);
  const [newDomi, setNewDomi] = useState({ nome: '', telefono: '', placa: '' });
  const [selectedDomiId, setSelectedDomiId] = useState('');
  const [search, setSearch] = useState('');

  const facturas = useMemo(() => getFacturas(), [showDispatchModal]);
  const domiciliarios = useMemo(() => getDomiciliarios(), [showDomiManager, showDispatchModal]);

  const filtrados = useMemo(() => {
    return facturas.filter(f => {
      if (f.estado !== 'activa') return false;
      const matchStatus = tab === 'pendientes' 
        ? (!f.estado_entrega || f.estado_entrega === 'pendiente')
        : (f.estado_entrega === 'despachado');
      
      const matchSearch = search === '' || 
        f.numero.toLowerCase().includes(search.toLowerCase()) ||
        f.cliente_nome.toLowerCase().includes(search.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [facturas, tab, search]);

  const handleCreateDomi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomi.nome || !newDomi.telefono) return;
    addDomiciliario({ ...newDomi, activo: true });
    setNewDomi({ nome: '', telefono: '', placa: '' });
    toast.success('Domiciliario registrado');
  };

  const handleDispatch = () => {
    if (!selectedDomiId || !showDispatchModal) {
      toast.error('Selecciona un domiciliario');
      return;
    }
    despacharFactura(showDispatchModal.id, selectedDomiId);
    toast.success(`Pedido ${showDispatchModal.numero} despachado`);
    setShowDispatchModal(null);
    setSelectedDomiId('');
  };

  const columns: DataTableColumn<any>[] = [
    { key: 'numero', header: 'Factura #', sortable: true },
    { key: 'fecha', header: 'Fecha', render: (f) => new Date(f.fecha).toLocaleDateString('es-CO') },
    { 
      key: 'cliente_nome', 
      header: 'Cliente', 
      render: (f) => (
        <div className="flex flex-col">
          <span className="font-bold text-white uppercase">{f.cliente_nome}</span>
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {f.cliente_direccion}
          </span>
        </div>
      ) 
    },
    { 
      key: 'domiciliario', 
      header: 'Mensajero', 
      render: (f) => tab === 'despachados' ? (
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <Truck className="w-4 h-4" />
          <span>{f.domiciliario_nome}</span>
        </div>
      ) : '--'
    },
    {
      key: 'acciones',
      header: '',
      render: (f) => (
        <div className="flex justify-end gap-2">
          {tab === 'pendientes' ? (
            <Button size="sm" onClick={() => setShowDispatchModal(f)}>
              <Truck className="w-4 h-4 mr-2" /> Despachar
            </Button>
          ) : (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Despachado
            </Badge>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Gestión de Pedidos</h2>
            <p className="text-sm text-white/40">Control de entregas y domiciliarios</p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowDomiManager(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Gestionar Mensajeros
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
        <div className="flex gap-1">
          <button 
            onClick={() => setTab('pendientes')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'pendientes' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <Clock className="w-4 h-4" /> Pendientes
            <Badge variant={tab === 'pendientes' ? 'secondary' : 'outline'}>{facturas.filter(f => f.estado === 'activa' && (!f.estado_entrega || f.estado_entrega === 'pendiente')).length}</Badge>
          </button>
          <button 
            onClick={() => setTab('despachados')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'despachados' ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <CheckCircle className="w-4 h-4" /> Despachados
          </button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-indigo-500/50 outline-none transition-colors text-white"
            placeholder="Buscar por factura o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <DataTable
          data={filtrados}
          columns={columns}
          keyField="id"
          paginated
          pageSize={10}
        />
      </div>

      {/* Modal Dispatch */}
      <Modal show={!!showDispatchModal} onClose={() => setShowDispatchModal(null)} title="Despachar Pedido" size="md">
        <div className="space-y-6">
          <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Información del Envío</h4>
            <div className="space-y-1">
              <p className="text-lg font-bold text-white">Factura {showDispatchModal?.numero}</p>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <User className="w-4 h-4" /> {showDispatchModal?.cliente_nome}
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <MapPin className="w-4 h-4 text-red-400" /> {showDispatchModal?.cliente_direccion}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white/40">Seleccionar Mensajero Encargado</label>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {domiciliarios.length > 0 ? domiciliarios.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDomiId(d.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedDomiId === d.id ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedDomiId === d.id ? 'bg-white/20' : 'bg-white/5'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{d.nome}</p>
                      <p className="text-[10px] opacity-60">Placa: {d.placa || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedDomiId === d.id && <CheckCircle className="w-5 h-5" />}
                </button>
              )) : (
                <div className="text-center py-8 text-white/20 italic">No hay mensajeros registrados</div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowDispatchModal(null)}>Cancelar</Button>
            <Button size="lg" disabled={!selectedDomiId} onClick={handleDispatch}>
              Confirmar Despacho
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Manager Domiciliarios */}
      <Modal show={showDomiManager} onClose={() => setShowDomiManager(false)} title="Gestionar Mensajeros" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Registrar Nuevo Mensajero</h4>
            <form onSubmit={handleCreateDomi} className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5">
              <Input label="Nombre Completo" value={newDomi.nome} onChange={e => setNewDomi({...newDomi, nome: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Teléfono / Celular" value={newDomi.telefono} onChange={e => setNewDomi({...newDomi, telefono: e.target.value})} required />
                <Input label="Placa Vehículo" value={newDomi.placa} onChange={e => setNewDomi({...newDomi, placa: e.target.value})} />
              </div>
              <Button type="submit" className="w-full">
                <UserPlus className="w-4 h-4 mr-2" /> Agregar Mensajero
              </Button>
            </form>
          </div>

          {/* List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Lista de Mensajeros Activos</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {domiciliarios.map(d => (
                <div key={d.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                       {d.nome.charAt(0)}
                     </div>
                     <div>
                       <p className="text-sm font-bold text-white">{d.nome}</p>
                       <p className="text-[10px] text-white/40 flex items-center gap-1">
                         <Phone className="w-3 h-3" /> {d.telefono} • <Truck className="w-3 h-3" /> {d.placa || 'N/A'}
                       </p>
                     </div>
                  </div>
                  <button onClick={() => { deleteDomiciliario(d.id); toast.success('Mensajero eliminado'); }} className="text-white/20 hover:text-red-400 p-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {domiciliarios.length === 0 && (
                <div className="text-center py-12 text-white/20 italic">No hay mensajeros registrados todavía</div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

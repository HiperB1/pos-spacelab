import { useState, useMemo } from 'react';
import { getFacturas, getDomiciliarios, addDomiciliario, despacharFactura, deleteDomiciliario, getSaldosDomiciliarios, getFacturasDomiciliario, marcarFacturaPagada, addAbono, getAbonosDomiciliario } from '../lib/database';
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
  Phone,
  DollarSign,
  Wallet,
  ImagePlus,
  History
} from 'lucide-react';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export function Pedidos() {
  const [tab, setTab] = useState<'pendientes' | 'despachados' | 'saldos'>('pendientes');
  const [showDispatchModal, setShowDispatchModal] = useState<any>(null);
  const [showDomiManager, setShowDomiManager] = useState(false);
  const [showAbonoModal, setShowAbonoModal] = useState<any>(null);
  const [showComprobante, setShowComprobante] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newDomi, setNewDomi] = useState({ nome: '', telefono: '', placa: '' });
  const [selectedDomiId, setSelectedDomiId] = useState('');
  const [search, setSearch] = useState('');
  const [abonoData, setAbonoData] = useState({ monto: '', nota: '', comprobante: '' });

  const facturas = useMemo(() => getFacturas(), [showDispatchModal]);
  const domiciliarios = useMemo(() => getDomiciliarios(), [showDomiManager, showDispatchModal]);
  const saldos = useMemo(() => getSaldosDomiciliarios(), [showDispatchModal, showAbonoModal, refreshTrigger]);
  const facturasDomi = useMemo(() => showAbonoModal ? getFacturasDomiciliario(showAbonoModal.domiciliario.id) : [], [showAbonoModal, refreshTrigger]);
  const abonosDomi = useMemo(() => showAbonoModal ? getAbonosDomiciliario(showAbonoModal.domiciliario.id) : [], [showAbonoModal, refreshTrigger]);

  const filtrados = useMemo(() => {
    return facturas.filter(f => {
      if (f.estado !== 'activa') return false;
      const matchStatus = tab === 'pendientes' 
        ? (!f.estado_entrega || f.estado_entrega === 'pendiente')
        : (f.estado_entrega === 'en_despacho' || f.estado_entrega === 'despachado');
      
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
            <Badge variant={tab === 'pendientes' ? 'info' : 'warning'}>{facturas.filter(f => f.estado === 'activa' && (!f.estado_entrega || f.estado_entrega === 'pendiente')).length}</Badge>
          </button>
          <button 
            onClick={() => setTab('despachados')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'despachados' ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <CheckCircle className="w-4 h-4" /> Despachados
          </button>
          <button 
            onClick={() => setTab('saldos')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'saldos' ? 'bg-amber-500 text-white' : 'text-white/40 hover:text-white'}`}
          >
            <Wallet className="w-4 h-4" /> Saldos
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
      {tab !== 'saldos' && (
        <div className="card overflow-hidden">
          <DataTable
            data={filtrados}
            columns={columns}
            keyField="id"
            paginated
            pageSize={10}
          />
        </div>
      )}

      {/* Tab Saldos */}
      {tab === 'saldos' && (
        <div className="space-y-6">
          {saldos.length === 0 ? (
            <div className="text-center py-12 text-white/40 italic">
              No hay mensajeros con saldo pendiente
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {saldos.map(({ domiciliario, saldoPendiente, facturasPendientes }) => (
                <div 
                  key={domiciliario.id} 
                  className={`card p-6 border-2 transition-all hover:scale-[1.02] cursor-pointer ${saldoPendiente > 0 ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-emerald-500/30 hover:border-emerald-500/60'}`}
                  onClick={() => setShowAbonoModal({ domiciliario, saldoPendiente, facturasPendientes })}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${saldoPendiente > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {domiciliario.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{domiciliario.nome}</h3>
                        <p className="text-xs text-white/40 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {domiciliario.telefono}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      {saldoPendiente > 0 ? (
                        <>
                          <p className="text-xs text-white/40 uppercase tracking-wider">Saldo Pendiente</p>
                          <p className="text-2xl font-bold text-amber-400">{formatCurrency(saldoPendiente)}</p>
                          <p className="text-xs text-white/40 mt-1">{facturasPendientes} factura{facturasPendientes !== 1 ? 's' : ''} pendiente{facturasPendientes !== 1 ? 's' : ''}</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">Al día</span>
                        </div>
                      )}
                    </div>
                    {saldoPendiente > 0 && (
                      <Button size="sm" variant="secondary">
                        <DollarSign className="w-4 h-4 mr-1" /> Abonar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Modal Abonar */}
      <Modal show={!!showAbonoModal} onClose={() => { setShowAbonoModal(null); setAbonoData({ monto: '', nota: '', comprobante: '' }); }} title={`Abono - ${showAbonoModal?.domiciliario?.nome}`} size="xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
            <div>
              <p className="text-xs text-amber-400 uppercase tracking-wider">Saldo Pendiente</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(showAbonoModal?.saldoPendiente || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">{showAbonoModal?.facturasPendientes} factura{showAbonoModal?.facturasPendientes !== 1 ? 's' : ''} pendiente{showAbonoModal?.facturasPendientes !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facturas del Mensajero */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4" /> Facturas Asignadas
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {facturasDomi.map(f => (
                  <div 
                    key={f.id} 
                    className={`p-4 rounded-2xl border transition-all ${f.pagada ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { marcarFacturaPagada(f.id); setRefreshTrigger(prev => prev + 1); }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${f.pagada ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-emerald-400'}`}
                        >
                          {f.pagada && <CheckCircle className="w-4 h-4 text-white" />}
                        </button>
                        <div>
                          <p className="font-bold text-white">{f.numero}</p>
                          <p className="text-xs text-white/40">{f.cliente_nome}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${f.pagada ? 'text-emerald-400 line-through' : 'text-white'}`}>{formatCurrency(f.total)}</p>
                        <p className="text-xs text-white/40">{new Date(f.fecha).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {facturasDomi.length === 0 && (
                  <div className="text-center py-8 text-white/20 italic">No hay facturas asignadas</div>
                )}
              </div>
            </div>

            {/* Historial de Abonos */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Historial de Abonos
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 mb-4">
                {abonosDomi.map(a => (
                  <div key={a.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-emerald-400">{formatCurrency(a.monto)}</p>
                        <p className="text-xs text-white/40">{a.nota || 'Sin nota'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">{new Date(a.fecha).toLocaleDateString('es-CO')}</p>
                        {a.comprobante && (
                          <button 
                            onClick={() => a.comprobante && setShowComprobante(a.comprobante)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <ImagePlus className="w-3 h-3" /> Ver comprobante
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {abonosDomi.length === 0 && (
                  <div className="text-center py-4 text-white/20 italic text-sm">No hay abonos registrados</div>
                )}
              </div>

              {/* Formulario Abono */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!abonoData.monto || parseFloat(abonoData.monto) <= 0) {
                    toast.error('Ingresa un monto válido');
                    return;
                  }
                  addAbono({
                    domiciliario_id: showAbonoModal.domiciliario.id,
                    monto: parseFloat(abonoData.monto),
                    fecha: new Date().toISOString(),
                    nota: abonoData.nota,
                    comprobante: abonoData.comprobante
                  });
                  toast.success('Abono registrado');
                  setAbonoData({ monto: '', nota: '', comprobante: '' });
                }}
                className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5"
              >
                <p className="text-xs font-bold text-white/40 uppercase">Registrar Nuevo Abono</p>
                <Input 
                  label="Monto" 
                  type="number" 
                  value={abonoData.monto} 
                  onChange={e => setAbonoData({...abonoData, monto: e.target.value})}
                  placeholder="0"
                />
                <Input 
                  label="Nota (opcional)" 
                  value={abonoData.nota} 
                  onChange={e => setAbonoData({...abonoData, nota: e.target.value})}
                  placeholder="Ej: Abono parcial, transferencia..."
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40">Comprobante (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAbonoData({...abonoData, comprobante: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-sm text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30"
                  />
                  {abonoData.comprobante && (
                    <div className="relative inline-block">
                      <img src={abonoData.comprobante} alt="Comprobante" className="w-20 h-20 object-cover rounded-lg mt-2" />
                      <button
                        type="button"
                        onClick={() => setAbonoData({...abonoData, comprobante: ''})}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" /> Registrar Abono
                </Button>
              </form>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Comprobante */}
      <Modal show={!!showComprobante} onClose={() => setShowComprobante(null)} title="Comprobante de Pago" size="lg">
        <div className="flex justify-center">
          <img src={showComprobante || ''} alt="Comprobante" className="max-w-full max-h-[500px] rounded-lg" />
        </div>
      </Modal>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { getAllClientes, createCliente, updateCliente, deleteCliente } from '../lib/clientes';
import { exportToCSV } from '../lib/backup';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useNavigation } from '../context/NavigationContext';
import { toast } from 'sonner';
import { Users, UserPlus, FileSpreadsheet, Trash2, Edit3, Mail, Phone, MapPin } from 'lucide-react';

interface Cliente {
  id: string;
  nome: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
}

export function Clientes() {
  const { pendingAction, setPendingAction } = useNavigation();
  const [items, setItems] = useState<Cliente[]>(() => getAllClientes());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    nit: '',
    direccion: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    loadData();
    if (pendingAction === 'new') {
      openModal();
      setPendingAction(null);
    }
  }, [pendingAction]);

  function loadData() {
    setItems(getAllClientes());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        updateCliente(editing.id, formData);
        toast.success('Cliente actualizado');
      } else {
        createCliente(formData);
        toast.success('Cliente registrado exitosamente');
      }
      loadData();
      setShowModal(false);
      setEditing(null);
    } catch (e) {
      toast.error('Error al guardar cliente');
    }
  }

  function handleEdit(item: Cliente) {
    setEditing(item);
    setFormData({
      nome: item.nome,
      nit: item.nit || '',
      direccion: item.direccion || '',
      telefono: item.telefono || '',
      email: item.email || ''
    });
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (confirm('¿Eliminar este cliente definitivamente?')) {
      deleteCliente(id);
      loadData();
      toast.success('Cliente eliminado');
    }
  }

  function openModal() {
    setEditing(null);
    setFormData({ nome: '', nit: '', direccion: '', telefono: '', email: '' });
    setShowModal(true);
  }

  function handleExportCSV() {
    const cols = [
      { key: 'nome', label: 'Nombre' },
      { key: 'nit', label: 'NIT' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'email', label: 'Email' }
    ];
    exportToCSV(items, 'clientes.csv', cols);
    toast.success('Listado exportado');
  }

  const columns: DataTableColumn<Cliente>[] = useMemo(() => [
    { 
      key: 'nome', 
      header: 'Cliente', 
      sortable: true, 
      searchable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {item.nome.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-white">{item.nome}</span>
        </div>
      )
    },
    { key: 'nit', header: 'NIT/CC', sortable: true, searchable: true },
    { 
      key: 'contacto', 
      header: 'Contacto',
      render: (item) => (
        <div className="space-y-1">
          {item.telefono && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Phone className="w-3 h-3" /> {item.telefono}
            </div>
          )}
          {item.email && (
            <div className="flex items-center gap-1.5 text-xs text-white/50">
              <Mail className="w-3 h-3" /> {item.email}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'direccion', 
      header: 'Ubicación',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <MapPin className="w-3 h-3" /> {item.direccion || 'No registrada'}
        </div>
      )
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(item)}>
            <Edit3 className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="card-title">Directorio de Clientes</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" onClick={openModal}>
              <UserPlus className="w-4 h-4 mr-2" /> Nuevo Cliente
            </Button>
          </div>
        </div>
        
        <DataTable
          data={items}
          columns={columns}
          keyField="id"
          searchable
          searchPlaceholder="Buscar clientes por nombre o NIT..."
          sortable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Información del Cliente' : 'Registrar Nuevo Cliente'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre o Razón Social"
            value={formData.nome}
            onChange={e => setFormData({...formData, nome: e.target.value})}
            required
            placeholder="Ej: Juan Pérez o Empresa S.A.S"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="NIT / Cédula"
              value={formData.nit}
              onChange={e => setFormData({...formData, nit: e.target.value})}
              placeholder="123456789-0"
            />
            <Input
              label="Teléfono / Celular"
              value={formData.telefono}
              onChange={e => setFormData({...formData, telefono: e.target.value})}
              placeholder="300 123 4567"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            placeholder="cliente@ejemplo.com"
          />
          <Input
            label="Dirección de Envío/Facturación"
            value={formData.direccion}
            onChange={e => setFormData({...formData, direccion: e.target.value})}
            placeholder="Calle 123 #45-67..."
          />
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editing ? 'Actualizar Cliente' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
import { useState, useMemo } from 'react';
import { getAllSubproductos, createSubproducto, updateSubproducto, deleteSubproducto } from '../lib/subproductos';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { exportToCSV } from '../lib/backup';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { Layers, Plus, FileSpreadsheet, Trash2, Edit3 } from 'lucide-react';

interface Subproducto {
  id: string;
  nome: string;
  tipo: string;
  quantidade: number;
  custo: number;
}

export function InventarioSubproductos() {
  const [items, setItems] = useState<Subproducto[]>(() => getAllSubproductos());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subproducto | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    quantidade: 0,
    custo: 0
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        updateSubproducto(editing.id, formData);
        toast.success('Subproducto actualizado');
      } else {
        createSubproducto(formData);
        toast.success('Subproducto agregado');
      }
      setItems(getAllSubproductos());
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  }

  function handleEdit(item: Subproducto) {
    setEditing(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      quantidade: item.quantidade,
      custo: item.custo
    });
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (confirm('¿Eliminar este subproducto?')) {
      deleteSubproducto(id);
      setItems(getAllSubproductos());
      toast.success('Subproducto eliminado');
    }
  }

  function openModal() {
    setEditing(null);
    setFormData({ nome: '', tipo: '', quantidade: 0, custo: 0 });
    setShowModal(true);
  }

  const columns: DataTableColumn<Subproducto>[] = useMemo(() => [
    { key: 'nome', header: 'Nombre', sortable: true, searchable: true },
    { key: 'tipo', header: 'Tipo', sortable: true, filterable: true },
    { 
      key: 'quantidade', 
      header: 'Stock', 
      sortable: true,
      render: (item) => (
        <span className={`font-bold ${item.quantidade < 10 ? 'text-yellow-400' : 'text-blue-400'}`}>
          {item.quantidade.toLocaleString('es-CO')} uds
        </span>
      )
    },
    { 
      key: 'custo', 
      header: 'Costo Unit.', 
      sortable: true,
      render: (item) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.custo)
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

  function handleExportCSV() {
    const cols = [
      { key: 'nome', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'quantidade', label: 'Cantidad' },
      { key: 'custo', label: 'Costo' }
    ];
    exportToCSV(items, 'subproductos.csv', cols);
    toast.success('Exportación completada');
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="card-title">Inventario de Subproductos</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" onClick={openModal}>
              <Plus className="w-4 h-4 mr-2" /> Agregar Parte
            </Button>
          </div>
        </div>
        
        <DataTable
          data={items}
          columns={columns}
          keyField="id"
          searchable
          searchPlaceholder="Buscar subproductos..."
          sortable
          filterable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Subproducto' : 'Nuevo Subproducto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Subproducto"
            value={formData.nome}
            onChange={e => setFormData({...formData, nome: e.target.value})}
            required
            placeholder="Ej: Pierna Derecha - Ghost"
          />
          <Input
            label="Tipo/Categoría"
            value={formData.tipo}
            onChange={e => setFormData({...formData, tipo: e.target.value})}
            required
            placeholder="Ej: Extremidades, Torso, Base..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock inicial"
              type="number"
              value={formData.quantidade}
              onChange={e => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})}
              required
            />
            <Input
              label="Costo unitario"
              type="number"
              step="0.01"
              value={formData.custo}
              onChange={e => setFormData({...formData, custo: parseFloat(e.target.value) || 0})}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editing ? 'Guardar Cambios' : 'Crear Subproducto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
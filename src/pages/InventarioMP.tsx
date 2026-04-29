import { useState, useMemo } from 'react';
import { getAllMateriasPrimas, createMateriaPrima, updateMateriaPrima, deleteMateriaPrima } from '../lib/materias_primas';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { exportToCSV } from '../lib/backup';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { Package, Plus, FileSpreadsheet, Trash2, Edit3 } from 'lucide-react';

interface MateriaPrima {
  id: string;
  nome: string;
  tipo: string;
  color: string;
  fornecedor: string;
  quantidade_kg: number;
  preco_kg: number;
}

export function InventarioMP() {
  const [items, setItems] = useState<MateriaPrima[]>(() => getAllMateriasPrimas());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MateriaPrima | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    color: '',
    fornecedor: '',
    quantidade_kg: 0,
    preco_kg: 0
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        updateMateriaPrima(editing.id, formData);
        toast.success('Materia prima actualizada');
      } else {
        createMateriaPrima(formData);
        toast.success('Materia prima agregada');
      }
      setItems(getAllMateriasPrimas());
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  }

  function handleEdit(item: MateriaPrima) {
    setEditing(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      color: item.color || '',
      fornecedor: item.fornecedor || '',
      quantidade_kg: item.quantidade_kg,
      preco_kg: item.preco_kg
    });
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (confirm('¿Eliminar esta materia prima?')) {
      deleteMateriaPrima(id);
      setItems(getAllMateriasPrimas());
      toast.success('Materia prima eliminada');
    }
  }

  function openModal() {
    setEditing(null);
    setFormData({ nome: '', tipo: '', color: '', fornecedor: '', quantidade_kg: 0, preco_kg: 0 });
    setShowModal(true);
  }

  const columns: DataTableColumn<MateriaPrima>[] = useMemo(() => [
    { key: 'nome', header: 'Nombre', sortable: true, searchable: true },
    { key: 'tipo', header: 'Tipo', sortable: true, filterable: true },
    { key: 'color', header: 'Color' },
    { key: 'fornecedor', header: 'Proveedor' },
    { 
      key: 'quantidade_kg', 
      header: 'Stock (kg)', 
      sortable: true,
      render: (item) => (
        <span className={`font-bold ${item.quantidade_kg < 5 ? 'text-red-400' : 'text-green-400'}`}>
          {item.quantidade_kg.toLocaleString('es-CO')} kg
        </span>
      )
    },
    { 
      key: 'preco_kg', 
      header: 'Precio/kg', 
      sortable: true,
      render: (item) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.preco_kg)
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
      { key: 'color', label: 'Color' },
      { key: 'fornecedor', label: 'Proveedor' },
      { key: 'quantidade_kg', label: 'Cantidad (kg)' },
      { key: 'preco_kg', label: 'Precio/kg' }
    ];
    exportToCSV(items, 'materias-primas.csv', cols);
    toast.success('Exportación completada');
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="card-title">Inventario de Materias Primas</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" onClick={openModal}>
              <Plus className="w-4 h-4 mr-2" /> Agregar Material
            </Button>
          </div>
        </div>
        
        <DataTable
          data={items}
          columns={columns}
          keyField="id"
          searchable
          searchPlaceholder="Buscar materiales..."
          sortable
          filterable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Material' : 'Nuevo Material'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Material"
            value={formData.nome}
            onChange={e => setFormData({...formData, nome: e.target.value})}
            required
            placeholder="Ej: Filamento PLA Turquesa"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tipo/Material"
              value={formData.tipo}
              onChange={e => setFormData({...formData, tipo: e.target.value})}
              required
              placeholder="PLA, PETG, ABS..."
            />
            <Input
              label="Color"
              value={formData.color}
              onChange={e => setFormData({...formData, color: e.target.value})}
              placeholder="Sólido, Translúcido..."
            />
          </div>
          <Input
            label="Proveedor"
            value={formData.fornecedor}
            onChange={e => setFormData({...formData, fornecedor: e.target.value})}
            placeholder="Nombre del proveedor"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad inicial (kg)"
              type="number"
              step="0.01"
              value={formData.quantidade_kg}
              onChange={e => setFormData({...formData, quantidade_kg: parseFloat(e.target.value) || 0})}
              required
            />
            <Input
              label="Precio por kg"
              type="number"
              step="0.01"
              value={formData.preco_kg}
              onChange={e => setFormData({...formData, preco_kg: parseFloat(e.target.value) || 0})}
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editing ? 'Guardar Cambios' : 'Crear Material'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
import { useState } from 'react';
import { getAllSubproductos, createSubproducto, updateSubproducto, deleteSubproducto } from '../lib/subproductos';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { exportToCSV } from '../lib/backup';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { toast } from 'sonner';
import { Layers, Plus, FileSpreadsheet, Trash2, Edit3 } from 'lucide-react';
import type { Subproducto } from '../lib/types';

export function InventarioSubproductos() {
  const [items, setItems] = useState<Subproducto[]>(() => getAllSubproductos());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subproducto | null>(null);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: '',
    quantidade: 0,
    custo: 0
  });

  const columns: DataTableColumn<Subproducto>[] = [
    { key: 'codigo', header: 'Código', sortable: true },
    { key: 'nome', header: 'Nombre', sortable: true },
    { key: 'tipo', header: 'Tipo', sortable: true },
    { key: 'quantidade', header: 'Stock', sortable: true, render: (item) => item.quantidade || 0 },
    { key: 'custo', header: 'Costo', sortable: true, render: (item) => `$${item.custo?.toLocaleString('es-CO')}` },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      )
    },
  ];

  function handleEdit(item: Subproducto) {
    setEditing(item);
    setFormData({
      codigo: item.codigo || '',
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
    setFormData({ codigo: '', nome: '', tipo: '', quantidade: 0, custo: 0 });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dataToSave = {
      nome: formData.nome,
      tipo: formData.tipo,
      quantidade: formData.quantidade,
      custo: formData.custo,
      codigo: formData.codigo || undefined
    };
    try {
      if (editing) {
        updateSubproducto(editing.id, dataToSave);
        toast.success('Subproducto actualizado');
      } else {
        createSubproducto(dataToSave);
        toast.success('Subproducto agregado');
      }
      setItems(getAllSubproductos());
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  }

  function handleExportCSV() {
    exportToCSV(items, 'subproductos', [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'quantidade', label: 'Stock' },
      { key: 'custo', label: 'Costo' }
    ]);
    toast.success('Exportado a CSV');
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
              <Plus className="w-4 h-4 mr-2" /> Agregar Subproducto
            </Button>
          </div>
        </div>
        
        <DataTable<Subproducto>
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código / SKU"
              value={formData.codigo}
              onChange={e => setFormData({...formData, codigo: e.target.value})}
              placeholder="Ej: SP-GHOST-PD"
            />
            <Input
              label="Nombre del Subproducto"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              required
              placeholder="Ej: Pierna Derecha - Ghost"
            />
          </div>
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
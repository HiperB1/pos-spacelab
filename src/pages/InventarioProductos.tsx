import { useState, useEffect, useMemo } from 'react';
import { getAllSubproductos } from '../lib/subproductos';
import { getProdutos, addProduto, updateProductRow, deleteProductRow, addComponente, removeComponente, getComponentesByProducto } from '../lib/productos';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { exportToCSV } from '../lib/backup';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { toast } from 'sonner';
import { useNavigation } from '../context/NavigationContext';
import { Box, Plus, FileSpreadsheet, Trash2, Edit3, Settings2, RefreshCw } from 'lucide-react';
import { getConfiguracion } from '../lib/database';
import { sincronizarProductosVenndelo, getVenndeloLastSync } from '../lib/venndelo';

interface Produto {
  id: string;
  codigo?: string;
  nome: string;
  descripcion: string;
  categoria?: string;
  tags?: string[];
  preco: number;
  custo: number;
  quantidade_stock?: number;
  venndelo_id?: string;
}

export function InventarioProductos() {
  const { pendingAction, setPendingAction } = useNavigation();
  const [items, setItems] = useState<Produto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showComponentes, setShowComponentes] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descripcion: '',
    categoria: '',
    tags: '',
    preco: 0,
    custo: 0
  });
  const [componentes, setComponentes] = useState<any[]>([]);
  const [nuevoComponente, setNuevoComponente] = useState({ subproductoId: '', quantidade: 1 });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => getVenndeloLastSync());

  useEffect(() => {
    loadData();
    if (pendingAction === 'new') {
      openModal();
      setPendingAction(null);
    }
  }, [pendingAction]);

  function loadData() {
    setItems(getProdutos());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const dataToSave = {
      nome: formData.nome,
      descripcion: formData.descripcion,
      preco: formData.preco,
      custo: formData.custo,
      codigo: formData.codigo || undefined,
      categoria: formData.categoria || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined
    };
    
    try {
      if (editing) {
        updateProductRow(editing.id, dataToSave);
        toast.success('Producto actualizado');
      } else {
        addProduto(dataToSave);
        toast.success('Producto creado');
      }
      loadData();
      setShowModal(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  }

  function handleEdit(item: Produto) {
    setEditing(item);
    setFormData({
      codigo: item.codigo || '',
      nome: item.nome,
      descripcion: item.descripcion || '',
      categoria: item.categoria || '',
      tags: item.tags?.join(', ') || '',
      preco: item.preco,
      custo: item.custo
    });
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (confirm('¿Eliminar este producto?')) {
      deleteProductRow(id);
      loadData();
      toast.success('Producto eliminado');
    }
  }

function openModal() {
    setEditing(null);
    setFormData({ codigo: '', nome: '', descripcion: '', categoria: '', tags: '', preco: 0, custo: 0 });
    setShowModal(true);
  }

  function openComponentes(item: Produto) {
    setSelectedProd(item);
    setComponentes(getComponentesByProducto(item.id));
    setShowComponentes(true);
  }

  function handleExportCSV() {
    const dataToExport = items.map(p => ({
      Nombre: p.nome,
      Descripción: p.descripcion,
      Precio: p.preco,
      Costo: p.custo,
      Stock: p.quantidade_stock || 0
    }));
    const cols = [
      { key: 'Nombre', label: 'Nombre' },
      { key: 'Descripción', label: 'Descripción' },
      { key: 'Precio', label: 'Precio' },
      { key: 'Costo', label: 'Costo' },
      { key: 'Stock', label: 'Stock' }
    ];
    exportToCSV(dataToExport, 'productos.csv', cols);
    toast.success('Exportación completada');
  }

  async function handleSyncVenndelo() {
    const config = getConfiguracion();
    if (!config.api_key_venndelo) {
      toast.error('API key de Venndelo no configurada. Ve a Configuración para agregarla.');
      return;
    }
    setSyncing(true);
    try {
      const result = await sincronizarProductosVenndelo();
      setLastSync(getVenndeloLastSync());
      loadData();
      toast.success(
        `Sincronización completa: ${result.creados} creados, ${result.actualizados} actualizados (${result.total} en Venndelo)`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al sincronizar con Venndelo: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }

  function handleAddComponente() {
    if (!selectedProd || !nuevoComponente.subproductoId) return;
    addComponente(selectedProd.id, nuevoComponente.subproductoId, nuevoComponente.quantidade);
    setComponentes(getComponentesByProducto(selectedProd.id));
    setNuevoComponente({ subproductoId: '', quantidade: 1 });
    toast.success('Componente añadido');
  }

  function handleRemoveComponente(id: string) {
    removeComponente(id);
    if (selectedProd) {
      setComponentes(getComponentesByProducto(selectedProd.id));
    }
    toast.success('Componente eliminado');
  }

  const subproductos = getAllSubproductos();

  const columns: DataTableColumn<Produto>[] = useMemo(() => [
    { key: 'codigo', header: 'SKU', sortable: true, searchable: true },
    { key: 'nome', header: 'Nombre', sortable: true, searchable: true },
    { key: 'categoria', header: 'Categoría', sortable: true, filterable: true },
    { 
      key: 'preco', 
      header: 'Precio', 
      sortable: true,
      render: (item) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.preco)
    },
    {
      key: 'quantidade_stock',
      header: 'Stock',
      sortable: true,
      render: (item) => (
        <span className="font-bold text-white/80">
          {(item.quantidade_stock || 0).toLocaleString('es-CO')} uds
        </span>
      )
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openComponentes(item)}>
            <Settings2 className="w-4 h-4 mr-1" /> Partes
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleEdit(item)}>
            <Edit3 className="w-4 h-4" />
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
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Box className="w-5 h-5" />
            </div>
            <h3 className="card-title">Productos Terminados</h3>
          </div>
          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="text-xs text-white/30 hidden sm:block">
                Sync: {new Date(lastSync).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={handleSyncVenndelo} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar con Venndelo'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button size="sm" onClick={openModal}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </Button>
          </div>
        </div>
        
        <DataTable
          data={items}
          columns={columns}
          keyField="id"
          searchable
          searchPlaceholder="Buscar productos..."
          sortable
          paginated
          pageSize={10}
        />
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
      >
<form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código / SKU"
              value={formData.codigo}
              onChange={e => setFormData({...formData, codigo: e.target.value})}
              placeholder="Ej: GS-001"
            />
            <Input
              label="Nombre del Producto"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              required
              placeholder="Ej: Ghost Articulado 15cm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Categoría"
              value={formData.categoria}
              onChange={e => setFormData({...formData, categoria: e.target.value})}
              placeholder="Ej: Figuras, Collares, Llaveros"
            />
            <Input
              label="Tags"
              value={formData.tags}
              onChange={e => setFormData({...formData, tags: e.target.value})}
              placeholder="Ej: popular, navidad, promo"
            />
          </div>
          <Input
            label="Descripción"
            value={formData.descripcion}
            onChange={e => setFormData({...formData, descripcion: e.target.value})}
placeholder="Detalles adicionales..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio de Venta"
              type="number"
              value={formData.preco}
              onChange={e => setFormData({...formData, preco: parseFloat(e.target.value) || 0})}
              required
            />
            <Input
              label="Costo de Producción"
              type="number"
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
              {editing ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        show={showComponentes}
        onClose={() => setShowComponentes(false)}
        title={`Componentes: ${selectedProd?.nome}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4">Añadir Componente Necesario</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  label="Subproducto"
                  value={nuevoComponente.subproductoId}
                  onChange={e => setNuevoComponente({...nuevoComponente, subproductoId: e.target.value})}
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    ...subproductos.map(s => ({ value: s.id, label: s.nome }))
                  ]}
                />
              </div>
              <div className="w-32">
                <Input
                  label="Cantidad"
                  type="number"
                  min="1"
                  value={nuevoComponente.quantidade}
                  onChange={e => setNuevoComponente({...nuevoComponente, quantidade: parseInt(e.target.value) || 1})}
                />
              </div>
              <Button onClick={handleAddComponente}>
                <Plus className="w-5 h-5 mr-1" /> Añadir
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/40 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">Subproducto</th>
                  <th className="px-6 py-4">Cantidad Necesaria</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {componentes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-white/20 italic">
                      No hay componentes definidos para este producto.
                    </td>
                  </tr>
                ) : (
                  componentes.map((c: any) => (
                    <tr key={c.id} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-4 text-white font-medium">{c.subproduto_nome}</td>
                      <td className="px-6 py-4 text-white/60">{c.quantidade_necesaria} uds</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRemoveComponente(c.id)}
                          className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowComponentes(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
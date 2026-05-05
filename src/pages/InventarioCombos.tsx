import { useState, useEffect } from 'react';
import { getCombos, getCombo, addCombo, updateCombo, deleteCombo, getProdutos } from '../lib/database';
import { DataTable, DataTableColumn } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { toast } from 'sonner';
import { useNavigation } from '../context/NavigationContext';
import { Package, Plus, Trash2, Edit3, Search, X, PackagePlus } from 'lucide-react';
import type { Combo, ComboProducto, Produto } from '../lib/types';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function InventarioCombos() {
  const { pendingAction, setPendingAction } = useNavigation();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [productos, setProductos] = useState<Produto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [busqueda, setBusqueda] = useState('');

const [formData, setFormData] = useState({
    nome: '',
    descripcion: '',
    preco: 0,
    quantidade_stock: 0,
    stock_minimo: 0,
    activo: true
  });

  const [productosSeleccionados, setProductosSeleccionados] = useState<ComboProducto[]>([]);
  const [productoBusqueda, setProductoBusqueda] = useState('');

  useEffect(() => {
    loadData();
    if (pendingAction === 'new') {
      openModal();
      setPendingAction(null);
    }
  }, [pendingAction]);

  function loadData() {
    setCombos(getCombos(true));
    setProductos(getProdutos());
  }

  const combosFiltrados = busqueda
    ? combos.filter(c => c.nome.toLowerCase().includes(busqueda.toLowerCase()))
    : combos;

  function openModal( combo?: Combo) {
    if (combo) {
      setEditing(combo);
      setFormData({
        nome: combo.nome,
        descripcion: combo.descripcion,
        preco: combo.preco,
        quantidade_stock: combo.quantidade_stock,
        stock_minimo: combo.stock_minimo || 0,
        activo: combo.activo
      });
      setProductosSeleccionados(combo.productos);
    } else {
      setEditing(null);
      setFormData({ nome: '', descripcion: '', preco: 0, quantidade_stock: 0, stock_minimo: 0, activo: true });
      setProductosSeleccionados([]);
    }
    setShowModal(true);
  }

  function getPrecioCalculado(): number {
    return productosSeleccionados.reduce((sum, p) => {
      const prod = productos.find(pr => pr.id === p.produto_id);
      return sum + (prod?.preco || 0) * p.quantidade;
    }, 0);
  }

  function agregarProducto(produtoId: string) {
    const existente = productosSeleccionados.find(p => p.produto_id === produtoId);
    if (existente) {
      setProductosSeleccionados(productosSeleccionados.map(p =>
        p.produto_id === produtoId ? { ...p, quantidade: p.quantidade + 1 } : p
      ));
    } else {
      setProductosSeleccionados([...productosSeleccionados, { produto_id: produtoId, quantidade: 1 }]);
    }
    setProductoBusqueda('');
  }

  function quitarProducto(produtoId: string) {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.produto_id !== produtoId));
  }

  function actualizarCantidad(produtoId: string, quantidade: number) {
    if (quantidade <= 0) {
      quitarProducto(produtoId);
      return;
    }
    setProductosSeleccionados(productosSeleccionados.map(p =>
      p.produto_id === produtoId ? { ...p, quantidade } : p
    ));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (productosSeleccionados.length < 2) {
      toast.error('El combo debe tener al menos 2 productos');
      return;
    }

    const dataToSave = {
      nome: formData.nome,
      descripcion: formData.descripcion,
      productos: productosSeleccionados,
      preco: formData.preco,
      quantidade_stock: formData.quantidade_stock,
      stock_minimo: formData.stock_minimo || undefined,
      activo: formData.activo
    };

    try {
      if (editing) {
        updateCombo(editing.id, dataToSave);
        toast.success('Combo actualizado');
      } else {
        addCombo(dataToSave);
        toast.success('Combo creado');
      }
      loadData();
      setShowModal(false);
    } catch (error) {
      toast.error('Error al guardar');
    }
  }

  function handleDelete(id: string) {
    if (confirm('¿Inactivar este combo?')) {
      deleteCombo(id);
      toast.success('Combo inactivado');
      loadData();
    }
  }

  const productosFiltrados = productoBusqueda
    ? productos.filter(p => p.nome.toLowerCase().includes(productoBusqueda.toLowerCase()))
    : productos;

  const columns: DataTableColumn<Combo>[] = [
    { key: 'nome', header: 'Nombre', render: row => <span className="font-semibold">{row.nome}</span> },
    { key: 'productos', header: 'Productos', render: row => (
      <span className="text-white/60 text-sm">{row.productos.length} productos</span>
    )},
    { key: 'preco', header: 'Precio', render: row => (
      <span className="text-primary font-mono">{formatCurrency(row.preco)}</span>
    )},
    { key: 'quantidade_stock', header: 'Stock', render: row => (
      <span className={`font-mono ${row.quantidade_stock <= (row.stock_minimo || 0) ? 'text-red-400' : ''}`}>
        {row.quantidade_stock}
      </span>
    )},
    { key: 'activo', header: 'Estado', render: row => (
      <span className={`text-xs px-2 py-1 rounded-full ${row.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {row.activo ? 'Activo' : 'Inactivo'}
      </span>
    )}
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Combos
          </h2>
          <p className="text-white/40 text-sm mt-1">Gestión de paquetes y combinaciones de productos</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Combo
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <Search className="w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Buscar combos..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 flex-1"
        />
      </div>

      <DataTable
        columns={columns}
        data={combosFiltrados}
        keyField="id"
      />

      <Modal show={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Combo' : 'Nuevo Combo'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.nome}
              onChange={e => setFormData({ ...formData, nome: e.target.value })}
              required
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Precio"
                  type="number"
                  value={formData.preco}
                  onChange={e => setFormData({ ...formData, preco: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <span className="text-white/40 text-sm pb-3">
                Sugerido: {formatCurrency(getPrecioCalculado())}
              </span>
            </div>
          </div>

          <Input
            label="Descripción"
            value={formData.descripcion}
            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Stock"
              type="number"
              value={formData.quantidade_stock}
              onChange={e => setFormData({ ...formData, quantidade_stock: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Stock Mínimo"
              type="number"
              value={formData.stock_minimo}
              onChange={e => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
            />
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary"
                />
                <span className="text-white/60">Combo activo</span>
              </label>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Productos del Combo</h4>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar producto para agregar..."
                value={productoBusqueda}
                onChange={e => setProductoBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-primary/50 outline-none"
              />
              {productoBusqueda && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-white/10 rounded-xl max-h-48 overflow-auto">
                  {productosFiltrados
                    .filter(p => !productosSeleccionados.some(ps => ps.produto_id === p.id))
                    .slice(0, 10)
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => agregarProducto(p.id)}
                        className="w-full px-4 py-2 text-left text-white hover:bg-white/5 flex justify-between items-center"
                      >
                        <span>{p.nome}</span>
                        <span className="text-white/40 text-sm">{formatCurrency(p.preco)}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {productosSeleccionados.length > 0 ? (
              <div className="space-y-2">
                {productosSeleccionados.map(p => {
                  const prod = productos.find(pr => pr.id === p.produto_id);
                  return (
                    <div key={p.produto_id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                      <PackagePlus className="w-5 h-5 text-primary" />
                      <span className="flex-1 text-white">{prod?.nome}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(p.produto_id, p.quantidade - 1)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-white">{p.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(p.produto_id, p.quantidade + 1)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-white/60 text-sm w-24 text-right">
                        {formatCurrency((prod?.preco || 0) * p.quantidade)}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarProducto(p.produto_id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                  <span className="text-white/40">Precio calculado:</span>
                  <span className="text-primary font-mono">{formatCurrency(getPrecioCalculado())}</span>
                </div>
              </div>
            ) : (
              <p className="text-white/40 text-sm text-center py-4">
                Agrega al menos 2 productos al combo
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editing ? 'Actualizar' : 'Crear'} Combo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
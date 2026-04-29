import { useState, useEffect } from 'react';
import { getMovimientos } from '../lib/inventarioMovimientos';
import type { InventarioMovimiento } from '../lib/types';
import { Filter, X } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function HistorialInventario() {
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroTabla, setFiltroTabla] = useState<string>('');
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    cargarMovimientos();
  }, [filtroTipo, filtroTabla, filtroFecha]);

  function cargarMovimientos() {
    const filtros: any = {};
    if (filtroTabla) filtros.tabla = filtroTabla;
    if (filtroFecha) filtros.fechaDesde = filtroFecha;
    
    const results = getMovimientos(filtros);
    
    let filtered = results;
    if (filtroTipo) {
      filtered = filtered.filter(m => m.tipo === filtroTipo);
    }
    
    setMovimientos(filtered);
  }

  function limpiarFiltros() {
    setFiltroTipo('');
    setFiltroTabla('');
    setFiltroFecha('');
  }

  const tieneFiltros = filtroTipo || filtroTabla || filtroFecha;

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Historial de Inventario</h3>
          <Button 
            variant={tieneFiltros ? 'primary' : 'secondary'}
            onClick={() => setShowFiltros(!showFiltros)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        {showFiltros && (
          <div className="filters-bar">
            <div className="filter-group">
              <label>Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Tabla</label>
              <select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)}>
                <option value="">Todas</option>
                <option value="materias_primas">Materias Primas</option>
                <option value="subproductos">Subproductos</option>
                <option value="productos">Productos</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Desde fecha</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
              />
            </div>
            {tieneFiltros && (
              <Button variant="secondary" onClick={limpiarFiltros}>
                <X className="w-4 h-4 mr-1" /> Limpiar
              </Button>
            )}
          </div>
        )}

        {movimientos.length === 0 ? (
          <div className="empty">No hay movimientos registrados.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Tabla</th>
                <th>Registro</th>
                <th>Campo</th>
                <th>Anterior</th>
                <th>Nuevo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('es-CO', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                  <td>
                    <span className={`badge badge-${m.tipo === 'entrada' ? 'success' : m.tipo === 'salida' ? 'danger' : 'warning'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td>{m.tabla.replace('_', ' ')}</td>
                  <td>{m.registro_nombre}</td>
                  <td>{m.campo}</td>
                  <td>{String(m.valor_anterior)}</td>
                  <td>{String(m.valor_nuevo)}</td>
                  <td>{m.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
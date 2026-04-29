import { useState } from 'react';
import { InventarioMP } from './InventarioMP';
import { InventarioSubproductos } from './InventarioSubproductos';
import { InventarioProductos } from './InventarioProductos';

type TabType = 'mp' | 'subproductos' | 'productos';

export function Inventario() {
  const [activeTab, setActiveTab] = useState<TabType>('mp');

  return (
    <div className="page">
      <h2>Inventario</h2>
      <div className="tab-buttons">
        <button 
          className={`tab-btn ${activeTab === 'mp' ? 'active' : ''}`}
          onClick={() => setActiveTab('mp')}
        >
          Materias Primas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'subproductos' ? 'active' : ''}`}
          onClick={() => setActiveTab('subproductos')}
        >
          Subproductos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Productos Terminados
        </button>
      </div>

      {activeTab === 'mp' && <InventarioMP />}
      {activeTab === 'subproductos' && <InventarioSubproductos />}
      {activeTab === 'productos' && <InventarioProductos />}
    </div>
  );
}
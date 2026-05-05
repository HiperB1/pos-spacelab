import { useState } from 'react';
import { InventarioMP } from './InventarioMP';
import { InventarioSubproductos } from './InventarioSubproductos';
import { InventarioProductos } from './InventarioProductos';
import { InventarioCombos } from './InventarioCombos';

type TabType = 'mp' | 'subproductos' | 'productos' | 'combos';

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
        <button 
          className={`tab-btn ${activeTab === 'combos' ? 'active' : ''}`}
          onClick={() => setActiveTab('combos')}
        >
          Combos
        </button>
      </div>

      {activeTab === 'mp' && <InventarioMP />}
      {activeTab === 'subproductos' && <InventarioSubproductos />}
      {activeTab === 'productos' && <InventarioProductos />}
      {activeTab === 'combos' && <InventarioCombos />}
    </div>
  );
}
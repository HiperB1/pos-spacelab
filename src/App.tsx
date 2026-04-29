import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventario } from './pages/Inventario';
import { Disponibilidad } from './pages/Disponibilidad';
import { Clientes } from './pages/Clientes';
import { Facturas } from './pages/Facturas';
import { Pedidos } from './pages/Pedidos';
import { Reportes } from './pages/Reportes';
import { HistorialInventario } from './pages/HistorialInventario';
import { ConfiguracionPage } from './pages/Configuracion';
import { initDatabase } from './lib/database';
import { Toaster } from 'sonner';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import './components/styles.css';

function AppContent() {
  const { activeTab, setActiveTab } = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
      } catch (e) {
        console.error('Error initializing database:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a1a] text-white">
        <div className="w-10 h-10 border-3 border-white/10 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium tracking-widest uppercase opacity-50">Cargando Sistema...</p>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={(tab: any) => setActiveTab(tab)}>
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'inventario' && <Inventario />}
      {activeTab === 'disponibilidad' && <Disponibilidad />}
      {activeTab === 'clientes' && <Clientes />}
      {activeTab === 'pedidos' && <Pedidos />}
      {activeTab === 'facturas' && <Facturas />}
      {activeTab === 'reportes' && <Reportes />}
      {activeTab === 'historial' && <HistorialInventario />}
      {activeTab === 'configuracion' && <ConfiguracionPage />}
    </Layout>
  );
}

function App() {
  return (
    <NavigationProvider>
      <AppContent />
      <Toaster position="top-right" theme="dark" closeButton richColors />
    </NavigationProvider>
  );
}

export default App;
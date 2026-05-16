import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventario } from './pages/Inventario';
import { Disponibilidad } from './pages/Disponibilidad';
import { Facturas } from './pages/Facturas';
import { Pedidos } from './pages/Pedidos';
import { Reportes } from './pages/Reportes';
import { HistorialInventario } from './pages/HistorialInventario';
import { ConfiguracionPage } from './pages/Configuracion';
import { Cotizaciones } from './pages/Cotizaciones';
import { NotasCredito } from './pages/NotasCredito';
import { initDatabase, getConfiguracion } from './lib/database';
import { sincronizarProductosVenndelo, shouldAutoSync } from './lib/venndelo';
import { Toaster, toast } from 'sonner';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { GlobalSearch } from './components/ui/GlobalSearch';
import { KeyboardShortcutsGuide } from './components/ui/KeyboardShortcuts';
import { ChangelogModal } from './components/ChangelogModal';
import './components/styles.css';

function AppContent() {
  console.log('[APP] Starting AppContent');
  const { activeTab, setActiveTab } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  function handleCloseChangelog() {
    if (currentVersion) {
      localStorage.setItem('dg_last_version_seen', currentVersion);
    }
    setShowChangelog(false);
  }

  useEffect(() => {
    console.log('[APP] Initializing database...');
    async function init() {
      try {
        await initDatabase();
        console.log('[APP] Database initialized');
      } catch (e) {
        console.error('[APP] Error initializing database:', e);
      } finally {
        setLoading(false);
      }

      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const v = await getVersion();
        setCurrentVersion(v);
        const lastSeen = localStorage.getItem('dg_last_version_seen');
        if (lastSeen !== v) {
          setShowChangelog(true);
        }
      } catch {}

      const config = getConfiguracion();
      if (config.api_key_venndelo && shouldAutoSync()) {
        console.log('[APP] Auto-sync Venndelo products...');
        try {
          const result = await sincronizarProductosVenndelo();
          console.log('[APP] Auto-sync complete:', result);
          if (result.creados > 0 || result.actualizados > 0) {
            toast.info(
              `Productos sincronizados con Venndelo: ${result.creados} nuevos, ${result.actualizados} actualizados`
            );
          }
        } catch (e) {
          console.warn('[APP] Auto-sync fallido (silencioso):', e);
        }
      }
    }
    init();
  }, []);

  // Keyboard shortcuts - simplified
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Ctrl+K - Global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // ? - Show shortcuts (only when not in input)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={(tab: any) => setActiveTab(tab)}
      >
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'inventario' && <Inventario />}
        {activeTab === 'disponibilidad' && <Disponibilidad />}
        {activeTab === 'cotizaciones' && <Cotizaciones />}
        {activeTab === 'notas_credito' && <NotasCredito />}
        {activeTab === 'pedidos' && <Pedidos />}
        {activeTab === 'facturas' && <Facturas />}
        {activeTab === 'reportes' && <Reportes />}
        {activeTab === 'historial' && <HistorialInventario />}
        {activeTab === 'configuracion' && <ConfiguracionPage />}
      </Layout>

      {showGlobalSearch && (
        <GlobalSearch 
          open={showGlobalSearch} 
          onClose={() => setShowGlobalSearch(false)} 
        />
      )}
      
      {showShortcuts && (
        <KeyboardShortcutsGuide
          open={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      )}

      <ChangelogModal show={showChangelog} onClose={handleCloseChangelog} />
      
      <Toaster
        position="bottom-right"
        theme="dark"
        closeButton
        richColors
        expand
        gap={8}
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '0.875rem',
            backdropFilter: 'blur(8px)',
          },
          duration: 4000,
        }}
      />
    </>
  );
}

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;
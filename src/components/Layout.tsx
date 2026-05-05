import { ReactNode, useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Users, 
  FileText, 
  Settings, 
  Menu,
  X,
  ChevronLeft,
  History,
  BarChart3,
  Truck,
  Quote,
  Receipt
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowShortcuts?: () => void;
}

const tabs = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: Layers },
  { id: 'pedidos', label: 'Pedidos', icon: Truck },
  { id: 'cotizaciones', label: 'Cotizaciones', icon: Quote },
  { id: 'notas_credito', label: 'Notas Crédito', icon: Receipt },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'facturas', label: 'Facturas', icon: FileText },
  { id: 'reportes', label: 'Contabilidad', icon: BarChart3 },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'configuracion', label: 'Configuración', icon: Settings }
];

export function Layout({ children, activeTab, onTabChange, onShowShortcuts }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 h-full bg-surface border-r border-border
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/5">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Space Lab" className="w-8 h-8 rounded-lg object-contain" />
              <h1 className="text-xl font-bold text-white">
                Space Lab
              </h1>
            </div>
          ) : (
            <img src="/logo.png" alt="Space Lab" className="w-10 h-10 rounded-lg object-contain" />
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-2 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setMobileOpen(false);
                }}
                className={`
                  relative w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-300 group
                  ${isActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                  }
                `}
                title={collapsed ? tab.label : undefined}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : 'group-hover:text-white'}`} />
                {!collapsed && (
                  <span className="truncate">{tab.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            hidden lg:flex absolute -right-3 top-24
            w-6 h-6 items-center justify-center
            bg-surface border border-border rounded-full
            text-text-secondary hover:text-primary shadow-lg
            transition-all duration-300 z-50
            hover:scale-110 hover:border-primary/50
          `}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center h-16 px-4 bg-surface border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-text-secondary hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="ml-3 text-lg font-semibold text-white">Space Lab</h1>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
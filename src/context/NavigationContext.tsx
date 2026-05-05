import { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'dashboard' | 'inventario' | 'disponibilidad' | 'cotizaciones' | 'notas_credito' | 'clientes' | 'pedidos' | 'facturas' | 'reportes' | 'historial' | 'configuracion';

interface NavigationContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingAction: string | null;
  setPendingAction: (action: string | null) => void;
  navigate: (tab: TabType, action?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const navigate = (tab: TabType, action?: string) => {
    setActiveTab(tab);
    if (action) {
      setPendingAction(action);
    }
  };

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab, pendingAction, setPendingAction, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

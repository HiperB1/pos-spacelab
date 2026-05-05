import { Modal } from './Modal';
import { useEffect } from 'react';

interface KeyboardShortcutsGuideProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'Ctrl + K', description: 'Abrir búsqueda global' },
  { key: 'N', description: 'Nueva factura / cliente / producto' },
  { key: 'Ctrl + P', description: 'Exportar PDF de elemento seleccionado' },
  { key: 'E', description: 'Editar elemento seleccionado' },
  { key: 'D', description: 'Eliminar elemento seleccionado' },
  { key: 'F', description: 'Enfocar campo de búsqueda' },
  { key: 'Escape', description: 'Cerrar modal / Cancelar' },
  { key: 'Ctrl + S', description: 'Guardar formulario' },
  { key: '?', description: 'Mostrar esta guía de atajos' },
  { key: 'G + D', description: 'Ir a Dashboard' },
  { key: 'G + I', description: 'Ir a Inventario' },
  { key: 'G + F', description: 'Ir a Facturas' },
  { key: 'G + C', description: 'Ir a Clientes' },
];

export function KeyboardShortcutsGuide({ open, onClose }: KeyboardShortcutsGuideProps) {

  return (
    <Modal show={open} onClose={onClose} title="Atajos de Teclado" size="md">
      <div className="space-y-1">
        <p className="text-white/40 text-xs mb-4">
          Usa estos atajos para navegar más rápido por la aplicación.
        </p>
        
        <div className="grid gap-2">
          {shortcuts.map((shortcut) => (
            <div 
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5"
            >
              <span className="text-white/60 text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/30 text-xs text-center">
            Presiona <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">?</kbd> en cualquier momento para mostrar esta guía
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function useKeyboardShortcuts(handlers: {
  onGlobalSearch?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  onNavigate?: (tab: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Ctrl/Cmd + K - Búsqueda global
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onGlobalSearch?.();
        return;
      }
      
      // ? - Ayuda (solo fuera de inputs)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        handlers.onHelp?.();
        return;
      }
      
      // Escape - Cerrar (para el padre)
      if (e.key === 'Escape') {
        return; // Deixe o componente pai lidar
      }
      
      // Si está en un input, solo allow some shortcuts
      if (isInput) {
        // Ctrl/Cmd + S - Guardar
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          return;
        }
        return;
      }
      
      // N - Nuevo
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handlers.onNew?.();
        return;
      }
      
      // E - Editar
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handlers.onEdit?.();
        return;
      }
      
      // D - Delete
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlers.onDelete?.();
        return;
      }
      
      // Ctrl/Cmd + P - Export PDF
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlers.onExport?.();
        return;
      }
      
      // G + D - Go to Dashboard
      if (e.key === 'g' || e.key === 'G') {
        // Precisa de um timeout para permitir o segundo key
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
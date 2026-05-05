import { useState, useEffect } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { getClientes, getFacturas, getProdutos, getSubproductos, getMateriasPrimas, getCotizaciones } from '../../lib/database';
import { Modal } from './Modal';
import { Search, FileText, Users, Package, Layers, Quote, Receipt } from 'lucide-react';

interface GlobalSearchResult {
  type: 'cliente' | 'factura' | 'producto' | 'subproducto' | 'materia_prima' | 'cotizacion';
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setActiveTab } = useNavigation();

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const allResults: GlobalSearchResult[] = [];

    // Search clients
    const clientes = getClientes();
    clientes.forEach(c => {
      if (c.nome.toLowerCase().includes(lowerQuery) || c.nit?.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'cliente',
          id: c.id,
          title: c.nome,
          subtitle: c.nit || 'Sin NIT',
          icon: <Users className="w-4 h-4" />
        });
      }
    });

    // Search invoices
    const facturas = getFacturas();
    facturas.forEach(f => {
      if (f.numero.toLowerCase().includes(lowerQuery) || f.cliente_nome.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'factura',
          id: f.id,
          title: f.numero,
          subtitle: `${f.cliente_nome} - $${f.total.toLocaleString()}`,
          icon: <FileText className="w-4 h-4" />
        });
      }
    });

    // Search quotes
    const cotizaciones = getCotizaciones();
    cotizaciones.forEach(c => {
      if (c.numero.toLowerCase().includes(lowerQuery) || c.cliente_nome.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'cotizacion',
          id: c.id,
          title: c.numero,
          subtitle: `${c.cliente_nome} (${c.estado})`,
          icon: <Quote className="w-4 h-4" />
        });
      }
    });

    // Search products
    const productos = getProdutos();
    productos.forEach(p => {
      if (p.nome.toLowerCase().includes(lowerQuery) || p.descripcion?.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'producto',
          id: p.id,
          title: p.nome,
          subtitle: `Stock: ${p.quantidade_stock || 0}`,
          icon: <Package className="w-4 h-4" />
        });
      }
    });

    // Search subproducts
    const subproductos = getSubproductos();
    subproductos.forEach(s => {
      if (s.nome.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'subproducto',
          id: s.id,
          title: s.nome,
          subtitle: `Stock: ${s.quantidade}`,
          icon: <Layers className="w-4 h-4" />
        });
      }
    });

    // Search raw materials
    const materias = getMateriasPrimas();
    materias.forEach(m => {
      if (m.nome.toLowerCase().includes(lowerQuery) || m.tipo?.toLowerCase().includes(lowerQuery)) {
        allResults.push({
          type: 'materia_prima',
          id: m.id,
          title: m.nome,
          subtitle: `${m.quantidade_kg} kg`,
          icon: <Receipt className="w-4 h-4" />
        });
      }
    });

    setResults(allResults.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex]);

  const handleSelectResult = (result: GlobalSearchResult) => {
    switch (result.type) {
      case 'cliente':
      case 'factura':
      case 'cotizacion':
        setActiveTab('clientes');
        break;
      case 'producto':
      case 'subproducto':
      case 'materia_prima':
        setActiveTab('inventario');
        break;
    }
    onClose();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cliente: 'Cliente',
      factura: 'Factura',
      cotizacion: 'Cotización',
      producto: 'Producto',
      subproducto: 'Subproducto',
      materia_prima: 'Materia Prima'
    };
    return labels[type] || type;
  };

  return (
    <Modal show={open} onClose={onClose} title="" size="md">
      <div className="-m-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar en todo el sistema..."
            className="w-full pl-12 pr-4 py-4 bg-transparent border-b border-white/10 text-white text-lg focus:outline-none"
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex ? 'bg-primary/20' : 'hover:bg-white/5'
                }`}
              >
                <div className="p-2 rounded-lg bg-white/10 text-white/60">
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{result.title}</div>
                  <div className="text-white/40 text-sm truncate">{result.subtitle}</div>
                </div>
                <span className="text-xs text-white/30 px-2 py-1 bg-white/5 rounded">
                  {getTypeLabel(result.type)}
                </span>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-white/40">
            No se encontraron resultados para "{query}"
          </div>
        )}

        {!query && (
          <div className="px-4 py-6 text-center text-white/30 text-sm">
            <p>Empieza a escribir para buscar en:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {['Clientes', 'Facturas', 'Cotizaciones', 'Productos', 'Subproductos', 'Materias Primas'].map(t => (
                <span key={t} className="px-2 py-1 bg-white/5 rounded text-xs">{t}</span>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
          <div className="flex gap-2">
            <span className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</span> navegar
            <span className="px-1.5 py-0.5 bg-white/10 rounded">Enter</span> seleccionar
          </div>
          <span className="px-1.5 py-0.5 bg-white/10 rounded">Esc</span> cerrar
        </div>
      </div>
    </Modal>
  );
}
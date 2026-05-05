import { useState, useEffect } from 'react';
import { getDisponibilidadeParaEnsamblar, assembleProducto } from '../lib/productos';
import { disassembleProduto } from '../lib/database';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { Settings2, PackageCheck, PackageX, ChevronDown, ChevronUp } from 'lucide-react';

export function Disponibilidad() {
  const [data, setData] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setData(getDisponibilidadeParaEnsamblar());
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const setQuantity = (id: string, val: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }));
  };

  const handleAssemble = (id: string) => {
    const qty = quantities[id] || 1;
    const result = assembleProducto(id, qty);
    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleDisassemble = (id: string) => {
    const qty = quantities[id] || 1;
    const result = disassembleProduto(id, qty);
    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between">
        <h2>Disponibilidad y Ensamblaje</h2>
        <Button variant="secondary" size="sm" onClick={loadData}>Actualizar Datos</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="stat-card p-6 flex items-center bg-green-500/5">
          <div className="p-4 rounded-2xl bg-green-500/10 text-green-400 mr-4">
            <PackageCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{data.filter(d => d.podeEnsamblar).length}</p>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest">Listos para Ensamblar</p>
          </div>
        </div>
        <div className="stat-card p-6 flex items-center bg-red-500/5">
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 mr-4">
            <PackageX className="w-8 h-8" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{data.filter(d => !d.podeEnsamblar).length}</p>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest">Con Faltantes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 text-center">
            <Settings2 className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/40">No hay productos definidos con componentes.</p>
            <p className="text-sm text-white/20 mt-1">Configura componentes en la sección de Productos.</p>
          </Card>
        ) : (
          data.map((item: any) => (
            <div 
              key={item.produto.id} 
              className={`group transition-all duration-300 border rounded-2xl overflow-hidden ${
                item.podeEnsamblar ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/[0.02] border-red-500/10'
              }`}
            >
              <div className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                  <div className={`p-3 rounded-xl ${item.podeEnsamblar ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                      {item.produto.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.podeEnsamblar ? 'success' : 'danger'}>
                        {item.podeEnsamblar ? '✓ Inventario Suficiente' : '✗ Faltan Componentes'}
                      </Badge>
                      <span className="text-xs text-white/30 uppercase font-bold tracking-tighter">
                        Stock Actual: {item.produto.quantidade_stock || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1">
                    <button 
                      onClick={() => setQuantity(item.produto.id, (quantities[item.produto.id] || 1) - 1)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <input 
                      type="number" 
                      value={quantities[item.produto.id] || 1}
                      onChange={(e) => setQuantity(item.produto.id, parseInt(e.target.value) || 1)}
                      className="w-12 text-center bg-transparent border-none focus:ring-0 text-white font-bold"
                    />
                    <button 
                      onClick={() => setQuantity(item.produto.id, (quantities[item.produto.id] || 1) + 1)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>

                  <Button 
                    size="sm" 
                    disabled={!item.podeEnsamblar}
                    onClick={() => handleAssemble(item.produto.id)}
                  >
                    Ensamblar
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="secondary"
                    disabled={(item.produto.quantidade_stock || 0) <= 0}
                    onClick={() => handleDisassemble(item.produto.id)}
                  >
                    Desarmar
                  </Button>

                  <button 
                    onClick={() => toggleExpand(item.produto.id)}
                    className="p-2 hover:bg-white/5 rounded-xl text-white/30 transition-all ml-2"
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${expandedItems[item.produto.id] ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {expandedItems[item.produto.id] && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="rounded-xl overflow-hidden border border-white/5">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-white/40 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Componente</th>
                          <th className="px-4 py-3">Necesario</th>
                          <th className="px-4 py-3">Disponible</th>
                          <th className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {item.componentes.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-4 py-3 text-white font-medium">{c.subprodutoNome}</td>
                            <td className="px-4 py-3 text-white/60">
                              {c.necessidadea * (quantities[item.produto.id] || 1)}
                            </td>
                            <td className="px-4 py-3 text-white/60">{c.quantidadeDisponivel}</td>
                            <td className="px-4 py-3">
                              <Badge variant={c.quantidadeDisponivel >= (c.necessidadea * (quantities[item.produto.id] || 1)) ? 'success' : 'danger'}>
                                {c.quantidadeDisponivel >= (c.necessidadea * (quantities[item.produto.id] || 1)) ? 'OK' : 'Faltan'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
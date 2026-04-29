import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Package, Users, DollarSign, TrendingUp, 
  AlertTriangle, FilePlus, UserPlus, Box, ReceiptText, Calendar, Truck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getFacturas, getClientes, getSubproductos, getProdutos, getMateriasPrimas, getConfiguracion } from '../lib/database';
import { useNavigation } from '../context/NavigationContext';

interface MonthlyData {
  name: string;
  total: number;
}

interface TopProduct {
  name: string;
  value: number;
  color: string;
}

interface StockAlert {
  id: string;
  nome: string;
  quantidade: number;
  tipo: 'materia_prima' | 'subproducto' | 'producto';
}

export function Dashboard() {
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    facturas: [] as any[],
    clientes: [] as any[],
    subproductos: [] as any[],
    productos: [] as any[],
    materiasPrimas: [] as any[],
    config: {} as any
  });

  useEffect(() => {
    setData({
      facturas: getFacturas(),
      clientes: getClientes(),
      subproductos: getSubproductos(),
      productos: getProdutos(),
      materiasPrimas: getMateriasPrimas(),
      config: getConfiguracion()
    });
    setLoading(false);
  }, []);

  const stats = useMemo(() => {
    const totalFacturas = data.facturas.length;
    const clientes = data.clientes.length;
    const productos = data.productos.length;
    const totalInventario = data.materiasPrimas.length + data.subproductos.length + data.productos.length;
    
    const hoy = new Date().toISOString().split('T')[0];
    const ventaHoy = data.facturas
      .filter(f => f.estado === 'activa' && f.fecha === hoy)
      .reduce((sum, f) => sum + f.total, 0);

    const ingresosMes = data.facturas
      .filter(f => f.estado === 'activa')
      .reduce((sum, f) => sum + f.total, 0);

    const metaDiaria = (data.config.meta_mensual || 0) / (data.config.dias_laborables || 1);

    return { totalFacturas, clientes, productos, totalInventario, ingresosMes, ventaHoy, metaDiaria };
  }, [data]);

  const monthlyData: MonthlyData[] = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((month, idx) => {
      const total = data.facturas
        .filter(f => f.estado === 'activa' && new Date(f.fecha).getMonth() === idx)
        .reduce((sum, f) => sum + f.total, 0);
      return { name: month, total };
    });
  }, [data]);

  const topProducts: TopProduct[] = useMemo(() => {
    const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
    return data.productos.slice(0, 5).map((p, idx) => ({
      name: p.nome,
      value: Math.floor(Math.random() * 100) + 50, // Mock sales data
      color: COLORS[idx % COLORS.length]
    }));
  }, [data]);

  const stockAlerts: StockAlert[] = useMemo(() => {
    const alerts: StockAlert[] = [];
    data.materiasPrimas.forEach(m => {
      if (m.quantidade_stock < 5) alerts.push({ id: m.id, nome: m.nome, quantidade: m.quantidade_stock, tipo: 'materia_prima' });
    });
    data.subproductos.forEach(s => {
      if (s.quantidade_stock < 5) alerts.push({ id: s.id, nome: s.nome, quantidade: s.quantidade_stock, tipo: 'subproducto' });
    });
    return alerts.sort((a, b) => a.quantidade - b.quantidade);
  }, [data]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-white/20">Cargando datos...</div>;

  return (
    <div className="page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard General</h2>
          <p className="text-sm text-white/40">Resumen de operaciones y estado del inventario</p>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white/60">
            {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Actions (Moved to Top) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Nueva Factura', icon: FilePlus, desc: 'Generar cobro rápido', action: () => navigate('facturas', 'new'), color: 'bg-indigo-500/10 text-indigo-400', border: 'border-indigo-500/20' },
          { label: 'Nuevo Cliente', icon: UserPlus, desc: 'Registrar contacto', action: () => navigate('clientes', 'new'), color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20' },
          { label: 'Despachar', icon: Truck, desc: 'Gestionar pedidos', action: () => navigate('pedidos'), color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'Ver Stock', icon: TrendingUp, desc: 'Estado de inventario', action: () => navigate('inventario'), color: 'bg-orange-500/10 text-orange-400', border: 'border-orange-500/20' }
        ].map((btn, idx) => (
          <button 
            key={idx}
            onClick={btn.action}
            className={`group p-4 ${btn.color} border ${btn.border} rounded-3xl text-left hover:brightness-125 transition-all flex items-center gap-4`}
          >
            <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <btn.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{btn.label}</h4>
              <p className="text-[10px] text-white/40">{btn.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" /> +12%
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-1">Ingresos (Mes)</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.ingresosMes)}</p>
          </div>
        </div>

        <div className="stat-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-1">Facturas Emitidas</p>
            <p className="text-2xl font-bold text-white">{stats.totalFacturas}</p>
          </div>
        </div>

        <div className="stat-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            {stats.ventaHoy >= stats.metaDiaria && stats.metaDiaria > 0 && (
              <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-2 py-1 rounded-full">
                META CUMPLIDA
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-1">Venta Diaria</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(stats.ventaHoy)}</p>
          </div>
        </div>

        <div className="stat-card p-6 flex flex-col justify-between border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Objetivo Diario
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-1">Meta Diaria</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(stats.metaDiaria)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" header="Flujo de Ventas">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '14px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card header="Top Productos">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-white/60">{p.name}</span>
                  </div>
                  <span className="text-white font-mono">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card header={
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span>Alertas de Stock</span>
          </div>
        } className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {stockAlerts.length > 0 ? (
              <>
                {stockAlerts.slice(0, 4).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{alert.nome}</p>
                        <p className="text-xs text-white/30 capitalize">{alert.tipo.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Badge variant="danger">{alert.quantidade} en stock</Badge>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-12 text-center text-white/20 italic lg:col-span-4">No hay alertas de stock bajas hoy.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
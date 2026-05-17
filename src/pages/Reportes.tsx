import { useState, useMemo } from 'react';
import { getAllFacturas } from '../lib/facturas';
import { getProdutos } from '../lib/database';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Download,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { exportContabilidadDetallada } from '../lib/export';
import { toast } from 'sonner';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#facc15', '#64748b'];

export function Reportes() {
  const [fechaInicio, setFechaInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [filtroEstado, setFiltroEstado] = useState('activa');

  const facturas = useMemo(() => getAllFacturas(), []);
  const productos = useMemo(() => getProdutos(), []);

  const reportData = useMemo(() => {
    const filtradas = facturas.filter(f => {
      const enRango = f.fecha >= fechaInicio && f.fecha <= fechaFin;
      const coincideEstado = filtroEstado === 'todas' || f.estado === filtroEstado;
      return enRango && coincideEstado;
    });

    let totalVentas = 0;
    let totalCosto = 0;
    let itemsVendidos = 0;
    let totalDescuentos = 0;
    let totalEnvios = 0;
    const ventasPorDia: Record<string, { total: number; costo: number; profit: number }> = {};
    const ventasPorProducto: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};
    const listaVentasDetalladas: any[] = [];

    filtradas.forEach(f => {
      totalVentas += f.total;
      totalDescuentos += f.descuento || 0;
      totalEnvios += f.costo_envio || 0;

      if (!ventasPorDia[f.fecha]) {
        ventasPorDia[f.fecha] = { total: 0, costo: 0, profit: 0 };
      }
      ventasPorDia[f.fecha].total += f.total;

      f.items.forEach(item => {
        itemsVendidos += item.quantidade;

        const pInfo = productos.find(p => p.nome === item.descripcion);
        const costoUnitario = pInfo?.custo || 0;
        const costoTotalItem = costoUnitario * item.quantidade;

        totalCosto += costoTotalItem;
        ventasPorDia[f.fecha].costo += costoTotalItem;

        if (!ventasPorProducto[item.descripcion]) {
          ventasPorProducto[item.descripcion] = { name: item.descripcion, quantity: 0, revenue: 0, cost: 0 };
        }
        ventasPorProducto[item.descripcion].quantity += item.quantidade;
        ventasPorProducto[item.descripcion].revenue += item.total;
        ventasPorProducto[item.descripcion].cost += costoTotalItem;

        listaVentasDetalladas.push({
          numero: f.numero,
          fecha: f.fecha,
          cliente: f.cliente_nome,
          producto: item.descripcion,
          cantidad: item.quantidade,
          precio: item.precio,
          total: item.total,
          costo: costoTotalItem,
          utilidad: item.total - costoTotalItem
        });
      });
    });

    Object.keys(ventasPorDia).forEach(day => {
      ventasPorDia[day].profit = ventasPorDia[day].total - ventasPorDia[day].costo;
    });

    const gananciaTotal = totalVentas - totalCosto;
    const ticketPromedio = filtradas.length > 0 ? totalVentas / filtradas.length : 0;

    const chartVentasDia = Object.keys(ventasPorDia).sort().map(day => ({
      fecha: day,
      Ventas: ventasPorDia[day].total,
      Ganancia: ventasPorDia[day].profit
    }));

    const chartVentasProducto = Object.values(ventasPorProducto)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalVentas,
      gananciaTotal,
      itemsVendidos,
      ticketPromedio,
      totalDescuentos,
      totalEnvios,
      chartVentasDia,
      chartVentasProducto,
      tablaProductos: Object.values(ventasPorProducto).sort((a, b) => b.revenue - a.revenue),
      listaDetallada: listaVentasDetalladas.sort((a, b) => b.numero.localeCompare(a.numero)),
      numFacturas: filtradas.length,
      facturasFiltradas: filtradas,
    };
  }, [facturas, productos, fechaInicio, fechaFin, filtroEstado]);

  async function handleExport() {
    const estadoLabel =
      filtroEstado === 'activa' ? 'Solo activas' :
      filtroEstado === 'anulada' ? 'Solo anuladas' : 'Todas';

    try {
      await exportContabilidadDetallada(
        reportData.facturasFiltradas,
        {
          totalVentas: reportData.totalVentas,
          gananciaTotal: reportData.gananciaTotal,
          itemsVendidos: reportData.itemsVendidos,
          ticketPromedio: reportData.ticketPromedio,
          numFacturas: reportData.numFacturas,
          totalDescuentos: reportData.totalDescuentos,
          totalEnvios: reportData.totalEnvios,
          tablaProductos: reportData.tablaProductos,
        },
        { inicio: fechaInicio, fin: fechaFin, estado: estadoLabel },
        `Reporte_Contabilidad_${fechaInicio}_a_${fechaFin}`
      );
      toast.success('Reporte exportado exitosamente');
    } catch {
      toast.error('Error al exportar el reporte');
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="card-title text-xl">Contabilidad y Reportes</h3>
              <p className="text-sm text-white/40">Análisis detallado de rendimiento financiero</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1 px-3">
              <Calendar className="w-4 h-4 text-white/40" />
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={e => setFechaInicio(e.target.value)}
                className="bg-transparent border-none text-xs text-white outline-none p-2"
              />
              <span className="text-white/20 px-1">al</span>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={e => setFechaFin(e.target.value)}
                className="bg-transparent border-none text-xs text-white outline-none p-2"
              />
            </div>
            <Select 
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              options={[
                { value: 'todas', label: 'Todos los estados' },
                { value: 'activa', label: 'Solo Activas' },
                { value: 'anulada', label: 'Solo Anuladas' }
              ]}
            />
            <Button onClick={handleExport} variant="secondary">
              <Download className="w-4 h-4 mr-2" /> Exportar Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: formatCurrency(reportData.totalVentas), icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Utilidad Estimada', value: formatCurrency(reportData.gananciaTotal), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Unidades Vendidas', value: reportData.itemsVendidos, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Ticket Promedio', value: formatCurrency(reportData.ticketPromedio), icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10' }
        ].map((kpi, idx) => (
          <div key={idx} className="card p-6 flex items-center gap-4 group hover:border-orange-500/30 transition-all">
            <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{kpi.label}</p>
              <h4 className="text-2xl font-bold text-white mt-1 group-hover:text-orange-400 transition-colors">{kpi.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-white">Evolución de Ventas y Ganancias</h4>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Ventas</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /> Ganancia</div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData.chartVentasDia}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="fecha" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                />
                <YAxis stroke="#ffffff20" fontSize={10} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="Ventas" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="Ganancia" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h4 className="font-bold text-white mb-6">Top 5 Productos (Ingresos)</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.chartVentasProducto.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {reportData.chartVentasProducto.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  formatter={(val) => formatCurrency(Number(val))}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {reportData.chartVentasProducto.slice(0, 5).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-white/60 truncate max-w-[100px]">{p.name}</span>
                </div>
                <span className="text-white font-bold">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Breakdown Table */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Resumen por Producto</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40 tracking-widest text-left">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4 text-center">Und. Vendidas</th>
                <th className="px-6 py-4 text-right">Ingresos Brutos</th>
                <th className="px-6 py-4 text-right">Costo Estimado</th>
                <th className="px-6 py-4 text-right">Utilidad</th>
                <th className="px-6 py-4 text-center">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reportData.tablaProductos.map((p, idx) => {
                const margen = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 text-sm text-white font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-center text-sm text-white/60">{p.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-400 font-bold">{formatCurrency(p.revenue)}</td>
                    <td className="px-6 py-4 text-right text-sm text-white/40">{formatCurrency(p.cost)}</td>
                    <td className="px-6 py-4 text-right text-sm text-orange-400 font-bold">{formatCurrency(p.revenue - p.cost)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${margen > 30 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {margen.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reportData.tablaProductos.length === 0 && (
            <div className="p-12 text-center text-white/20">No hay datos para mostrar en este rango</div>
          )}
        </div>
      </div>

      {/* Detailed Sales List Table */}
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">Detalle de Movimientos (Factura por Factura)</h4>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full">
            <thead className="bg-white/5 text-[10px] uppercase font-bold text-white/40 tracking-widest text-left sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4">Factura</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4 text-center">Cant.</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Utilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reportData.listaDetallada.map((v, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-primary">{v.numero}</td>
                  <td className="px-6 py-4 text-xs text-white/60">{new Date(v.fecha).toLocaleDateString('es-CO')}</td>
                  <td className="px-6 py-4 text-xs text-white uppercase">{v.cliente}</td>
                  <td className="px-6 py-4 text-xs text-white/80">{v.producto}</td>
                  <td className="px-6 py-4 text-center text-xs text-white">{v.cantidad}</td>
                  <td className="px-6 py-4 text-right text-xs text-emerald-400 font-bold">{formatCurrency(v.total)}</td>
                  <td className="px-6 py-4 text-right text-xs text-orange-400 font-bold">{formatCurrency(v.utilidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reportData.listaDetallada.length === 0 && (
            <div className="p-12 text-center text-white/20">No hay ventas registradas en este rango</div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Glasses, 
  Eye, 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useOpticsStats, useOpticsProducts } from "@/hooks/useOpticsProducts";
import { useOpticsEntries } from "@/hooks/useOpticsEntries";
import { useOpticsOutputs } from "@/hooks/useOpticsOutputs";
import { useOpticsProductTypes } from "@/hooks/useOpticsProductTypes";
import { Link } from "react-router-dom";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

export function Optics() {
  const { data: stats, isLoading: statsLoading } = useOpticsStats();
  const { data: products } = useOpticsProducts();
  const { data: entries } = useOpticsEntries();
  const { data: outputs } = useOpticsOutputs();
  const { data: productTypes } = useOpticsProductTypes();

  // Calculate low stock alerts from real data
  const lowStockProducts = products?.filter(p => p.stock_actual <= p.stock_minimo) || [];

  // Get current month entries and outputs
  const currentMonthData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthEntries = entries?.filter(e => 
      isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
    ) || [];
    
    const monthOutputs = outputs?.filter(o => 
      isWithinInterval(new Date(o.date), { start: monthStart, end: monthEnd })
    ) || [];

    const totalEntries = monthEntries.reduce((sum, e) => sum + (e.importe || 0), 0);
    const totalOutputs = monthOutputs.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      entries: monthEntries,
      outputs: monthOutputs,
      totalEntries,
      totalOutputs,
      entryCount: monthEntries.length,
      outputCount: monthOutputs.length
    };
  }, [entries, outputs]);

  // Daily movements chart data (last 7 days)
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, { date: string; entradas: number; salidas: number }>();
    const now = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dateKey = format(date, "dd/MM");
      dataMap.set(dateKey, { date: dateKey, entradas: 0, salidas: 0 });
    }

    entries?.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate >= subDays(now, 6)) {
        const dateKey = format(entryDate, "dd/MM");
        const existing = dataMap.get(dateKey);
        if (existing) {
          existing.entradas += entry.importe || 0;
        }
      }
    });

    outputs?.forEach((output) => {
      const outputDate = new Date(output.date);
      if (outputDate >= subDays(now, 6)) {
        const dateKey = format(outputDate, "dd/MM");
        const existing = dataMap.get(dateKey);
        if (existing) {
          existing.salidas += output.total || 0;
        }
      }
    });

    return Array.from(dataMap.values());
  }, [entries, outputs]);

  // Products by type for pie chart
  const productsByType = useMemo(() => {
    if (!products || !productTypes) return [];
    
    const typeCount = new Map<string, number>();
    
    products.forEach(p => {
      const current = typeCount.get(p.tipo) || 0;
      typeCount.set(p.tipo, current + 1);
    });

    return Array.from(typeCount.entries()).map(([type, count], index) => {
      const typeLabel = productTypes.find(t => t.value === type)?.label || type;
      return {
        name: typeLabel,
        value: count,
        color: CHART_COLORS[index % CHART_COLORS.length]
      };
    });
  }, [products, productTypes]);

  // Stock status for pie chart
  const stockStatus = useMemo(() => {
    if (!products) return [];
    
    const normalStock = products.filter(p => p.stock_actual > p.stock_minimo).length;
    const lowStock = products.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length;
    const noStock = products.filter(p => p.stock_actual === 0).length;

    return [
      { name: "Stock Normal", value: normalStock, color: "#10b981" },
      { name: "Stock Bajo", value: lowStock, color: "#f59e0b" },
      { name: "Sin Stock", value: noStock, color: "#ef4444" }
    ].filter(s => s.value > 0);
  }, [products]);

  const statsData = [
    {
      title: "Total Monturas",
      value: stats?.monturas || 0,
      icon: Glasses,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      link: "/optics/products?tipo=montura"
    },
    {
      title: "Total Lentes",
      value: stats?.lentes || 0,
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      link: "/optics/products?tipo=lentes_graduados"
    },
    {
      title: "Productos en Stock",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100",
      link: "/optics/products"
    },
    {
      title: "Valor del Inventario",
      value: `S/ ${(stats?.totalValue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      link: "/optics/inventory"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-700">
          Dashboard Sistema de Óptica
        </h1>
        <p className="text-muted-foreground">
          Panel de control para gestión de monturas y lunas ópticas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} to={stat.link}>
              <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? "..." : stat.value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Monthly Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/optics/entries">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas del Mes</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                S/ {currentMonthData.totalEntries.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentMonthData.entryCount} operaciones
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/optics/outputs">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Salidas del Mes</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                S/ {currentMonthData.totalOutputs.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentMonthData.outputCount} operaciones
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/optics/alerts">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.lowStockCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Productos por reabastecer
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/optics/inventory">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margen Estimado</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                S/ {(currentMonthData.totalOutputs - currentMonthData.totalEntries).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Salidas - Entradas del mes
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Movements Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Movimientos Últimos 7 Días
            </CardTitle>
            <CardDescription>
              Comparativa de entradas y salidas por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  }
                />
                <Legend />
                <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                <Bar dataKey="salidas" fill="#3b82f6" name="Salidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Products by Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-500" />
              Productos por Tipo
            </CardTitle>
            <CardDescription>
              Distribución del catálogo por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsByType.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay productos registrados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stock Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Estado del Stock
            </CardTitle>
            <CardDescription>
              Distribución por nivel de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockStatus.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stockStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ value }) => `${value}`}
                  >
                    {stockStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas de Stock Bajo
            </CardTitle>
            <CardDescription>
              Productos que requieren reabastecimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[250px] overflow-y-auto">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay alertas de stock bajo</p>
            ) : (
              lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{product.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {product.stock_actual} / Mínimo: {product.stock_minimo}
                    </p>
                  </div>
                  <Badge variant={product.stock_actual === 0 ? "destructive" : "outline"}>
                    {product.stock_actual === 0 ? "Sin Stock" : "Bajo"}
                  </Badge>
                </div>
              ))
            )}
            {lowStockProducts.length > 5 && (
              <Link to="/optics/alerts">
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  Ver todas las alertas ({lowStockProducts.length})
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Operaciones frecuentes del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/optics/products">
              <Button variant="ghost" className="w-full justify-start p-2">
                <Plus className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Ver Catálogo</div>
                  <div className="text-xs text-muted-foreground">Gestionar productos</div>
                </div>
              </Button>
            </Link>
            <Link to="/optics/entries">
              <Button variant="ghost" className="w-full justify-start p-2">
                <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Registrar Entrada</div>
                  <div className="text-xs text-muted-foreground">Nueva compra</div>
                </div>
              </Button>
            </Link>
            <Link to="/optics/outputs">
              <Button variant="ghost" className="w-full justify-start p-2">
                <TrendingDown className="mr-2 h-4 w-4 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Registrar Salida</div>
                  <div className="text-xs text-muted-foreground">Venta o ajuste</div>
                </div>
              </Button>
            </Link>
            <Link to="/optics/inventory">
              <Button variant="ghost" className="w-full justify-start p-2">
                <Package className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Ver Movimientos</div>
                  <div className="text-xs text-muted-foreground">Historial de inventario</div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

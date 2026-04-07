import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Boxes, 
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
import { useSuppliesStats, useSuppliesProducts, SUPPLIES_CATEGORIES } from "@/hooks/useSuppliesProducts";
import { useSuppliesEntries } from "@/hooks/useSuppliesEntries";
import { useSuppliesOutputs } from "@/hooks/useSuppliesOutputs";
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

const CHART_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"];

export function Supplies() {
  const { data: stats, isLoading: statsLoading } = useSuppliesStats();
  const { data: products } = useSuppliesProducts();
  const { data: entries } = useSuppliesEntries();
  const { data: outputs } = useSuppliesOutputs();

  // Calculate low stock alerts from real data
  const lowStockProducts = products?.filter(p => p.stock_actual <= p.min_stock_level) || [];

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

    const totalEntries = monthEntries.reduce((sum, e) => sum + (e.total_amount || 0), 0);
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
          existing.entradas += entry.total_amount || 0;
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

  // Products by category chart data
  const productsByCategory = useMemo(() => {
    return SUPPLIES_CATEGORIES.map((cat, index) => ({
      name: cat,
      value: stats?.byCategory?.[cat] || 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })).filter(item => item.value > 0);
  }, [stats]);

  // Stock status chart data
  const stockStatus = useMemo(() => {
    const total = stats?.totalProducts || 0;
    const lowStock = stats?.lowStockCount || 0;
    const outOfStock = stats?.outOfStockCount || 0;
    const normal = total - lowStock;
    
    return [
      { name: "Normal", value: normal, color: "#10b981" },
      { name: "Bajo", value: lowStock - outOfStock, color: "#f59e0b" },
      { name: "Sin Stock", value: outOfStock, color: "#ef4444" },
    ].filter(item => item.value > 0);
  }, [stats]);

  const statsData = [
    {
      title: "Total Productos",
      value: stats?.totalProducts || 0,
      icon: Boxes,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      link: "/supplies/products"
    },
    {
      title: "Stock Bajo",
      value: stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      link: "/supplies/alerts"
    },
    {
      title: "Valor Inventario",
      value: `S/ ${(stats?.totalValue || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      link: "/supplies/inventory"
    },
    {
      title: "Entradas del Mes",
      value: currentMonthData.entryCount,
      subValue: `S/ ${currentMonthData.totalEntries.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
      icon: ArrowUpRight,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/supplies/entries"
    },
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-emerald-600" />
            Dashboard de Suministros
          </h1>
          <p className="text-muted-foreground">
            Gestión de suministros médicos y materiales de procedimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/supplies/entries">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entrada
            </Link>
          </Button>
          <Button asChild>
            <Link to="/supplies/outputs">
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Nueva Salida
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.subValue && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Movements Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Movimientos (Últimos 7 días)</CardTitle>
            <CardDescription>Entradas y salidas de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" />
                <Bar dataKey="salidas" name="Salidas" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Products by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos por Categoría</CardTitle>
            <CardDescription>Distribución del catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            {productsByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={productsByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {productsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No hay productos clasificados por categoría
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del Stock</CardTitle>
            <CardDescription>Salud del inventario</CardDescription>
          </CardHeader>
          <CardContent>
            {stockStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stockStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stockStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No hay datos de stock
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas de Stock Bajo
              </CardTitle>
              <CardDescription>Productos que requieren reposición</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/supplies/alerts">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={product.stock_actual <= 0 ? "destructive" : "secondary"}
                        className="min-w-[60px] justify-center"
                      >
                        {product.stock_actual} uds
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{product.descripcion}</p>
                        <p className="text-xs text-muted-foreground">{product.codigo}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/supplies/entries">
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay alertas de stock bajo</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/supplies/products">
                <Boxes className="h-6 w-6 mb-2" />
                Catálogo
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/supplies/inventory">
                <Package className="h-6 w-6 mb-2" />
                Inventario
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/supplies/reports">
                <BarChart3 className="h-6 w-6 mb-2" />
                Reportes
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link to="/supplies/suppliers">
                <TrendingUp className="h-6 w-6 mb-2" />
                Proveedores
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

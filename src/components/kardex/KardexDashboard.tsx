import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Pill, 
  Glasses, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ArrowRight,
  Layers,
  DollarSign,
  BarChart3,
  RefreshCw,
  Calculator
} from "lucide-react";
import { useKardexSummary, useKardexStats, useKardexMovements } from "@/hooks/useKardexData";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = {
  botica: "#22c55e",
  optica: "#8b5cf6",
  suministros: "#14b8a6",
};

export function KardexDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: summary } = useKardexSummary();
  const { data: stats } = useKardexStats('mes');
  const { data: recentMovements } = useKardexMovements({ limit: 10 });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["kardex-summary"] });
    queryClient.invalidateQueries({ queryKey: ["kardex-stats"] });
    queryClient.invalidateQueries({ queryKey: ["kardex-movements"] });
    toast({
      title: "Actualizado",
      description: "Los datos del kardex se han actualizado.",
    });
  };

  const chartData = summary?.map((s) => ({
    name: s.sistema,
    productos: s.total_productos,
    entradas: s.total_entradas,
    salidas: s.total_salidas,
    valor: s.valor_inventario,
  })) || [];

  const pieData = summary?.map((s) => ({
    name: s.sistema,
    value: s.valor_inventario,
  })) || [];

  const getTotalValue = () => {
    return summary?.reduce((acc, s) => acc + s.valor_inventario, 0) || 0;
  };

  const getTotalAlerts = () => {
    return summary?.reduce((acc, s) => acc + s.productos_bajo_stock, 0) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-amber-700">
            Dashboard de Kardex
          </h2>
          <p className="text-muted-foreground">
            Control consolidado de existencias e inventario
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              S/. {getTotalValue().toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Consolidado de todos los sistemas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {stats?.conteos.entradas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              S/. {((stats?.entradas.botica || 0) + (stats?.entradas.optica || 0) + (stats?.entradas.suministros || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {stats?.conteos.salidas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              S/. {((stats?.salidas.botica || 0) + (stats?.salidas.optica || 0) + (stats?.salidas.suministros || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance del Mes</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              ((stats?.entradas.botica || 0) + (stats?.entradas.optica || 0) + (stats?.entradas.suministros || 0)) -
              ((stats?.salidas.botica || 0) + (stats?.salidas.optica || 0) + (stats?.salidas.suministros || 0)) >= 0
                ? 'text-green-700' : 'text-red-700'
            }`}>
              S/. {(
                ((stats?.entradas.botica || 0) + (stats?.entradas.optica || 0) + (stats?.entradas.suministros || 0)) -
                ((stats?.salidas.botica || 0) + (stats?.salidas.optica || 0) + (stats?.salidas.suministros || 0))
              ).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Entradas - Salidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {getTotalAlerts()}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos bajo stock mínimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        {summary?.map((s) => (
          <Card 
            key={s.sistema} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/kardex/${s.sistema.toLowerCase()}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                {s.sistema === 'Botica' && <Pill className="h-5 w-5 text-green-600" />}
                {s.sistema === 'Óptica' && <Glasses className="h-5 w-5 text-purple-600" />}
                {s.sistema === 'Suministros' && <Package className="h-5 w-5 text-teal-600" />}
                <CardTitle className="text-lg">{s.sistema}</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Productos</p>
                  <p className="text-xl font-bold">{s.total_productos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="text-lg font-bold">S/. {s.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mov. Entradas</p>
                  <p className="font-medium text-green-600">{s.total_entradas}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mov. Salidas</p>
                  <p className="font-medium text-red-600">{s.total_salidas}</p>
                </div>
              </div>
              {/* Value summary */}
              <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Compras: </span>
                  <span className="font-medium text-green-600">S/. {(s.total_valor_entradas || 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ventas: </span>
                  <span className="font-medium text-red-600">S/. {(s.total_valor_salidas || 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span>
                </div>
              </div>
              {s.productos_bajo_stock > 0 && (
                <Badge variant="destructive" className="mt-3">
                  {s.productos_bajo_stock} productos bajo stock
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparativa por Sistema
            </CardTitle>
            <CardDescription>Productos, entradas y salidas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="productos" fill="#f59e0b" name="Productos" />
                <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                <Bar dataKey="salidas" fill="#ef4444" name="Salidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Distribución de Valor
            </CardTitle>
            <CardDescription>Valor de inventario por sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={Object.values(COLORS)[index % Object.values(COLORS).length]} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `S/. ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Últimos Movimientos</CardTitle>
            <CardDescription>Movimientos recientes de todos los sistemas</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/kardex/movimientos')}>
            Ver todos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentMovements?.slice(0, 8).map((movement) => (
              <div 
                key={movement.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    movement.tipo_movimiento === 'entrada' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {movement.tipo_movimiento === 'entrada' 
                      ? <TrendingUp className="h-4 w-4" /> 
                      : <TrendingDown className="h-4 w-4" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm">{movement.producto_nombre}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {movement.sistema.charAt(0).toUpperCase() + movement.sistema.slice(1)}
                      </Badge>
                      <span>{movement.producto_codigo}</span>
                      <span>•</span>
                      <span>{format(new Date(movement.fecha), "dd MMM", { locale: es })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    movement.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.tipo_movimiento === 'entrada' ? '+' : '-'}{movement.cantidad}
                  </p>
                  <p className="text-xs text-muted-foreground">{movement.motivo}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

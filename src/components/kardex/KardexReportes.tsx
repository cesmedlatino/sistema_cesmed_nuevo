import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  FileText, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Pill,
  Glasses,
  Package,
  Calendar
} from "lucide-react";
import { useKardexMovements, useKardexSummary } from "@/hooks/useKardexData";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ['#f59e0b', '#22c55e', '#8b5cf6', '#14b8a6', '#ef4444'];

export function KardexReportes() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("resumen");
  const [sistemaFilter, setSistemaFilter] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const { data: movements } = useKardexMovements({
    sistema: sistemaFilter !== 'todos' ? sistemaFilter : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
  });
  const { data: summary } = useKardexSummary();

  // Preparar datos para gráficos
  const movementsByDate = movements?.reduce((acc: any, m) => {
    const date = format(new Date(m.fecha), "dd/MM");
    if (!acc[date]) {
      acc[date] = { date, entradas: 0, salidas: 0 };
    }
    if (m.tipo_movimiento === 'entrada') {
      acc[date].entradas += m.cantidad;
    } else {
      acc[date].salidas += m.cantidad;
    }
    return acc;
  }, {});

  const chartData = Object.values(movementsByDate || {}).slice(-15);

  const systemDistribution = summary?.map(s => ({
    name: s.sistema,
    value: s.valor_inventario,
    productos: s.total_productos,
  })) || [];

  const handleExportExcel = () => {
    if (!movements?.length) return;

    const wb = XLSX.utils.book_new();

    // Hoja de movimientos
    const movementsData = movements.map((m) => ({
      Fecha: format(new Date(m.fecha), "dd/MM/yyyy"),
      Sistema: m.sistema.charAt(0).toUpperCase() + m.sistema.slice(1),
      Tipo: m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
      Código: m.producto_codigo,
      Producto: m.producto_nombre,
      Cantidad: m.cantidad,
      'Stock Anterior': m.stock_anterior,
      'Stock Nuevo': m.stock_nuevo,
      'Costo Total': m.costo_total || 0,
      Motivo: m.motivo,
      Documento: m.documento_referencia || '',
    }));
    const ws1 = XLSX.utils.json_to_sheet(movementsData);
    XLSX.utils.book_append_sheet(wb, ws1, "Movimientos");

    // Hoja de resumen
    const summaryData = summary?.map(s => ({
      Sistema: s.sistema,
      'Total Productos': s.total_productos,
      'Total Entradas': s.total_entradas,
      'Total Salidas': s.total_salidas,
      'Valor Inventario': s.valor_inventario,
      'Productos Bajo Stock': s.productos_bajo_stock,
    })) || [];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

    XLSX.writeFile(wb, `reporte_kardex_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);

    toast({
      title: "Reporte exportado",
      description: "El archivo Excel se ha descargado correctamente.",
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("KARDEX CESMED", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text("Reporte de Inventario Consolidado", 105, 23, { align: "center" });

    // Fecha
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 15, 40);

    // Resumen por sistema
    let y = 50;
    doc.setFontSize(14);
    doc.text("Resumen por Sistema", 15, y);
    y += 10;

    summary?.forEach((s) => {
      doc.setFontSize(11);
      doc.text(`${s.sistema}:`, 15, y);
      doc.setFontSize(10);
      doc.text(`Productos: ${s.total_productos} | Entradas: ${s.total_entradas} | Salidas: ${s.total_salidas} | Valor: S/. ${s.valor_inventario.toLocaleString('es-PE')}`, 40, y);
      y += 8;
    });

    // Totales
    y += 10;
    doc.setFontSize(12);
    const totalValor = summary?.reduce((acc, s) => acc + s.valor_inventario, 0) || 0;
    const totalProductos = summary?.reduce((acc, s) => acc + s.total_productos, 0) || 0;
    doc.text(`TOTAL: ${totalProductos} productos | Valor: S/. ${totalValor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 15, y);

    doc.save(`reporte_kardex_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);

    toast({
      title: "PDF generado",
      description: "El reporte PDF se ha descargado correctamente.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-amber-700">
            Reportes de Kardex
          </h2>
          <p className="text-muted-foreground">
            Análisis y reportes consolidados de inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportExcel} className="bg-amber-600 hover:bg-amber-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Sistema</Label>
              <Select value={sistemaFilter} onValueChange={setSistemaFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los sistemas</SelectItem>
                  <SelectItem value="botica">Botica</SelectItem>
                  <SelectItem value="optica">Óptica</SelectItem>
                  <SelectItem value="suministros">Suministros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desde</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resumen">Resumen General</SelectItem>
                  <SelectItem value="movimientos">Movimientos</SelectItem>
                  <SelectItem value="valoracion">Valoración</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Movimientos</p>
                <p className="text-2xl font-bold">{movements?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {movements?.filter(m => m.tipo_movimiento === 'entrada').reduce((acc, m) => acc + m.cantidad, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Salidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {movements?.filter(m => m.tipo_movimiento === 'salida').reduce((acc, m) => acc + m.cantidad, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  S/. {(movements?.reduce((acc, m) => acc + (m.costo_total || 0), 0) || 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Movimientos por Fecha</CardTitle>
            <CardDescription>Entradas y salidas en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                <Bar dataKey="salidas" fill="#ef4444" name="Salidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Sistema</CardTitle>
            <CardDescription>Valor de inventario por sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={systemDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {systemDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `S/. ${value.toLocaleString('es-PE')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {summary?.map((s) => (
              <Card key={s.sistema} className="border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    {s.sistema === 'Botica' && <Pill className="h-6 w-6 text-green-600" />}
                    {s.sistema === 'Óptica' && <Glasses className="h-6 w-6 text-purple-600" />}
                    {s.sistema === 'Suministros' && <Package className="h-6 w-6 text-teal-600" />}
                    <h3 className="font-semibold text-lg">{s.sistema}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Productos:</span>
                      <span className="font-medium">{s.total_productos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entradas:</span>
                      <span className="font-medium text-green-600">{s.total_entradas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salidas:</span>
                      <span className="font-medium text-red-600">{s.total_salidas}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-bold">S/. {s.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

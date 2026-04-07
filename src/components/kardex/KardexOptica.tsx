import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Glasses,
  Package,
  AlertTriangle
} from "lucide-react";
import { useKardexMovements, useKardexSummary } from "@/hooks/useKardexData";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export function KardexOptica() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [productoFilter, setProductoFilter] = useState<string>("todos");

  const { data: movements, isLoading } = useKardexMovements({ sistema: 'optica' });
  const { data: summary } = useKardexSummary();

  const opticaSummary = summary?.find(s => s.sistema === 'Óptica');

  const filteredMovements = movements?.filter((m) => {
    const matchesSearch = !searchTerm || 
      m.producto_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.documento_referencia?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'todos' || m.tipo_movimiento === tipoFilter;
    const matchesProducto = productoFilter === 'todos' || m.producto_codigo === productoFilter;
    
    return matchesSearch && matchesTipo && matchesProducto;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["kardex-movements"] });
    toast({
      title: "Actualizado",
      description: "Los datos de Óptica se han actualizado.",
    });
  };

  const handleExportExcel = () => {
    if (!filteredMovements?.length) return;

    const exportData = filteredMovements.map((m) => ({
      Fecha: format(new Date(m.fecha), "dd/MM/yyyy"),
      Tipo: m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
      Código: m.producto_codigo,
      Producto: m.producto_nombre,
      Cantidad: m.cantidad,
      'Stock Anterior': m.stock_anterior,
      'Stock Nuevo': m.stock_nuevo,
      'Costo Unitario': m.costo_unitario || '',
      'Costo Total': m.costo_total || '',
      Motivo: m.motivo,
      Documento: m.documento_referencia || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex Óptica");
    XLSX.writeFile(wb, `kardex_optica_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);

    toast({
      title: "Exportado",
      description: "El archivo Excel se ha descargado correctamente.",
    });
  };

  const uniqueProducts = [...new Set(movements?.map(m => m.producto_codigo))].filter(codigo => codigo && codigo.trim() !== "");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Glasses className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-purple-700">
              Kardex Óptica
            </h2>
            <p className="text-muted-foreground">
              Control de existencias de productos ópticos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleExportExcel} disabled={!filteredMovements?.length} className="bg-purple-600 hover:bg-purple-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Productos</p>
                <p className="text-2xl font-bold">{opticaSummary?.total_productos || 0}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600">{opticaSummary?.total_entradas || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Salidas</p>
                <p className="text-2xl font-bold text-red-600">{opticaSummary?.total_salidas || 0}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajo Stock</p>
                <p className="text-2xl font-bold text-orange-600">{opticaSummary?.productos_bajo_stock || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto, documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="salida">Salidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productoFilter} onValueChange={setProductoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los productos</SelectItem>
                {uniqueProducts.map((codigo) => (
                  <SelectItem key={codigo} value={codigo}>{codigo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Kardex</CardTitle>
          <CardDescription>
            {filteredMovements?.length || 0} movimientos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Stock Ant.</TableHead>
                  <TableHead className="text-right">Stock Nuevo</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                ) : filteredMovements?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                      No se encontraron movimientos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements?.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.fecha), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={movement.tipo_movimiento === 'entrada' ? 'default' : 'destructive'} 
                               className={movement.tipo_movimiento === 'entrada' ? 'bg-green-100 text-green-700' : ''}>
                          <span className="flex items-center gap-1">
                            {movement.tipo_movimiento === 'entrada' 
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />
                            }
                            {movement.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{movement.producto_codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{movement.producto_nombre}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={movement.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                          {movement.tipo_movimiento === 'entrada' ? '+' : '-'}{movement.cantidad}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{movement.stock_anterior}</TableCell>
                      <TableCell className="text-right font-medium">{movement.stock_nuevo}</TableCell>
                      <TableCell className="text-right">
                        {movement.costo_unitario ? `S/. ${movement.costo_unitario.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.costo_total ? `S/. ${movement.costo_total.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{movement.motivo}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.documento_referencia || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

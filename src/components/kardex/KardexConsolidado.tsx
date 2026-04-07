import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Calendar,
  Layers
} from "lucide-react";
import { useKardexMovements } from "@/hooks/useKardexData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export function KardexConsolidado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sistemaFilter, setSistemaFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const { data: movements, isLoading } = useKardexMovements({
    sistema: sistemaFilter !== 'todos' ? sistemaFilter : undefined,
    tipoMovimiento: tipoFilter !== 'todos' ? tipoFilter : undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
  });

  const filteredMovements = movements?.filter((m) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      m.producto_codigo.toLowerCase().includes(search) ||
      m.producto_nombre.toLowerCase().includes(search) ||
      m.documento_referencia?.toLowerCase().includes(search) ||
      m.motivo.toLowerCase().includes(search)
    );
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["kardex-movements"] });
    toast({
      title: "Actualizado",
      description: "Los movimientos se han actualizado.",
    });
  };

  const handleExportExcel = () => {
    if (!filteredMovements?.length) return;

    const exportData = filteredMovements.map((m) => ({
      Fecha: format(new Date(m.fecha), "dd/MM/yyyy"),
      Sistema: m.sistema.charAt(0).toUpperCase() + m.sistema.slice(1),
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
      Observaciones: m.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex Consolidado");
    XLSX.writeFile(wb, `kardex_consolidado_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);

    toast({
      title: "Exportado",
      description: "El archivo Excel se ha descargado correctamente.",
    });
  };

  const getSistemaBadgeColor = (sistema: string) => {
    switch (sistema) {
      case 'botica':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'optica':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'suministros':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-amber-700">
            Kardex Consolidado
          </h2>
          <p className="text-muted-foreground">
            Vista unificada de todos los movimientos de inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleExportExcel} disabled={!filteredMovements?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto, documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sistemaFilter} onValueChange={setSistemaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los sistemas</SelectItem>
                <SelectItem value="botica">Botica</SelectItem>
                <SelectItem value="optica">Óptica</SelectItem>
                <SelectItem value="suministros">Suministros</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="salida">Salidas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                placeholder="Desde"
              />
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                placeholder="Hasta"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Movimientos</p>
                <p className="text-2xl font-bold">{filteredMovements?.length || 0}</p>
              </div>
              <Layers className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredMovements?.filter(m => m.tipo_movimiento === 'entrada').length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredMovements?.filter(m => m.tipo_movimiento === 'salida').length || 0}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  S/. {(filteredMovements?.reduce((acc, m) => acc + (m.costo_total || 0), 0) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Stock Ant.</TableHead>
                  <TableHead className="text-right">Stock Nuevo</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
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
                    <TableRow key={`${movement.sistema}-${movement.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.fecha), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSistemaBadgeColor(movement.sistema)}>
                          {movement.sistema.charAt(0).toUpperCase() + movement.sistema.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${
                          movement.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.tipo_movimiento === 'entrada' 
                            ? <TrendingUp className="h-4 w-4" />
                            : <TrendingDown className="h-4 w-4" />
                          }
                          <span className="capitalize">{movement.tipo_movimiento}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{movement.producto_codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={movement.producto_nombre}>
                        {movement.producto_nombre}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={movement.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                          {movement.tipo_movimiento === 'entrada' ? '+' : '-'}{movement.cantidad}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{movement.stock_anterior}</TableCell>
                      <TableCell className="text-right font-medium">{movement.stock_nuevo}</TableCell>
                      <TableCell className="text-right">
                        {movement.costo_total 
                          ? `S/. ${movement.costo_total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` 
                          : '-'
                        }
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

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, RefreshCw, History } from "lucide-react";
import { useInventoryMovements } from "@/hooks/usePharmacyInventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export function PharmacyMovementHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { data: movements, isLoading } = useInventoryMovements();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
  };

  const filteredMovements = (movements || []).filter((mov) => {
    const matchesSearch =
      !searchTerm ||
      mov.medication?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.medication?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.movement_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.reference_document?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" ||
      mov.movement_type === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700 flex items-center gap-2">
          <History className="h-8 w-8" />
          Historial de Movimientos
        </h2>
        <p className="text-muted-foreground">
          Registro automático de todos los cambios de stock en el inventario
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Log de Movimientos</CardTitle>
              <CardDescription>
                Cada entrada, salida y edición de stock queda registrada automáticamente
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto, código, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Entrada">Entradas</SelectItem>
                <SelectItem value="Salida">Salidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron movimientos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Stock Anterior</TableHead>
                    <TableHead className="text-right">Stock Nuevo</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Documento Ref.</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={mov.movement_type === "Entrada" ? "default" : "secondary"}
                          className={
                            mov.movement_type === "Entrada"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }
                        >
                          {mov.movement_type === "Entrada" ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {mov.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{mov.medication?.descripcion || "-"}</div>
                          <code className="text-xs text-muted-foreground">{mov.medication?.codigo}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{mov.movement_reason}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={mov.movement_type === "Entrada" ? "text-green-600" : "text-red-600"}>
                          {mov.movement_type === "Entrada" ? "+" : "-"}{mov.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{mov.previous_stock}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{mov.new_stock}</TableCell>
                      <TableCell className="text-right text-sm">
                        {mov.unit_cost ? `S/. ${mov.unit_cost.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {mov.total_cost ? `S/. ${mov.total_cost.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm">{mov.reference_document || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {mov.observations || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {filteredMovements.length} movimientos registrados
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

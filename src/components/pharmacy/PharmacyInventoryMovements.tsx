
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Search } from "lucide-react";
import { usePharmacyEntries } from "@/hooks/usePharmacyEntries";
import { usePharmacyOutputs } from "@/hooks/usePharmacyOutputs";
import { NewMovementDialog } from "./NewMovementDialog";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

type FilterType = "total" | "today" | "thisWeek" | "lastMonth" | "month" | "year" | "date";

interface PharmacyInventoryMovementsProps {
  filterType?: FilterType;
  selectedMonth?: string;
  selectedYear?: string;
  selectedDate?: Date;
}

export function PharmacyInventoryMovements({ 
  filterType = "total",
  selectedMonth,
  selectedYear,
  selectedDate 
}: PharmacyInventoryMovementsProps) {
  const [showNewMovementDialog, setShowNewMovementDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementType, setMovementType] = useState<"all" | "entries" | "outputs">("all");
  
  const { data: entries, isLoading: isLoadingEntries } = usePharmacyEntries();
  const { data: outputs, isLoading: isLoadingOutputs } = usePharmacyOutputs();

  const isLoading = isLoadingEntries || isLoadingOutputs;

  // Apply date filter
  const getFilteredData = () => {
    if (!entries || !outputs) return { entries: [], outputs: [] };

    if (filterType === "total") {
      return { entries, outputs };
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (filterType) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "thisWeek":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "month":
        if (!selectedMonth) return { entries: [], outputs: [] };
        startDate = startOfMonth(new Date(selectedMonth));
        endDate = endOfMonth(new Date(selectedMonth));
        break;
      case "year":
        if (!selectedYear) return { entries: [], outputs: [] };
        startDate = new Date(parseInt(selectedYear), 0, 1);
        endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
        break;
      case "date":
        if (!selectedDate) return { entries: [], outputs: [] };
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      default:
        startDate = startOfDay(now);
    }

    const filteredEntries = entries.filter(entry => {
      const [year, month, day] = entry.date.split('-').map(Number);
      const entryDate = new Date(year, month - 1, day);
      const entryTime = entryDate.getTime();
      return entryTime >= startDate.getTime() && entryTime <= endDate.getTime();
    });

    const filteredOutputs = outputs.filter(output => {
      const [year, month, day] = output.date.split('-').map(Number);
      const outputDate = new Date(year, month - 1, day);
      const outputTime = outputDate.getTime();
      return outputTime >= startDate.getTime() && outputTime <= endDate.getTime();
    });

    return { entries: filteredEntries, outputs: filteredOutputs };
  };

  const { entries: filteredEntries, outputs: filteredOutputs } = getFilteredData();

  // Apply search filter
  const searchFilteredEntries = filteredEntries.filter(entry =>
    entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.product_code?.includes(searchTerm) ||
    entry.invoice_number?.includes(searchTerm)
  );

  const searchFilteredOutputs = filteredOutputs.filter(output =>
    output.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    output.product_code?.includes(searchTerm)
  );

  if (isLoading) {
    return <div>Cargando movimientos...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Movimientos de Inventario</CardTitle>
              <CardDescription>
                Registro de todas las entradas y salidas de medicamentos
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewMovementDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </div>

          <Tabs value={movementType} onValueChange={(value) => setMovementType(value as "all" | "entries" | "outputs")} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todos ({searchFilteredEntries.length + searchFilteredOutputs.length})
              </TabsTrigger>
              <TabsTrigger value="entries">
                Entradas ({searchFilteredEntries.length})
              </TabsTrigger>
              <TabsTrigger value="outputs">
                Salidas ({searchFilteredOutputs.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por medicamento, código o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {(movementType === "all" || movementType === "entries") && searchFilteredEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center text-green-600">
                <TrendingUp className="mr-2 h-5 w-5" />
                Entradas
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Unitario</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>N° Factura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchFilteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.description}</div>
                          <code className="text-xs text-muted-foreground">
                            {entry.product_code}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          +{entry.quantity_received || entry.quantity_requested}
                        </span>
                      </TableCell>
                      <TableCell>
                        S/. {entry.purchase_cost_per_unit?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        S/. {entry.total_amount?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>{entry.nsoc_rs || "-"}</TableCell>
                      <TableCell>{entry.invoice_number || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {(movementType === "all" || movementType === "outputs") && searchFilteredOutputs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center text-blue-600">
                <TrendingDown className="mr-2 h-5 w-5" />
                Salidas
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Medicamento</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Unitario</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Comentarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchFilteredOutputs.map((output) => (
                    <TableRow key={output.id}>
                      <TableCell>
                        {format(new Date(output.date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{output.description}</div>
                          <code className="text-xs text-muted-foreground">
                            {output.product_code}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          -{output.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        S/. {output.sale_cost_per_unit?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        S/. {output.total?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>{output.comments || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {searchFilteredEntries.length === 0 && searchFilteredOutputs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron movimientos
            </div>
          )}
        </CardContent>
      </Card>

      <NewMovementDialog
        open={showNewMovementDialog}
        onOpenChange={setShowNewMovementDialog}
      />
    </div>
  );
}

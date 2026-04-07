import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Calendar } from "lucide-react";
import { usePharmacyOutputs, usePharmacyOutputsCount, useDeleteOutput, PharmacyOutput } from "@/hooks/usePharmacyOutputs";
import { OutputDialog } from "./OutputDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper para formatear fechas locales sin interpretación UTC
const formatLocalDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "dd/MM/yyyy");
};

type FilterType = "total" | "today" | "date" | "month" | "year";

export function PharmacyOutputsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [editData, setEditData] = useState<PharmacyOutput | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [outputToDelete, setOutputToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Debounce search to avoid too many queries
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Determine limit based on filter type
  const limit = filterType === "total" ? 500 : 0; // 0 means no limit for specific date filters
  
  const filterValue = filterType === "date" 
    ? (selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined)
    : filterType === "month"
    ? selectedMonth
    : filterType === "year"
    ? selectedYear
    : undefined;

  const { data: outputs, isLoading, refetch } = usePharmacyOutputs(
    limit,
    filterType,
    filterValue,
    debouncedSearch
  );
  const { data: totalCount } = usePharmacyOutputsCount();
  const deleteOutput = useDeleteOutput();

  React.useEffect(() => {
    const savedConfig = localStorage.getItem("pharmacy_config");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setColumnVisibility(config.outputsColumns || {});
      } catch (error) {
        console.error("Error loading column config:", error);
      }
    }
  }, []);

  const handleEdit = (output: PharmacyOutput) => {
    setEditData(output);
    setShowOutputDialog(true);
  };

  const handleNewOutput = () => {
    setEditData(null);
    setShowOutputDialog(true);
  };

  const handleSuccess = () => {
    refetch();
  };

  const handleDeleteClick = (id: string) => {
    setOutputToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (outputToDelete) {
      await deleteOutput.mutateAsync(outputToDelete);
      setShowDeleteDialog(false);
      setOutputToDelete(null);
    }
  };

  // Client-side filtering adds patient, supplier, and laboratory name search (joined tables not fully indexed in server search)
  const filteredOutputs = outputs?.filter((output) => {
    if (!debouncedSearch) return true;
    
    const searchLower = debouncedSearch.toLowerCase();
    
    // Check patient name (not fully searchable on server due to join)
    const patientName = output.patient 
      ? `${output.patient.first_name} ${output.patient.last_name}`.toLowerCase()
      : "";
    
    // Check supplier name (joined table)
    const supplierName = output.supplier?.name?.toLowerCase() || "";
    
    // Check laboratory (joined table)
    const laboratory = output.medication?.laboratorio?.toLowerCase() || "";
    
    // Check all other fields client-side to ensure comprehensive search
    const productCode = output.medication?.codigo?.toLowerCase() || "";
    const description = output.medication?.descripcion?.toLowerCase() || "";
    const tipoSalida = output.tipo_salida?.toLowerCase() || "";
    const nroComprobante = output.nro_comprobante?.toLowerCase() || "";
    
    return patientName.includes(searchLower) || 
           supplierName.includes(searchLower) || 
           laboratory.includes(searchLower) ||
           productCode.includes(searchLower) ||
           description.includes(searchLower) ||
           tipoSalida.includes(searchLower) ||
           nroComprobante.includes(searchLower);
  }) || [];

  // Calculate total by date
  const totalsByDate = filteredOutputs?.reduce((acc, output) => {
    const date = output.date;
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += Number(output.quantity || 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate total amount
  const totalAmount = filteredOutputs?.reduce((sum, output) => {
    return sum + Number(output.total || 0);
  }, 0) || 0;

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleNewOutput}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Salida
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                Salidas de Inventario
                <Badge variant="secondary" className="text-base">
                  {totalCount || 0} registros
                </Badge>
              </CardTitle>
              <CardDescription>
                Mostrando: {filteredOutputs.length}
                {filterType === "total" && limit > 0 && ` (limitado a ${limit} registros más recientes)`}
              </CardDescription>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="total">Total</TabsTrigger>
              <TabsTrigger value="today">Hoy</TabsTrigger>
              <TabsTrigger value="date">Por Fecha</TabsTrigger>
              <TabsTrigger value="month">Por Mes</TabsTrigger>
              <TabsTrigger value="year">Por Año</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {filterType === "date" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {filterType === "month" && (
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-[200px]"
              />
            )}

            {filterType === "year" && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre, comprobante, paciente, proveedor o laboratorio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative max-h-[600px] overflow-auto">
          <Table className="relative border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
              <TableRow className="hover:bg-transparent">
                {(columnVisibility.fecha ?? true) && <TableHead className="bg-card">Fecha</TableHead>}
                {(columnVisibility.tipo_salida ?? true) && <TableHead className="bg-card">Tipo de Salida</TableHead>}
                {(columnVisibility.nro_comprobante ?? true) && <TableHead className="bg-card">Nro. Comprobante</TableHead>}
                {(columnVisibility.paciente ?? true) && <TableHead className="bg-card">Paciente/Proveedor</TableHead>}
                {(columnVisibility.cod_producto ?? true) && <TableHead className="bg-card">Cod. Del Producto</TableHead>}
                {(columnVisibility.descripcion ?? true) && <TableHead className="bg-card">Descripción</TableHead>}
                {(columnVisibility.cantidad ?? true) && <TableHead className="bg-card">Cantidad</TableHead>}
                {(columnVisibility.costo_venta ?? true) && <TableHead className="bg-card">Costo De Venta Por Und</TableHead>}
                {(columnVisibility.total ?? true) && <TableHead className="bg-card">Total</TableHead>}
                {(columnVisibility.comentarios ?? true) && <TableHead className="bg-card">Comentarios</TableHead>}
                {(columnVisibility.acciones ?? true) && <TableHead className="text-right bg-card">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOutputs?.map((output) => (
                <TableRow key={output.id}>
                  {(columnVisibility.fecha ?? true) && <TableCell>{formatLocalDate(output.date)}</TableCell>}
                  {(columnVisibility.tipo_salida ?? true) && <TableCell>{output.tipo_salida || "-"}</TableCell>}
                  {(columnVisibility.nro_comprobante ?? true) && <TableCell>{output.nro_comprobante || "-"}</TableCell>}
                  {(columnVisibility.paciente ?? true) && (
                    <TableCell>
                      {output.patient 
                        ? `${output.patient.first_name} ${output.patient.last_name}`
                        : output.supplier
                        ? output.supplier.name
                        : "-"}
                    </TableCell>
                  )}
                  {(columnVisibility.cod_producto ?? true) && <TableCell>{output.product_code || "-"}</TableCell>}
                  {(columnVisibility.descripcion ?? true) && <TableCell>{output.description || "-"}</TableCell>}
                  {(columnVisibility.cantidad ?? true) && <TableCell>{output.quantity}</TableCell>}
                  {(columnVisibility.costo_venta ?? true) && (
                    <TableCell>
                      {output.sale_cost_per_unit
                        ? `S/ ${output.sale_cost_per_unit.toFixed(2)}`
                        : "-"}
                    </TableCell>
                  )}
                  {(columnVisibility.total ?? true) && (
                    <TableCell>
                      {output.total ? `S/ ${output.total.toFixed(2)}` : "-"}
                    </TableCell>
                  )}
                  {(columnVisibility.comentarios ?? true) && <TableCell>{output.comments || "-"}</TableCell>}
                  {(columnVisibility.acciones ?? true) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(output)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(output.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredOutputs && filteredOutputs.length > 0 && (
                <TableRow className="font-bold bg-muted">
                  <TableCell colSpan={6}>Total de Salidas</TableCell>
                  <TableCell>
                    {Object.values(totalsByDate || {}).reduce((a, b) => a + b, 0)}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    S/ {totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <OutputDialog
        open={showOutputDialog}
        onOpenChange={setShowOutputDialog}
        editData={editData}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta salida del registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOutputToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

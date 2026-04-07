import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, PackageMinus, Download, Calendar, Filter } from "lucide-react";
import { format, startOfYear, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

// Helper to parse date string as local date (not UTC)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

import { usePharmacyOutputsPaginated, FilterType } from "@/hooks/usePharmacyOutputsPaginated";
import { useDeleteOutput } from "@/hooks/usePharmacyOutputs";
import { OutputDialog } from "./OutputDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";

type DateFilterType = "today" | "week" | "month" | "currentMonth" | "date" | "year" | "all";

export function PharmacyOutputsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewOutputOpen, setIsNewOutputOpen] = useState(false);
  const [editingOutput, setEditingOutput] = useState<any>(null);
  const [deletingOutput, setDeletingOutput] = useState<any>(null);
  const [pageSize, setPageSize] = useState(20);
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState<string>(() => format(new Date(), "yyyy"));
  
  // Excel download dialog state
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [excelStartDate, setExcelStartDate] = useState(() => {
    const firstDayOfYear = startOfYear(new Date());
    return format(firstDayOfYear, "yyyy-MM-dd");
  });
  const [excelEndDate, setExcelEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast } = useToast();

  // Calculate filter values based on selection
  const getFilterParams = (): { filterType: FilterType; filterValue?: string } => {
    const today = new Date();
    
    switch (dateFilterType) {
      case "today":
        return { filterType: "today" };
      case "week": {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return { 
          filterType: "date", 
          filterValue: `${format(weekStart, "yyyy-MM-dd")}|${format(weekEnd, "yyyy-MM-dd")}` 
        };
      }
      case "currentMonth": {
        return { 
          filterType: "month", 
          filterValue: format(today, "yyyy-MM") 
        };
      }
      case "month":
        return { filterType: "month", filterValue: selectedMonth };
      case "date":
        return { 
          filterType: "date", 
          filterValue: selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined 
        };
      case "year":
        return { filterType: "year", filterValue: selectedYear };
      case "all":
        return { filterType: "all" };
      default:
        return { filterType: "all" };
    }
  };

  const filterParams = getFilterParams();

  const { data: result, isLoading } = usePharmacyOutputsPaginated({
    page: currentPage,
    pageSize,
    filterType: filterParams.filterType,
    filterValue: filterParams.filterValue,
    searchTerm,
  });

  const outputs = result?.data || [];
  const totalPages = result?.totalPages || 1;
  const totalCount = result?.totalCount || 0;

  const deleteOutput = useDeleteOutput();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleDateFilterChange = (value: DateFilterType) => {
    setDateFilterType(value);
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (deletingOutput) {
      await deleteOutput.mutateAsync(deletingOutput.id);
      setDeletingOutput(null);
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase
        .from("pharmacy_outputs")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo, laboratorio),
          patient:patients(first_name, last_name, dni),
          supplier:pharmacy_suppliers(name)
        `)
        .gte("date", excelStartDate)
        .lte("date", excelEndDate)
        .order("date", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay salidas en el rango de fechas seleccionado",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      const excelData = data.map((output) => ({
        Fecha: format(parseLocalDate(output.date), "dd/MM/yyyy"),
        "Nro Comprobante": output.nro_comprobante || "",
        "Tipo Salida": output.tipo_salida || "",
        Código: output.product_code || output.medication?.codigo || "",
        Producto: output.medication?.descripcion || output.description || "",
        Laboratorio: output.medication?.laboratorio || "",
        Paciente: output.patient ? `${output.patient.first_name} ${output.patient.last_name}` : "",
        "DNI Paciente": output.patient?.dni || "",
        Proveedor: output.supplier?.name || "",
        Cantidad: output.quantity || 0,
        "Precio Unitario": output.sale_cost_per_unit || 0,
        Total: output.total || 0,
        "Motivo Ajuste": output.motivo_ajuste || "",
        Comentarios: output.comments || "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salidas");

      ws["!cols"] = [
        { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 40 },
        { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 10 },
        { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
      ];

      const fileName = `Salidas_${format(new Date(excelStartDate), "ddMMyyyy")}_${format(new Date(excelEndDate), "ddMMyyyy")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel descargado",
        description: `Se descargaron ${data.length} registros correctamente`,
      });

      setIsExcelDialogOpen(false);
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getTipoSalidaBadge = (tipo: string | undefined) => {
    switch (tipo) {
      case "Salida por comprobante":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Comprobante</Badge>;
      case "Salida por ajuste":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ajuste</Badge>;
      case "Salida por devolución":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Devolución</Badge>;
      default:
        return <Badge variant="secondary">{tipo || "Sin tipo"}</Badge>;
    }
  };

  const isAnulado = (output: any) => output.comments === "ANULADO";

  const getFilterLabel = () => {
    switch (dateFilterType) {
      case "today": return "Hoy";
      case "week": return "Semana Actual";
      case "currentMonth": return "Mes Actual";
      case "month": return `Mes: ${format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: es })}`;
      case "date": return selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Fecha";
      case "year": return `Año: ${selectedYear}`;
      case "all": return "Todo";
      default: return "Filtrar";
    }
  };

  // Generate years for selection (last 5 years)
  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  // Generate months for selection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(parseInt(selectedYear), i, 1);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: es })
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salidas</h1>
          <p className="text-muted-foreground">Listado completo de salidas de productos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsExcelDialogOpen(true)}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
          <Button onClick={() => setIsNewOutputOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Salida
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PackageMinus className="h-5 w-5" />
                Salidas
                <Badge variant="outline" className="ml-2">{totalCount} registros</Badge>
              </CardTitle>
              <div className="relative w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por comprobante, producto..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                <Button
                  variant={dateFilterType === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange("today")}
                  className={dateFilterType === "today" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Hoy
                </Button>
                <Button
                  variant={dateFilterType === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange("week")}
                  className={dateFilterType === "week" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Semana Actual
                </Button>
                <Button
                  variant={dateFilterType === "currentMonth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange("currentMonth")}
                  className={dateFilterType === "currentMonth" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Mes Actual
                </Button>
                
                {/* Month Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateFilterType === "month" ? "default" : "outline"}
                      size="sm"
                      className={dateFilterType === "month" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Mes
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 bg-background" align="start">
                    <Select 
                      value={selectedMonth} 
                      onValueChange={(value) => {
                        setSelectedMonth(value);
                        setDateFilterType("month");
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>

                {/* Date Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateFilterType === "date" ? "default" : "outline"}
                      size="sm"
                      className={dateFilterType === "date" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Fecha
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          setDateFilterType("date");
                          setCurrentPage(1);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Year Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateFilterType === "year" ? "default" : "outline"}
                      size="sm"
                      className={dateFilterType === "year" ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      Año
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-2 bg-background" align="start">
                    <Select 
                      value={selectedYear} 
                      onValueChange={(value) => {
                        setSelectedYear(value);
                        setDateFilterType("year");
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>

                <Button
                  variant={dateFilterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateFilterChange("all")}
                  className={dateFilterType === "all" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Todo
                </Button>
              </div>
              
              {dateFilterType !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {getFilterLabel()}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : outputs && outputs.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nro Comprobante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outputs.map((output, index) => (
                      <TableRow key={output.id} className={`hover:bg-muted/30 ${isAnulado(output) ? "opacity-50" : ""}`}>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {(currentPage - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          {format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {output.nro_comprobante || "-"}
                          {isAnulado(output) && (
                            <Badge variant="destructive" className="ml-2">ANULADO</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getTipoSalidaBadge(output.tipo_salida)}</TableCell>
                        <TableCell className="font-mono text-sm">{output.product_code || output.medication?.codigo || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {output.medication?.descripcion || output.description || "-"}
                        </TableCell>
                        <TableCell>
                          {output.patient 
                            ? `${output.patient.first_name} ${output.patient.last_name}` 
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {output.quantity || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {(output.total || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingOutput(output)}
                              disabled={isAnulado(output)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingOutput(output)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Fila de totales */}
                    <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
                      <TableCell colSpan={7} className="text-right">
                        Totales de página:
                      </TableCell>
                      <TableCell className="text-center text-green-700">
                        {outputs.reduce((sum, output) => sum + (output.quantity || 0), 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        S/ {outputs.reduce((sum, output) => sum + (output.total || 0), 0).toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="99999">Todo</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">por página</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron salidas para el filtro seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OutputDialog open={isNewOutputOpen} onOpenChange={setIsNewOutputOpen} />

      {editingOutput && (
        <OutputDialog
          open={!!editingOutput}
          onOpenChange={(open) => !open && setEditingOutput(null)}
          editData={editingOutput}
        />
      )}

      <AlertDialog open={!!deletingOutput} onOpenChange={(open) => !open && setDeletingOutput(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar salida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta salida del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel Download Dialog */}
      <Dialog open={isExcelDialogOpen} onOpenChange={setIsExcelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Descargar Salidas Excel
            </DialogTitle>
            <DialogDescription>
              Seleccione el rango de fechas para descargar las salidas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de inicio
              </Label>
              <Input
                id="start-date"
                type="date"
                value={excelStartDate}
                onChange={(e) => setExcelStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de término
              </Label>
              <Input
                id="end-date"
                type="date"
                value={excelEndDate}
                onChange={(e) => setExcelEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExcelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDownloadExcel} 
              disabled={isDownloading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

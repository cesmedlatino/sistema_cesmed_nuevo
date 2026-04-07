import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, PackageOpen, Calendar, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { usePharmacyEntriesPaginated, useDeleteEntry, FilterType } from "@/hooks/usePharmacyEntriesPaginated";
import { NewEntryDialog } from "./NewEntryDialog";
import { EditEntryDialog } from "./EditEntryDialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

type DateFilterType = "today" | "week" | "month" | "currentMonth" | "date" | "year" | "all";

export function PharmacyEntriesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deletingEntry, setDeletingEntry] = useState<any>(null);
  const [pageSize, setPageSize] = useState(20);
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState<string>(() => format(new Date(), "yyyy"));

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

  const { data: result, isLoading } = usePharmacyEntriesPaginated({
    page: currentPage,
    pageSize,
    filterType: filterParams.filterType,
    filterValue: filterParams.filterValue,
    searchTerm,
  });

  const entries = result?.data || [];
  const totalPages = result?.totalPages || 1;
  const totalCount = result?.totalCount || 0;

  const deleteEntry = useDeleteEntry();

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
    if (deletingEntry) {
      await deleteEntry.mutateAsync(deletingEntry.id);
      setDeletingEntry(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Pagado":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagado</Badge>;
      case "Pendiente":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
      case "Cancelado":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>;
      case "Donación":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Donación</Badge>;
      default:
        return <Badge variant="secondary">{status || "Sin estado"}</Badge>;
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Entradas</h1>
          <p className="text-muted-foreground">Listado completo de entradas de productos</p>
        </div>
        <Button onClick={() => setIsNewEntryOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entrada
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5" />
                Entradas
                <Badge variant="outline" className="ml-2">{totalCount} registros</Badge>
              </CardTitle>
              <div className="relative w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por factura, proveedor, producto..."
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
          ) : entries && entries.length > 0 ? (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nro Factura</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {(currentPage - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell>
                          {entry.date ? format(new Date(`${entry.date}T00:00:00`), "dd/MM/yyyy", { locale: es }) : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.invoice_number || "-"}
                        </TableCell>
                        <TableCell>{entry.supplier?.name || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.product_code || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.medication?.descripcion || entry.description || "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {entry.quantity_received || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/ {(entry.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.payment_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingEntry(entry)}
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
                      <TableCell colSpan={6} className="text-right">
                        Totales de página:
                      </TableCell>
                      <TableCell className="text-center text-green-700">
                        {entries.reduce((sum, entry) => sum + (entry.quantity_received || 0), 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        S/ {entries.reduce((sum, entry) => sum + (entry.total_amount || 0), 0).toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
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
              No se encontraron entradas para el filtro seleccionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <NewEntryDialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen} />

      {editingEntry && (
        <EditEntryDialog
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          entry={editingEntry}
        />
      )}

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta entrada del sistema.
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
    </div>
  );
}

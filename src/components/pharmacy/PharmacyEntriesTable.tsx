import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { 
  usePharmacyEntriesPaginated, 
  useDeleteEntry,
  type FilterType,
  type PharmacyEntry
} from "@/hooks/usePharmacyEntriesPaginated";
import { NewEntryDialog } from "./NewEntryDialog";
import { EditEntryDialog } from "./EditEntryDialog";
import { format, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PAGE_SIZE = 100;

export function PharmacyEntriesTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);
  const [showEditEntryDialog, setShowEditEntryDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PharmacyEntry | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

  // Calculate filter value based on filter type
  const filterValue = useMemo(() => {
    if (filterType === "date" && selectedDate) {
      return format(selectedDate, "yyyy-MM-dd");
    }
    if (filterType === "month") {
      return selectedMonth;
    }
    if (filterType === "year") {
      return selectedYear;
    }
    return undefined;
  }, [filterType, selectedDate, selectedMonth, selectedYear]);

  // Fetch paginated data
  const { data: paginatedData, isLoading, isFetching, isError } = usePharmacyEntriesPaginated({
    page: currentPage,
    pageSize: PAGE_SIZE,
    filterType,
    filterValue,
    searchTerm: debouncedSearch
  });

  const deleteEntry = useDeleteEntry();

  // Load column visibility config
  useEffect(() => {
    const savedConfig = localStorage.getItem("pharmacy_config");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setColumnVisibility(config.entriesColumns || {});
      } catch (error) {
        console.error("Error loading column config:", error);
      }
    }
  }, []);

  // Extract data from query result
  const entries = paginatedData?.data || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Data comes pre-filtered from the hook
  const filteredEntries = entries;

  // Handle delete
  const handleDeleteClick = useCallback((id: string) => {
    setEntryToDelete(id);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry.mutateAsync(entryToDelete);
      setShowDeleteDialog(false);
      setEntryToDelete(null);
    }
  };

  // Handle filter change
  const handleFilterTypeChange = useCallback((value: string) => {
    setFilterType(value as FilterType);
    setSearchTerm(""); // Clear search when changing filter
    setDebouncedSearch("");
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    document.querySelector('.pharmacy-entries-table')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Calculate visible pages for pagination
  const visiblePages = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 4) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('ellipsis');
      }
      
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [totalPages, currentPage]);

  // Column visibility helper
  const isColumnVisible = useCallback((key: string) => columnVisibility[key] ?? true, [columnVisibility]);

  return (
    <Card className="pharmacy-entries-table">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => setShowNewEntryDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entrada
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                Entradas de Inventario
                <Badge variant="secondary" className="text-base">
                  {totalCount.toLocaleString()} registros
                </Badge>
                {isFetching && !isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>
                Página {currentPage} de {totalPages} | Mostrando {filteredEntries.length} de {PAGE_SIZE} por página
              </CardDescription>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Tabs value={filterType} onValueChange={handleFilterTypeChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">Hoy</TabsTrigger>
              <TabsTrigger value="date">Por Fecha</TabsTrigger>
              <TabsTrigger value="month">Por Mes</TabsTrigger>
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


            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nombre, factura, proveedor o laboratorio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar las entradas. Por favor intente de nuevo.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Cargando entradas...</span>
          </div>
        ) : (
          <>
            <div className="rounded-md border relative max-h-[500px] overflow-auto">
              <Table className="relative border-separate border-spacing-0">
                <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
                  <TableRow className="hover:bg-transparent">
                    {isColumnVisible('acciones') && <TableHead className="bg-card">Acciones</TableHead>}
                    {isColumnVisible('proveedor') && <TableHead className="bg-card">Proveedor</TableHead>}
                    {isColumnVisible('nro_factura') && <TableHead className="bg-card">Nro Factura</TableHead>}
                    {isColumnVisible('fecha') && <TableHead className="bg-card">Fecha</TableHead>}
                    {isColumnVisible('num_cajas') && <TableHead className="bg-card">N° Cajas</TableHead>}
                    {isColumnVisible('cod_producto') && <TableHead className="bg-card">Cod. Del Producto</TableHead>}
                    {isColumnVisible('descripcion') && <TableHead className="bg-card">Descripción</TableHead>}
                    {isColumnVisible('forma_farmaceutica') && <TableHead className="bg-card">Forma Farmaceutica</TableHead>}
                    {isColumnVisible('laboratorio') && <TableHead className="bg-card">Laboratorio</TableHead>}
                    {isColumnVisible('lote') && <TableHead className="bg-card">Lote</TableHead>}
                    {isColumnVisible('nsoc_rs') && <TableHead className="bg-card">NSOC/RS</TableHead>}
                    {isColumnVisible('fecha_venc') && <TableHead className="bg-card">Fecha Venc</TableHead>}
                    {isColumnVisible('presentacion') && <TableHead className="bg-card">Presentación</TableHead>}
                    {isColumnVisible('cant_solicitada') && <TableHead className="bg-card">Cant. Solicitada</TableHead>}
                    {isColumnVisible('cant_recibida') && <TableHead className="bg-card">Cant. Recibida</TableHead>}
                    {isColumnVisible('se_acepta') && <TableHead className="bg-card">Se Acepta</TableHead>}
                    {isColumnVisible('observaciones') && <TableHead className="bg-card">Observaciones</TableHead>}
                    {isColumnVisible('precio_entrada') && <TableHead className="bg-card">Precio Entrada</TableHead>}
                    {isColumnVisible('precio_venta') && <TableHead className="bg-card">Precio de Venta</TableHead>}
                    {isColumnVisible('credito_contado') && <TableHead className="bg-card">Crédito/Contado</TableHead>}
                    {isColumnVisible('fecha_venc_factura') && <TableHead className="bg-card">Fecha Venc Factura</TableHead>}
                    {isColumnVisible('estado') && <TableHead className="bg-card">Estado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={22} className="text-center py-8 text-muted-foreground">
                        {isError 
                          ? "Error al cargar los datos" 
                          : "No se encontraron entradas para los filtros seleccionados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        {isColumnVisible('acciones') && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setShowEditEntryDialog(true);
                                }}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(entry.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible('proveedor') && <TableCell>{entry.supplier?.name || "-"}</TableCell>}
                        {isColumnVisible('nro_factura') && <TableCell>{entry.invoice_number || "-"}</TableCell>}
                        {isColumnVisible('fecha') && (
                          <TableCell>
                            {entry.date ? format(parseISO(entry.date), "dd/MM/yyyy") : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible('num_cajas') && <TableCell>{entry.num_boxes || "-"}</TableCell>}
                        {isColumnVisible('cod_producto') && <TableCell>{entry.product_code || "-"}</TableCell>}
                        {isColumnVisible('descripcion') && <TableCell>{entry.description || "-"}</TableCell>}
                        {isColumnVisible('forma_farmaceutica') && <TableCell>{entry.pharmaceutical_form || "-"}</TableCell>}
                        {isColumnVisible('laboratorio') && <TableCell>{entry.laboratory || "-"}</TableCell>}
                        {isColumnVisible('lote') && <TableCell>{entry.batch || "-"}</TableCell>}
                        {isColumnVisible('nsoc_rs') && <TableCell>{entry.nsoc_rs || "-"}</TableCell>}
                        {isColumnVisible('fecha_venc') && (
                          <TableCell>
                            {entry.expiry_date
                              ? format(parseISO(entry.expiry_date), "MM/yyyy")
                              : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible('presentacion') && <TableCell>{entry.presentation || "-"}</TableCell>}
                        {isColumnVisible('cant_solicitada') && <TableCell>{entry.quantity_requested || "-"}</TableCell>}
                        {isColumnVisible('cant_recibida') && <TableCell>{entry.quantity_received || "-"}</TableCell>}
                        {isColumnVisible('se_acepta') && <TableCell>{entry.is_accepted ? "Sí" : "No"}</TableCell>}
                        {isColumnVisible('observaciones') && <TableCell>{entry.observations || "-"}</TableCell>}
                        {isColumnVisible('precio_entrada') && (
                          <TableCell>
                            {entry.purchase_cost_per_unit
                              ? `S/ ${entry.purchase_cost_per_unit.toFixed(2)}`
                              : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible('precio_venta') && (
                          <TableCell>
                            {entry.medication?.precio_venta
                              ? `S/ ${entry.medication.precio_venta.toFixed(2)}`
                              : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible('credito_contado') && <TableCell>{entry.payment_type || "-"}</TableCell>}
                        {isColumnVisible('fecha_venc_factura') && (
                          <TableCell>
                            {entry.invoice_due_date
                              ? format(parseISO(entry.invoice_due_date), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                        )}
                        {isColumnVisible('estado') && (
                          <TableCell>
                            <Badge
                              variant={
                                entry.payment_status === "Pagado"
                                  ? "default"
                                  : entry.payment_status === "Cancelado"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {entry.payment_status || "Pendiente"}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {visiblePages.map((page, index) => (
                      <PaginationItem key={index}>
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Dialogs */}
      <NewEntryDialog
        open={showNewEntryDialog}
        onOpenChange={setShowNewEntryDialog}
      />

      {selectedEntry && (
        <EditEntryDialog
          open={showEditEntryDialog}
          onOpenChange={(open) => {
            setShowEditEntryDialog(open);
            if (!open) setSelectedEntry(null);
          }}
          entry={selectedEntry}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La entrada será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

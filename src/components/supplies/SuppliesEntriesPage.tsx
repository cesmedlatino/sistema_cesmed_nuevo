import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, PackageOpen, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  SuppliesEntry,
  useDeleteSuppliesEntry,
  useSuppliesEntriesPaginated,
} from "@/hooks/useSuppliesEntries";
import { SuppliesNewEntryDialog } from "@/components/supplies/SuppliesNewEntryDialog";

export function SuppliesEntriesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<SuppliesEntry | null>(null);
  const [pageSize, setPageSize] = useState(10);

  const { data: result, isLoading } = useSuppliesEntriesPaginated(currentPage, pageSize, searchTerm);
  const deleteEntry = useDeleteSuppliesEntry();

  const entries = result?.data || [];
  const totalPages = result?.totalPages || 1;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (!deletingEntry) return;
    await deleteEntry.mutateAsync(deletingEntry.id);
    setDeletingEntry(null);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "Pagado":
        return <Badge>Pagado</Badge>;
      case "Pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "Cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status || "Sin estado"}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entradas</h1>
          <p className="text-muted-foreground">Listado completo de entradas de suministros</p>
        </div>
        <Button onClick={() => setIsNewEntryOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entrada
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" />
              Todas las Entradas
            </CardTitle>
            <div className="relative w-80 max-w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por factura, código, descripción..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : entries.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {entry.date
                          ? format(new Date(`${entry.date}T00:00:00`), "dd/MM/yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{entry.invoice_number || "-"}</TableCell>
                      <TableCell>{entry.supplier?.name || "-"}</TableCell>
                      <TableCell>{entry.product_code || entry.medication?.codigo || "-"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {entry.medication?.descripcion || entry.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">{entry.quantity_received || 0}</TableCell>
                      <TableCell className="text-right">
                        S/{" "}
                        {(
                          entry.total_amount ||
                          (entry.quantity_received || 0) * (entry.purchase_cost_per_unit || 0) ||
                          0
                        ).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingEntry(entry)}
                            className="text-destructive hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[90px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">registros</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No se encontraron entradas</div>
          )}
        </CardContent>
      </Card>

      <SuppliesNewEntryDialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen} />

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
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

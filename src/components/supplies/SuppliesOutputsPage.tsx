import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, PackageMinus, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { SuppliesOutput, useDeleteSuppliesOutput, useSuppliesOutputsPaginated } from "@/hooks/useSuppliesOutputs";
import { SuppliesOutputDialog } from "@/components/supplies/SuppliesOutputDialog";

// Helper to parse date string as local date (not UTC)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function SuppliesOutputsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewOutputOpen, setIsNewOutputOpen] = useState(false);
  const [deletingOutput, setDeletingOutput] = useState<SuppliesOutput | null>(null);
  const [pageSize, setPageSize] = useState(10);

  const { data: result, isLoading } = useSuppliesOutputsPaginated(currentPage, pageSize, searchTerm);
  const deleteOutput = useDeleteSuppliesOutput();

  const outputs = result?.data || [];
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
    if (!deletingOutput) return;
    await deleteOutput.mutateAsync(deletingOutput.id);
    setDeletingOutput(null);
  };

  const getTipoSalidaBadge = (tipo: string | null | undefined) => {
    switch (tipo) {
      case "Salida por comprobante":
        return <Badge>Comprobante</Badge>;
      case "Salida por ajuste":
        return <Badge variant="secondary">Ajuste</Badge>;
      case "Salida por devolución":
        return <Badge variant="outline">Devolución</Badge>;
      default:
        return <Badge variant="outline">{tipo || "Sin tipo"}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salidas</h1>
          <p className="text-muted-foreground">Listado completo de salidas de suministros</p>
        </div>
        <Button onClick={() => setIsNewOutputOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Salida
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Todas las Salidas
            </CardTitle>
            <div className="relative w-80 max-w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprobante, código, descripción..."
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
          ) : outputs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {outputs.map((output) => (
                    <TableRow key={output.id}>
                      <TableCell>{format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell className="font-medium">{output.nro_comprobante || "-"}</TableCell>
                      <TableCell>{getTipoSalidaBadge(output.tipo_salida)}</TableCell>
                      <TableCell>{output.product_code || output.medication?.codigo || "-"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {output.medication?.descripcion || output.description || "-"}
                      </TableCell>
                      <TableCell>
                        {output.patient ? `${output.patient.first_name} ${output.patient.last_name}` : "-"}
                      </TableCell>
                      <TableCell className="text-center">{output.quantity || 0}</TableCell>
                      <TableCell className="text-right">S/ {(output.total || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingOutput(output)}
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
            <div className="text-center py-8 text-muted-foreground">No se encontraron salidas</div>
          )}
        </CardContent>
      </Card>

      <SuppliesOutputDialog open={isNewOutputOpen} onOpenChange={setIsNewOutputOpen} />

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
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

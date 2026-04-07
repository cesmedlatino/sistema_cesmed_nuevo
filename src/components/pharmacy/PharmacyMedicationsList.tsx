
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { usePharmacyMedications, useDeleteMedication, usePermanentDeleteMedication } from "@/hooks/usePharmacyMedications";
import { EditMedicationDialog } from "./EditMedicationDialog";
import { NewMedicationDialog } from "./NewMedicationDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDebounce } from "@/hooks/use-debounce";
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

interface PharmacyMedicationsListProps {
  initialFilter?: "all" | "low_stock" | "near_expiry";
}

export function PharmacyMedicationsList({ initialFilter = "all" }: PharmacyMedicationsListProps) {
  const [inputValue, setInputValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low_stock" | "near_expiry">(initialFilter);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Debounce search term to improve UX and reduce API calls
  const debouncedSearchTerm = useDebounce(inputValue, 400);
  
  const { data: medications, isLoading } = usePharmacyMedications(0, debouncedSearchTerm);
  const deleteMutation = useDeleteMedication();
  const permanentDeleteMutation = usePermanentDeleteMedication();

  // Apply filter based on type (search is now done server-side)
  const getFilteredMedications = () => {
    if (!medications) return [];
    
    let filtered = medications;
    
    // Apply type filter
    if (filterType === "low_stock") {
      filtered = filtered.filter(med => med.stock_actual <= (med.min_stock_level || 10));
    } else if (filterType === "near_expiry") {
      const now = new Date();
      filtered = filtered.filter(med => {
        if (!med.fecha_vencimiento) return false;
        const expiryDate = new Date(med.fecha_vencimiento);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= (med.days_before_expiry_alert || 30) && daysUntilExpiry > 0;
      });
    }
    
    return filtered;
  };

  const filteredMedications = getFilteredMedications();

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmSoftDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const confirmPermanentDelete = () => {
    if (deleteId) {
      permanentDeleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleEditMedication = (medication) => {
    setSelectedMedication(medication);
    setShowEditDialog(true);
  };

  const getStockStatus = (stock, minStock) => {
    if (stock <= 0) return { color: "destructive" as const, text: "Sin Stock" };
    if (stock <= minStock) return { color: "secondary" as const, text: "Stock Bajo" };
    return { color: "default" as const, text: "Disponible" };
  };

  const getExpiryStatus = (expiryDate, alertDays) => {
    const today = new Date();
    const expiry = new Date(expiryDate + 'T00:00:00');
    const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToExpiry <= 0) return { color: "destructive" as const, text: "Vencido" };
    if (daysToExpiry <= alertDays) return { color: "secondary" as const, text: `${daysToExpiry} días` };
    
    // Extract month and year directly from the string to avoid timezone issues
    const [year, month] = expiryDate.split('-');
    return { color: "default" as const, text: `${month}/${year}` };
  };

  if (isLoading) {
    return <div>Cargando productos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Gestión de Productos
              <Badge variant="secondary" className="text-base">
                {filteredMedications.length} productos
              </Badge>
            </CardTitle>
            <CardDescription>
              Lista completa de productos registrados en el sistema
            </CardDescription>
          </div>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
        
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as "all" | "low_stock" | "near_expiry")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="low_stock">Stock Bajo</TabsTrigger>
            <TabsTrigger value="near_expiry">Por Vencer</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, principio activo o código..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative max-h-[600px] overflow-auto">
          <Table className="relative border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
              <TableRow className="hover:bg-transparent">
              <TableHead className="bg-card">Código</TableHead>
              <TableHead className="bg-card">Descripción</TableHead>
              <TableHead className="bg-card">Forma Farmacéutica</TableHead>
              <TableHead className="bg-card">Laboratorio</TableHead>
              <TableHead className="bg-card">Lote</TableHead>
              <TableHead className="bg-card">Fecha Vencimiento</TableHead>
              <TableHead className="bg-card">Presentación</TableHead>
              <TableHead className="bg-card">Stock Inicial</TableHead>
              <TableHead className="bg-card">Entrada</TableHead>
              <TableHead className="bg-card">Salida</TableHead>
              <TableHead className="bg-card">Stock Actual</TableHead>
              <TableHead className="bg-card">Precio Venta</TableHead>
              <TableHead className="bg-card">Comentarios</TableHead>
              <TableHead className="bg-card">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredMedications.map((medication) => {
              const stockStatus = getStockStatus(medication.stock_actual, medication.min_stock_level);
              const expiryStatus = medication.fecha_vencimiento 
                ? getExpiryStatus(medication.fecha_vencimiento, medication.days_before_expiry_alert)
                : { color: "default" as const, text: "No especificado" };
              
              return (
                <TableRow key={medication.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {medication.codigo || "N/A"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{medication.descripcion}</div>
                  </TableCell>
                  <TableCell>{medication.forma_farmaceutica || "N/A"}</TableCell>
                  <TableCell>{medication.laboratorio || "N/A"}</TableCell>
                  <TableCell>{medication.lote || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={expiryStatus.color}>
                      {expiryStatus.text}
                    </Badge>
                  </TableCell>
                  <TableCell>{medication.presentation || "N/A"}</TableCell>
                  <TableCell>{medication.stock_inicial}</TableCell>
                  <TableCell>{medication.entrada}</TableCell>
                  <TableCell>{medication.salida}</TableCell>
                  <TableCell>
                    <Badge variant={stockStatus.color}>
                      {medication.stock_actual}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {medication.precio_venta ? `S/ ${medication.precio_venta}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {medication.comentarios || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMedication(medication)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(medication.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>

      <NewMedicationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />

      <EditMedicationDialog
        medication={selectedMedication}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo desea eliminar el producto?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <strong className="text-foreground">Marcar como inactivo:</strong>
                <p className="text-sm">El producto no se mostrará en el inventario pero se mantendrá en el sistema para consultas históricas.</p>
              </div>
              <div>
                <strong className="text-foreground">Eliminar permanentemente:</strong>
                <p className="text-sm text-destructive">Esta acción eliminará el producto de forma permanente del sistema. Esta acción no se puede deshacer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={confirmSoftDelete}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Marcar como inactivo
            </Button>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Phone, Truck, Trash2 } from "lucide-react";
import { usePharmacySuppliers, useUpdateSupplier, PharmacySupplier } from "@/hooks/usePharmacySuppliers";
import { SuppliesNewSupplierDialog } from "./SuppliesNewSupplierDialog";
import { SuppliesEditSupplierDialog } from "./SuppliesEditSupplierDialog";
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

export function SuppliesSuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<PharmacySupplier | null>(null);
  const { data: suppliers, isLoading } = usePharmacySuppliers();
  const updateSupplier = useUpdateSupplier();

  const handleEdit = (supplier: PharmacySupplier) => {
    setSelectedSupplier(supplier);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (supplier: PharmacySupplier) => {
    setSelectedSupplier(supplier);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    await updateSupplier.mutateAsync({
      id: selectedSupplier.id,
      status: "Inactivo"
    });
    setShowDeleteConfirm(false);
    setSelectedSupplier(null);
  };

  // Filter by specialty "suministros" or general and search term
  const filteredSuppliers = suppliers?.filter(supplier => {
    const hasSuppliesSpecialty = supplier.specialty?.toLowerCase().includes("suministro") || 
      supplier.specialty?.toLowerCase().includes("insumo") ||
      supplier.specialty?.toLowerCase().includes("material");
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.razon_social?.toLowerCase().includes(searchTerm.toLowerCase());
    return hasSuppliesSpecialty && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-orange-700">
            Gestión de Proveedores
          </h2>
          <p className="text-muted-foreground">
            Administra los proveedores de suministros médicos
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Lista de Proveedores
          </CardTitle>
          <CardDescription>
            Proveedores registrados en el sistema
          </CardDescription>
          <div className="flex items-center space-x-2 pt-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUC, razón social o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron proveedores. Registra proveedores con especialidad "Suministros", "Insumos" o "Materiales".
            </div>
          ) : (
            <div className="rounded-md border relative max-h-[600px] overflow-auto">
              <Table className="relative border-separate border-spacing-0">
                <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="bg-card">RUC</TableHead>
                    <TableHead className="bg-card">Razón Social</TableHead>
                    <TableHead className="bg-card">Proveedor</TableHead>
                    <TableHead className="bg-card">Contacto</TableHead>
                    <TableHead className="bg-card">Teléfono</TableHead>
                    <TableHead className="bg-card">Categoría</TableHead>
                    <TableHead className="bg-card">Estado</TableHead>
                    <TableHead className="bg-card">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono text-sm">
                        {supplier.ruc || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{supplier.razon_social || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.address && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {supplier.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.contact_person || "-"}</TableCell>
                      <TableCell>
                        {supplier.phone ? (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {supplier.phone}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{supplier.specialty || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={supplier.status === "Activo" ? "default" : "secondary"}
                          className={supplier.status === "Activo" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                        >
                          {supplier.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(supplier)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SuppliesNewSupplierDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />

      {selectedSupplier && (
        <SuppliesEditSupplierDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          supplier={selectedSupplier}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará al proveedor "{selectedSupplier?.name}" como inactivo.
              Podrá ser reactivado posteriormente si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

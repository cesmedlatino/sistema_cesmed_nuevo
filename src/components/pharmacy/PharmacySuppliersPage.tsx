import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Phone, Mail } from "lucide-react";
import { usePharmacySuppliers, type PharmacySupplier } from "@/hooks/usePharmacySuppliers";
import { SuppliersCSVImporter } from "./SuppliersCSVImporter";
import { NewSupplierDialog } from "./NewSupplierDialog";
import { EditSupplierDialog } from "./EditSupplierDialog";

export function PharmacySuppliersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<PharmacySupplier | null>(null);
  const { data: suppliers, isLoading, refetch } = usePharmacySuppliers();

  const handleEdit = (supplier: PharmacySupplier) => {
    setSelectedSupplier(supplier);
    setShowEditDialog(true);
  };

  const filteredSuppliers = suppliers?.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div>Cargando proveedores...</div>;
  }

  return (
    <div className="space-y-6">
      <SuppliersCSVImporter onImportComplete={() => refetch()} />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-green-700">
            Gestión de Proveedores
          </h2>
          <p className="text-muted-foreground">
            Administra los proveedores de medicamentos
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Proveedores registrados en el sistema
          </CardDescription>
          <div className="flex items-center space-x-2">
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
          <div className="rounded-md border relative max-h-[600px] overflow-auto">
            <Table className="relative border-separate border-spacing-0">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-card">RUC</TableHead>
                  <TableHead className="bg-card">Razón Social</TableHead>
                  <TableHead className="bg-card">Proveedor</TableHead>
                  <TableHead className="bg-card">Contacto</TableHead>
                  <TableHead className="bg-card">Teléfono</TableHead>
                  <TableHead className="bg-card">Especialidad</TableHead>
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
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.contact_person || "-"}</TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {supplier.phone}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{supplier.specialty || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewSupplierDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      <EditSupplierDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        supplier={selectedSupplier}
      />
    </div>
  );
}

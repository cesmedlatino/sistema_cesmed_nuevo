import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useUpdateSupplier, PharmacySupplier } from "@/hooks/usePharmacySuppliers";

interface OpticsEditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: PharmacySupplier;
}

export function OpticsEditSupplierDialog({ open, onOpenChange, supplier }: OpticsEditSupplierDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    ruc: "",
    razon_social: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    specialty: "",
    observations: "",
    status: "Activo",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSupplier = useUpdateSupplier();

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        ruc: supplier.ruc || "",
        razon_social: supplier.razon_social || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        specialty: supplier.specialty || "",
        observations: supplier.observations || "",
        status: supplier.status || "Activo",
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    await updateSupplier.mutateAsync({
      id: supplier.id,
      ...formData,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    await updateSupplier.mutateAsync({
      id: supplier.id,
      status: "Inactivo",
    });
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
            <DialogDescription>
              Modifica los datos del proveedor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Row 1: RUC, Razón Social */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-ruc" className="text-xs">RUC</Label>
                  <Input
                    id="edit-ruc"
                    className="h-9"
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    placeholder="20123456789"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="edit-razon_social" className="text-xs">Razón Social</Label>
                  <Input
                    id="edit-razon_social"
                    className="h-9"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2: Nombre, Contacto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name" className="text-xs">Nombre *</Label>
                  <Input
                    id="edit-name"
                    className="h-9"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-contact_person" className="text-xs">Persona de Contacto</Label>
                  <Input
                    id="edit-contact_person"
                    className="h-9"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 3: Teléfono, Email, Especialidad */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-phone" className="text-xs">Teléfono</Label>
                  <Input
                    id="edit-phone"
                    className="h-9"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-email" className="text-xs">Email</Label>
                  <Input
                    id="edit-email"
                    className="h-9"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-specialty" className="text-xs">Especialidad</Label>
                  <Input
                    id="edit-specialty"
                    className="h-9"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Ej: Monturas, Lentes de contacto"
                  />
                </div>
              </div>

              {/* Row 4: Dirección, Estado */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1 col-span-3">
                  <Label htmlFor="edit-address" className="text-xs">Dirección</Label>
                  <Input
                    id="edit-address"
                    className="h-9"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-status" className="text-xs">Estado</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 5: Observaciones */}
              <div className="space-y-1">
                <Label htmlFor="edit-observations" className="text-xs">Observaciones</Label>
                <Textarea
                  id="edit-observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Eliminar
              </Button>
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateSupplier.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateSupplier.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará al proveedor "{supplier.name}". 
              Podrás reactivarlo más tarde si es necesario.
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
    </>
  );
}

import React, { useState } from "react";
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
import { useCreateSupplier } from "@/hooks/usePharmacySuppliers";

interface SuppliesNewSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliesNewSupplierDialog({ open, onOpenChange }: SuppliesNewSupplierDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    ruc: "",
    razon_social: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    specialty: "Suministros",
    observations: "",
  });

  const createSupplier = useCreateSupplier();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    await createSupplier.mutateAsync({
      ...formData,
      status: "Activo",
    });

    setFormData({
      name: "",
      ruc: "",
      razon_social: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      specialty: "Suministros",
      observations: "",
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Registra un nuevo proveedor de suministros médicos
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Row 1: RUC, Razón Social */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="ruc" className="text-xs">RUC</Label>
                <Input
                  id="ruc"
                  className="h-9"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  placeholder="20123456789"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="razon_social" className="text-xs">Razón Social</Label>
                <Input
                  id="razon_social"
                  className="h-9"
                  value={formData.razon_social}
                  onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Nombre, Contacto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Nombre *</Label>
                <Input
                  id="name"
                  className="h-9"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_person" className="text-xs">Persona de Contacto</Label>
                <Input
                  id="contact_person"
                  className="h-9"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3: Teléfono, Email, Especialidad */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Teléfono</Label>
                <Input
                  id="phone"
                  className="h-9"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  className="h-9"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="specialty" className="text-xs">Categoría</Label>
                <Input
                  id="specialty"
                  className="h-9"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ej: Suministros, Insumos, Materiales"
                />
              </div>
            </div>

            {/* Row 4: Dirección */}
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs">Dirección</Label>
              <Input
                id="address"
                className="h-9"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* Row 5: Observaciones */}
            <div className="space-y-1">
              <Label htmlFor="observations" className="text-xs">Observaciones</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createSupplier.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createSupplier.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

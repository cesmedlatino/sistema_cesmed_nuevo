import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateSupplier, type PharmacySupplier } from "@/hooks/usePharmacySuppliers";

interface EditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: PharmacySupplier | null;
}

export function EditSupplierDialog({ open, onOpenChange, supplier }: EditSupplierDialogProps) {
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

  const updateSupplier = useUpdateSupplier();

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        ruc: supplier.ruc || "",
        razon_social: supplier.razon_social || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        specialty: supplier.specialty || "",
        observations: supplier.observations || "",
        status: supplier.status,
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    
    await updateSupplier.mutateAsync({
      id: supplier.id,
      ...formData,
    });
    onOpenChange(false);
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Proveedor</DialogTitle>
            <DialogDescription>
              Actualiza la información del proveedor
            </DialogDescription>
          </DialogHeader>
          
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
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-contact" className="text-xs">Persona de Contacto</Label>
                <Input
                  id="edit-contact"
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
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="edit-status" className="h-9">
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
                rows={2}
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateSupplier.isPending}>
              {updateSupplier.isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

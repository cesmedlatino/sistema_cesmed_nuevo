
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useCreateInventoryMovement } from "@/hooks/usePharmacyInventory";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";

interface NewMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMovementDialog({ open, onOpenChange }: NewMovementDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const [selectedMedication, setSelectedMedication] = useState(null);
  const createMovement = useCreateInventoryMovement();
  const { data: medications } = usePharmacyMedications();

  const movementType = watch("movement_type");

  const entryReasons = ["Compra", "Reposición"];
  const exitReasons = ["Uso Interno", "Devolución", "Venta Externa", "Vencimiento", "Pérdida", "Ajuste"];

  const onSubmit = async (data) => {
    try {
      await createMovement.mutateAsync({
        ...data,
        quantity: parseInt(data.quantity),
        unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : null,
        total_cost: data.total_cost ? parseFloat(data.total_cost) : null,
      });
      reset();
      setSelectedMedication(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating movement:", error);
    }
  };

  const handleMedicationChange = (medicationId) => {
    const medication = medications?.find(m => m.id === medicationId);
    setSelectedMedication(medication);
    setValue("medication_id", medicationId);
  };

  const handleQuantityChange = (quantity) => {
    const unitCost = watch("unit_cost");
    if (unitCost && quantity) {
      setValue("total_cost", (parseFloat(unitCost) * parseInt(quantity)).toFixed(2));
    }
  };

  const handleUnitCostChange = (unitCost) => {
    const quantity = watch("quantity");
    if (unitCost && quantity) {
      setValue("total_cost", (parseFloat(unitCost) * parseInt(quantity)).toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
          <DialogDescription>
            Registre una entrada o salida de producto
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medication_id">Producto *</Label>
            <Select onValueChange={handleMedicationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Buscar producto..." />
              </SelectTrigger>
              <SelectContent>
                {medications?.map((medication) => (
                  <SelectItem key={medication.id} value={medication.id}>
                    <div className="flex flex-col">
                      <span>{medication.descripcion}</span>
                      <span className="text-xs text-muted-foreground">
                        {medication.codigo} - Stock: {medication.stock_actual}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMedication && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm">
                <div><strong>Stock actual:</strong> {selectedMedication.stock_actual} unidades</div>
                <div><strong>Lote:</strong> {selectedMedication.lote || "N/A"}</div>
                <div><strong>Vencimiento:</strong> {selectedMedication.fecha_vencimiento || "N/A"}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
              <Select onValueChange={(value) => setValue("movement_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="movement_reason">Motivo *</Label>
              <Select onValueChange={(value) => setValue("movement_reason", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {movementType === "Entrada" && entryReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                  {movementType === "Salida" && exitReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              type="number"
              {...register("quantity", { 
                required: true,
                onChange: (e) => handleQuantityChange(e.target.value)
              })}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Costo Unitario</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                {...register("unit_cost", {
                  onChange: (e) => handleUnitCostChange(e.target.value)
                })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total_cost">Costo Total</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                {...register("total_cost")}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_document">Documento de Referencia</Label>
            <Input
              id="reference_document"
              {...register("reference_document")}
              placeholder="Ej: Factura #12345, Orden #67890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              {...register("observations")}
              placeholder="Comentarios adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

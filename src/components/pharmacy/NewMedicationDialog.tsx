
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useCreateMedication, useNextMedicationCode } from "@/hooks/usePharmacyMedications";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useEffect } from "react";
import { Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NewMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMedicationDialog({ open, onOpenChange }: NewMedicationDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const createMedication = useCreateMedication();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: nextCode, refetch: refetchNextCode } = useNextMedicationCode();
  const [showGananciaDialog, setShowGananciaDialog] = useState(false);
  const [tempGanancia, setTempGanancia] = useState(50);

  const igvPercentage = 18;
  const purchasePrice = Number(watch("purchase_price")) || 0;
  const porcentajeGanancia = Number(watch("porcentaje_ganancia")) || 50;

  const igvUnitario = purchasePrice * (igvPercentage / 100);
  const importeUnitario = purchasePrice + igvUnitario;
  const importeGanancia = importeUnitario * (porcentajeGanancia / 100);
  const precioVenta = importeUnitario + importeGanancia;

  // Asegura que el código automático se recalcula al abrir (evita duplicados en catálogos >1000).
  useEffect(() => {
    if (open) refetchNextCode();
  }, [open, refetchNextCode]);

  useEffect(() => {
    if (nextCode && open) {
      setValue("codigo", nextCode);
      setValue("porcentaje_ganancia", 50);
    }
  }, [nextCode, open, setValue]);

  const onSubmit = async (data) => {
    try {
      // Convert YYYY-MM to YYYY-MM-01 for database storage
      const fechaVencimiento = data.fecha_vencimiento 
        ? `${data.fecha_vencimiento}-01` 
        : null;

      await createMedication.mutateAsync({
        codigo: data.codigo || null,
        descripcion: data.descripcion,
        forma_farmaceutica: data.forma_farmaceutica || null,
        laboratorio: data.laboratorio || null,
        lote: data.lote || null,
        fecha_vencimiento: fechaVencimiento,
        presentation: data.presentation,
        ubicacion: data.ubicacion || null,
        stock_inicial: parseInt(data.stock_inicial) || 0,
        entrada: 0,
        salida: 0,
        stock_actual: parseInt(data.stock_inicial) || 0,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        igv_unitario: igvUnitario,
        importe_unitario: importeUnitario,
        porcentaje_ganancia: parseFloat(data.porcentaje_ganancia) || 50,
        importe_ganancia: importeGanancia,
        precio_venta: data.precio_venta ? parseFloat(data.precio_venta) : precioVenta,
        comentarios: data.comentarios || null,
        min_stock_level: parseInt(data.min_stock_level) || 10,
        days_before_expiry_alert: 30,
        status: "Activo",
        formula_magistral: data.formula_magistral || false,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating medication:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Ingrese la información completa del producto
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código (Automático)</Label>
              <Input
                id="codigo"
                {...register("codigo")}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                {...register("descripcion", { required: true })}
                placeholder="Nombre del producto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forma_farmaceutica">Forma Farmacéutica</Label>
              <Input
                id="forma_farmaceutica"
                {...register("forma_farmaceutica")}
                placeholder="Ej: Tabletas, Jarabe, Cápsulas"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="laboratorio">Laboratorio</Label>
              <Input
                id="laboratorio"
                {...register("laboratorio")}
                placeholder="Nombre del laboratorio"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                {...register("lote")}
                placeholder="Número de lote"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Fecha Vencimiento (Mes/Año)</Label>
              <Input
                id="fecha_vencimiento"
                type="month"
                {...register("fecha_vencimiento")}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presentation">Presentación *</Label>
              <Input
                id="presentation"
                {...register("presentation", { required: true })}
                placeholder="Ej: Caja x 20 tabletas"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                {...register("ubicacion")}
                placeholder="Ej: Estante A, Nivel 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">Precio de Entrada (S/)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price")}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>IGV Unitario (S/)</Label>
              <Input
                type="number"
                step="0.01"
                value={igvUnitario.toFixed(2)}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Importe Unitario (S/)</Label>
              <Input
                type="number"
                step="0.01"
                value={importeUnitario.toFixed(2)}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Porcentaje Ganancia (%)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={porcentajeGanancia}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setTempGanancia(porcentajeGanancia);
                    setShowGananciaDialog(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Importe Ganancia (S/)</Label>
              <Input
                type="number"
                step="0.01"
                value={importeGanancia.toFixed(2)}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio_venta">Precio Venta (S/)</Label>
              <Input
                id="precio_venta"
                type="number"
                step="0.01"
                {...register("precio_venta")}
                placeholder={precioVenta.toFixed(2)}
              />
              <p className="text-xs text-muted-foreground">
                Calculado: S/. {precioVenta.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_inicial">Stock Inicial *</Label>
              <Input
                id="stock_inicial"
                type="number"
                {...register("stock_inicial", { required: true })}
                placeholder="0"
                defaultValue="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Stock Mínimo *</Label>
              <Input
                id="min_stock_level"
                type="number"
                {...register("min_stock_level", { required: true })}
                placeholder="10"
                defaultValue="10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada</Label>
              <Input
                id="entrada"
                type="number"
                value="0"
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="salida">Salida</Label>
              <Input
                id="salida"
                type="number"
                value="0"
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentarios">Comentarios</Label>
            <Input
              id="comentarios"
              {...register("comentarios")}
              placeholder="Observaciones adicionales"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="formula_magistral"
              checked={watch("formula_magistral")}
              onCheckedChange={(checked) => setValue("formula_magistral", checked)}
            />
            <Label htmlFor="formula_magistral" className="cursor-pointer">
              Formula Magistral
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMedication.isPending}>
              {createMedication.isPending ? "Registrando..." : "Registrar Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={showGananciaDialog} onOpenChange={setShowGananciaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Establecer Porcentaje de Ganancia</AlertDialogTitle>
            <AlertDialogDescription>
              Ingrese el porcentaje de ganancia para este producto
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="temp_ganancia">Porcentaje (%)</Label>
            <Input
              id="temp_ganancia"
              type="number"
              step="0.01"
              value={tempGanancia}
              onChange={(e) => setTempGanancia(parseFloat(e.target.value) || 0)}
              placeholder="50"
            />
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowGananciaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setValue("porcentaje_ganancia", tempGanancia);
                setShowGananciaDialog(false);
              }}
            >
              Aplicar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

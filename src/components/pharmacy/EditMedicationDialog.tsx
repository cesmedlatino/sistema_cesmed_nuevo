
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useUpdateMedication } from "@/hooks/usePharmacyMedications";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
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

interface EditMedicationDialogProps {
  medication: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMedicationDialog({ medication, open, onOpenChange }: EditMedicationDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const updateMedication = useUpdateMedication();
  const { data: suppliers } = usePharmacySuppliers();
  const [showGananciaDialog, setShowGananciaDialog] = useState(false);
  const [tempGanancia, setTempGanancia] = useState(50);

  const igvPercentage = 18;
  const purchasePrice = Number(watch("purchase_price")) || 0;
  const porcentajeGanancia = Number(watch("porcentaje_ganancia")) || 50;

  const igvUnitario = purchasePrice * (igvPercentage / 100);
  const importeUnitario = purchasePrice + igvUnitario;
  const importeGanancia = importeUnitario * (porcentajeGanancia / 100);
  const precioVenta = importeUnitario + importeGanancia;

  useEffect(() => {
    if (medication) {
      // Convert fecha_vencimiento to YYYY-MM format if it exists
      const fechaVencimiento = medication.fecha_vencimiento 
        ? medication.fecha_vencimiento.substring(0, 7) 
        : '';
      
      reset({
        codigo: medication.codigo,
        descripcion: medication.descripcion,
        forma_farmaceutica: medication.forma_farmaceutica,
        laboratorio: medication.laboratorio,
        lote: medication.lote,
        fecha_vencimiento: fechaVencimiento,
        presentation: medication.presentation,
        ubicacion: medication.ubicacion,
        purchase_price: medication.purchase_price,
        porcentaje_ganancia: medication.porcentaje_ganancia || 50,
        precio_venta: medication.precio_venta,
        stock_inicial: medication.stock_inicial,
        entrada: medication.entrada,
        salida: medication.salida,
        stock_actual: medication.stock_actual,
        min_stock_level: medication.min_stock_level || 10,
        comentarios: medication.comentarios,
        formula_magistral: medication.formula_magistral || false,
      });
    }
  }, [medication, reset, setValue]);

  const onSubmit = async (data) => {
    try {
      // Convert YYYY-MM to YYYY-MM-01 for database storage
      const fechaVencimiento = data.fecha_vencimiento 
        ? `${data.fecha_vencimiento}-01` 
        : null;
      
      await updateMedication.mutateAsync({
        id: medication.id,
        codigo: data.codigo,
        descripcion: data.descripcion,
        forma_farmaceutica: data.forma_farmaceutica,
        laboratorio: data.laboratorio,
        lote: data.lote,
        fecha_vencimiento: fechaVencimiento,
        presentation: data.presentation,
        ubicacion: data.ubicacion,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        igv_unitario: igvUnitario,
        importe_unitario: importeUnitario,
        porcentaje_ganancia: parseFloat(data.porcentaje_ganancia) || 50,
        importe_ganancia: importeGanancia,
        precio_venta: data.precio_venta ? parseFloat(data.precio_venta) : precioVenta,
        stock_inicial: parseInt(data.stock_inicial),
        entrada: parseInt(data.entrada),
        salida: parseInt(data.salida),
        stock_actual: parseInt(data.stock_actual),
        min_stock_level: parseInt(data.min_stock_level) || 10,
        comentarios: data.comentarios,
        formula_magistral: data.formula_magistral || false,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating medication:", error);
    }
  };

  if (!medication) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifique la información del producto
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                {...register("codigo")}
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                {...register("descripcion", { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forma_farmaceutica">Forma Farmacéutica</Label>
              <Input
                id="forma_farmaceutica"
                {...register("forma_farmaceutica")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="laboratorio">Laboratorio</Label>
              <Input
                id="laboratorio"
                {...register("laboratorio")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                {...register("lote")}
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

          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_inicial">Stock Inicial</Label>
              <Input
                id="stock_inicial"
                type="number"
                {...register("stock_inicial")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Stock Mínimo</Label>
              <Input
                id="min_stock_level"
                type="number"
                {...register("min_stock_level")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada</Label>
              <Input
                id="entrada"
                type="number"
                {...register("entrada")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="salida">Salida</Label>
              <Input
                id="salida"
                type="number"
                {...register("salida")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock_actual">Stock Actual</Label>
              <Input
                id="stock_actual"
                type="number"
                {...register("stock_actual")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio_venta">Precio Venta (S/)</Label>
            <Input
              id="precio_venta"
              type="number"
              step="0.01"
              {...register("precio_venta")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentarios">Comentarios</Label>
            <Input
              id="comentarios"
              {...register("comentarios")}
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
            <Button type="submit" disabled={updateMedication.isPending}>
              {updateMedication.isPending ? "Guardando..." : "Guardar Cambios"}
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

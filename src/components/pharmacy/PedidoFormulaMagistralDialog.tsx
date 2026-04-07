import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useCreatePedidoFormulaMagistral } from "@/hooks/useFormulasMagistrales";
import { PatientAutocomplete } from "./PatientAutocomplete";
import { MedicationAutocomplete } from "./MedicationAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PedidoFormulaMagistralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPedidoCreated?: (pedido: any) => void;
  selectedPatient?: any | null;
  preSelectedFormula?: any | null;
  editingPedido?: any | null;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  patient_code: string;
}

interface Medication {
  id: string;
  codigo: string;
  descripcion: string;
  precio_venta?: number;
  stock_actual: number;
  presentation: string;
}

interface FormData {
  formula: string;
  id_paciente?: string;
  numero_contacto?: string;
  cantidad: number;
  monto_pedido?: number;
  observaciones?: string;
}

export function PedidoFormulaMagistralDialog({
  open,
  onOpenChange,
  onPedidoCreated,
  selectedPatient: initialPatient,
  preSelectedFormula,
  editingPedido,
}: PedidoFormulaMagistralDialogProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [nextCode, setNextCode] = useState<string>("");
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      cantidad: 1,
    },
  });
  const createPedido = useCreatePedidoFormulaMagistral();
  const queryClient = useQueryClient();

  // Set initial patient and formula when dialog opens
  useEffect(() => {
    if (open) {
      if (editingPedido) {
        // Load editing pedido data
        setValue("formula", editingPedido.formula);
        setValue("cantidad", editingPedido.cantidad);
        setValue("monto_pedido", editingPedido.monto_pedido);
        setValue("numero_contacto", editingPedido.numero_contacto);
        setValue("observaciones", editingPedido.observaciones);
        setNextCode(editingPedido.nro_formula);
        
        if (editingPedido.id_paciente && editingPedido.patient) {
          const patient = {
            id: editingPedido.id_paciente,
            first_name: editingPedido.patient.first_name,
            last_name: editingPedido.patient.last_name,
            dni: editingPedido.patient.dni,
            patient_code: editingPedido.patient.patient_code,
          };
          setSelectedPatient(patient);
          setValue("id_paciente", patient.id);
        }
      } else {
        if (initialPatient) {
          setSelectedPatient(initialPatient);
          setValue("id_paciente", initialPatient.id);
        }
        if (preSelectedFormula) {
          setSelectedMedication(preSelectedFormula);
          setValue("formula", preSelectedFormula.descripcion);
          if (preSelectedFormula.precio_venta) {
            const cantidad = watch("cantidad") || 1;
            setValue("monto_pedido", preSelectedFormula.precio_venta * cantidad);
          }
        }
      }
    }
  }, [open, initialPatient, preSelectedFormula, editingPedido, setValue, watch]);

  // Generate next code only if not editing
  useEffect(() => {
    const generateNextCode = async () => {
      const { data, error } = await supabase
        .from("pedido_formula_magistral")
        .select("nro_formula")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastCode = data[0].nro_formula;
        const numericPart = parseInt(lastCode.split("-")[1]) + 1;
        setNextCode(`FM-${String(numericPart).padStart(6, "0")}`);
      } else {
        setNextCode("FM-000001");
      }
    };

    if (open && !editingPedido) {
      generateNextCode();
    }
  }, [open, editingPedido]);

  // Update monto_pedido when medication changes
  useEffect(() => {
    if (selectedMedication?.precio_venta) {
      const cantidad = watch("cantidad") || 1;
      setValue("monto_pedido", selectedMedication.precio_venta * cantidad);
    }
  }, [selectedMedication, watch("cantidad"), setValue, watch]);

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setValue("id_paciente", patient?.id);
  };

  const handleMedicationChange = (medication: Medication | null) => {
    setSelectedMedication(medication);
    if (medication) {
      setValue("formula", medication.descripcion);
      if (medication.precio_venta) {
        const cantidad = watch("cantidad") || 1;
        setValue("monto_pedido", medication.precio_venta * cantidad);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingPedido) {
        // Update existing pedido
        const { error } = await supabase
          .from("pedido_formula_magistral")
          .update({
            formula: data.formula,
            id_paciente: data.id_paciente,
            numero_contacto: data.numero_contacto,
            cantidad: data.cantidad,
            monto_pedido: data.monto_pedido,
            observaciones: data.observaciones,
          })
          .eq("id", editingPedido.id);

        if (error) throw error;
        toast.success("Pedido actualizado exitosamente");
        queryClient.invalidateQueries({ queryKey: ["pedidos-formulas-magistrales"] });
      } else {
        // Create new pedido
        await createPedido.mutateAsync(data);
        onPedidoCreated?.(data);
      }
      
      reset();
      setSelectedPatient(null);
      setSelectedMedication(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving pedido:", error);
      toast.error("Error al guardar el pedido");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingPedido ? "Editar Pedido de Fórmula Magistral" : "Nuevo Pedido de Fórmula Magistral"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Código de Pedido</Label>
            <Input
              value={nextCode}
              disabled
              className="bg-muted font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="formula">Producto / Fórmula *</Label>
            <input type="hidden" {...register("formula", { required: "El producto/fórmula es requerido" })} />
            <MedicationAutocomplete
              value={selectedMedication}
              onChange={handleMedicationChange}
              placeholder="Buscar por código o descripción..."
              formulaMagistralOnly={true}
            />
            {errors.formula && (
              <p className="text-sm text-destructive">{errors.formula.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Paciente (Opcional)</Label>
            <PatientAutocomplete
              value={selectedPatient}
              onChange={handlePatientChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_contacto">Número de Contacto</Label>
              <Input
                id="numero_contacto"
                placeholder="Ej: 999999999"
                {...register("numero_contacto")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                {...register("cantidad", {
                  required: "La cantidad es requerida",
                  min: { value: 1, message: "La cantidad debe ser al menos 1" },
                })}
              />
              {errors.cantidad && (
                <p className="text-sm text-destructive">{errors.cantidad.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto_pedido">Monto del Pedido</Label>
            <Input
              id="monto_pedido"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={watch("monto_pedido") || ""}
              onChange={(e) => setValue("monto_pedido", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Observaciones adicionales..."
              {...register("observaciones")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setSelectedPatient(null);
                setSelectedMedication(null);
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createPedido.isPending}>
              {createPedido.isPending 
                ? (editingPedido ? "Actualizando..." : "Registrando...") 
                : (editingPedido ? "Actualizar Pedido" : "Registrar Pedido")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, FileText, Beaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PatientAutocomplete } from "./PatientAutocomplete";
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { MedicationAutocomplete } from "./MedicationAutocomplete";
import { OutputComprobantePreview } from "./OutputComprobantePreview";
import { NewPatientDialog } from "@/components/patients/NewPatientDialog";
import { UserPlus } from "lucide-react";
import { FormulaMagistralDialog } from "./FormulaMagistralDialog";

interface MedicationItem {
  medication_id: string;
  codigo: string;
  descripcion: string;
  quantity: number;
  sale_cost_per_unit: number;
  total: number;
  comments?: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  patient_code: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
}

interface Medication {
  id: string;
  codigo: string;
  descripcion: string;
  precio_venta?: number;
  stock_actual: number;
  presentation: string;
}

interface OutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any | null;
  onSuccess?: () => void;
}

export function OutputDialog({ open, onOpenChange, editData, onSuccess }: OutputDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [showFormulaMagistralDialog, setShowFormulaMagistralDialog] = useState(false);

  // Helper para obtener la fecha local en formato YYYY-MM-DD
  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Form state - usar fecha local en lugar de UTC
  const [fecha, setFecha] = useState(getLocalDateString());
  const [tipoSalida, setTipoSalida] = useState("Salida por comprobante");
  const [customTipo, setCustomTipo] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([]);

  // Temp fields for adding medication
  const [tempMedication, setTempMedication] = useState<Medication | null>(null);
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempComments, setTempComments] = useState("");

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('comprobante_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setConfig(data);
      }
    };
    loadConfig();
  }, []);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editData) {
        // Load edit data
        setFecha(editData.date);
        setTipoSalida(editData.tipo_salida || "Salida por comprobante");
        setMotivoAjuste(editData.motivo_ajuste || "");
        setNumeroComprobante(editData.nro_comprobante || "");
        
        // Load patient if exists
        if (editData.patient) {
          setSelectedPatient(editData.patient);
        }
        
        // Load supplier if exists
        if (editData.supplier_id) {
          // Could fetch supplier details here if needed
        }
        
        // Load medications if exists
        if (editData.medications && Array.isArray(editData.medications)) {
          setMedicationItems(editData.medications);
        }
      } else {
        // Reset for new entry
        setFecha(getLocalDateString());
        setTipoSalida("Salida por comprobante");
        setCustomTipo("");
        setMotivoAjuste("");
        setSelectedPatient(null);
        setSelectedSupplier(null);
        setMedicationItems([]);
        setNumeroComprobante("");
      }
      setTempMedication(null);
      setTempQuantity(1);
      setTempComments("");
    }
  }, [open, editData]);

  const addMedicationItem = () => {
    if (!tempMedication) {
      toast({
        title: "Error",
        description: "Seleccione un producto",
        variant: "destructive",
      });
      return;
    }

    if (tempQuantity <= 0) {
      toast({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    // Check if medication has enough stock (skip for pedidos)
    if (!(tempMedication as any).isPedido && tempQuantity > tempMedication.stock_actual) {
      toast({
        title: "Error",
        description: `Stock insuficiente. Disponible: ${tempMedication.stock_actual}`,
        variant: "destructive",
      });
      return;
    }

    const total = tempQuantity * (tempMedication.precio_venta || 0);
    
    const newItem: MedicationItem = {
      medication_id: tempMedication.id,
      codigo: tempMedication.codigo,
      descripcion: tempMedication.descripcion,
      quantity: tempQuantity,
      sale_cost_per_unit: tempMedication.precio_venta || 0,
      total: total,
      comments: tempComments,
    };

    setMedicationItems([...medicationItems, newItem]);
    setTempMedication(null);
    setTempQuantity(1);
    setTempComments("");
  };

  const handleFormulaMagistralSelect = (formula: any) => {
    // Add formula to medication items
    const newItem: MedicationItem = {
      medication_id: formula.id,
      codigo: formula.codigo,
      descripcion: formula.descripcion,
      quantity: formula.cantidad || 1,
      sale_cost_per_unit: formula.precio_venta || formula.monto_pedido || 0,
      total: (formula.cantidad || 1) * (formula.precio_venta || formula.monto_pedido || 0),
      comments: formula.isPedido ? "Pedido de Fórmula Magistral" : "Fórmula Magistral",
    };

    setMedicationItems([...medicationItems, newItem]);
  };

  const removeMedicationItem = (index: number) => {
    setMedicationItems(medicationItems.filter((_, i) => i !== index));
  };

  const generateComprobante = async () => {
    if (medicationItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto",
        variant: "destructive",
      });
      return;
    }

    if (tipoSalida === "Salida por comprobante" && !selectedPatient) {
      toast({
        title: "Error",
        description: "Debe seleccionar un paciente para salida por comprobante",
        variant: "destructive",
      });
      return;
    }

    if (tipoSalida === "Salida por Devolución" && !selectedSupplier) {
      toast({
        title: "Error",
        description: "Debe seleccionar un proveedor para salida por devolución",
        variant: "destructive",
      });
      return;
    }

    if (tipoSalida === "Salida por Ajuste" && !motivoAjuste) {
      toast({
        title: "Error",
        description: "Debe especificar el motivo del ajuste",
        variant: "destructive",
      });
      return;
    }

    // Si estamos editando, no generar un nuevo número
    if (editData) {
      setShowPreview(true);
      return;
    }

    try {
      // Call function to generate correlative number
      const { data, error } = await supabase.rpc('generate_next_comprobante_number');
      
      if (error) throw error;
      
      setNumeroComprobante(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generando comprobante:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el número de comprobante",
        variant: "destructive",
      });
    }
  };

  const handleRegistrarSalida = () => {
    if (!numeroComprobante) {
      toast({
        title: "Error",
        description: "Debe generar el comprobante antes de registrar",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmarRegistro = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const finalTipoSalida = tipoSalida === "Otro" ? customTipo : tipoSalida;
      const totalAmount = medicationItems.reduce((sum, item) => sum + item.total, 0);

      if (editData) {
        // Update existing record
        const updatedOutput = {
          date: fecha,
          tipo_salida: finalTipoSalida,
          patient_id: selectedPatient?.id || null,
          supplier_id: selectedSupplier?.id || null,
          motivo_ajuste: motivoAjuste || null,
          medications: medicationItems as any,
          total: totalAmount,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('pharmacy_outputs')
          .update(updatedOutput)
          .eq('id', editData.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "El comprobante ha sido actualizado correctamente",
        });
      } else {
        // Create new records - Para cada medicamento en la tabla, crear una salida individual
        for (const item of medicationItems) {
          const output = {
            date: fecha,
            tipo_salida: finalTipoSalida,
            nro_comprobante: numeroComprobante,
            patient_id: selectedPatient?.id || null,
            supplier_id: selectedSupplier?.id || null,
            motivo_ajuste: motivoAjuste || null,
            medication_id: item.medication_id,
            product_code: item.codigo,
            description: item.descripcion,
            quantity: item.quantity,
            sale_cost_per_unit: item.sale_cost_per_unit,
            total: item.total,
            comments: item.comments || null,
            medications: [item] // Keep for compatibility
          };

          const { error } = await supabase
            .from('pharmacy_outputs')
            .insert(output as any);

          if (error) throw error;
        }

        // Upsert to consolidado_salidas and documento_de_pago (only for "Salida por comprobante" with patient)
        if (tipoSalida === "Salida por comprobante" && selectedPatient && numeroComprobante) {
          // Upsert to consolidado_salidas
          const consolidado = {
            nro_comprobante: numeroComprobante,
            tipo_documento: "Nota de Venta",
            patient_id: selectedPatient.id,
            fecha_emision: fecha,
            importe_total: totalAmount,
            subtotal: totalAmount,
            igv: 0,
            estado: "emitido",
            estado_documento: "Emitido",
            forma_pago: "Contado",
            observaciones: `Salida de farmacia - ${medicationItems.length} producto(s)`,
            updated_at: new Date().toISOString()
          };

          const { error: consolidadoError } = await supabase
            .from('consolidado_salidas')
            .upsert(consolidado, { onConflict: 'nro_comprobante' });

          if (consolidadoError) {
            console.error('Error upserting consolidado_salidas:', consolidadoError);
          }

          // Upsert to documento_de_pago
          const documentoPago = {
            tipo_documento: "Nota de Venta",
            numero_documento: numeroComprobante,
            patient_id: selectedPatient.id,
            fecha_emision: fecha,
            importe_total: totalAmount,
            subtotal: totalAmount,
            igv: 0,
            estado: "emitido",
            estado_documento: "Emitido",
            forma_pago: "Contado",
            cliente_razon_social: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
            cliente_ruc: selectedPatient.dni || null,
            observaciones: `Salida de farmacia - ${medicationItems.length} producto(s)`
          };

          const { error: docError } = await supabase
            .from('documento_de_pago')
            .upsert(documentoPago, { onConflict: 'numero_documento' });

          if (docError) {
            console.error('Error upserting documento_de_pago:', docError);
          }
        }

        toast({
          title: "Éxito",
          description: `Se registraron ${medicationItems.length} salida(s) correctamente`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error registrando salidas:', error);
      toast({
        title: "Error",
        description: editData ? "No se pudo actualizar el comprobante" : "No se pudieron registrar las salidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalGeneral = medicationItems.reduce((sum, item) => sum + item.total, 0);

  const handlePatientCreated = (patient: Patient) => {
    setSelectedPatient(patient);
    toast({
      title: "Paciente registrado",
      description: "El paciente ha sido seleccionado automáticamente.",
    });
  };

  return (
    <>
      <NewPatientDialog
        isOpen={showNewPatientDialog}
        onClose={() => setShowNewPatientDialog(false)}
        onPatientCreated={handlePatientCreated}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editData ? "Editar Salida" : "Nueva Salida de Productos"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tipo_salida">Tipo de Salida</Label>
                <Select value={tipoSalida} onValueChange={setTipoSalida}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salida por comprobante">Salida por comprobante</SelectItem>
                    <SelectItem value="Salida por Ajuste">Salida por Ajuste</SelectItem>
                    <SelectItem value="Salida por Devolución">Salida por Devolución</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {numeroComprobante && (
                <div>
                  <Label>Número de Comprobante</Label>
                  <Input value={numeroComprobante} disabled className="bg-muted font-semibold" />
                </div>
              )}
            </div>

            {tipoSalida === "Otro" && (
              <div>
                <Label htmlFor="custom_tipo">Especifique el tipo de salida</Label>
                <Input
                  id="custom_tipo"
                  value={customTipo}
                  onChange={(e) => setCustomTipo(e.target.value)}
                  placeholder="Ingrese el tipo de salida"
                />
              </div>
            )}

            {tipoSalida === "Salida por comprobante" && (
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-10">
                  <Label>Paciente</Label>
                  <PatientAutocomplete
                    value={selectedPatient}
                    onChange={setSelectedPatient}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="opacity-0">-</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewPatientDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Paciente
                  </Button>
                </div>
              </div>
            )}

            {tipoSalida === "Salida por Devolución" && (
              <div>
                <Label>Proveedor</Label>
                <SupplierAutocomplete
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                />
              </div>
            )}

            {tipoSalida === "Salida por Ajuste" && (
              <div>
                <Label htmlFor="motivo_ajuste">Motivo del Ajuste</Label>
                <Textarea
                  id="motivo_ajuste"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Describa el motivo del ajuste..."
                  rows={3}
                />
              </div>
            )}

            {/* Add Medications Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold">Agregar Productos</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label>Producto</Label>
                  <MedicationAutocomplete
                    value={tempMedication}
                    onChange={setTempMedication}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Precio Unit.</Label>
                  <Input
                    type="number"
                    disabled
                    value={tempMedication?.precio_venta || 0}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Total</Label>
                  <Input
                    type="number"
                    disabled
                    value={(tempQuantity * (tempMedication?.precio_venta || 0)).toFixed(2)}
                  />
                </div>
                <div className="col-span-1 flex gap-1">
                  <Button 
                    type="button" 
                    onClick={addMedicationItem} 
                    className="flex-1"
                    title="Agregar Producto"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setShowFormulaMagistralDialog(true)}
                    variant="outline"
                    className="flex-1"
                    title="Agregar Fórmula Magistral"
                  >
                    <Beaker className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="col-span-12">
                <Label>Comentarios (Opcional)</Label>
                <Input
                  value={tempComments}
                  onChange={(e) => setTempComments(e.target.value)}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            {/* Medications Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Comentarios</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicationItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No hay productos agregados
                      </TableCell>
                    </TableRow>
                  ) : (
                    medicationItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.codigo}</TableCell>
                        <TableCell>{item.descripcion}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">S/. {item.sale_cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">S/. {item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.comments || "-"}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMedicationItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {medicationItems.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4} className="text-right">Total General:</TableCell>
                      <TableCell className="text-right">S/. {totalGeneral.toFixed(2)}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={generateComprobante}
                disabled={medicationItems.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generar Comprobante
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleRegistrarSalida}
                disabled={!numeroComprobante || loading}
              >
                {loading ? (editData ? "Actualizando..." : "Registrando...") : (editData ? "Actualizar Salida" : "Registrar Salida")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <OutputComprobantePreview
        open={showPreview}
        onOpenChange={setShowPreview}
        numeroComprobante={numeroComprobante}
        fecha={fecha}
        tipoSalida={tipoSalida === "Otro" ? customTipo : tipoSalida}
        paciente={selectedPatient}
        proveedor={selectedSupplier}
        medications={medicationItems}
        total={totalGeneral}
        config={config}
      />

      {/* New Patient Dialog */}
      <NewPatientDialog
        isOpen={showNewPatientDialog}
        onClose={() => setShowNewPatientDialog(false)}
        onPatientCreated={(patient) => {
          setSelectedPatient(patient);
          setShowNewPatientDialog(false);
        }}
      />

      {/* Formula Magistral Dialog */}
      <FormulaMagistralDialog
        open={showFormulaMagistralDialog}
        onOpenChange={setShowFormulaMagistralDialog}
        onSelect={handleFormulaMagistralSelect}
        selectedPatient={selectedPatient}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desea registrar la Salida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrarán {medicationItems.length} salida(s) con el número de comprobante {numeroComprobante}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRegistro}>Sí, Registrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

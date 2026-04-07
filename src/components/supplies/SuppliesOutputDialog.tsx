import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { cn, getLocalDateString } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

import { PatientAutocomplete } from "@/components/pharmacy/PatientAutocomplete";
import { NewPatientDialog } from "@/components/patients/NewPatientDialog";
import { useSuppliesProducts } from "@/hooks/useSuppliesProducts";
import { useCreateSuppliesOutput } from "@/hooks/useSuppliesOutputs";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  patient_code: string;
}

interface ProductItem {
  medication_id: string;
  codigo: string;
  descripcion: string;
  quantity: number;
  sale_cost_per_unit: number;
  total: number;
  comments?: string;
}

interface SuppliesOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliesOutputDialog({ open, onOpenChange }: SuppliesOutputDialogProps) {
  const createOutput = useCreateSuppliesOutput();
  const { data: products } = useSuppliesProducts(1000);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);

  const [fecha, setFecha] = useState(getLocalDateString());
  const [tipoSalida, setTipoSalida] = useState("Salida por comprobante");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [nroComprobante, setNroComprobante] = useState("");

  const [openProduct, setOpenProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempComments, setTempComments] = useState("");

  const selectableProducts = useMemo(() => (products || []).filter((p) => (p.stock_actual || 0) > 0), [products]);
  const selectedProductData = selectableProducts.find((p) => p.id === selectedProduct);

  useEffect(() => {
    if (!open) return;
    setFecha(getLocalDateString());
    setTipoSalida("Salida por comprobante");
    setMotivoAjuste("");
    setSelectedPatient(null);
    setProductItems([]);
    setNroComprobante("");
    setSelectedProduct("");
    setTempQuantity(1);
    setTempComments("");
  }, [open]);

  const handlePatientCreated = (patient: Patient) => {
    setSelectedPatient(patient);
    toast.success("Paciente registrado y seleccionado");
  };

  const addProductItem = () => {
    if (!selectedProductData) {
      toast.error("Seleccione un producto");
      return;
    }
    if (tempQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    if (tempQuantity > (selectedProductData.stock_actual || 0)) {
      toast.error(`Stock insuficiente. Disponible: ${selectedProductData.stock_actual}`);
      return;
    }

    const unit = selectedProductData.precio_venta || 0;
    const total = tempQuantity * unit;

    setProductItems((prev) => [
      ...prev,
      {
        medication_id: selectedProductData.id,
        codigo: selectedProductData.codigo,
        descripcion: selectedProductData.descripcion,
        quantity: tempQuantity,
        sale_cost_per_unit: unit,
        total,
        comments: tempComments || undefined,
      },
    ]);

    setSelectedProduct("");
    setTempQuantity(1);
    setTempComments("");
  };

  const removeProductItem = (index: number) => {
    setProductItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalGeneral = productItems.reduce((sum, item) => sum + item.total, 0);

  const prepareRegister = async () => {
    if (productItems.length === 0) {
      toast.error("Debe agregar al menos un producto");
      return;
    }

    if (tipoSalida === "Salida por comprobante" && !selectedPatient) {
      toast.error("Debe seleccionar un paciente para salida por comprobante");
      return;
    }

    if (tipoSalida === "Salida por ajuste" && !motivoAjuste.trim()) {
      toast.error("Debe especificar el motivo del ajuste");
      return;
    }

    if (tipoSalida === "Salida por comprobante" && !nroComprobante) {
      try {
        const { data: last } = await supabase
          .from("pharmacy_outputs")
          .select("nro_comprobante")
          .ilike("nro_comprobante", "SUM-S%")
          .order("created_at", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        const lastValue = last?.[0]?.nro_comprobante || "";
        const match = lastValue.match(/SUM-S(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;

        setNroComprobante(`SUM-S${nextNumber.toString().padStart(5, "0")}`);
      } catch (e) {
        console.error("Error generating comprobante number", e);
      }
    }

    setShowConfirmDialog(true);
  };

  const confirmarRegistro = async () => {
    setShowConfirmDialog(false);

    try {
      for (const item of productItems) {
        await createOutput.mutateAsync({
          date: fecha,
          tipo_salida: tipoSalida,
          nro_comprobante: tipoSalida === "Salida por comprobante" ? nroComprobante : null,
          patient_id: tipoSalida === "Salida por comprobante" ? selectedPatient?.id || null : null,
          motivo_ajuste: tipoSalida === "Salida por ajuste" ? motivoAjuste : null,
          medication_id: item.medication_id,
          product_code: item.codigo,
          description: item.descripcion,
          quantity: item.quantity,
          sale_cost_per_unit: item.sale_cost_per_unit,
          total: item.total,
          comments: item.comments || null,
        });
      }

      toast.success(`Se registraron ${productItems.length} salida(s) correctamente`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron registrar las salidas");
    }
  };

  return (
    <>
      <NewPatientDialog
        isOpen={showNewPatientDialog}
        onClose={() => setShowNewPatientDialog(false)}
        onPatientCreated={handlePatientCreated}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Salida de Suministros</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Tipo de Salida</Label>
                <Select value={tipoSalida} onValueChange={setTipoSalida}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salida por comprobante">Salida por comprobante</SelectItem>
                    <SelectItem value="Salida por ajuste">Salida por ajuste</SelectItem>
                    <SelectItem value="Salida por devolución">Salida por devolución</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {nroComprobante && (
                <div>
                  <Label>Número de Comprobante</Label>
                  <Input value={nroComprobante} disabled className="bg-muted font-semibold" />
                </div>
              )}
            </div>

            {tipoSalida === "Salida por comprobante" && (
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-10">
                  <Label>Paciente</Label>
                  <PatientAutocomplete value={selectedPatient} onChange={setSelectedPatient} />
                </div>
                <div className="col-span-2">
                  <Label className="opacity-0">-</Label>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowNewPatientDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo
                  </Button>
                </div>
              </div>
            )}

            {tipoSalida === "Salida por ajuste" && (
              <div>
                <Label>Motivo del Ajuste</Label>
                <Textarea
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Describa el motivo del ajuste..."
                  rows={3}
                />
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold">Agregar Productos</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label>Producto</Label>
                  <Popover open={openProduct} onOpenChange={setOpenProduct}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedProductData ? `${selectedProductData.codigo} - ${selectedProductData.descripcion}` : "Seleccionar producto..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar producto..." />
                        <CommandList>
                          <CommandEmpty>No se encontró producto.</CommandEmpty>
                          <CommandGroup>
                            {selectableProducts.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.codigo} ${p.descripcion}`}
                                onSelect={() => {
                                  setSelectedProduct(p.id);
                                  setOpenProduct(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProduct === p.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-mono mr-2">{p.codigo}</span>
                                {p.descripcion}
                                <span className="ml-auto text-muted-foreground">Stock: {p.stock_actual}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProductData?.stock_actual || 999}
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Precio Venta</Label>
                  <Input value={`S/ ${(selectedProductData?.precio_venta || 0).toFixed(2)}`} disabled className="bg-muted" />
                </div>
                <div className="col-span-2">
                  <Label>Total</Label>
                  <Input
                    value={`S/ ${(tempQuantity * (selectedProductData?.precio_venta || 0)).toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-1">
                  <Button onClick={addProductItem} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Comentario (opcional)</Label>
                <Input
                  value={tempComments}
                  onChange={(e) => setTempComments(e.target.value)}
                  placeholder="Comentario para este ítem"
                />
              </div>
            </div>

            {productItems.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">P. Unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productItems.map((item, index) => (
                      <TableRow key={`${item.medication_id}-${index}`}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{item.descripcion}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">S/ {item.sale_cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">S/ {item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeProductItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {productItems.length > 0 && (
              <div className="flex justify-end">
                <div className="text-lg font-semibold">Total: S/ {totalGeneral.toFixed(2)}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={prepareRegister} disabled={createOutput.isPending}>
              Registrar Salida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar registro</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrarán {productItems.length} salida(s) por un total de S/ {totalGeneral.toFixed(2)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRegistro}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

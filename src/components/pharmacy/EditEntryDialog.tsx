import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Settings } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";
import { useUpdateEntry, usePharmacyEntriesByInvoice } from "@/hooks/usePharmacyEntries";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useUpdateInvoiceHeader } from "@/hooks/useInvoiceHeaders";
import type { PharmacyEntry } from "@/hooks/usePharmacyEntries";
import { EntryDetailsTable, type EntryDetailItem, hasUnprocessedPedidos } from "./EntryDetailsTable";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { NewMedicationDialog } from "./NewMedicationDialog";
import { supabase } from "@/integrations/supabase/client";
import { PedidosFormulaDialog } from "./PedidosFormulaDialog";
import type { PedidoFormulaMagistral } from "@/hooks/useFormulasMagistrales";

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PharmacyEntry | null;
}

export function EditEntryDialog({ open, onOpenChange, entry }: EditEntryDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const updateEntry = useUpdateEntry();
  const updateInvoiceHeader = useUpdateInvoiceHeader();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: invoiceEntries = [] } = usePharmacyEntriesByInvoice(entry?.invoice_number);

  const [openSupplier, setOpenSupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [sinFactura, setSinFactura] = useState(false);
  const [detailItems, setDetailItems] = useState<EntryDetailItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNewMedicationDialog, setShowNewMedicationDialog] = useState(false);
  const [igvPercentage, setIgvPercentage] = useState(18);
  const [showIgvConfig, setShowIgvConfig] = useState(false);
  const [showPedidosWarning, setShowPedidosWarning] = useState(false);
  const [unprocessedItems, setUnprocessedItems] = useState<EntryDetailItem[]>([]);
  const [showPedidosDialog, setShowPedidosDialog] = useState(false);
  const [currentPedidoItem, setCurrentPedidoItem] = useState<EntryDetailItem | null>(null);
  const [showDonacionConfirm, setShowDonacionConfirm] = useState(false);
  const [entryDate, setEntryDate] = useState<string>("");

  const entryType = watch("entry_type");
  
  const handleSinFacturaChange = (checked: boolean) => {
    setSinFactura(checked);
  };

  const handleEntryTypeChange = (value: string) => {
    if (value === "Donación") {
      setShowDonacionConfirm(true);
    } else {
      // Reset to normal entry
      setValue("entry_type", value);
      if (value !== "Donación") {
        setValue("invoice_number", entry?.invoice_number || "");
        setValue("payment_status", entry?.payment_status || "Pendiente");
        setValue("payment_type", entry?.payment_type || "");
        setSinFactura(false);
      }
    }
  };

  const handleConfirmDonacion = () => {
    setValue("entry_type", "Donación");
    setValue("invoice_number", "S/FACTURA");
    setValue("payment_status", "Donación");
    setValue("payment_type", "Donación");
    setSinFactura(true);
    setShowDonacionConfirm(false);
  };

  const handleCancelDonacion = () => {
    setValue("entry_type", "Entrada");
    setShowDonacionConfirm(false);
  };

  // Pre-populate form when entry changes
  useEffect(() => {
    if (entry && open) {
      setValue("entry_type", entry.entry_type || "Entrada");
      setValue("supplier_id", entry.supplier_id);
      setValue("invoice_number", entry.invoice_number);
      setValue("invoice_due_date", entry.invoice_due_date);
      setValue("payment_status", entry.payment_status);
      setValue("payment_type", entry.payment_type);
      setValue("total_amount", entry.total_amount);
      
      // Set date separately for controlled input
      setEntryDate(entry.date || getLocalDateString());
      
      setSelectedSupplier(entry.supplier_id || "");
      
      // Check if invoice number is "S/FACTURA"
      if (entry.invoice_number && entry.invoice_number.toUpperCase().includes("S/FACTURA")) {
        setSinFactura(true);
      } else {
        setSinFactura(false);
      }
    }
  }, [entry, open, setValue]);

  // Load all items from the invoice
  useEffect(() => {
    if (invoiceEntries && invoiceEntries.length > 0 && open) {
      const items = invoiceEntries.map(invoiceEntry => {
        // Format expiry_date from YYYY-MM-DD to YYYY-MM
        let formattedExpiryDate = "";
        if (invoiceEntry.expiry_date) {
          const dateParts = invoiceEntry.expiry_date.split('-');
          formattedExpiryDate = `${dateParts[0]}-${dateParts[1]}`;
        }

        return {
          id: invoiceEntry.id,
          medication_id: invoiceEntry.medication_id || undefined,
          product_code: invoiceEntry.product_code || "",
          description: invoiceEntry.description || "",
          quantity_requested: invoiceEntry.quantity_requested || 0,
          quantity_received: invoiceEntry.quantity_received || 0,
          is_accepted: invoiceEntry.is_accepted ?? true,
          pharmaceutical_form: invoiceEntry.pharmaceutical_form || "",
          presentation: invoiceEntry.presentation || "",
          laboratory: invoiceEntry.laboratory || "",
          batch: invoiceEntry.batch || "",
          nsoc_rs: invoiceEntry.nsoc_rs || "",
          expiry_date: formattedExpiryDate,
          purchase_cost_per_unit: invoiceEntry.purchase_cost_per_unit || 0,
          number_of_boxes: invoiceEntry.num_boxes || 0,
          observations: invoiceEntry.observations || "",
          porcentaje_ganancia: 50,
          update_precio_venta: false,
        };
      });
      setDetailItems(items);
    }
  }, [invoiceEntries, open]);

  const handleFormSubmit = (data: any) => {
    // Check for unprocessed pedidos before confirming
    const { hasUnprocessed, items: unprocessed } = hasUnprocessedPedidos(detailItems);
    if (hasUnprocessed) {
      setUnprocessedItems(unprocessed);
      setShowPedidosWarning(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const handleProcesarPedidos = () => {
    setShowPedidosWarning(false);
    if (unprocessedItems.length > 0) {
      // Open dialog for first unprocessed item
      setCurrentPedidoItem(unprocessedItems[0]);
      setShowPedidosDialog(true);
    }
  };

  const handleContinuarSinDescuentos = () => {
    setShowPedidosWarning(false);
    setShowConfirmDialog(true);
  };

  const handlePedidosConfirm = (selectedPedidos: PedidoFormulaMagistral[]) => {
    if (currentPedidoItem) {
      const totalUnidadesDescuento = selectedPedidos.reduce((sum, p) => sum + p.cantidad, 0);
      const itemIndex = detailItems.findIndex(item => item.id === currentPedidoItem.id);
      
      if (itemIndex !== -1) {
        const newItems = [...detailItems];
        const currentQuantity = newItems[itemIndex].quantity_received || 0;
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          quantity_received: Math.max(0, currentQuantity - totalUnidadesDescuento),
          pedidos_processed: true,
        };
        setDetailItems(newItems);
      }
    }
    
    setShowPedidosDialog(false);
    setCurrentPedidoItem(null);
    
    // Check if there are more unprocessed items
    const remaining = unprocessedItems.slice(1);
    if (remaining.length > 0) {
      setUnprocessedItems(remaining);
      setCurrentPedidoItem(remaining[0]);
      setShowPedidosDialog(true);
    } else {
      // All processed, show confirm dialog
      setShowConfirmDialog(true);
    }
  };

  // Calculate total amount from all items
  const calculateTotalAmount = () => {
    return detailItems.reduce((sum, item) => {
      return sum + (item.quantity_received * item.purchase_cost_per_unit);
    }, 0);
  };

  const calculateIGV = () => {
    const total = calculateTotalAmount();
    return total * (igvPercentage / 100);
  };

  const calculateTotalWithIGV = () => {
    return calculateTotalAmount() + calculateIGV();
  };

  const onConfirm = async () => {
    if (!entry) return;
    const data = watch();
    
    try {
      const totalAmount = calculateTotalAmount();
      const invoiceNumber = data.invoice_number;
      const entryType = data.entry_type || "Entrada";
      
      // Step 1: Update Invoice Header (Maestro)
      const igvAmount = entryType === "Donación" ? 0 : calculateIGV();
      const totalAPagar = entryType === "Donación" ? 0 : calculateTotalWithIGV();
      
      const headerData = {
        invoice_number: invoiceNumber,
        date: entryDate || getLocalDateString(),
        due_date: entryType === "Donación" ? null : (data.invoice_due_date || null),
        status: data.payment_status || "Pendiente",
        total_amount: entryType === "Donación" ? 0 : totalAmount,
        igv: igvAmount,
        total_a_pagar: totalAPagar,
        supplier_id: selectedSupplier || null,
        payment_type: entryType === "Donación" ? null : (data.payment_type || null),
      };
      
      console.log("Saving entry with date:", entryDate, "headerData.date:", headerData.date);

      await updateInvoiceHeader.mutateAsync(headerData);

      // Step 2: Update Entry Details (Detalle)
      for (const detailItem of detailItems) {
        // Convert month format (YYYY-MM) to date format (last day of month)
        let processedExpiryDate = null;
        if (detailItem.expiry_date) {
          const [year, month] = detailItem.expiry_date.split('-');
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          processedExpiryDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        }

        const submitData: any = {
          id: detailItem.id,
          date: headerData.date,
          entry_type: entryType,
          invoice_number: invoiceNumber,
          payment_status: headerData.status,
          payment_type: headerData.payment_type,
          invoice_due_date: headerData.due_date,
          supplier_id: headerData.supplier_id,
          medication_id: detailItem.medication_id || null,
          product_code: detailItem.product_code,
          description: detailItem.description,
          pharmaceutical_form: detailItem.pharmaceutical_form,
          laboratory: detailItem.laboratory,
          batch: detailItem.batch,
          nsoc_rs: detailItem.nsoc_rs,
          expiry_date: processedExpiryDate,
          presentation: detailItem.presentation,
          quantity_requested: detailItem.quantity_requested,
          quantity_received: detailItem.quantity_received,
          is_accepted: detailItem.is_accepted,
          observations: detailItem.observations,
          purchase_cost_per_unit: detailItem.purchase_cost_per_unit,
          num_boxes: detailItem.number_of_boxes,
        };

        await updateEntry.mutateAsync(submitData);

        // Update pharmacy_medications pricing if checkbox is checked
        if (detailItem.update_precio_venta && detailItem.medication_id) {
          const igvUnitario = detailItem.purchase_cost_per_unit * (igvPercentage / 100);
          const importeUnitario = detailItem.purchase_cost_per_unit + igvUnitario;
          const importeGanancia = importeUnitario * (detailItem.porcentaje_ganancia / 100);
          const precioVenta = importeUnitario + importeGanancia;

          const { error: updateError } = await supabase
            .from("pharmacy_medications")
            .update({
              purchase_price: detailItem.purchase_cost_per_unit,
              igv_unitario: igvUnitario,
              importe_unitario: importeUnitario,
              porcentaje_ganancia: detailItem.porcentaje_ganancia,
              importe_ganancia: importeGanancia,
              precio_venta: precioVenta,
            })
            .eq("id", detailItem.medication_id);

          if (updateError) {
            console.error("Error updating medication pricing:", updateError);
          }
        }
      }

      reset();
      setShowConfirmDialog(false);
      onOpenChange(false);
      toast.success("Entrada actualizada exitosamente");
    } catch (error: any) {
      console.error("Error updating entry:", error);
      toast.error(error?.message || "Error al actualizar la entrada. Por favor, intente nuevamente.");
    }
  };

  const getSupplierName = () => {
    return suppliers?.find((s) => s.id === selectedSupplier)?.name || "No especificado";
  };

  if (!entry) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[98vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Entrada de Inventario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Encabezado */}
            <div className="space-y-4">
              {/* Primera fila - Fecha a la izquierda, Tipo de Entrada a la derecha */}
              <div className="flex justify-between items-end">
                <div className="w-64">
                  <Label htmlFor="date">Fecha</Label>
                  <Input 
                    type="date" 
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    max={getLocalDateString()}
                  />
                </div>
                <div className="w-64">
                  <Label htmlFor="entry_type">Tipo de Entrada</Label>
                  <Select 
                    value={watch("entry_type")}
                    onValueChange={handleEntryTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrada">Entrada</SelectItem>
                      <SelectItem value="Donación">Donación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Segunda fila - Nro Factura, S/F, Fecha Venc, Proveedor */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Nro Factura</Label>
                  <Input {...register("invoice_number")} disabled={sinFactura} />
                </div>

                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sin_factura"
                      checked={sinFactura}
                      onCheckedChange={handleSinFacturaChange}
                    />
                    <Label htmlFor="sin_factura" className="text-sm">S/F</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="invoice_due_date">Fecha Venc Factura</Label>
                  <Input 
                    type="date" 
                    {...register("invoice_due_date")} 
                    disabled={sinFactura || entryType === "Donación"}
                  />
                </div>

                <div>
                  <Label htmlFor="supplier_id">Proveedor</Label>
                  <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSupplier}
                        className="w-full justify-between"
                      >
                        {selectedSupplier
                          ? suppliers?.find((s) => s.id === selectedSupplier)?.name
                          : "Buscar proveedor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar proveedor..." />
                        <CommandList>
                          <CommandEmpty>No se encontró proveedor.</CommandEmpty>
                          <CommandGroup>
                            {suppliers?.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.name}
                                onSelect={() => {
                                  setValue("supplier_id", supplier.id);
                                  setSelectedSupplier(supplier.id);
                                  setOpenSupplier(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSupplier === supplier.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {supplier.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tercera fila - Estado y Crédito/Contado con colores */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="payment_status">Estado</Label>
                  {entryType === "Donación" ? (
                    <Input 
                      value="Donación"
                      disabled
                      className="bg-muted"
                    />
                  ) : (
                    <Select 
                      value={watch("payment_status")}
                      onValueChange={(value) => setValue("payment_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente" className="text-yellow-600 font-semibold">
                          Pendiente
                        </SelectItem>
                        <SelectItem value="Cancelado" className="text-green-600 font-semibold">
                          Cancelado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label htmlFor="payment_type">Crédito/Contado</Label>
                  {entryType === "Donación" ? (
                    <Input 
                      value="Donación"
                      disabled
                      className="bg-muted"
                    />
                  ) : (
                    <Select 
                      value={watch("payment_type")}
                      onValueChange={(value) => setValue("payment_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Credito" className="text-orange-600 font-semibold">
                          Crédito
                        </SelectItem>
                        <SelectItem value="Contado" className="text-blue-600 font-semibold">
                          Contado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

          <Separator />

          {/* Detalle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewMedicationDialog(true)}
              >
                Nuevo Producto
              </Button>
            </div>
            <EntryDetailsTable
              items={detailItems}
              onChange={setDetailItems}
              igvPercentage={igvPercentage}
            />
          </div>

          <Separator />

          {/* Pie */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Totales</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="total_amount">Monto Total (Calculado)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    S/.
                  </span>
                  <Input 
                    type="text"
                    value={entryType === "Donación" ? "0.00" : calculateTotalAmount().toFixed(2)}
                    disabled
                    className="pl-12 bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="igv">IGV ({igvPercentage}%)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      S/.
                    </span>
                    <Input 
                      type="text"
                      value={entryType === "Donación" ? "0.00" : calculateIGV().toFixed(2)}
                      disabled
                      className="pl-12 bg-muted"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowIgvConfig(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="total_with_igv">Total con IGV</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    S/.
                  </span>
                  <Input 
                    type="text"
                    value={entryType === "Donación" ? "0.00" : calculateTotalWithIGV().toFixed(2)}
                    disabled
                    className="pl-12 bg-muted font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Cambios</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Desea guardar los cambios de la entrada?
            <div className="mt-4 space-y-2">
              <p><strong>Nro Factura:</strong> {watch("invoice_number") || "Sin especificar"}</p>
              <p><strong>Proveedor:</strong> {getSupplierName()}</p>
              <p><strong>Nro de Items:</strong> {detailItems.length}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={updateEntry.isPending}>
            {updateEntry.isPending ? "Guardando..." : "Sí"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <NewMedicationDialog
      open={showNewMedicationDialog}
      onOpenChange={setShowNewMedicationDialog}
    />

    <Dialog open={showIgvConfig} onOpenChange={setShowIgvConfig}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar IGV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="igv_percentage">Porcentaje de IGV (%)</Label>
            <Input
              id="igv_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={igvPercentage}
              onChange={(e) => setIgvPercentage(Number(e.target.value))}
            />
          </div>
          <Button onClick={() => setShowIgvConfig(false)} className="w-full">
            Aplicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showPedidosWarning} onOpenChange={setShowPedidosWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pedidos de Fórmula Magistral Pendientes</AlertDialogTitle>
          <AlertDialogDescription>
            Hay {unprocessedItems.length} producto(s) con pedidos de fórmula magistral pendientes que no han sido procesados.
            <div className="mt-4 space-y-2">
              {unprocessedItems.map((item, idx) => (
                <p key={idx} className="text-sm">
                  <strong>{item.product_code}</strong> - {item.description} 
                  <span className="text-muted-foreground"> ({item.pending_pedidos?.length} pedido(s))</span>
                </p>
              ))}
            </div>
            <p className="mt-4">¿Desea procesar los descuentos de estos pedidos o continuar sin descuentos?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="outline" onClick={handleContinuarSinDescuentos}>
            Continuar Sin Descuentos
          </Button>
          <AlertDialogAction onClick={handleProcesarPedidos}>
            Procesar Descuentos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {currentPedidoItem && (
      <PedidosFormulaDialog
        open={showPedidosDialog}
        onOpenChange={setShowPedidosDialog}
        pedidos={currentPedidoItem.pending_pedidos || []}
        onConfirm={handlePedidosConfirm}
        productCode={currentPedidoItem.product_code}
        cantidadEntrada={currentPedidoItem.quantity_received}
      />
    )}

    <AlertDialog open={showDonacionConfirm} onOpenChange={setShowDonacionConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Entrada de Donación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Desea ingresar una entrada de tipo Donación? Esta entrada se registrará sin factura.
            <div className="mt-4 text-sm text-muted-foreground">
              <p>• El Nro de Factura se establecerá como "S/FACTURA"</p>
              <p>• El Estado se establecerá como "Donación"</p>
              <p>• El Tipo de Pago se establecerá como "Donación"</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDonacion}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDonacion}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

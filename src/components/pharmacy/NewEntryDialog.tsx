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
import { useCreateEntry } from "@/hooks/usePharmacyEntries";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useCreateInvoiceHeader } from "@/hooks/useInvoiceHeaders";
import { EntryDetailsTable, type EntryDetailItem, hasUnprocessedPedidos } from "./EntryDetailsTable";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { NewMedicationDialog } from "./NewMedicationDialog";
import { supabase } from "@/integrations/supabase/client";
import { PedidosFormulaDialog } from "./PedidosFormulaDialog";
import type { PedidoFormulaMagistral } from "@/hooks/useFormulasMagistrales";

interface NewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewEntryDialog({ open, onOpenChange }: NewEntryDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: {
      entry_type: "Entrada"
    }
  });
  const createEntry = useCreateEntry();
  const createInvoiceHeader = useCreateInvoiceHeader();
  const { data: suppliers } = usePharmacySuppliers();

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
      setValue("invoice_number", "");
      setValue("payment_status", "Pendiente");
      setValue("payment_type", "");
      setSinFactura(false);
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
    const data = watch();
    try {
      const totalAmount = calculateTotalAmount();
      let invoiceNumber = data.invoice_number;
      const entryType = data.entry_type || "Entrada";
      
      // Step 1: Generate unique invoice number for donations
      if (entryType === "Donación") {
        const { data: lastDonation, error: donationError } = await supabase
          .from("invoice_headers")
          .select("invoice_number")
          .ilike("invoice_number", "DON-SF%")
          .order("created_at", { ascending: false })
          .limit(1);

        if (donationError) throw donationError;

        let nextNumber = 1;
        if (lastDonation && lastDonation.length > 0) {
          const lastNumber = parseInt(lastDonation[0].invoice_number.replace("DON-SF", ""));
          nextNumber = lastNumber + 1;
        }
        
        invoiceNumber = `DON-SF${nextNumber.toString().padStart(4, "0")}`;
      }
      
      // Step 2: Create Invoice Header (Maestro)
      const igvAmount = entryType === "Donación" ? 0 : calculateIGV();
      const totalAPagar = entryType === "Donación" ? 0 : calculateTotalWithIGV();
      
      const headerData = {
        invoice_number: invoiceNumber,
        date: data.date || getLocalDateString(),
        due_date: entryType === "Donación" ? null : (data.invoice_due_date || null),
        status: data.payment_status || "Pendiente",
        total_amount: entryType === "Donación" ? 0 : totalAmount,
        igv: igvAmount,
        total_a_pagar: totalAPagar,
        supplier_id: data.supplier_id || null,
        payment_type: entryType === "Donación" ? null : (data.payment_type || null),
      };

      await createInvoiceHeader.mutateAsync(headerData);

      // Step 2: Create Entry Details (Detalle)
      for (const item of detailItems) {
        // Convert month format (YYYY-MM) to date format (last day of month)
        let processedExpiryDate = null;
        if (item.expiry_date) {
          const [year, month] = item.expiry_date.split('-');
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          processedExpiryDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        }

        const entryData = {
          date: headerData.date,
          entry_type: entryType,
          invoice_number: invoiceNumber,
          payment_status: headerData.status,
          payment_type: headerData.payment_type,
          invoice_due_date: headerData.due_date,
          supplier_id: headerData.supplier_id,
          medication_id: item.medication_id,
          product_code: item.product_code,
          description: item.description,
          quantity_requested: item.quantity_requested,
          quantity_received: item.quantity_received,
          is_accepted: item.is_accepted,
          pharmaceutical_form: item.pharmaceutical_form,
          presentation: item.presentation,
          laboratory: item.laboratory,
          batch: item.batch,
          nsoc_rs: item.nsoc_rs,
          expiry_date: processedExpiryDate,
          purchase_cost_per_unit: item.purchase_cost_per_unit,
          number_of_boxes: item.number_of_boxes || 0,
          observations: item.observations,
        };
        
        await createEntry.mutateAsync(entryData);

        // Update pharmacy_medications pricing if checkbox is checked
        if (item.update_precio_venta && item.medication_id) {
          const igvUnitario = item.purchase_cost_per_unit * (igvPercentage / 100);
          const importeUnitario = item.purchase_cost_per_unit + igvUnitario;
          const importeGanancia = importeUnitario * (item.porcentaje_ganancia / 100);
          const precioVenta = importeUnitario + importeGanancia;

          const { error: updateError } = await supabase
            .from("pharmacy_medications")
            .update({
              purchase_price: item.purchase_cost_per_unit,
              igv_unitario: igvUnitario,
              importe_unitario: importeUnitario,
              porcentaje_ganancia: item.porcentaje_ganancia,
              importe_ganancia: importeGanancia,
              precio_venta: precioVenta,
            })
            .eq("id", item.medication_id);

          if (updateError) {
            console.error("Error updating medication pricing:", updateError);
          }
        }
      }

      reset({ entry_type: "Entrada" });
      setSelectedSupplier("");
      setDetailItems([]);
      setShowConfirmDialog(false);
      onOpenChange(false);
      toast.success("Entrada registrada exitosamente");
    } catch (error: any) {
      console.error("Error creating entry:", error);
      toast.error(error?.message || "Error al guardar la entrada. Por favor, intente nuevamente.");
    }
  };

  const getSupplierName = () => {
    return suppliers?.find((s) => s.id === selectedSupplier)?.name || "No especificado";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[98vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Entrada de Inventario</DialogTitle>
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
                    {...register("date")}
                    defaultValue={getLocalDateString()}
                    max={getLocalDateString()}
                  />
                </div>
                <div className="w-64">
                  <Label htmlFor="entry_type">Tipo de Entrada</Label>
                  <Select 
                    value={entryType || "Entrada"}
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
                  <Popover modal open={openSupplier} onOpenChange={setOpenSupplier}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
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
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  setValue("supplier_id", supplier.id);
                                  setSelectedSupplier(supplier.id);
                                  setOpenSupplier(false);
                                }}
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

              {/* Tercera fila - Estado, Crédito/Contado y Nro de Cajas */}
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
                      defaultValue="Pendiente"
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
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Entrada</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Desea agregar la entrada?
            <div className="mt-4 space-y-2">
              <p><strong>Nro Factura:</strong> {watch("invoice_number") || "Sin especificar"}</p>
              <p><strong>Proveedor:</strong> {getSupplierName()}</p>
              <p><strong>Nro de Items:</strong> {detailItems.length}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={createEntry.isPending}>
            {createEntry.isPending ? "Guardando..." : "Sí"}
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

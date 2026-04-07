import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateOpticsEntry } from "@/hooks/useOpticsEntries";
import { toast } from "sonner";

interface OpticsEditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
}

export function OpticsEditEntryDialog({ open, onOpenChange, entry }: OpticsEditEntryDialogProps) {
  const updateEntry = useUpdateOpticsEntry();

  const [date, setDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pendiente");
  const [entryType, setEntryType] = useState("Entrada");
  const [observations, setObservations] = useState("");
  const [lote, setLote] = useState("");
  const [quantityReceived, setQuantityReceived] = useState(1);
  const [purchaseCostPerUnit, setPurchaseCostPerUnit] = useState(0);

  useEffect(() => {
    if (entry) {
      setDate(entry.date || "");
      setInvoiceNumber(entry.invoice_number || "");
      setPaymentStatus(entry.payment_status || "Pendiente");
      setEntryType(entry.entry_type || "Entrada");
      setObservations(entry.observations || "");
      setLote(entry.lote || "");
      setQuantityReceived(entry.quantity_received || 1);
      setPurchaseCostPerUnit(entry.purchase_cost_per_unit || 0);
    }
  }, [entry]);

  const handleSubmit = async () => {
    const importe = quantityReceived * purchaseCostPerUnit;

    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        date,
        quantity_received: quantityReceived,
        purchase_cost_per_unit: purchaseCostPerUnit,
        importe,
        invoice_number: invoiceNumber || null,
        payment_status: paymentStatus,
        entry_type: entryType,
        lote: lote || null,
        observations: observations || null,
      });

      onOpenChange(false);
      toast.success("Entrada actualizada exitosamente");
    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar la entrada");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Entrada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de Entrada</Label>
              <Select value={entryType} onValueChange={setEntryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Devolución">Devolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nro Factura</Label>
              <Input 
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Producto</Label>
            <Input 
              value={`${entry?.product_code || ""} - ${entry?.product?.nombre || entry?.description || ""}`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Cantidad</Label>
              <Input 
                type="number" 
                min={1}
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Costo Unitario (S/)</Label>
              <Input 
                type="number" 
                step="0.01"
                min={0}
                value={purchaseCostPerUnit}
                onChange={(e) => setPurchaseCostPerUnit(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Importe Total (S/)</Label>
              <Input 
                value={(quantityReceived * purchaseCostPerUnit).toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lote</Label>
              <Input 
                value={lote}
                onChange={(e) => setLote(e.target.value)}
              />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input 
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateEntry.isPending}>
            {updateEntry.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

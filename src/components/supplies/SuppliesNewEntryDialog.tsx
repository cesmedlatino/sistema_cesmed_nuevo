import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";

import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useSuppliesProducts } from "@/hooks/useSuppliesProducts";
import { useCreateSuppliesEntry } from "@/hooks/useSuppliesEntries";

interface EntryItem {
  id: string;
  medication_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  cost_per_unit: number;
  batch: string;
  observations: string;
}

interface SuppliesNewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliesNewEntryDialog({ open, onOpenChange }: SuppliesNewEntryDialogProps) {
  const createEntry = useCreateSuppliesEntry();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: products } = useSuppliesProducts(1000);

  const [date, setDate] = useState(getLocalDateString());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pendiente");
  const [entryType, setEntryType] = useState("Entrada");

  const [openSupplier, setOpenSupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [items, setItems] = useState<EntryItem[]>([]);
  const [openProduct, setOpenProduct] = useState(false);

  const addItem = (medicationId: string) => {
    const product = products?.find((p) => p.id === medicationId);
    if (!product) return;

    if (items.some((it) => it.medication_id === medicationId)) {
      toast.error("Este producto ya fue agregado");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        medication_id: medicationId,
        product_code: product.codigo || "",
        product_name: product.descripcion,
        quantity: 1,
        cost_per_unit: product.purchase_price || 0,
        batch: "",
        observations: "",
      },
    ]);
    setOpenProduct(false);
  };

  const updateItem = (id: string, field: keyof EntryItem, value: string | number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const totalImporte = items.reduce((sum, it) => sum + it.quantity * it.cost_per_unit, 0);

  const resetForm = () => {
    setDate(getLocalDateString());
    setInvoiceNumber("");
    setPaymentStatus("Pendiente");
    setEntryType("Entrada");
    setSelectedSupplier("");
    setItems([]);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Debe agregar al menos un producto");
      return;
    }
    for (const item of items) {
      if (item.quantity <= 0) {
        toast.error(`La cantidad de "${item.product_name}" debe ser mayor a 0`);
        return;
      }
    }

    try {
      for (const item of items) {
        await createEntry.mutateAsync({
          date,
          medication_id: item.medication_id,
          product_code: item.product_code,
          description: item.product_name,
          quantity_received: item.quantity,
          purchase_cost_per_unit: item.cost_per_unit,
          invoice_number: invoiceNumber || null,
          supplier_id: selectedSupplier || null,
          batch: item.batch || null,
          expiry_date: null,
          observations: item.observations || null,
          entry_type: entryType,
          payment_status: paymentStatus,
        });
      }

      const count = items.length;
      resetForm();
      onOpenChange(false);
      toast.success(`${count} entrada(s) registrada(s) exitosamente`);
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar las entradas");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nueva Entrada de Suministros</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getLocalDateString()}
              />
            </div>
            <div>
              <Label>Tipo</Label>
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
            <div>
              <Label>Nro Factura</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedSupplier
                      ? suppliers?.find((s) => s.id === selectedSupplier)?.name
                      : "Seleccionar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar proveedor..." />
                    <CommandList>
                      <CommandEmpty>No encontrado.</CommandEmpty>
                      <CommandGroup>
                        {suppliers?.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.name}
                            onSelect={() => {
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

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Agregar Producto</Label>
              <Popover open={openProduct} onOpenChange={setOpenProduct}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Seleccionar producto...
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[520px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por código o descripción..." />
                    <CommandList>
                      <CommandEmpty>No se encontró producto.</CommandEmpty>
                      <CommandGroup>
                        {products?.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.codigo} ${p.descripcion}`}
                            onSelect={() => addItem(p.id)}
                          >
                            <span className="font-mono mr-2">{p.codigo}</span>
                            {p.descripcion}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[110px]">Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[90px]">Cantidad</TableHead>
                    <TableHead className="w-[120px]">Costo Unit.</TableHead>
                    <TableHead className="w-[120px]">Lote</TableHead>
                    <TableHead className="w-[170px]">Observaciones</TableHead>
                    <TableHead className="w-[110px] text-right">Importe</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                      <TableCell className="text-sm">{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.cost_per_unit}
                          onChange={(e) => updateItem(item.id, "cost_per_unit", Number(e.target.value))}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.batch}
                          onChange={(e) => updateItem(item.id, "batch", e.target.value)}
                          placeholder="-"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.observations}
                          onChange={(e) => updateItem(item.id, "observations", e.target.value)}
                          placeholder="-"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">S/ {(item.quantity * item.cost_per_unit).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
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

          {items.length === 0 && (
            <div className="flex-1 flex items-center justify-center border rounded-md border-dashed text-muted-foreground">
              Seleccione productos para agregar a la entrada
            </div>
          )}

          {items.length > 0 && (
            <div className="flex justify-end pt-2 border-t">
              <div className="text-lg font-semibold">Total: S/ {totalImporte.toFixed(2)}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createEntry.isPending || items.length === 0}>
            {createEntry.isPending ? "Guardando..." : `Guardar ${items.length} item(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

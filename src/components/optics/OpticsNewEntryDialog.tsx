import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";
import { useCreateOpticsEntry } from "@/hooks/useOpticsEntries";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useOpticsProducts } from "@/hooks/useOpticsProducts";
import { OpticsProductDialog } from "./OpticsProductDialog";
import { toast } from "sonner";

interface EntryItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  cost_per_unit: number;
  lote: string;
  observations: string;
}

interface OpticsNewEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpticsNewEntryDialog({ open, onOpenChange }: OpticsNewEntryDialogProps) {
  const createEntry = useCreateOpticsEntry();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: products, refetch: refetchProducts } = useOpticsProducts();

  const [date, setDate] = useState(getLocalDateString());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Pendiente");
  const [entryType, setEntryType] = useState("Entrada");

  const [openSupplier, setOpenSupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const [items, setItems] = useState<EntryItem[]>([]);
  const [openProduct, setOpenProduct] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);

  const addItem = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    // Check if product already exists in items
    if (items.some((item) => item.product_id === productId)) {
      toast.error("Este producto ya fue agregado");
      return;
    }

    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        product_id: productId,
        product_code: product.codigo || "",
        product_name: product.nombre,
        quantity: 1,
        cost_per_unit: product.precio_compra || 0,
        lote: "",
        observations: "",
      },
    ]);
    setOpenProduct(false);
  };

  const updateItem = (id: string, field: keyof EntryItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const totalImporte = items.reduce((sum, item) => sum + item.quantity * item.cost_per_unit, 0);

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
          product_id: item.product_id,
          product_code: item.product_code,
          description: item.product_name,
          quantity_received: item.quantity,
          purchase_cost_per_unit: item.cost_per_unit,
          importe: item.quantity * item.cost_per_unit,
          invoice_number: invoiceNumber || null,
          payment_status: paymentStatus,
          payment_type: null,
          entry_type: entryType,
          supplier_id: selectedSupplier || null,
          lote: item.lote || null,
          observations: item.observations || null,
        });
      }

      // Reset form
      setDate(getLocalDateString());
      setInvoiceNumber("");
      setPaymentStatus("Pendiente");
      setEntryType("Entrada");
      setSelectedSupplier("");
      setItems([]);

      onOpenChange(false);
      toast.success(`${items.length} entrada(s) registrada(s) exitosamente`);
    } catch (error: any) {
      toast.error(error?.message || "Error al guardar las entradas");
    }
  };

  const handleProductCreated = () => {
    refetchProducts();
    setShowProductDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nueva Entrada de Productos Ópticos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Header fields */}
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
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Opcional"
                />
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
                  <PopoverContent className="w-[250px] p-0">
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

            {/* Product selector */}
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
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por código o nombre..." />
                      <CommandList>
                        <CommandEmpty>No se encontró producto.</CommandEmpty>
                        <CommandGroup>
                          {products?.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.codigo} ${product.nombre}`}
                              onSelect={() => addItem(product.id)}
                            >
                              <span className="font-mono mr-2">{product.codigo}</span>
                              {product.nombre}
                              {product.marca && (
                                <span className="text-muted-foreground ml-2">({product.marca})</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowProductDialog(true)}
                title="Agregar nuevo producto"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Items table */}
            {items.length > 0 && (
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[80px]">Cantidad</TableHead>
                      <TableHead className="w-[110px]">Costo Unit.</TableHead>
                      <TableHead className="w-[100px]">Lote</TableHead>
                      <TableHead className="w-[150px]">Observaciones</TableHead>
                      <TableHead className="w-[100px] text-right">Importe</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
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
                            value={item.lote}
                            onChange={(e) => updateItem(item.id, "lote", e.target.value)}
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
                        <TableCell className="text-right font-medium">
                          S/ {(item.quantity * item.cost_per_unit).toFixed(2)}
                        </TableCell>
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

            {/* Total */}
            {items.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <div className="text-lg font-semibold">
                  Total: S/ {totalImporte.toFixed(2)}
                </div>
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

      <OpticsProductDialog
        open={showProductDialog}
        onOpenChange={(open) => {
          setShowProductDialog(open);
          if (!open) handleProductCreated();
        }}
      />
    </>
  );
}
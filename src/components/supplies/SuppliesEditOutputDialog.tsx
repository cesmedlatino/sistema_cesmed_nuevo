import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useUpdateConsultingRoomOutput, ConsultingRoomOutput, UpdateOutputItem } from "@/hooks/useSuppliesConsultingRoomOutputs";
import { useSuppliesProducts } from "@/hooks/useSuppliesProducts";
import { Trash2, Plus, Search } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SuppliesEditOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  output: ConsultingRoomOutput | null;
}

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface EditableItem {
  id?: string;
  medicationId: string;
  productCode: string;
  description: string;
  quantity: number;
  originalQuantity: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function SuppliesEditOutputDialog({ open, onOpenChange, output }: SuppliesEditOutputDialogProps) {
  const updateOutput = useUpdateConsultingRoomOutput();
  const { data: products = [] } = useSuppliesProducts();
  
  const [observations, setObservations] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (output) {
      setObservations(output.observations || "");
      setDeliveryDate(output.delivery_date?.split("T")[0] || output.date.split("T")[0]);
      
      // Convert output items to editable items
      const editableItems: EditableItem[] = (output.items || []).map(item => ({
        id: item.id,
        medicationId: item.medication_id,
        productCode: item.product_code || item.medication?.codigo || "",
        description: item.description || item.medication?.descripcion || "",
        quantity: item.quantity,
        originalQuantity: item.quantity,
        isNew: false,
        isDeleted: false,
      }));
      setItems(editableItems);
    }
  }, [output]);

  const handleQuantityChange = (index: number, newQuantity: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.max(1, newQuantity) } : item
    ));
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isDeleted: true } : item
    ));
  };

  const handleRestoreItem = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isDeleted: false } : item
    ));
  };

  const handleAddItem = (product: { id: string; codigo: string; descripcion: string; stock_actual: number }) => {
    // Check if product already exists in items
    const existingIndex = items.findIndex(item => item.medicationId === product.id && !item.isDeleted);
    if (existingIndex >= 0) {
      // Increment quantity instead of adding duplicate
      handleQuantityChange(existingIndex, items[existingIndex].quantity + 1);
      setSearchOpen(false);
      setSearchTerm("");
      return;
    }

    const newItem: EditableItem = {
      medicationId: product.id,
      productCode: product.codigo,
      description: product.descripcion,
      quantity: 1,
      originalQuantity: 0,
      isNew: true,
      isDeleted: false,
    };
    setItems(prev => [...prev, newItem]);
    setSearchOpen(false);
    setSearchTerm("");
  };

  const handleSave = async () => {
    if (!output) return;

    // Convert to UpdateOutputItem format
    const updateItems: UpdateOutputItem[] = items.map(item => ({
      id: item.id,
      medicationId: item.medicationId,
      quantity: item.quantity,
      productCode: item.productCode,
      description: item.description,
      originalQuantity: item.originalQuantity,
      isNew: item.isNew,
      isDeleted: item.isDeleted,
    }));

    await updateOutput.mutateAsync({
      id: output.id,
      consultingRoomId: output.consulting_room_id,
      observations,
      deliveryDate,
      items: updateItems,
      originalItems: output.items,
    });

    onOpenChange(false);
  };

  if (!output) return null;

  const activeItems = items.filter(item => !item.isDeleted);
  const deletedItems = items.filter(item => item.isDeleted);
  const filteredProducts = products.filter(p => 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Formato de Salida {output.output_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nro. Formato</Label>
              <Input value={output.output_number} disabled className="font-mono" />
            </div>
            <div>
              <Label>Consultorio</Label>
              <Input value={output.consulting_room?.name || ""} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha de Registro</Label>
              <Input value={format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })} disabled />
            </div>
            <div>
              <Label>Fecha de Entrega</Label>
              <Input 
                type="date" 
                value={deliveryDate} 
                onChange={(e) => setDeliveryDate(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <Label>Estado</Label>
            <div className="mt-1">
              <Badge variant={output.status === "Entregado" ? "default" : output.status === "Anulado" ? "destructive" : "secondary"}>
                {output.status}
              </Badge>
            </div>
          </div>

          {/* Agregar Producto */}
          <div className="space-y-2">
            <Label>Agregar Producto</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Buscar y agregar producto...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar por código o descripción..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron productos</CommandEmpty>
                    <CommandGroup heading="Productos disponibles">
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.codigo} ${product.descripcion}`}
                          onSelect={() => handleAddItem(product)}
                          className="cursor-pointer"
                        >
                          <div className="flex justify-between w-full">
                            <div>
                              <span className="font-mono text-sm mr-2">{product.codigo}</span>
                              <span>{product.descripcion}</span>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              Stock: {product.stock_actual}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-32 text-center">Cantidad</TableHead>
                  <TableHead className="w-20 text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay items. Agregue productos usando el buscador.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeItems.map((item, index) => {
                    const originalIndex = items.findIndex(i => i === item);
                    return (
                      <TableRow key={originalIndex} className={item.isNew ? "bg-green-50" : ""}>
                        <TableCell className="font-mono">{item.productCode}</TableCell>
                        <TableCell>
                          {item.description}
                          {item.isNew && (
                            <Badge variant="secondary" className="ml-2 text-xs">Nuevo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(originalIndex, parseInt(e.target.value) || 1)}
                            className="w-20 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(originalIndex)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Deleted items - can be restored */}
          {deletedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Items eliminados (click para restaurar)</Label>
              <div className="flex flex-wrap gap-2">
                {deletedItems.map((item, idx) => {
                  const originalIndex = items.findIndex(i => i === item);
                  return (
                    <Badge 
                      key={originalIndex}
                      variant="outline" 
                      className="cursor-pointer line-through opacity-60 hover:opacity-100"
                      onClick={() => handleRestoreItem(originalIndex)}
                    >
                      {item.productCode} - {item.description} (x{item.quantity})
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label>Observaciones</Label>
            <Textarea 
              value={observations} 
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Agregar observaciones..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateOutput.isPending || activeItems.length === 0}
          >
            {updateOutput.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

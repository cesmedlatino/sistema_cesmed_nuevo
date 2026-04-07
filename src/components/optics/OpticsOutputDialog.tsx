import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PatientAutocomplete } from "@/components/pharmacy/PatientAutocomplete";
import { NewPatientDialog } from "@/components/patients/NewPatientDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, getLocalDateString } from "@/lib/utils";
import { useOpticsProducts } from "@/hooks/useOpticsProducts";
import { OpticsOutputComprobantePreview } from "./OpticsOutputComprobantePreview";

interface ProductItem {
  product_id: string;
  codigo: string;
  nombre: string;
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

interface OpticsOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any | null;
  onSuccess?: () => void;
}

export function OpticsOutputDialog({ open, onOpenChange, editData, onSuccess }: OpticsOutputDialogProps) {
  const { toast } = useToast();
  const { data: products } = useOpticsProducts();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [comprobanteConfig, setComprobanteConfig] = useState<any>(null);

  const [fecha, setFecha] = useState(getLocalDateString());
  const [tipoSalida, setTipoSalida] = useState("Salida por comprobante");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [nroComprobante, setNroComprobante] = useState("");

  // Temp fields for adding product
  const [openProduct, setOpenProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempComments, setTempComments] = useState("");
  
  // Fetch comprobante config
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("comprobante_config")
        .select("*")
        .single();
      if (data) setComprobanteConfig(data);
    };
    fetchConfig();
  }, []);

  const selectedProductData = products?.find((p) => p.id === selectedProduct);

  useEffect(() => {
    if (open) {
      if (editData) {
        setFecha(editData.date);
        setTipoSalida(editData.tipo_salida || "Salida por comprobante");
        setMotivoAjuste(editData.motivo_ajuste || "");
        setNroComprobante(editData.nro_comprobante || "");
        if (editData.patient) {
          setSelectedPatient(editData.patient);
        }
      } else {
        setFecha(getLocalDateString());
        setTipoSalida("Salida por comprobante");
        setMotivoAjuste("");
        setSelectedPatient(null);
        setProductItems([]);
        setNroComprobante("");
      }
      setSelectedProduct("");
      setTempQuantity(1);
      setTempComments("");
    }
  }, [open, editData]);

  const addProductItem = () => {
    if (!selectedProduct || !selectedProductData) {
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

    if (tempQuantity > selectedProductData.stock_actual) {
      toast({
        title: "Error",
        description: `Stock insuficiente. Disponible: ${selectedProductData.stock_actual}`,
        variant: "destructive",
      });
      return;
    }

    const total = tempQuantity * (selectedProductData.precio_venta || 0);
    
    const newItem: ProductItem = {
      product_id: selectedProductData.id,
      codigo: selectedProductData.codigo,
      nombre: selectedProductData.nombre,
      quantity: tempQuantity,
      sale_cost_per_unit: selectedProductData.precio_venta || 0,
      total,
      comments: tempComments,
    };

    setProductItems([...productItems, newItem]);
    setSelectedProduct("");
    setTempQuantity(1);
    setTempComments("");
  };

  const removeProductItem = (index: number) => {
    setProductItems(productItems.filter((_, i) => i !== index));
  };

  const handleRegistrarSalida = async () => {
    if (productItems.length === 0) {
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

    if (tipoSalida === "Salida por ajuste" && !motivoAjuste) {
      toast({
        title: "Error",
        description: "Debe especificar el motivo del ajuste",
        variant: "destructive",
      });
      return;
    }

    // Generate correlative number if new
    if (!editData && !nroComprobante) {
      try {
        const { data: lastOutput } = await supabase
          .from("optics_outputs")
          .select("nro_comprobante")
          .ilike("nro_comprobante", "OPT-S%")
          .order("created_at", { ascending: false })
          .limit(1);

        let nextNumber = 1;
        if (lastOutput && lastOutput.length > 0 && lastOutput[0].nro_comprobante) {
          const match = lastOutput[0].nro_comprobante.match(/OPT-S(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        setNroComprobante(`OPT-S${nextNumber.toString().padStart(5, "0")}`);
      } catch (error) {
        console.error("Error generating comprobante number:", error);
      }
    }

    setShowConfirmDialog(true);
  };

  const confirmarRegistro = async () => {
    setLoading(true);
    setShowConfirmDialog(false);

    try {
      if (editData) {
        const totalAmount = productItems.reduce((sum, item) => sum + item.total, 0);
        
        const { error } = await supabase
          .from("optics_outputs")
          .update({
            date: fecha,
            tipo_salida: tipoSalida,
            patient_id: selectedPatient?.id || null,
            motivo_ajuste: motivoAjuste || null,
            total: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq("id", editData.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "La salida ha sido actualizada correctamente",
        });
      } else {
        // Create new records - one per product
        for (const item of productItems) {
          const output = {
            date: fecha,
            tipo_salida: tipoSalida,
            nro_comprobante: nroComprobante,
            patient_id: selectedPatient?.id || null,
            motivo_ajuste: motivoAjuste || null,
            product_id: item.product_id,
            product_code: item.codigo,
            description: item.nombre,
            quantity: item.quantity,
            sale_cost_per_unit: item.sale_cost_per_unit,
            total: item.total,
            comments: item.comments || null,
          };

          const { error } = await supabase
            .from("optics_outputs")
            .insert(output);

          if (error) throw error;
        }

        toast({
          title: "Éxito",
          description: `Se registraron ${productItems.length} salida(s) correctamente`,
        });
        
        // Show preview after registration
        setShowPreview(true);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error registrando salidas:", error);
      toast({
        title: "Error",
        description: editData ? "No se pudo actualizar la salida" : "No se pudieron registrar las salidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalGeneral = productItems.reduce((sum, item) => sum + item.total, 0);

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
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editData ? "Editar Salida" : "Nueva Salida de Productos Ópticos"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
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

            {/* Add Products Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold">Agregar Productos</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  <Label>Producto</Label>
                  <Popover open={openProduct} onOpenChange={setOpenProduct}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedProduct
                          ? `${selectedProductData?.codigo} - ${selectedProductData?.nombre}`
                          : "Seleccionar producto..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar producto..." />
                        <CommandList>
                          <CommandEmpty>No se encontró producto.</CommandEmpty>
                          <CommandGroup>
                            {products?.filter(p => p.stock_actual > 0).map((product) => (
                              <CommandItem
                                key={product.id}
                                value={`${product.codigo} ${product.nombre}`}
                                onSelect={() => {
                                  setSelectedProduct(product.id);
                                  setOpenProduct(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProduct === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-mono mr-2">{product.codigo}</span>
                                {product.nombre}
                                <span className="ml-auto text-muted-foreground">
                                  Stock: {product.stock_actual}
                                </span>
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
                  <Input
                    value={`S/ ${(selectedProductData?.precio_venta || 0).toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
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
            </div>

            {/* Products Table */}
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
                      <TableRow key={index}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">S/ {item.sale_cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">S/ {item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProductItem(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4} className="text-right">TOTAL GENERAL:</TableCell>
                      <TableCell className="text-right">S/ {totalGeneral.toFixed(2)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarSalida} disabled={loading || productItems.length === 0}>
              {loading ? "Registrando..." : editData ? "Actualizar Salida" : "Registrar Salida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrarán {productItems.length} producto(s) con un total de S/ {totalGeneral.toFixed(2)}.
              ¿Desea continuar?
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

      <OpticsOutputComprobantePreview
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
        numeroComprobante={nroComprobante}
        fecha={fecha}
        tipoSalida={tipoSalida}
        paciente={selectedPatient}
        products={productItems.map(item => ({
          codigo: item.codigo,
          nombre: item.nombre,
          quantity: item.quantity,
          sale_cost_per_unit: item.sale_cost_per_unit,
          total: item.total,
          comments: item.comments,
        }))}
        total={totalGeneral}
        config={comprobanteConfig}
      />
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { cn, getLocalDateString } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

import { useSuppliesProducts } from "@/hooks/useSuppliesProducts";
import { useCreateConsultingRoomOutput } from "@/hooks/useSuppliesConsultingRoomOutputs";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProductItem {
  medication_id: string;
  codigo: string;
  descripcion: string;
  quantity: number;
}

interface SuppliesConsultingRoomOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliesConsultingRoomOutputDialog({ open, onOpenChange }: SuppliesConsultingRoomOutputDialogProps) {
  const createOutput = useCreateConsultingRoomOutput();
  const { data: products } = useSuppliesProducts(1000);
  const { data: consultingRooms = [] } = useConsultingRooms();
  const { user } = useAuth();

  // Get current user's full name
  const [currentUserName, setCurrentUserName] = useState<string>("");
  
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("usuario")
        .select("personal:personal_id(nombres, apellidos)")
        .eq("auth_user_id", user.id)
        .single();
      
      if (data?.personal) {
        const personal = data.personal as { nombres: string; apellidos: string };
        setCurrentUserName(`${personal.nombres} ${personal.apellidos}`);
      } else {
        setCurrentUserName(user.email || "Usuario del sistema");
      }
    };
    fetchUserName();
  }, [user]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [generatedOutputNumber, setGeneratedOutputNumber] = useState("");

  const [fecha, setFecha] = useState(getLocalDateString());
  const [fechaEntrega, setFechaEntrega] = useState(getLocalDateString());
  const [selectedConsultingRoom, setSelectedConsultingRoom] = useState("");
  const [observations, setObservations] = useState("");
  const [productItems, setProductItems] = useState<ProductItem[]>([]);

  const [openProduct, setOpenProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);

  const selectableProducts = useMemo(() => (products || []).filter((p) => (p.stock_actual || 0) > 0), [products]);
  const selectedProductData = selectableProducts.find((p) => p.id === selectedProduct);
  const selectedRoomData = (consultingRooms || []).find((r) => r.id === selectedConsultingRoom);

  useEffect(() => {
    if (!open) return;
    // Reset form when dialog opens
    setFecha(getLocalDateString());
    setFechaEntrega(getLocalDateString());
    setSelectedConsultingRoom("");
    setObservations("");
    setProductItems([]);
    setSelectedProduct("");
    setTempQuantity(1);
    setGeneratedOutputNumber("");
  }, [open]);

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

    setProductItems((prev) => [
      ...prev,
      {
        medication_id: selectedProductData.id,
        codigo: selectedProductData.codigo,
        descripcion: selectedProductData.descripcion,
        quantity: tempQuantity,
      },
    ]);

    setSelectedProduct("");
    setTempQuantity(1);
  };

  const removeProductItem = (index: number) => {
    setProductItems((prev) => prev.filter((_, i) => i !== index));
  };

  const prepareRegister = async () => {
    if (!selectedConsultingRoom) {
      toast.error("Debe seleccionar un consultorio");
      return;
    }
    if (productItems.length === 0) {
      toast.error("Debe agregar al menos un producto");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmarRegistro = async () => {
    setShowConfirmDialog(false);

    try {
      const result = await createOutput.mutateAsync({
        consultingRoomId: selectedConsultingRoom,
        deliveryDate: fechaEntrega,
        observations: observations || undefined,
        items: productItems.map((item) => ({
          medicationId: item.medication_id,
          quantity: item.quantity,
          productCode: item.codigo,
          description: item.descripcion,
        })),
      });

      setGeneratedOutputNumber(result.outputNumber);
      setShowPreviewDialog(true);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo registrar la salida");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const itemsHTML = productItems
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${item.codigo}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.descripcion}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${item.quantity}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Formato de Salida ${generatedOutputNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1a1a1a; }
          .container { padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo { width: 80px; height: auto; }
          .clinic-name { font-size: 18px; font-weight: bold; color: #059669; text-transform: uppercase; }
          .clinic-info { font-size: 11px; color: #666; }
          .doc-box { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
          .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .doc-number { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .info-box { background: #f0fdf4; border-radius: 8px; padding: 15px; border-left: 4px solid #10b981; }
          .info-title { font-size: 11px; font-weight: 600; color: #059669; text-transform: uppercase; margin-bottom: 10px; }
          .info-item { margin-bottom: 5px; }
          .info-item label { color: #666; }
          .info-item span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #059669; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .observations { background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .observations-title { font-weight: 600; color: #374151; margin-bottom: 8px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature { text-align: center; width: 200px; }
          .signature-line { border-top: 2px solid #059669; padding-top: 8px; }
          .signature-label { font-size: 11px; color: #666; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .footer .name { color: #059669; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="/images/logo-cesmed.png" alt="Logo" class="logo" />
              <div>
                <div class="clinic-name">CESMED LATINOAMERICANO</div>
                <div class="clinic-info">Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa</div>
                <div class="clinic-info">Tel: 054-407301 | Cel: 959029377</div>
              </div>
            </div>
            <div class="doc-box">
              <div class="doc-label">Salida por Consumo</div>
              <div class="doc-number">${generatedOutputNumber}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Información de Entrega</div>
              <div class="info-item"><label>Fecha de Registro: </label><span>${format(new Date(fecha), "dd/MM/yyyy", { locale: es })}</span></div>
              <div class="info-item"><label>Fecha de Entrega: </label><span>${format(new Date(fechaEntrega), "dd/MM/yyyy", { locale: es })}</span></div>
              <div class="info-item"><label>Registrado por: </label><span>${currentUserName || "Usuario del sistema"}</span></div>
            </div>
            <div class="info-box">
              <div class="info-title">Destino</div>
              <div class="info-item"><label>Consultorio: </label><span>${selectedRoomData?.name || ""}</span></div>
              <div class="info-item"><label>Ubicación: </label><span>${selectedRoomData?.floor || "No especificada"}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th style="width: 120px;">Código</th>
                <th>Descripción del Producto</th>
                <th style="width: 80px; text-align: center;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${
            observations
              ? `
            <div class="observations">
              <div class="observations-title">Observaciones:</div>
              <div>${observations}</div>
            </div>
          `
              : ""
          }

          <div class="signatures">
            <div class="signature">
              <div class="signature-line">Entregado por</div>
              <div class="signature-label">Almacén de Suministros</div>
            </div>
            <div class="signature">
              <div class="signature-line">Recibido por</div>
              <div class="signature-label">${selectedRoomData?.name || "Consultorio"}</div>
            </div>
          </div>

          <div class="footer">
            <span class="name">CESMED LATINOAMERICANO</span> - Sistema de Control de Suministros Médicos
            <br>Documento generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const closeAll = () => {
    setShowPreviewDialog(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Salida a Consultorio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fecha de Registro</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <Label>Fecha de Entrega</Label>
                <Input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
              </div>
              <div>
                <Label>Consultorio Destino</Label>
                <Select value={selectedConsultingRoom} onValueChange={setSelectedConsultingRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar consultorio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(consultingRooms || []).map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} {room.floor ? `- ${room.floor}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold">Agregar Productos</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <Label>Producto</Label>
                  <Popover open={openProduct} onOpenChange={setOpenProduct}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {selectedProductData
                          ? `${selectedProductData.codigo} - ${selectedProductData.descripcion}`
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
                            {selectableProducts.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.codigo} ${p.descripcion}`}
                                onSelect={() => {
                                  setSelectedProduct(p.id);
                                  setOpenProduct(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedProduct === p.id ? "opacity-100" : "opacity-0")} />
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
                <div className="col-span-3">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProductData?.stock_actual || 999}
                    value={tempQuantity}
                    onChange={(e) => setTempQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1">
                  <Button onClick={addProductItem} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
                      <TableHead className="text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productItems.map((item, index) => (
                      <TableRow key={`${item.medication_id}-${index}`}>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell className="max-w-[420px] truncate">{item.descripcion}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeProductItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Notas adicionales sobre la entrega..."
                rows={3}
              />
            </div>
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
            <AlertDialogTitle>Confirmar salida a consultorio</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrarán {productItems.length} producto(s) para el consultorio "{selectedRoomData?.name}".
              <br />
              Los productos se descontarán del inventario general y se agregarán al stock del consultorio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRegistro}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">✓ Salida Registrada</AlertDialogTitle>
            <AlertDialogDescription>
              La salida <span className="font-mono font-bold">{generatedOutputNumber}</span> ha sido registrada correctamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Formato
            </Button>
            <AlertDialogAction onClick={closeAll}>Cerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

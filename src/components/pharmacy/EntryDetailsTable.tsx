import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, ChevronsUpDown, Plus, Trash2, Settings, Beaker } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { usePedidosFormulasMagistrales } from "@/hooks/useFormulasMagistrales";
import type { PedidoFormulaMagistral } from "@/hooks/useFormulasMagistrales";
import { Textarea } from "@/components/ui/textarea";
import { MonthYearPicker } from "./MonthYearPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PedidosFormulaDialog } from "./PedidosFormulaDialog";
import { Badge } from "@/components/ui/badge";

export interface EntryDetailItem {
  id: string;
  medication_id?: string;
  product_code: string;
  description: string;
  quantity_requested: number;
  quantity_received: number;
  is_accepted: boolean;
  pharmaceutical_form: string;
  presentation: string;
  laboratory: string;
  batch: string;
  nsoc_rs: string;
  expiry_date: string;
  purchase_cost_per_unit: number;
  number_of_boxes: number;
  observations: string;
  porcentaje_ganancia: number;
  update_precio_venta: boolean;
  pending_pedidos?: PedidoFormulaMagistral[];
  pedidos_processed?: boolean;
}

interface EntryDetailsTableProps {
  items: EntryDetailItem[];
  onChange: (items: EntryDetailItem[]) => void;
  disabled?: boolean;
  igvPercentage: number;
}

export function EntryDetailsTable({ items, onChange, disabled = false, igvPercentage }: EntryDetailsTableProps) {
  const [medicationSearch, setMedicationSearch] = useState("");
  const { data: medications } = usePharmacyMedications(200, medicationSearch);
  const { data: allPedidos } = usePedidosFormulasMagistrales();
  const [openMedication, setOpenMedication] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showProfitConfig, setShowProfitConfig] = useState(false);
  const [profitEditIndex, setProfitEditIndex] = useState<number | null>(null);
  const [tempProfitPercentage, setTempProfitPercentage] = useState(0);
  const [showPedidosDialog, setShowPedidosDialog] = useState(false);
  const [pendingMedication, setPendingMedication] = useState<any>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [relatedPedidos, setRelatedPedidos] = useState<PedidoFormulaMagistral[]>([]);

  const addItem = () => {
    const newItem: EntryDetailItem = {
      id: crypto.randomUUID(),
      product_code: "",
      description: "",
      quantity_requested: 0,
      quantity_received: 0,
      is_accepted: false,
      pharmaceutical_form: "",
      presentation: "",
      laboratory: "",
      batch: "",
      nsoc_rs: "",
      expiry_date: "",
      purchase_cost_per_unit: 0,
      number_of_boxes: 0,
      observations: "",
      porcentaje_ganancia: 50,
      update_precio_venta: false,
    };
    onChange([...items, newItem]);
    setEditingIndex(items.length);
  };

  const handleOpenProfitConfig = (index: number) => {
    setProfitEditIndex(index);
    setTempProfitPercentage(items[index].porcentaje_ganancia || 0);
    setShowProfitConfig(true);
  };

  const handleApplyProfitPercentage = () => {
    if (profitEditIndex !== null) {
      updateItem(profitEditIndex, { porcentaje_ganancia: tempProfitPercentage });
    }
    setShowProfitConfig(false);
    setProfitEditIndex(null);
  };

  const calculateIgvUnitario = (costo: number) => {
    const validCosto = Number(costo) || 0;
    const validIgv = Number(igvPercentage) || 0;
    return validCosto * (validIgv / 100);
  };

  const calculateImporteUnitario = (costo: number) => {
    const validCosto = Number(costo) || 0;
    return validCosto + calculateIgvUnitario(validCosto);
  };

  const calculateImporteGanancia = (importeUnitario: number, porcentajeGanancia: number) => {
    const validImporte = Number(importeUnitario) || 0;
    const validPorcentaje = Number(porcentajeGanancia) || 0;
    return validImporte * (validPorcentaje / 100);
  };

  const calculatePrecioVenta = (importeUnitario: number, importeGanancia: number) => {
    const validImporte = Number(importeUnitario) || 0;
    const validGanancia = Number(importeGanancia) || 0;
    // Redondeo estándar al entero más cercano
    return Math.round(validImporte + validGanancia);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const updateItem = (index: number, updates: Partial<EntryDetailItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const handleMedicationSelect = (medication: any, index: number) => {
    // Buscar pedidos de fórmula magistral con el mismo código de producto
    const pedidos = allPedidos?.filter(p => p.codigo_producto === medication.codigo) || [];
    
    // Siempre agregar el producto, pero guardar los pedidos pendientes si existen
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_code: medication.codigo,
      description: medication.descripcion,
      presentation: medication.presentation,
      laboratory: medication.laboratorio || "",
      pharmaceutical_form: medication.forma_farmaceutica || "",
      purchase_cost_per_unit: medication.purchase_price || 0,
      medication_id: medication.id,
      pending_pedidos: pedidos.length > 0 ? pedidos : undefined,
      pedidos_processed: false,
    };
    onChange(newItems);
    setOpenMedication(false);
    setMedicationSearch("");
  };

  const handlePedidosConfirm = (selectedPedidos: PedidoFormulaMagistral[]) => {
    if (pendingIndex !== null) {
      const totalUnidadesDescuento = selectedPedidos.reduce((sum, p) => sum + p.cantidad, 0);
      const newItems = [...items];
      const currentQuantity = newItems[pendingIndex].quantity_received || 0;
      
      // Ajustar cantidad recibida descontando los pedidos
      newItems[pendingIndex] = {
        ...newItems[pendingIndex],
        quantity_received: Math.max(0, currentQuantity - totalUnidadesDescuento),
        pedidos_processed: true,
      };
      onChange(newItems);
      
      // Limpiar estado
      setPendingIndex(null);
      setRelatedPedidos([]);
      setShowPedidosDialog(false);
    }
  };

  const handleOpenPedidosDialog = (index: number) => {
    const item = items[index];
    if (item.pending_pedidos && item.pending_pedidos.length > 0) {
      setPendingIndex(index);
      setRelatedPedidos(item.pending_pedidos);
      setShowPedidosDialog(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Detalle de Productos</Label>
        <Button
          type="button"
          onClick={addItem}
          size="sm"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          No hay productos agregados. Haga clic en "Agregar Producto" para comenzar.
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 w-[60px]">Acciones</TableHead>
                <TableHead className="px-2 w-[100px]">Cod</TableHead>
                <TableHead className="px-2 min-w-[180px]">Descripción</TableHead>
                <TableHead className="px-2 w-[90px]">C. Sol.</TableHead>
                <TableHead className="px-2 w-[90px]">C. Rec.</TableHead>
                <TableHead className="px-2 w-[90px]">N° Cajas</TableHead>
                <TableHead className="px-2 w-[70px]">Acepta</TableHead>
                <TableHead className="px-2 w-[100px]">FF</TableHead>
                <TableHead className="px-2 w-[110px]">Presentación</TableHead>
                <TableHead className="px-2 w-[110px]">Laboratorio</TableHead>
                <TableHead className="px-2 w-[90px]">Lote</TableHead>
                <TableHead className="px-2 w-[90px]">NSOC/RS</TableHead>
                <TableHead className="px-2 w-[120px]">F. Venc</TableHead>
                <TableHead className="px-2 w-[100px]">C.U.</TableHead>
                <TableHead className="px-2 w-[100px]">IGV UNI</TableHead>
                <TableHead className="px-2 w-[100px]">Importe UNI</TableHead>
                <TableHead className="px-2 w-[100px]">%Gan</TableHead>
                <TableHead className="px-2 w-[100px]">Imp Gan</TableHead>
                <TableHead className="px-2 w-[100px]">P.V.</TableHead>
                <TableHead className="px-2 w-[70px]">Act. P.V.</TableHead>
                <TableHead className="px-2 w-[100px]">Importe</TableHead>
                <TableHead className="px-2 min-w-[150px]">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="px-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={disabled}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      {item.pending_pedidos && item.pending_pedidos.length > 0 && !item.pedidos_processed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPedidosDialog(index)}
                          disabled={disabled}
                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Este producto tiene pedidos de fórmula magistral pendientes"
                        >
                          <Beaker className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <Popover modal open={openMedication && editingIndex === index} onOpenChange={(open) => {
                      setOpenMedication(open);
                      if (open) setEditingIndex(index);
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-7 text-xs px-2"
                          disabled={disabled}
                        >
                          {item.product_code || "..."}
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar producto..."
                            value={medicationSearch}
                            onValueChange={setMedicationSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontró producto.</CommandEmpty>
                            <CommandGroup>
                              {medications?.map((med) => (
                                <CommandItem
                                  key={med.id}
                                  value={`${med.codigo} ${med.descripcion}`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleMedicationSelect(med, index);
                                  }}
                                  onSelect={() => handleMedicationSelect(med, index)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      item.medication_id === med.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {med.codigo} - {med.descripcion}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="number"
                      value={item.quantity_requested}
                      onChange={(e) => updateItem(index, { quantity_requested: Number(e.target.value) })}
                      disabled={disabled}
                      className="h-7 text-xs w-20"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="number"
                      value={item.quantity_received}
                      onChange={(e) => updateItem(index, { quantity_received: Number(e.target.value) })}
                      disabled={disabled}
                      className="h-7 text-xs w-20"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="number"
                      value={item.number_of_boxes}
                      onChange={(e) => updateItem(index, { number_of_boxes: Number(e.target.value) })}
                      disabled={disabled}
                      className="h-7 text-xs w-20"
                      min="0"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={item.is_accepted}
                        onCheckedChange={(checked) => updateItem(index, { is_accepted: checked as boolean })}
                        disabled={disabled}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.pharmaceutical_form}
                      onChange={(e) => updateItem(index, { pharmaceutical_form: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.presentation}
                      onChange={(e) => updateItem(index, { presentation: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs w-28"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.laboratory}
                      onChange={(e) => updateItem(index, { laboratory: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs w-28"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.batch}
                      onChange={(e) => updateItem(index, { batch: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs w-20"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      value={item.nsoc_rs}
                      onChange={(e) => updateItem(index, { nsoc_rs: e.target.value })}
                      disabled={disabled}
                      className="h-7 text-xs w-20"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <MonthYearPicker
                      value={item.expiry_date}
                      onChange={(value) => updateItem(index, { expiry_date: value })}
                      disabled={disabled}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.purchase_cost_per_unit}
                      onChange={(e) => updateItem(index, { purchase_cost_per_unit: Number(e.target.value) })}
                      disabled={disabled}
                      className="h-7 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="text"
                      value={calculateIgvUnitario(item.purchase_cost_per_unit).toFixed(2)}
                      disabled
                      className="h-7 text-xs w-24 bg-muted"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="text"
                      value={calculateImporteUnitario(item.purchase_cost_per_unit).toFixed(2)}
                      disabled
                      className="h-7 text-xs w-24 bg-muted"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={item.porcentaje_ganancia}
                        disabled
                        className="h-7 text-xs w-16 bg-muted"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenProfitConfig(index)}
                        disabled={disabled}
                        className="h-7 w-7"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="text"
                      value={calculateImporteGanancia(
                        calculateImporteUnitario(item.purchase_cost_per_unit),
                        item.porcentaje_ganancia
                      ).toFixed(2)}
                      disabled
                      className="h-7 text-xs w-24 bg-muted"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="text"
                      value={calculatePrecioVenta(
                        calculateImporteUnitario(item.purchase_cost_per_unit),
                        calculateImporteGanancia(
                          calculateImporteUnitario(item.purchase_cost_per_unit),
                          item.porcentaje_ganancia
                        )
                      )}
                      disabled
                      className="h-7 text-xs w-24 bg-muted font-semibold"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={item.update_precio_venta}
                        onCheckedChange={(checked) => updateItem(index, { update_precio_venta: checked as boolean })}
                        disabled={disabled}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <Input
                      type="text"
                      value={((Number(item.quantity_received) || 0) * (Number(item.purchase_cost_per_unit) || 0)).toFixed(2)}
                      disabled
                      className="h-7 text-xs w-24 bg-muted font-semibold"
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <Textarea
                      value={item.observations}
                      onChange={(e) => updateItem(index, { observations: e.target.value })}
                      disabled={disabled}
                      className="min-h-[56px] text-xs"
                      rows={2}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showProfitConfig} onOpenChange={setShowProfitConfig}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Porcentaje de Ganancia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profit_percentage">Porcentaje de Ganancia (%)</Label>
              <Input
                id="profit_percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tempProfitPercentage}
                onChange={(e) => setTempProfitPercentage(Number(e.target.value))}
              />
            </div>
            <Button onClick={handleApplyProfitPercentage} className="w-full">
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PedidosFormulaDialog
        open={showPedidosDialog}
        onOpenChange={setShowPedidosDialog}
        pedidos={relatedPedidos}
        onConfirm={handlePedidosConfirm}
        productCode={items[pendingIndex || 0]?.product_code || ""}
        cantidadEntrada={items[pendingIndex || 0]?.quantity_received || 0}
      />
    </div>
  );
}

// Helper function to check if there are unprocessed pedidos
export function hasUnprocessedPedidos(items: EntryDetailItem[]): { hasUnprocessed: boolean; items: EntryDetailItem[] } {
  const unprocessedItems = items.filter(
    item => item.pending_pedidos && 
    item.pending_pedidos.length > 0 && 
    !item.pedidos_processed &&
    item.product_code && 
    item.quantity_received > 0
  );
  return {
    hasUnprocessed: unprocessedItems.length > 0,
    items: unprocessedItems
  };
}

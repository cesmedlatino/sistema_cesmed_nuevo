import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Package } from "lucide-react";
import { useFormulasMagistrales } from "@/hooks/useFormulasMagistrales";
import { PedidoFormulaMagistralDialog } from "./PedidoFormulaMagistralDialog";

interface FormulaMagistralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (formula: any) => void;
  selectedPatient?: any | null;
}

export function FormulaMagistralDialog({ open, onOpenChange, onSelect, selectedPatient }: FormulaMagistralDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showPedidoDialog, setShowPedidoDialog] = useState(false);
  const [showStockAlert, setShowStockAlert] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<any>(null);
  const { data: formulas, isLoading } = useFormulasMagistrales();

  const filteredFormulas = formulas?.filter((formula) => {
    const search = searchTerm.toLowerCase();
    return (
      formula.codigo?.toLowerCase().includes(search) ||
      formula.descripcion?.toLowerCase().includes(search) ||
      formula.presentation?.toLowerCase().includes(search)
    );
  });

  const handleSelect = (formula: any) => {
    if (formula.stock_actual <= 0) {
      setSelectedFormula(formula);
      setShowStockAlert(true);
    } else {
      onSelect(formula);
      onOpenChange(false);
    }
  };

  const handleConfirmNoPedido = () => {
    setShowStockAlert(false);
    setShowPedidoDialog(true);
  };

  const handleClosePedidoDialog = () => {
    setShowPedidoDialog(false);
    setSelectedFormula(null);
  };

  const handlePedidoCreated = (pedido: any) => {
    // Cuando se crea un pedido, lo agregamos como una salida especial
    onSelect({
      id: pedido.id,
      codigo: pedido.nro_formula,
      descripcion: pedido.formula,
      presentation: "Fórmula Magistral",
      precio_venta: pedido.monto_pedido,
      stock_actual: 0, // No valida stock
      isPedido: true, // Flag para identificar que es un pedido
    });
    setShowPedidoDialog(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Buscar Fórmula Magistral</span>
              <Button
                onClick={() => setShowPedidoDialog(true)}
                variant="outline"
                size="sm"
              >
                <Package className="h-4 w-4 mr-2" />
                Nuevo Pedido
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descripción o presentación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">Cargando fórmulas...</div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFormulas?.map((formula) => (
                      <TableRow key={formula.id}>
                        <TableCell className="font-medium">{formula.codigo}</TableCell>
                        <TableCell>{formula.descripcion}</TableCell>
                        <TableCell>{formula.presentation}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={formula.stock_actual <= 0 ? "destructive" : "secondary"}>
                            {formula.stock_actual}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formula.precio_venta ? `S/. ${formula.precio_venta.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleSelect(formula)}
                            size="sm"
                            variant="outline"
                          >
                            Agregar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredFormulas || filteredFormulas.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No se encontraron fórmulas magistrales
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PedidoFormulaMagistralDialog
        open={showPedidoDialog}
        onOpenChange={handleClosePedidoDialog}
        onPedidoCreated={handlePedidoCreated}
        selectedPatient={selectedPatient}
        preSelectedFormula={selectedFormula}
      />

      <AlertDialog open={showStockAlert} onOpenChange={setShowStockAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Falta de Stock</AlertDialogTitle>
            <AlertDialogDescription>
              No se puede agregar la Fórmula Magistral <strong>{selectedFormula?.descripcion}</strong> por falta de stock.
              <br /><br />
              ¿Desea realizar un nuevo pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNoPedido}>
              Realizar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

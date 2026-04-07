import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PedidoFormulaMagistral } from "@/hooks/useFormulasMagistrales";

interface PedidosFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidos: PedidoFormulaMagistral[];
  onConfirm: (selectedPedidos: PedidoFormulaMagistral[]) => void;
  productCode: string;
  cantidadEntrada: number;
}

export function PedidosFormulaDialog({
  open,
  onOpenChange,
  pedidos,
  onConfirm,
  productCode,
  cantidadEntrada,
}: PedidosFormulaDialogProps) {
  const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());

  const togglePedido = (pedidoId: string) => {
    const newSelected = new Set(selectedPedidos);
    if (newSelected.has(pedidoId)) {
      newSelected.delete(pedidoId);
    } else {
      newSelected.add(pedidoId);
    }
    setSelectedPedidos(newSelected);
  };

  const totalUnidadesSeleccionadas = pedidos
    .filter(p => selectedPedidos.has(p.id))
    .reduce((sum, p) => sum + p.cantidad, 0);

  const handleConfirm = () => {
    const selected = pedidos.filter(p => selectedPedidos.has(p.id));
    onConfirm(selected);
    setSelectedPedidos(new Set());
  };

  const handleCancel = () => {
    setSelectedPedidos(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pedidos de Fórmula Magistral - Producto {productCode}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este producto tiene {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'} de fórmula magistral pendiente{pedidos.length !== 1 ? 's' : ''}.
            Seleccione los pedidos que quiere descontar de la entrada actual ({cantidadEntrada} unidades).
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Seleccionar</TableHead>
                <TableHead>Nro. Pedido</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPedidos.has(pedido.id)}
                      onCheckedChange={() => togglePedido(pedido.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{pedido.nro_formula}</TableCell>
                  <TableCell>{pedido.formula}</TableCell>
                  <TableCell>
                    {pedido.patient 
                      ? `${pedido.patient.first_name} ${pedido.patient.last_name}`
                      : "-"}
                  </TableCell>
                  <TableCell>{pedido.numero_contacto || "-"}</TableCell>
                  <TableCell className="text-right">{pedido.cantidad}</TableCell>
                  <TableCell>
                    {new Date(pedido.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">Unidades de entrada: {cantidadEntrada}</p>
              <p className="text-sm font-medium">Pedidos seleccionados: {totalUnidadesSeleccionadas}</p>
              <p className="text-sm font-semibold text-primary">
                Stock neto después de descuento: {cantidadEntrada - totalUnidadesSeleccionadas}
              </p>
            </div>
            {totalUnidadesSeleccionadas > cantidadEntrada && (
              <p className="text-sm text-destructive font-medium">
                ⚠ Las unidades seleccionadas exceden la cantidad de entrada
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={totalUnidadesSeleccionadas > cantidadEntrada}
          >
            Confirmar Descuento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

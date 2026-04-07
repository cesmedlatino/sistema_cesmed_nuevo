import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useFormulasMagistrales, usePedidosFormulasMagistrales } from "@/hooks/useFormulasMagistrales";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PedidoFormulaMagistralDialog } from "./PedidoFormulaMagistralDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export function PharmacyFormulasMagistralesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPedidos, setSearchPedidos] = useState("");
  const [formulasOpen, setFormulasOpen] = useState(true);
  const [pedidosOpen, setPedidosOpen] = useState(true);
  const [editingPedido, setEditingPedido] = useState<any>(null);
  const [showPedidoDialog, setShowPedidoDialog] = useState(false);
  
  const { data: formulas, isLoading } = useFormulasMagistrales();
  const { data: pedidos, isLoading: isLoadingPedidos } = usePedidosFormulasMagistrales();
  const queryClient = useQueryClient();

  const filteredFormulas = formulas?.filter((formula) => {
    const search = searchTerm.toLowerCase();
    return (
      formula.codigo?.toLowerCase().includes(search) ||
      formula.descripcion?.toLowerCase().includes(search) ||
      formula.presentation?.toLowerCase().includes(search)
    );
  });

  const filteredPedidos = pedidos?.filter((pedido) => {
    const search = searchPedidos.toLowerCase();
    return (
      pedido.nro_formula?.toLowerCase().includes(search) ||
      pedido.formula?.toLowerCase().includes(search) ||
      pedido.patient?.first_name?.toLowerCase().includes(search) ||
      pedido.patient?.last_name?.toLowerCase().includes(search)
    );
  });

  const handleEditPedido = (pedido: any) => {
    setEditingPedido(pedido);
    setShowPedidoDialog(true);
  };

  const handleDeletePedido = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from("pedido_formula_magistral")
        .delete()
        .eq("id", pedidoId);

      if (error) throw error;

      toast.success("Pedido eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["pedidos-formulas-magistrales"] });
    } catch (error) {
      console.error("Error deleting pedido:", error);
      toast.error("Error al eliminar el pedido");
    }
  };

  const handleClosePedidoDialog = () => {
    setShowPedidoDialog(false);
    setEditingPedido(null);
  };

  if (isLoading || isLoadingPedidos) {
    return <div>Cargando fórmulas magistrales...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Fórmulas Magistrales
        </h2>
        <p className="text-muted-foreground">
          Gestiona las fórmulas magistrales preparadas
        </p>
      </div>

      <Collapsible open={formulasOpen} onOpenChange={setFormulasOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <span>Lista de Fórmulas Magistrales</span>
                  <Badge variant="secondary">
                    {filteredFormulas?.length || 0} fórmulas
                  </Badge>
                </CardTitle>
                {formulasOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, descripción o presentación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CollapsibleContent>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
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
                      </TableRow>
                    ))}
                    {(!filteredFormulas || filteredFormulas.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No se encontraron fórmulas magistrales
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={pedidosOpen} onOpenChange={setPedidosOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <span>Pedidos de Fórmulas Magistrales</span>
                  <Badge variant="secondary">
                    {filteredPedidos?.length || 0} pedidos
                  </Badge>
                </CardTitle>
                {pedidosOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, fórmula o paciente..."
                  value={searchPedidos}
                  onChange={(e) => setSearchPedidos(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CollapsibleContent>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro. Pedido</TableHead>
                      <TableHead>Código del Producto</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPedidos?.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-medium">{pedido.nro_formula}</TableCell>
                        <TableCell>{pedido.codigo_producto || "-"}</TableCell>
                        <TableCell>{pedido.formula}</TableCell>
                        <TableCell>
                          {pedido.patient 
                            ? `${pedido.patient.first_name} ${pedido.patient.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>{pedido.numero_contacto || "-"}</TableCell>
                        <TableCell className="text-right">{pedido.cantidad}</TableCell>
                        <TableCell className="text-right">
                          {pedido.monto_pedido ? `S/. ${pedido.monto_pedido.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          {pedido.created_at ? format(new Date(pedido.created_at), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPedido(pedido)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePedido(pedido.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredPedidos || filteredPedidos.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No se encontraron pedidos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <PedidoFormulaMagistralDialog
        open={showPedidoDialog}
        onOpenChange={handleClosePedidoDialog}
        editingPedido={editingPedido}
      />
    </div>
  );
}

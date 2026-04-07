import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, XCircle, Trash2, Search, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { OutputDialog } from "./OutputDialog";
import { ComprobanteDetailsDialog } from "./ComprobanteDetailsDialog";

// Helper para formatear fechas locales sin interpretación UTC
const formatLocalDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "dd/MM/yyyy", { locale: es });
};

type FilterType = "Hoy" | "Semana Actual" | "Mes Actual" | "Mes" | "Fecha";

export function PharmacyComprobantesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("Hoy");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getDateRange = () => {
    const today = new Date();
    
    switch (filterType) {
      case "Hoy":
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
      case "Semana Actual":
        return {
          start: format(startOfWeek(today, { locale: es }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { locale: es }), "yyyy-MM-dd"),
        };
      case "Mes Actual":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "Mes":
        const monthDate = new Date(selectedMonth + "-01");
        return {
          start: format(startOfMonth(monthDate), "yyyy-MM-dd"),
          end: format(endOfMonth(monthDate), "yyyy-MM-dd"),
        };
      case "Fecha":
        return {
          start: selectedDate,
          end: selectedDate,
        };
      default:
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
    }
  };

  const { data: comprobantes = [], isLoading } = useQuery({
    queryKey: ["pharmacy-comprobantes", filterType, selectedMonth, selectedDate, searchTerm],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      let query = supabase
        .from("pharmacy_outputs")
        .select(`
          *,
          patient:patients(first_name, last_name, dni)
        `)
        .eq("tipo_salida", "Salida por comprobante")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `nro_comprobante.ilike.%${searchTerm}%,patient.first_name.ilike.%${searchTerm}%,patient.last_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_outputs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-comprobantes"] });
      toast({
        title: "Comprobante eliminado",
        description: "El comprobante ha sido eliminado correctamente.",
      });
      setDeleteDialogOpen(false);
      setSelectedComprobante(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el comprobante.",
        variant: "destructive",
      });
      console.error("Error al eliminar:", error);
    },
  });

  const anularMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_outputs")
        .update({ 
          comments: "ANULADO",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-comprobantes"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      toast({
        title: "Comprobante anulado",
        description: "El comprobante ha sido anulado correctamente.",
      });
      setAnularDialogOpen(false);
      setSelectedComprobante(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo anular el comprobante.",
        variant: "destructive",
      });
      console.error("Error al anular:", error);
    },
  });

  const handleDelete = (comprobante: any) => {
    setSelectedComprobante(comprobante);
    setDeleteDialogOpen(true);
  };

  const handleAnular = (comprobante: any) => {
    setSelectedComprobante(comprobante);
    setAnularDialogOpen(true);
  };

  const handleEdit = (comprobante: any) => {
    setSelectedComprobante(comprobante);
    setEditDialogOpen(true);
  };

  const handleViewDetails = async (comprobante: any) => {
    // Buscar todos los registros con el mismo nro_comprobante
    const { data: allItems, error } = await supabase
      .from("pharmacy_outputs")
      .select(`
        *,
        patient:patients(first_name, last_name, dni, patient_code)
      `)
      .eq("nro_comprobante", comprobante.nro_comprobante)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error al cargar items del comprobante:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el comprobante completo",
        variant: "destructive",
      });
      return;
    }

    // Agrupar todos los medicamentos en un solo objeto comprobante
    const groupedComprobante = {
      ...comprobante,
      medications: allItems.flatMap((item: any) => {
        // Si el item tiene medications como array, usarlo
        if (Array.isArray(item.medications) && item.medications.length > 0) {
          return item.medications;
        }
        // Si no, crear un objeto con los datos individuales del item
        if (item.medication_id) {
          return [{
            medication_id: item.medication_id,
            descripcion: item.description,
            cantidad: item.quantity,
            quantity: item.quantity,
            precio_unitario: item.sale_cost_per_unit,
            unit_price: item.sale_cost_per_unit,
            sale_cost_per_unit: item.sale_cost_per_unit,
            subtotal: (item.quantity || 0) * (item.sale_cost_per_unit || 0),
            presentacion: item.medications?.[0]?.presentacion,
            presentation: item.medications?.[0]?.presentation,
          }];
        }
        return [];
      }),
      // Calcular el total sumando todos los items
      total: allItems.reduce((sum: number, item: any) => {
        if (Array.isArray(item.medications)) {
          return sum + item.medications.reduce((medSum: number, med: any) => 
            medSum + (med.subtotal || (med.quantity || med.cantidad || 0) * (med.unit_price || med.precio_unitario || med.sale_cost_per_unit || 0)), 0
          );
        }
        return sum + ((item.quantity || 0) * (item.sale_cost_per_unit || 0));
      }, 0),
      patient: allItems[0].patient, // Usar el paciente del primer item
    };

    setSelectedComprobante(groupedComprobante);
    setDetailsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedComprobante) {
      deleteMutation.mutate(selectedComprobante.id);
    }
  };

  const confirmAnular = () => {
    if (selectedComprobante) {
      anularMutation.mutate(selectedComprobante.id);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "S/. 0.00";
    return `S/. ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (comprobante: any) => {
    if (comprobante.comments === "ANULADO") {
      return (
        <Badge variant="destructive">
          Anulado
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-500">
        Emitido
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comprobantes de Farmacia</h1>
          <p className="text-muted-foreground">
            Gestión de notas de venta emitidas
          </p>
        </div>
        <FileText className="h-8 w-8 text-green-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as FilterType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hoy">Hoy</SelectItem>
                  <SelectItem value="Semana Actual">Semana Actual</SelectItem>
                  <SelectItem value="Mes Actual">Mes Actual</SelectItem>
                  <SelectItem value="Mes">Seleccionar Mes</SelectItem>
                  <SelectItem value="Fecha">Seleccionar Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "Mes" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mes</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}

            {filterType === "Fecha" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="N° Comprobante, paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Comprobantes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprobantes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No se encontraron comprobantes
                      </TableCell>
                    </TableRow>
                  ) : (
                    comprobantes.map((comprobante) => (
                      <TableRow key={comprobante.id}>
                        <TableCell className="font-medium">
                          {comprobante.nro_comprobante || "-"}
                        </TableCell>
                        <TableCell>
                          {formatLocalDate(comprobante.date)}
                        </TableCell>
                        <TableCell>
                          {comprobante.patient
                            ? `${comprobante.patient.first_name} ${comprobante.patient.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {comprobante.patient?.dni || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(comprobante.total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(comprobante)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                              onClick={() => handleViewDetails(comprobante)}
                            >
                              <Eye className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => handleEdit(comprobante)}
                              disabled={comprobante.comments === "ANULADO"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Anular"
                              onClick={() => handleAnular(comprobante)}
                              disabled={comprobante.comments === "ANULADO"}
                            >
                              <XCircle className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              onClick={() => handleDelete(comprobante)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el comprobante{" "}
              <strong>{selectedComprobante?.nro_comprobante}</strong>.
              <br />
              <br />
              Paciente:{" "}
              {selectedComprobante?.patient
                ? `${selectedComprobante.patient.first_name} ${selectedComprobante.patient.last_name}`
                : "-"}
              <br />
              Total: {formatCurrency(selectedComprobante?.total)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará el comprobante{" "}
              <strong>{selectedComprobante?.nro_comprobante}</strong>.
              <br />
              <br />
              Paciente:{" "}
              {selectedComprobante?.patient
                ? `${selectedComprobante.patient.first_name} ${selectedComprobante.patient.last_name}`
                : "-"}
              <br />
              Total: {formatCurrency(selectedComprobante?.total)}
              <br />
              <br />
              El comprobante quedará marcado como anulado y no podrá ser editado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAnular}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedComprobante && (
        <>
          <OutputDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) setSelectedComprobante(null);
            }}
            editData={selectedComprobante}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["pharmacy-comprobantes"] });
              queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
            }}
          />
          <ComprobanteDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={(open) => {
              setDetailsDialogOpen(open);
              if (!open) setSelectedComprobante(null);
            }}
            comprobante={selectedComprobante}
          />
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, PackageMinus, Download, Calendar, FileText } from "lucide-react";
import { format, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { useOpticsOutputsPaginated, useDeleteOpticsOutput } from "@/hooks/useOpticsOutputsPaginated";
import { OpticsOutputDialog } from "./OpticsOutputDialog";
import { OpticsOutputComprobantePreview } from "./OpticsOutputComprobantePreview";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Helper to parse date string as local date (not UTC)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function OpticsOutputsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewOutputOpen, setIsNewOutputOpen] = useState(false);
  const [editingOutput, setEditingOutput] = useState<any>(null);
  const [deletingOutput, setDeletingOutput] = useState<any>(null);
  const [pageSize, setPageSize] = useState(10);
  
  // Comprobante preview state
  const [comprobantePreviewOpen, setComprobantePreviewOpen] = useState(false);
  const [selectedComprobanteData, setSelectedComprobanteData] = useState<any>(null);
  const [comprobanteConfig, setComprobanteConfig] = useState<any>(null);
  
  // Excel download dialog state
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false);
  const [excelStartDate, setExcelStartDate] = useState(() => {
    const firstDayOfYear = startOfYear(new Date());
    return format(firstDayOfYear, "yyyy-MM-dd");
  });
  const [excelEndDate, setExcelEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast } = useToast();

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

  const { data: result, isLoading } = useOpticsOutputsPaginated({
    page: currentPage,
    pageSize,
    searchTerm,
  });

  const outputs = result?.data || [];
  const totalPages = result?.totalPages || 1;

  const deleteOutput = useDeleteOpticsOutput();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleDelete = async () => {
    if (deletingOutput) {
      await deleteOutput.mutateAsync(deletingOutput.id);
      setDeletingOutput(null);
    }
  };

  const handleViewComprobante = async (output: any) => {
    if (!output.nro_comprobante) {
      toast({
        title: "Sin comprobante",
        description: "Esta salida no tiene número de comprobante asociado.",
        variant: "destructive",
      });
      return;
    }

    // Fetch all outputs with the same nro_comprobante
    const { data: relatedOutputs, error } = await supabase
      .from("optics_outputs")
      .select(`
        *,
        product:optics_products(nombre, codigo),
        patient:patients(first_name, last_name, dni, patient_code)
      `)
      .eq("nro_comprobante", output.nro_comprobante);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el comprobante.",
        variant: "destructive",
      });
      return;
    }

    if (!relatedOutputs || relatedOutputs.length === 0) return;

    const products = relatedOutputs.map((o: any) => ({
      codigo: o.product_code || o.product?.codigo || "",
      nombre: o.product?.nombre || o.description || "",
      quantity: o.quantity || 0,
      sale_cost_per_unit: o.sale_cost_per_unit || 0,
      total: o.total || 0,
      comments: o.comments || "",
    }));

    const total = products.reduce((sum: number, p: any) => sum + p.total, 0);
    const firstOutput = relatedOutputs[0];

    setSelectedComprobanteData({
      nroComprobante: output.nro_comprobante,
      fecha: firstOutput.date,
      tipoSalida: firstOutput.tipo_salida || "",
      paciente: firstOutput.patient,
      products,
      total,
    });

    setComprobantePreviewOpen(true);
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase
        .from("optics_outputs")
        .select(`
          *,
          product:optics_products(nombre, codigo, marca),
          patient:patients(first_name, last_name, dni)
        `)
        .gte("date", excelStartDate)
        .lte("date", excelEndDate)
        .order("date", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay salidas en el rango de fechas seleccionado",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      const excelData = data.map((output) => ({
        Fecha: format(parseLocalDate(output.date), "dd/MM/yyyy"),
        "Nro Comprobante": output.nro_comprobante || "",
        "Tipo Salida": output.tipo_salida || "",
        Código: output.product_code || output.product?.codigo || "",
        Producto: output.product?.nombre || output.description || "",
        Marca: output.product?.marca || "",
        Paciente: output.patient ? `${output.patient.first_name} ${output.patient.last_name}` : "",
        "DNI Paciente": output.patient?.dni || "",
        Cantidad: output.quantity || 0,
        "Precio Unitario": output.sale_cost_per_unit || 0,
        Total: output.total || 0,
        "Motivo Ajuste": output.motivo_ajuste || "",
        Comentarios: output.comments || "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salidas Óptica");

      ws["!cols"] = [
        { wch: 12 },
        { wch: 18 },
        { wch: 20 },
        { wch: 12 },
        { wch: 40 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 30 },
      ];

      const fileName = `Salidas_Optica_${format(new Date(excelStartDate), "ddMMyyyy")}_${format(new Date(excelEndDate), "ddMMyyyy")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel descargado",
        description: `Se descargaron ${data.length} registros correctamente`,
      });

      setIsExcelDialogOpen(false);
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getTipoSalidaBadge = (tipo: string | null | undefined) => {
    switch (tipo) {
      case "Salida por comprobante":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Comprobante</Badge>;
      case "Salida por ajuste":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Ajuste</Badge>;
      case "Salida por devolución":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Devolución</Badge>;
      default:
        return <Badge variant="secondary">{tipo || "Sin tipo"}</Badge>;
    }
  };

  const isAnulado = (output: any) => output.comments === "ANULADO";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salidas</h1>
          <p className="text-muted-foreground">Listado completo de salidas de productos ópticos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsExcelDialogOpen(true)}
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Salidas Excel
          </Button>
          <Button onClick={() => setIsNewOutputOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Salida
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Todas las Salidas
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprobante, producto..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : outputs && outputs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nro Comprobante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outputs.map((output) => (
                    <TableRow key={output.id} className={isAnulado(output) ? "opacity-50" : ""}>
                      <TableCell>
                        {format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {output.nro_comprobante || "-"}
                        {isAnulado(output) && (
                          <Badge variant="destructive" className="ml-2">ANULADO</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getTipoSalidaBadge(output.tipo_salida)}</TableCell>
                      <TableCell>{output.product_code || output.product?.codigo || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {output.product?.nombre || output.description || "-"}
                      </TableCell>
                      <TableCell>
                        {output.patient 
                          ? `${output.patient.first_name} ${output.patient.last_name}` 
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {output.quantity || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        S/ {(output.total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {output.nro_comprobante && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewComprobante(output)}
                              title="Ver comprobante"
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingOutput(output)}
                            disabled={isAnulado(output)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingOutput(output)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Mostrar</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">registros</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron salidas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OpticsOutputDialog open={isNewOutputOpen} onOpenChange={setIsNewOutputOpen} />

      {editingOutput && (
        <OpticsOutputDialog
          open={!!editingOutput}
          onOpenChange={(open) => !open && setEditingOutput(null)}
          editData={editingOutput}
        />
      )}

      <AlertDialog open={!!deletingOutput} onOpenChange={(open) => !open && setDeletingOutput(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar salida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta salida del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excel Download Dialog */}
      <Dialog open={isExcelDialogOpen} onOpenChange={setIsExcelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Descargar Salidas Excel
            </DialogTitle>
            <DialogDescription>
              Seleccione el rango de fechas para descargar las salidas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de inicio
              </Label>
              <Input
                id="start-date"
                type="date"
                value={excelStartDate}
                onChange={(e) => setExcelStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de término
              </Label>
              <Input
                id="end-date"
                type="date"
                value={excelEndDate}
                onChange={(e) => setExcelEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExcelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDownloadExcel} 
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprobante Preview */}
      {selectedComprobanteData && (
        <OpticsOutputComprobantePreview
          open={comprobantePreviewOpen}
          onOpenChange={setComprobantePreviewOpen}
          numeroComprobante={selectedComprobanteData.nroComprobante}
          fecha={selectedComprobanteData.fecha}
          tipoSalida={selectedComprobanteData.tipoSalida}
          paciente={selectedComprobanteData.paciente}
          products={selectedComprobanteData.products}
          total={selectedComprobanteData.total}
          config={comprobanteConfig}
        />
      )}
    </div>
  );
}

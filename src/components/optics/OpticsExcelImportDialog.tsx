import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationResult {
  row: number;
  data: Record<string, any>;
  errors: string[];
  isValid: boolean;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const VALID_TYPES = ["montura", "lentes_contacto", "lentes_graduados", "gafas_sol", "accesorio"];
const VALID_GENDERS = ["Unisex", "Masculino", "Femenino", "Niño", "Niña"];

const TEMPLATE_COLUMNS = [
  "codigo",
  "nombre",
  "tipo",
  "marca",
  "modelo",
  "descripcion",
  "precio_compra",
  "precio_venta",
  "stock_actual",
  "stock_minimo",
  "ubicacion",
  "material",
  "color",
  "tamanio",
  "genero",
  "indice_refraccion",
  "tratamiento",
  "tipo_lente",
];

export function OpticsExcelImportDialog({ open, onOpenChange }: Props) {
  const [pastedData, setPastedData] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"paste" | "preview" | "result">("paste");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      [
        "OPT-001",
        "Montura Ray-Ban Aviator",
        "montura",
        "Ray-Ban",
        "RB3025",
        "Montura clásica aviador",
        "150.00",
        "299.00",
        "10",
        "3",
        "Estante A1",
        "Metal",
        "Dorado",
        "58-14-135",
        "Unisex",
        "",
        "",
        "",
      ],
      [
        "OPT-002",
        "Lente CR-39 1.56",
        "lentes_graduados",
        "Essilor",
        "Orma",
        "Lente orgánico estándar",
        "25.00",
        "60.00",
        "50",
        "10",
        "Estante B2",
        "CR-39",
        "Transparente",
        "",
        "",
        "1.56",
        "Antirreflejo",
        "Monofocal",
      ],
    ]);

    // Set column widths
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos Óptica");

    XLSX.writeFile(wb, "plantilla_productos_optica.xlsx");
    
    toast({
      title: "Plantilla descargada",
      description: "La plantilla Excel se ha descargado correctamente.",
    });
  };

  const parseExcelData = (data: string): Record<string, any>[] => {
    const lines = data.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split("\t");
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });
      
      rows.push(row);
    }

    return rows;
  };

  const validateRow = (row: Record<string, any>, rowIndex: number): ValidationResult => {
    const errors: string[] = [];

    // Required fields
    if (!row.nombre) {
      errors.push("El nombre es obligatorio");
    }

    if (!row.tipo) {
      errors.push("El tipo es obligatorio");
    } else if (!VALID_TYPES.includes(row.tipo.toLowerCase())) {
      errors.push(`Tipo inválido. Debe ser: ${VALID_TYPES.join(", ")}`);
    }

    // Validate numeric fields
    const numericFields = ["precio_compra", "precio_venta", "stock_actual", "stock_minimo"];
    numericFields.forEach((field) => {
      if (row[field] && isNaN(parseFloat(row[field]))) {
        errors.push(`${field} debe ser un número válido`);
      }
    });

    // Validate gender if provided
    if (row.genero && !VALID_GENDERS.includes(row.genero)) {
      errors.push(`Género inválido. Debe ser: ${VALID_GENDERS.join(", ")}`);
    }

    // Validate prices are positive
    if (row.precio_compra && parseFloat(row.precio_compra) < 0) {
      errors.push("El precio de compra no puede ser negativo");
    }
    if (row.precio_venta && parseFloat(row.precio_venta) < 0) {
      errors.push("El precio de venta no puede ser negativo");
    }

    return {
      row: rowIndex + 2, // +2 because Excel rows start at 1 and we skip header
      data: row,
      errors,
      isValid: errors.length === 0,
    };
  };

  const handleValidate = () => {
    if (!pastedData.trim()) {
      toast({
        title: "Error",
        description: "Por favor, pega los datos desde Excel.",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    
    try {
      const rows = parseExcelData(pastedData);
      
      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron datos válidos. Asegúrate de copiar desde Excel incluyendo los encabezados.",
          variant: "destructive",
        });
        setIsValidating(false);
        return;
      }

      const results = rows.map((row, index) => validateRow(row, index));
      setValidationResults(results);
      setStep("preview");
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar los datos. Verifica el formato.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    const validRows = validationResults.filter((r) => r.isValid);
    
    if (validRows.length === 0) {
      toast({
        title: "Error",
        description: "No hay registros válidos para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);

    const result: ImportResult = {
      total: validRows.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const productData = {
          codigo: row.data.codigo || undefined,
          nombre: row.data.nombre,
          tipo: row.data.tipo.toLowerCase(),
          marca: row.data.marca || null,
          modelo: row.data.modelo || null,
          descripcion: row.data.descripcion || null,
          precio_compra: parseFloat(row.data.precio_compra) || 0,
          precio_venta: parseFloat(row.data.precio_venta) || 0,
          stock_actual: parseInt(row.data.stock_actual) || 0,
          stock_minimo: parseInt(row.data.stock_minimo) || 0,
          ubicacion: row.data.ubicacion || null,
          material: row.data.material || null,
          color: row.data.color || null,
          tamanio: row.data.tamanio || null,
          genero: row.data.genero || null,
          indice_refraccion: row.data.indice_refraccion || null,
          tratamiento: row.data.tratamiento || null,
          tipo_lente: row.data.tipo_lente || null,
          status: "Activo",
        };

        const { error } = await supabase
          .from("optics_products")
          .insert(productData);

        if (error) {
          throw error;
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: row.row,
          message: error.message || "Error desconocido",
        });
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResult(result);
    setStep("result");
    setIsImporting(false);

    if (result.success > 0) {
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
    }
  };

  const handleClose = () => {
    setPastedData("");
    setValidationResults([]);
    setImportResult(null);
    setStep("paste");
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Productos desde Excel
          </DialogTitle>
          <DialogDescription>
            Copia y pega los datos desde Excel para importar productos al catálogo.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Plantilla Excel
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Descarga la plantilla y llénala con tus productos
                <br />
                2. Selecciona todas las celdas (incluyendo encabezados) y copia (Ctrl+C)
                <br />
                3. Pega los datos aquí abajo (Ctrl+V)
              </p>
              
              <Textarea
                placeholder="Pega aquí los datos copiados desde Excel..."
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleValidate} disabled={isValidating || !pastedData.trim()}>
                {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Validar Datos
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="secondary" className="text-sm">
                Total: {validationResults.length}
              </Badge>
              <Badge className="bg-green-500 text-sm">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Válidos: {validCount}
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <XCircle className="mr-1 h-3 w-3" />
                  Con errores: {invalidCount}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead className="w-16">Estado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow
                      key={result.row}
                      className={result.isValid ? "" : "bg-red-50"}
                    >
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.data.codigo || "-"}
                      </TableCell>
                      <TableCell>{result.data.nombre || "-"}</TableCell>
                      <TableCell>{result.data.tipo || "-"}</TableCell>
                      <TableCell>{result.data.marca || "-"}</TableCell>
                      <TableCell>
                        {result.errors.length > 0 && (
                          <div className="text-xs text-destructive">
                            {result.errors.join("; ")}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando productos...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("paste")}
                disabled={isImporting}
              >
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || validCount === 0}
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {validCount} producto{validCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {importResult.success > 0 ? (
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold">Importación Completada</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total procesados</div>
              </Card>
              <Card className="p-4 text-center bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.success}
                </div>
                <div className="text-sm text-muted-foreground">Importados</div>
              </Card>
              <Card className="p-4 text-center bg-red-50">
                <div className="text-2xl font-bold text-destructive">
                  {importResult.failed}
                </div>
                <div className="text-sm text-muted-foreground">Fallidos</div>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Errores de importación:</h4>
                <ScrollArea className="h-[150px] border rounded-md p-3">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm py-1">
                      <span className="font-medium">Fila {error.row}:</span>{" "}
                      {error.message}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

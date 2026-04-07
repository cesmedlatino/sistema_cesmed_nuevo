import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useMedicalSpecialties } from "@/hooks/useMedicalSpecialties";
import { loadConceptoTipos } from "./ConceptoTiposManager";
import * as XLSX from "xlsx";
import type { Concepto } from "@/hooks/useConceptos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptos: Concepto[] | undefined;
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

const TEMPLATE_COLUMNS = ["nombre", "descripcion", "tipo", "monto", "especialidad", "activo"];

export function ConceptosExcelImportDialog({ open, onOpenChange, conceptos }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: specialties, fetchData: fetchSpecialties } = useMedicalSpecialties();
  
  const [step, setStep] = useState<"paste" | "preview" | "result">("paste");
  const [pastedData, setPastedData] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSpecialties();
    }
  }, [open]);

  const downloadTemplate = () => {
    const headers = TEMPLATE_COLUMNS;
    const exampleData = [
      ["Consulta General", "Consulta médica general", "consulta", "100.00", "Medicina General", "SI"],
      ["Examen de Laboratorio", "Análisis clínicos", "examen", "50.00", "", "SI"],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 40 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Conceptos");
    XLSX.writeFile(wb, "plantilla_conceptos.xlsx");

    toast({
      title: "Plantilla descargada",
      description: "Se ha descargado la plantilla de conceptos en formato Excel.",
    });
  };

  const downloadExistingConceptos = () => {
    if (!conceptos || conceptos.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay conceptos existentes para exportar.",
        variant: "destructive",
      });
      return;
    }

    const headers = TEMPLATE_COLUMNS;
    const data = conceptos.map((c) => [
      c.nombre,
      c.descripcion || "",
      c.tipo,
      c.monto.toFixed(2),
      c.especialidad_name || "",
      c.activo ? "SI" : "NO",
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    ws["!cols"] = [
      { wch: 25 },
      { wch: 40 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Conceptos");
    XLSX.writeFile(wb, "conceptos_existentes.xlsx");

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${conceptos.length} conceptos a Excel.`,
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

      if (Object.values(row).some((v) => v !== "")) {
        rows.push(row);
      }
    }

    return rows;
  };

  const validateRow = (row: Record<string, any>, rowIndex: number): ValidationResult => {
    const errors: string[] = [];
    
    // Load valid types dynamically from localStorage
    const conceptoTipos = loadConceptoTipos();
    const validTypes = conceptoTipos
      .filter(t => t.activo)
      .map(t => t.nombre.toLowerCase());

    // Validate nombre (required)
    if (!row.nombre || row.nombre.trim() === "") {
      errors.push("El nombre es obligatorio");
    }

    // Validate tipo
    const tipo = row.tipo?.toLowerCase().trim();
    if (!tipo || !validTypes.includes(tipo)) {
      const tiposDisponibles = conceptoTipos.filter(t => t.activo).map(t => t.nombre).join(", ");
      errors.push(`Tipo inválido. Use: ${tiposDisponibles}`);
    }

    // Validate monto
    const monto = parseFloat(row.monto?.toString().replace(",", ".") || "0");
    if (isNaN(monto) || monto < 0) {
      errors.push("El monto debe ser un número positivo");
    }

    // Validate activo
    const activo = row.activo?.toString().toUpperCase().trim();
    if (activo && !["SI", "NO", "SÍ", "TRUE", "FALSE", "1", "0"].includes(activo)) {
      errors.push("El campo activo debe ser SI o NO");
    }

    return {
      row: rowIndex + 1,
      data: row,
      errors,
      isValid: errors.length === 0,
    };
  };

  const handleValidate = () => {
    const rows = parseExcelData(pastedData);

    if (rows.length === 0) {
      toast({
        title: "Sin datos",
        description: "No se encontraron datos válidos para importar.",
        variant: "destructive",
      });
      return;
    }

    const results = rows.map((row, index) => validateRow(row, index));
    setValidationResults(results);
    setStep("preview");
  };

  const handleImport = async () => {
    const validRows = validationResults.filter((r) => r.isValid);

    if (validRows.length === 0) {
      toast({
        title: "Sin registros válidos",
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
        const activo = ["SI", "SÍ", "TRUE", "1"].includes(
          row.data.activo?.toString().toUpperCase().trim() || "SI"
        );

        // Find specialty ID by name if provided
        let especialidadId: string | null = null;
        const especialidadName = row.data.especialidad?.trim();
        if (especialidadName) {
          const matchedSpecialty = specialties.find(
            (s) => s.name.toLowerCase() === especialidadName.toLowerCase()
          );
          if (matchedSpecialty) {
            especialidadId = matchedSpecialty.id;
          }
        }

        const conceptoData = {
          nombre: row.data.nombre.trim(),
          descripcion: row.data.descripcion?.trim() || null,
          tipo: row.data.tipo.toLowerCase().trim(),
          monto: parseFloat(row.data.monto?.toString().replace(",", ".") || "0"),
          activo,
          especialidad_id: especialidadId,
        };

        let error = null;

        if (replaceExisting) {
          // Check if concept exists by name (case-insensitive, get first match)
          const { data: existingList } = await supabase
            .from("concepto")
            .select("id")
            .ilike("nombre", conceptoData.nombre)
            .order("created_at", { ascending: true })
            .limit(1);

          const existing = existingList?.[0];

          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from("concepto")
              .update(conceptoData)
              .eq("id", existing.id);
            error = updateError;
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from("concepto")
              .insert(conceptoData);
            error = insertError;
          }
        } else {
          // Just insert
          const { error: insertError } = await supabase
            .from("concepto")
            .insert(conceptoData);
          error = insertError;
        }

        if (error) {
          result.failed++;
          result.errors.push({
            row: row.row,
            message: error.message,
          });
        } else {
          result.success++;
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push({
          row: row.row,
          message: err.message || "Error desconocido",
        });
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResult(result);
    setIsImporting(false);
    setStep("result");
    
    queryClient.invalidateQueries({ queryKey: ["conceptos"] });

    toast({
      title: "Importación completada",
      description: `${result.success} conceptos importados correctamente.`,
    });
  };

  const handleClose = () => {
    setStep("paste");
    setPastedData("");
    setValidationResults([]);
    setImportResult(null);
    setProgress(0);
    setReplaceExisting(false);
    onOpenChange(false);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-teal-600" />
            Importar Conceptos desde Excel
          </DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala y pega los datos aquí para importar conceptos de pago.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
              <Button
                variant="outline"
                onClick={downloadExistingConceptos}
                className="flex-1"
                disabled={!conceptos || conceptos.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Existentes ({conceptos?.length || 0})
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Copia las filas desde Excel (incluyendo encabezados) y pégalas aquí:
              </p>
              <Textarea
                placeholder="Pega aquí el contenido copiado desde Excel..."
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Columnas esperadas:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_COLUMNS.map((col) => (
                    <Badge key={col} variant="secondary" className="capitalize">
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tipos válidos: {loadConceptoTipos().filter(t => t.activo).map(t => t.nombre).join(", ")}. Campo activo: SI/NO.
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="replace-existing" className="text-sm font-medium">
                    Reemplazar Existentes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activado, actualizará conceptos con el mismo nombre
                  </p>
                </div>
                <Switch
                  id="replace-existing"
                  checked={replaceExisting}
                  onCheckedChange={setReplaceExisting}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!pastedData.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Validar Datos
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Válidos: {validCount}
              </Badge>
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Con errores: {invalidCount}
              </Badge>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead className="w-16">Estado</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow
                      key={result.row}
                      className={result.isValid ? "" : "bg-red-50"}
                    >
                      <TableCell className="font-mono">{result.row}</TableCell>
                      <TableCell>
                        {result.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {result.data.nombre || "-"}
                      </TableCell>
                      <TableCell>
                        {result.data.especialidad || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {result.data.tipo || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.data.monto ? `S/ ${result.data.monto}` : "-"}
                      </TableCell>
                      <TableCell>{result.data.activo || "SI"}</TableCell>
                      <TableCell>
                        {result.errors.length > 0 && (
                          <ul className="text-xs text-red-600 list-disc list-inside">
                            {result.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importando conceptos...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("paste")}
                disabled={isImporting}
              >
                Volver
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {validCount} Conceptos
              </Button>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Importación Completada</h3>
              <p className="text-muted-foreground mt-2">
                Se procesaron {importResult.total} registros.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">
                  {importResult.success}
                </p>
                <p className="text-sm text-green-700">Importados correctamente</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">
                  {importResult.failed}
                </p>
                <p className="text-sm text-red-700">Con errores</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errores durante la importación
                </h4>
                <ScrollArea className="h-32">
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        Fila {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose} className="bg-teal-600 hover:bg-teal-700">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

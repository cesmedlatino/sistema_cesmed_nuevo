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
  onSuccess: () => void;
}

interface ValidationResult {
  row: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const TEMPLATE_COLUMNS = [
  "patient_dni",
  "patient_code",
  "hms",
  "especialidad",
  "specialist_dni",
  "template_name",
  "visit_date",
  "status",
];

export function MedicalRecordsExcelImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [pastedData, setPastedData] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"paste" | "preview" | "result">("paste");

  // Cache for lookups (stored locally in loadCaches, used during validation)

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadEmptyTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      [
        "12345678",
        "PAC-000001-EJEMP",
        "",
        "OFTALMOLOGIA",
        "87654321",
        "Historia Clínica General",
        "2024-01-15",
        "Abierta",
      ],
    ]);

    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historias Clinicas");

    XLSX.writeFile(wb, "plantilla_historias_clinicas.xlsx");

    toast({
      title: "Plantilla descargada",
      description: "La plantilla vacía se ha descargado correctamente.",
    });
  };

  const downloadCurrentRecords = async () => {
    try {
      toast({
        title: "Generando archivo",
        description: "Obteniendo todas las historias clínicas, esto puede tomar un momento...",
      });

      // Fetch all records using pagination to bypass 1000 row limit
      const BATCH_SIZE = 1000;
      let allRecords: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("medical_records")
          .select(`
            hms,
            especialidad,
            visit_date,
            status,
            patients (dni, patient_code),
            specialists (dni),
            medical_record_templates (name)
          `)
          .order("created_at", { ascending: false })
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (batch && batch.length > 0) {
          allRecords = [...allRecords, ...batch];
          from += BATCH_SIZE;
          hasMore = batch.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      const rows = allRecords.map((record: any) => [
        record.patients?.dni || "",
        record.patients?.patient_code || "",
        record.hms || "",
        record.especialidad || "",
        record.specialists?.dni || "",
        record.medical_record_templates?.name || "",
        record.visit_date || "",
        record.status || "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...rows]);
      ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historias Clinicas");

      XLSX.writeFile(wb, `historias_clinicas_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Archivo descargado",
        description: `Se exportaron ${allRecords.length.toLocaleString()} historias clínicas.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo descargar el archivo.",
        variant: "destructive",
      });
    }
  };

  const parseExcelData = (data: string): Record<string, any>[] => {
    const lines = data.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase().replace(/ /g, "_"));
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

  const loadCaches = async () => {
    // Load ALL patients using pagination (Supabase limit is 1000 per query)
    const pCache: Record<string, any> = {};
    const BATCH_SIZE = 1000;
    let patientOffset = 0;
    let hasMorePatients = true;
    
    while (hasMorePatients) {
      const { data: patientsBatch } = await supabase
        .from("patients")
        .select("id, dni, patient_code, first_name, last_name")
        .range(patientOffset, patientOffset + BATCH_SIZE - 1);
      
      if (patientsBatch && patientsBatch.length > 0) {
        patientsBatch.forEach((p: any) => {
          if (p.dni) pCache[p.dni] = p;
        });
        patientOffset += BATCH_SIZE;
        hasMorePatients = patientsBatch.length === BATCH_SIZE;
      } else {
        hasMorePatients = false;
      }
    }

    // Load specialists
    const { data: specialists } = await supabase
      .from("specialists")
      .select("id, dni, first_name, last_name");
    
    const sCache: Record<string, any> = {};
    (specialists || []).forEach((s: any) => {
      if (s.dni) sCache[s.dni] = s;
    });

    // Load templates
    const { data: templates } = await supabase
      .from("medical_record_templates")
      .select("id, name")
      .eq("is_active", true);
    
    const tCache: Record<string, any> = {};
    (templates || []).forEach((t: any) => {
      tCache[t.name.toLowerCase()] = t;
    });

    return { pCache, sCache, tCache };
  };

  const validateRow = (
    row: Record<string, any>,
    rowIndex: number,
    patients: Record<string, any>,
    specialists: Record<string, any>,
    templates: Record<string, any>
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required: patient_dni
    if (!row.patient_dni) {
      errors.push("DNI del paciente es obligatorio");
    } else if (!patients[row.patient_dni]) {
      errors.push(`Paciente con DNI ${row.patient_dni} no encontrado`);
    }

    // Optional but validated: specialist_dni
    if (row.specialist_dni && !specialists[row.specialist_dni]) {
      warnings.push(`Especialista con DNI ${row.specialist_dni} no encontrado`);
    }

    // Optional but validated: template_name
    if (row.template_name && !templates[row.template_name.toLowerCase()]) {
      warnings.push(`Plantilla "${row.template_name}" no encontrada`);
    }

    // Validate date format if provided
    if (row.visit_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.visit_date)) {
        errors.push("Formato de fecha inválido. Use YYYY-MM-DD");
      }
    }

    return {
      row: rowIndex + 2,
      data: {
        ...row,
        _patient: patients[row.patient_dni] || null,
        _specialist: specialists[row.specialist_dni] || null,
        _template: templates[row.template_name?.toLowerCase()] || null,
      },
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  };

  const handleValidate = async () => {
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

      const { pCache, sCache, tCache } = await loadCaches();
      const results = rows.map((row, index) => validateRow(row, index, pCache, sCache, tCache));
      setValidationResults(results);
      setStep("preview");
    } catch {
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
        const insertData: any = {
          patient_id: row.data._patient?.id,
          visit_date: row.data.visit_date || new Date().toISOString().split("T")[0],
          status: row.data.status || "Abierta",
          especialidad: row.data.especialidad || null,
          hms: row.data.hms || null,
          specialist_id: row.data._specialist?.id || null,
          template_id: row.data._template?.id || null,
          form_data: {
            patient_code: row.data.patient_code || row.data._patient?.patient_code,
          },
        };

        const { error } = await supabase.from("medical_records").insert(insertData);

        if (error) {
          throw error;
        }

        // Update patient HMS if provided
        if (row.data.hms && row.data._patient?.id) {
          await supabase
            .from("patients")
            .update({ hms: row.data.hms })
            .eq("id", row.data._patient.id);
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
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      onSuccess();
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
  const warningCount = validationResults.filter((r) => r.warnings.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Historias Clínicas desde Excel
          </DialogTitle>
          <DialogDescription>
            Copia y pega los datos desde Excel para importar historias clínicas.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadEmptyTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Plantilla Vacía
              </Button>
              <Button variant="outline" onClick={downloadCurrentRecords}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Historias Actuales
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Descarga la plantilla y llénala con los datos
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

            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium">Columnas requeridas:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2">
                <li><strong>patient_dni</strong>: DNI del paciente (obligatorio)</li>
                <li><strong>patient_code</strong>: Código del paciente</li>
                <li><strong>hms</strong>: Número de historia (se genera automáticamente si está vacío y hay plantilla)</li>
                <li><strong>especialidad</strong>: Especialidad médica</li>
                <li><strong>specialist_dni</strong>: DNI del especialista</li>
                <li><strong>template_name</strong>: Nombre de la plantilla</li>
                <li><strong>visit_date</strong>: Fecha de visita (YYYY-MM-DD)</li>
                <li><strong>status</strong>: Estado (Abierta, En Progreso, Completada)</li>
              </ul>
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
            <div className="flex flex-wrap gap-4">
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
              {warningCount > 0 && (
                <Badge className="bg-orange-500 text-sm">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Con advertencias: {warningCount}
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Fila</TableHead>
                    <TableHead className="w-14">Estado</TableHead>
                    <TableHead>DNI Paciente</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>HMS</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow
                      key={result.row}
                      className={!result.isValid ? "bg-red-50" : result.warnings.length > 0 ? "bg-orange-50" : ""}
                    >
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.isValid ? (
                          result.warnings.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.data.patient_dni || "-"}
                      </TableCell>
                      <TableCell>
                        {result.data._patient
                          ? `${result.data._patient.first_name} ${result.data._patient.last_name}`
                          : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.data.hms || "(auto)"}
                      </TableCell>
                      <TableCell>{result.data.especialidad || "-"}</TableCell>
                      <TableCell>{result.data._template?.name || result.data.template_name || "-"}</TableCell>
                      <TableCell>
                        {result.errors.length > 0 && (
                          <div className="text-xs text-destructive">
                            {result.errors.join("; ")}
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div className="text-xs text-orange-600">
                            {result.warnings.join("; ")}
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
                  <span>Importando historias clínicas...</span>
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
                  Importar {validCount} historia{validCount !== 1 ? "s" : ""}
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

              <h3 className="text-xl font-semibold">Importación Completada</h3>

              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {importResult.success}
                  </div>
                  <div className="text-sm text-muted-foreground">Importadas</div>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-destructive">
                      {importResult.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">Fallidas</div>
                  </div>
                )}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-md p-4">
                <h4 className="font-medium mb-2 text-destructive">Errores:</h4>
                {importResult.errors.map((err, index) => (
                  <div key={index} className="text-sm mb-1">
                    <span className="font-medium">Fila {err.row}:</span> {err.message}
                  </div>
                ))}
              </ScrollArea>
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

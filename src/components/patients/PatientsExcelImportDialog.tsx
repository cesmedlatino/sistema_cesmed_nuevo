import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Settings2,
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
  existingPatient?: any;
  generatedCode?: string;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; message: string }[];
}

interface CodeConfig {
  prefix: string;
  numDigits: number;
  useNameLetters: boolean;
}

const TEMPLATE_COLUMNS = [
  "first_name",
  "last_name",
  "dni",
  "gender",
  "birth_date",
  "phone",
  "email",
  "address",
  "blood_type",
  "emergency_contact_name",
  "emergency_contact_phone",
  "chronic_conditions",
  "hms",
];

const TEMPLATE_COLUMNS_WITH_CODE = ["patient_code", ...TEMPLATE_COLUMNS];

const VALID_GENDERS = ["Masculino", "Femenino"];
const VALID_BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Default code config based on current logic: PAC-XXXXXX-ABCDE
const DEFAULT_CODE_CONFIG: CodeConfig = {
  prefix: "PAC",
  numDigits: 6,
  useNameLetters: true,
};

export function PatientsExcelImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [pastedData, setPastedData] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"paste" | "preview" | "result">("paste");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [includeCodeInExport, setIncludeCodeInExport] = useState(false);
  const [codeConfig, setCodeConfig] = useState<CodeConfig>(DEFAULT_CODE_CONFIG);
  const [showCodeConfig, setShowCodeConfig] = useState(false);
  const [importWithCode, setImportWithCode] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "invalid" | "warnings" | "duplicates">("all");
  const [showIgnoreWarningsDialog, setShowIgnoreWarningsDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadEmptyTemplate = () => {
    const columns = includeCodeInExport ? TEMPLATE_COLUMNS_WITH_CODE : TEMPLATE_COLUMNS;
    const exampleRow = includeCodeInExport
      ? [
          "PAC-000001-JUPEG",
          "Juan",
          "Pérez García",
          "12345678",
          "Masculino",
          "1990-05-15",
          "999888777",
          "juan.perez@email.com",
          "Av. Principal 123",
          "O+",
          "María García",
          "999777666",
          "Diabetes",
          "",
        ]
      : [
          "Juan",
          "Pérez García",
          "12345678",
          "Masculino",
          "1990-05-15",
          "999888777",
          "juan.perez@email.com",
          "Av. Principal 123",
          "O+",
          "María García",
          "999777666",
          "Diabetes",
          "",
        ];

    const ws = XLSX.utils.aoa_to_sheet([columns, exampleRow]);
    ws["!cols"] = columns.map(() => ({ wch: 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");

    XLSX.writeFile(wb, "plantilla_pacientes.xlsx");

    toast({
      title: "Plantilla descargada",
      description: "La plantilla vacía se ha descargado correctamente.",
    });
  };

  const downloadCurrentPatients = async () => {
    try {
      toast({
        title: "Generando archivo",
        description: "Obteniendo todos los pacientes, esto puede tomar un momento...",
      });

      // Fetch all patients using pagination to bypass 1000 row limit
      const BATCH_SIZE = 1000;
      let allPatients: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + BATCH_SIZE - 1);

        if (error) throw error;

        if (batch && batch.length > 0) {
          allPatients = [...allPatients, ...batch];
          from += BATCH_SIZE;
          hasMore = batch.length === BATCH_SIZE;
        } else {
          hasMore = false;
        }
      }

      const columns = includeCodeInExport ? TEMPLATE_COLUMNS_WITH_CODE : TEMPLATE_COLUMNS;

      const rows = allPatients.map((patient: any) => {
        const baseRow = [
          patient.first_name || "",
          patient.last_name || "",
          patient.dni || "",
          patient.gender || "",
          patient.birth_date || "",
          patient.phone || "",
          patient.email || "",
          patient.address || "",
          patient.blood_type || "",
          patient.emergency_contact_name || "",
          patient.emergency_contact_phone || "",
          Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions.join(", ") : "",
          patient.hms || "",
        ];

        if (includeCodeInExport) {
          return [patient.patient_code || "", ...baseRow];
        }
        return baseRow;
      });

      const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
      ws["!cols"] = columns.map(() => ({ wch: 18 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pacientes");

      XLSX.writeFile(wb, `pacientes_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Archivo descargado",
        description: `Se exportaron ${allPatients.length.toLocaleString()} pacientes.`,
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

  const loadExistingPatients = async () => {
    const { data: patients } = await supabase
      .from("patients")
      .select("id, dni, first_name, last_name, patient_code");

    const patientsMap: Record<string, any> = {};
    let maxCorrelative = 0;

    (patients || []).forEach((p: any) => {
      // Index by DNI
      if (p.dni) patientsMap[p.dni.toLowerCase()] = p;
      // Also index by full name (normalized)
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase().trim();
      patientsMap[fullName] = p;

      // Extract correlative from patient_code if exists
      if (p.patient_code) {
        const match = p.patient_code.match(/-(\d+)-?/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxCorrelative) maxCorrelative = num;
        }
      }
    });

    return { patientsMap, maxCorrelative };
  };

  const generateRandomDNI = (): string => {
    const random = Math.floor(10000000 + Math.random() * 90000000);
    return `DNI-${random}`;
  };

  const generatePatientCode = (
    firstName: string,
    lastName: string,
    correlative: number,
    config: CodeConfig
  ): string => {
    const paddedNumber = String(correlative).padStart(config.numDigits, "0");
    
    if (!config.useNameLetters) {
      return `${config.prefix}-${paddedNumber}`;
    }

    // Extract letters from name: A = first letter of first_name, B = second letter
    // C = first letter of last_name, D = second letter, E = last letter
    const fn = (firstName || "").toUpperCase().replace(/[^A-Z]/g, "");
    const ln = (lastName || "").toUpperCase().replace(/[^A-Z]/g, "");

    const a = fn[0] || "X";
    const b = fn[1] || "X";
    const c = ln[0] || "X";
    const d = ln[1] || "X";
    const e = ln[ln.length - 1] || "X";

    return `${config.prefix}-${paddedNumber}-${a}${b}${c}${d}${e}`;
  };

  const validateRow = (
    row: Record<string, any>,
    rowIndex: number,
    existingPatients: Record<string, any>,
    startingCorrelative: number
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.first_name?.trim()) {
      errors.push("Nombre es obligatorio");
    }
    if (!row.last_name?.trim()) {
      errors.push("Apellido es obligatorio");
    }

    // DNI validation - can be empty (will be auto-generated)
    let existingPatient = null;
    if (row.dni?.trim()) {
      existingPatient = existingPatients[row.dni.toLowerCase()];
      if (existingPatient && !replaceExisting) {
        warnings.push(`Paciente con DNI ${row.dni} ya existe`);
      }
    }

    // Check by full name if no DNI match
    if (!existingPatient && row.first_name && row.last_name) {
      const fullName = `${row.first_name} ${row.last_name}`.toLowerCase().trim();
      existingPatient = existingPatients[fullName];
      if (existingPatient && !replaceExisting) {
        warnings.push("Paciente con mismo nombre ya existe");
      }
    }

    // Gender validation
    if (row.gender && !VALID_GENDERS.includes(row.gender)) {
      warnings.push(`Género inválido. Debe ser: ${VALID_GENDERS.join(", ")}`);
    }

    // Blood type validation
    if (row.blood_type && !VALID_BLOOD_TYPES.includes(row.blood_type)) {
      warnings.push(`Tipo de sangre inválido. Debe ser: ${VALID_BLOOD_TYPES.join(", ")}`);
    }

    // Date format validation
    if (row.birth_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row.birth_date)) {
        warnings.push("Formato de fecha inválido. Use YYYY-MM-DD");
      }
    }

    // Email validation
    if (row.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        warnings.push("Email con formato inválido");
      }
    }

    // Generate code for new patients
    let generatedCode: string | undefined;
    if (!existingPatient && row.first_name && row.last_name) {
      generatedCode = generatePatientCode(
        row.first_name,
        row.last_name,
        startingCorrelative + rowIndex + 1,
        codeConfig
      );
    }

    return {
      row: rowIndex + 2,
      data: row,
      errors,
      warnings,
      isValid: errors.length === 0,
      existingPatient,
      generatedCode,
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

      const { patientsMap, maxCorrelative } = await loadExistingPatients();
      const results = rows.map((row, index) => validateRow(row, index, patientsMap, maxCorrelative));
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

  const handleImport = async (ignoreWarnings: boolean = false) => {
    // Filter rows based on ignoreWarnings flag
    let rowsToImport: ValidationResult[];
    
    if (ignoreWarnings) {
      // Import all valid rows (those without errors), ignoring warnings
      rowsToImport = validationResults.filter((r) => r.isValid);
    } else {
      // Import only valid rows without warnings
      rowsToImport = validationResults.filter((r) => r.isValid);
    }

    if (rowsToImport.length === 0) {
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
      total: rowsToImport.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    const { data: userData } = await supabase.auth.getUser();

    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];

      try {
        // Prepare patient data
        const patientData: any = {
          first_name: row.data.first_name?.trim(),
          last_name: row.data.last_name?.trim(),
          dni: row.data.dni?.trim() || generateRandomDNI(),
          gender: VALID_GENDERS.includes(row.data.gender) ? row.data.gender : null,
          birth_date: row.data.birth_date || null,
          phone: row.data.phone || null,
          email: row.data.email || null,
          address: row.data.address || null,
          blood_type: VALID_BLOOD_TYPES.includes(row.data.blood_type) ? row.data.blood_type : null,
          emergency_contact_name: row.data.emergency_contact_name || null,
          emergency_contact_phone: row.data.emergency_contact_phone || null,
          chronic_conditions: row.data.chronic_conditions
            ? row.data.chronic_conditions.split(",").map((c: string) => c.trim()).filter(Boolean)
            : [],
          hms: row.data.hms || null,
          updated_by: userData?.user?.id || null,
        };

        if (row.existingPatient && replaceExisting) {
          // Update existing patient
          const { error } = await supabase
            .from("patients")
            .update(patientData)
            .eq("id", row.existingPatient.id);

          if (error) throw error;
          result.updated++;
        } else {
          // Create new patient
          patientData.created_by = userData?.user?.id || null;
          
          const { error } = await supabase.from("patients").insert(patientData);

          if (error) throw error;
          result.created++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: row.row,
          message: error.message || "Error desconocido",
        });
      }

      setProgress(Math.round(((i + 1) / rowsToImport.length) * 100));
    }

    setImportResult(result);
    setStep("result");
    setIsImporting(false);

    if (result.created > 0 || result.updated > 0) {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      onSuccess();
    }
  };

  const handleClose = () => {
    setPastedData("");
    setValidationResults([]);
    setImportResult(null);
    setStep("paste");
    setProgress(0);
    setReplaceExisting(false);
    setIncludeCodeInExport(false);
    setShowCodeConfig(false);
    setCodeConfig(DEFAULT_CODE_CONFIG);
    setImportWithCode(false);
    setPreviewFilter("all");
    setShowIgnoreWarningsDialog(false);
    onOpenChange(false);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.filter((r) => !r.isValid).length;
  const warningCount = validationResults.filter((r) => r.warnings.length > 0).length;
  const duplicateCount = validationResults.filter((r) => r.existingPatient).length;
  
  
  // Check if there are duplicate codes (for import with code mode)
  const hasDuplicateCodes = importWithCode && validationResults.some((r) => 
    r.warnings.some((w) => w.toLowerCase().includes("código") || w.toLowerCase().includes("code"))
  );
  
  // Can import ignoring warnings only if there are no duplicate codes
  const canImportIgnoringWarnings = warningCount > 0 && validCount > 0 && !hasDuplicateCodes;

  // Filter results based on selected filter
  const filteredValidationResults = validationResults.filter((r) => {
    switch (previewFilter) {
      case "valid":
        return r.isValid && r.warnings.length === 0;
      case "invalid":
        return !r.isValid;
      case "warnings":
        return r.warnings.length > 0;
      case "duplicates":
        return r.existingPatient;
      default:
        return true;
    }
  });

  // Generate example code for preview
  const exampleCode = generatePatientCode("Juan", "Pérez García", 1, codeConfig);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Pacientes desde Excel
          </DialogTitle>
          <DialogDescription>
            Copia y pega los datos desde Excel para importar pacientes.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <div className="space-y-4">
            {/* Downloads Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Descargas:</span>
                <Button variant="outline" size="sm" onClick={downloadEmptyTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Plantilla Vacía
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCurrentPatients}>
                  <Download className="mr-2 h-4 w-4" />
                  Pacientes Actuales
                </Button>
                <div className="flex items-center gap-2 border-l pl-3">
                  <Switch
                    id="include-code"
                    checked={includeCodeInExport}
                    onCheckedChange={setIncludeCodeInExport}
                  />
                  <Label htmlFor="include-code" className="text-sm whitespace-nowrap">
                    Incluir código
                  </Label>
                </div>
              </div>

              {/* Import Mode Toggle */}
              <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                <span className="text-sm font-medium text-muted-foreground">Modo de importación:</span>
                <div className="flex items-center gap-2">
                  <Switch
                    id="import-with-code"
                    checked={importWithCode}
                    onCheckedChange={setImportWithCode}
                  />
                  <Label htmlFor="import-with-code" className="text-sm">
                    {importWithCode ? (
                      <span className="text-blue-600 font-medium">Actualización masiva (con código)</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Importación incremental (sin código)</span>
                    )}
                  </Label>
                </div>
              </div>
            </div>

            {/* Code Configuration Section */}
            {!importWithCode && (
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Configuración del Código de Paciente</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCodeConfig(!showCodeConfig)}
                  >
                    {showCodeConfig ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Ejemplo de código: <span className="font-mono font-medium text-foreground">{exampleCode}</span>
                </div>

                {showCodeConfig && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="prefix" className="text-sm">Prefijo</Label>
                      <Input
                        id="prefix"
                        value={codeConfig.prefix}
                        onChange={(e) => setCodeConfig({ ...codeConfig, prefix: e.target.value.toUpperCase() })}
                        placeholder="PAC"
                        maxLength={5}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Letras al inicio del código</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numDigits" className="text-sm">Número de dígitos</Label>
                      <Input
                        id="numDigits"
                        type="number"
                        value={codeConfig.numDigits}
                        onChange={(e) => setCodeConfig({ ...codeConfig, numDigits: Math.max(1, Math.min(13, parseInt(e.target.value) || 6)) })}
                        min={1}
                        max={13}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Dígitos para número correlativo (1-13)</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Letras de nombre/apellido</Label>
                      <div className="flex items-center gap-2 h-9">
                        <Switch
                          id="use-name-letters"
                          checked={codeConfig.useNameLetters}
                          onCheckedChange={(checked) => setCodeConfig({ ...codeConfig, useNameLetters: checked })}
                        />
                        <Label htmlFor="use-name-letters" className="text-sm font-normal">
                          {codeConfig.useNameLetters ? "Activado" : "Desactivado"}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">5 letras del nombre y apellido</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Switch
                id="replace-existing"
                checked={replaceExisting}
                onCheckedChange={setReplaceExisting}
              />
              <Label htmlFor="replace-existing">
                Reemplazar pacientes existentes (por DNI o nombre completo)
              </Label>
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
                className="min-h-[180px] font-mono text-sm"
              />
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium">Columnas {importWithCode ? "(con código)" : "(sin código)"}:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1 text-muted-foreground text-xs">
                {importWithCode && (
                  <span><strong>patient_code</strong>: Código del paciente</span>
                )}
                <span><strong>first_name</strong>: Nombres (obligatorio)</span>
                <span><strong>last_name</strong>: Apellidos (obligatorio)</span>
                <span><strong>dni</strong>: DNI {!importWithCode && "(se genera si vacío)"}</span>
                <span><strong>gender</strong>: Masculino/Femenino</span>
                <span><strong>birth_date</strong>: Fecha (YYYY-MM-DD)</span>
                <span><strong>phone</strong>: Teléfono</span>
                <span><strong>email</strong>: Correo electrónico</span>
                <span><strong>address</strong>: Dirección</span>
                <span><strong>blood_type</strong>: Tipo de sangre</span>
                <span><strong>emergency_contact_name</strong>: Contacto emergencia</span>
                <span><strong>emergency_contact_phone</strong>: Tel. emergencia</span>
                <span><strong>chronic_conditions</strong>: Condiciones (coma)</span>
                <span><strong>hms</strong>: Historia clínica</span>
              </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Filtrar:</span>
              <Badge 
                variant={previewFilter === "all" ? "default" : "secondary"} 
                className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewFilter("all")}
              >
                Total: {validationResults.length}
              </Badge>
              <Badge 
                className={`text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                  previewFilter === "valid" 
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-300" 
                    : "bg-emerald-500 text-white"
                }`}
                onClick={() => setPreviewFilter("valid")}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Válidos: {validCount}
              </Badge>
              {invalidCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className={`text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                    previewFilter === "invalid" ? "ring-2 ring-destructive/50" : ""
                  }`}
                  onClick={() => setPreviewFilter("invalid")}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Con errores: {invalidCount}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge 
                  className={`text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                    previewFilter === "warnings" 
                      ? "bg-amber-600 text-white ring-2 ring-amber-300" 
                      : "bg-amber-500 text-white"
                  }`}
                  onClick={() => setPreviewFilter("warnings")}
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Con advertencias: {warningCount}
                </Badge>
              )}
              {duplicateCount > 0 && (
                <Badge 
                  variant={previewFilter === "duplicates" ? "default" : "outline"} 
                  className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewFilter("duplicates")}
                >
                  Duplicados: {duplicateCount}
                </Badge>
              )}
              {previewFilter !== "all" && (
                <span className="text-sm text-muted-foreground ml-2">
                  Mostrando {filteredValidationResults.length} de {validationResults.length}
                </span>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Fila</TableHead>
                    <TableHead className="w-14">Estado</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredValidationResults.map((result) => (
                    <TableRow
                      key={result.row}
                      className={!result.isValid ? "bg-destructive/10" : result.warnings.length > 0 ? "bg-amber-50" : ""}
                    >
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.isValid ? (
                          result.warnings.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>{result.data.first_name || "-"}</TableCell>
                      <TableCell>{result.data.last_name || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.data.dni || "(auto)"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.existingPatient ? (
                          <span className="text-muted-foreground">{result.existingPatient.patient_code}</span>
                        ) : (
                          <span className="text-emerald-600">{result.generatedCode || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.errors.length > 0 && (
                          <div className="text-xs text-destructive">
                            {result.errors.join("; ")}
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div className="text-xs text-amber-600">
                            {result.warnings.join("; ")}
                          </div>
                        )}
                        {result.existingPatient && replaceExisting && (
                          <div className="text-xs text-blue-600">
                            Actualizará: {result.existingPatient.patient_code}
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
                  <span>Importando pacientes...</span>
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
                {canImportIgnoringWarnings && (
                  <Button
                    variant="outline"
                    onClick={() => setShowIgnoreWarningsDialog(true)}
                    disabled={isImporting}
                    className="border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Importar omitiendo advertencias ({validCount})
                  </Button>
                )}
                <Button
                  onClick={() => handleImport(false)}
                  disabled={isImporting || validCount === 0}
                >
                  {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {validCount} paciente{validCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-4">
              {(importResult.created > 0 || importResult.updated > 0) ? (
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              )}

              <h3 className="text-xl font-semibold">Importación Completada</h3>

              <div className="flex justify-center gap-6 mt-4">
                {importResult.created > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600">
                      {importResult.created}
                    </div>
                    <div className="text-sm text-muted-foreground">Creados</div>
                  </div>
                )}
                {importResult.updated > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {importResult.updated}
                    </div>
                    <div className="text-sm text-muted-foreground">Actualizados</div>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-destructive">
                      {importResult.failed}
                    </div>
                    <div className="text-sm text-muted-foreground">Fallidos</div>
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

      {/* Alert Dialog for ignoring warnings */}
      <AlertDialog open={showIgnoreWarningsDialog} onOpenChange={setShowIgnoreWarningsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Importar omitiendo advertencias
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de importar <strong>{validCount} pacientes</strong> ignorando las advertencias detectadas.
              </p>
              <p className="text-amber-600">
                Se encontraron {warningCount} registros con advertencias que serán procesados sin corrección.
              </p>
              <p className="text-sm text-muted-foreground">
                Las advertencias incluyen: formatos inválidos de género, tipo de sangre, fechas, emails, y registros duplicados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowIgnoreWarningsDialog(false);
                handleImport(true);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

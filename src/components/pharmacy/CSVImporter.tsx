import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { parse, isValid, format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

type ImportType = "medications" | "entries" | "outputs";

interface ValidationMessage {
  type: 'error' | 'warning' | 'success';
  message: string;
}

interface CSVPreviewRow {
  rowNumber: number;
  data: string[];
  isValid: boolean;
  errors: string[];
}

interface ErrorDetail {
  rowNumber: number;
  errors: string[];
}

interface ImportResults {
  success: boolean;
  totalProcessed: number;
  successfulRows: number;
  failedRows: number;
  emptyRows: number;
  errors: string[];
}

export function CSVImporter() {
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>("medications");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [useSemicolon, setUseSemicolon] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [csvPreview, setCSVPreview] = useState<CSVPreviewRow[]>([]);
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [validRows, setValidRows] = useState(0);
  const [errorRows, setErrorRows] = useState(0);
  const [allErrors, setAllErrors] = useState<ErrorDetail[]>([]);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const parseCSVLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    
    const trimmed = dateStr.trim().replace(/["']/g, ''); // Remover comillas
    
    // Si ya está en formato ISO, devolverlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Lista de formatos posibles para intentar parsear
    const dateFormats = [
      'dd/MM/yyyy',   // 13/12/2023
      'd/M/yyyy',     // 1/1/2023
      'dd-MM-yyyy',   // 13-12-2023
      'd-M-yyyy',     // 1-1-2023
      'yyyy/MM/dd',   // 2023/12/13
      'yyyy-MM-dd',   // 2023-12-13
      'dd.MM.yyyy',   // 13.12.2023
      'd.M.yyyy',     // 1.1.2023
      'MM/dd/yyyy',   // 12/13/2023 (formato US)
      'M/d/yyyy',     // 1/1/2023 (formato US)
    ];
    
    // Intentar parsear con cada formato
    for (const formatStr of dateFormats) {
      try {
        const parsedDate = parse(trimmed, formatStr, new Date());
        if (isValid(parsedDate)) {
          // Validación adicional: verificar que no sea una fecha absurda
          const year = parsedDate.getFullYear();
          if (year >= 1900 && year <= 2100) {
            return format(parsedDate, 'yyyy-MM-dd');
          }
        }
      } catch (e) {
        // Continuar con el siguiente formato
        continue;
      }
    }
    
    // Intentar parsear formato mes-año (ene-24, dic-25, etc.)
    const months: { [key: string]: string } = {
      'ene': '01', 'enero': '01', 'jan': '01', 'january': '01',
      'feb': '02', 'febrero': '02', 'february': '02',
      'mar': '03', 'marzo': '03', 'march': '03',
      'abr': '04', 'abril': '04', 'apr': '04', 'april': '04',
      'may': '05', 'mayo': '05',
      'jun': '06', 'junio': '06', 'june': '06',
      'jul': '07', 'julio': '07', 'july': '07',
      'ago': '08', 'agosto': '08', 'aug': '08', 'august': '08',
      'sep': '09', 'septiembre': '09', 'september': '09',
      'oct': '10', 'octubre': '10', 'october': '10',
      'nov': '11', 'noviembre': '11', 'november': '11',
      'dic': '12', 'diciembre': '12', 'dec': '12', 'december': '12'
    };
    
    const parts = trimmed.toLowerCase().split(/[-\/\.]/);
    if (parts.length === 2) {
      const month = months[parts[0]];
      let year = parts[1];
      
      // Si el año es de 2 dígitos, convertir a 4 dígitos
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum >= 50 ? `19${year}` : `20${year}`;
      }
      
      if (month && year.length === 4) {
        return `${year}-${month}-01`;
      }
    }
    
    // Si nada funcionó, intentar con Date.parse como último recurso
    try {
      const timestamp = Date.parse(trimmed);
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp);
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd');
        }
      }
    } catch (e) {
      // Ignorar error
    }
    
    return null;
  };

  const isValidDate = (dateStr: string): boolean => {
    const parsed = parseDate(dateStr);
    return parsed !== null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setValidationMessages([]);
      setCSVPreview([]);
      setShowPreview(false);
      setIsValidated(false);
      setTotalRows(0);
      setValidRows(0);
      setErrorRows(0);
      setAllErrors([]);
    }
  };

  const handleValidate = async () => {
    if (!uploadedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV.",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);
    setValidationMessages([]);
    setCSVPreview([]);
    setAllErrors([]);
    setShowPreview(false);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const separator = useSemicolon ? ';' : ',';
          const lines = csvText.split('\n');
          const preview: CSVPreviewRow[] = [];
          const messages: ValidationMessage[] = [];
          const errorDetails: ErrorDetail[] = [];
          let validCount = 0;
          let errorCount = 0;
          let emptyCount = 0;

          // Obtener todos los códigos de productos existentes
          let existingMedicationCodes: Set<string> = new Set();
          const { data: medications } = await supabase
            .from('pharmacy_medications')
            .select('codigo')
            .eq('status', 'Activo');
          
          if (medications) {
            existingMedicationCodes = new Set(medications.map(m => m.codigo).filter(c => c));
          }

          // Validar TODAS las filas
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
              emptyCount++;
              continue;
            }

            const values = parseCSVLine(line, separator);
            const errors: string[] = [];
            const rowNumber = i + 1;

            if (importType === "medications") {
              if (!values[2]?.trim()) errors.push("Falta descripción");
              if (values[6]?.trim() && !isValidDate(values[6])) errors.push("Fecha vencimiento inválida");
              
              // Validar si el código ya existe en la base de datos (solo si no se va a reemplazar)
              if (!replaceExisting) {
                const codigo = values[1]?.trim();
                if (codigo && existingMedicationCodes.has(codigo)) {
                  errors.push(`El código "${codigo}" ya existe en la base de datos`);
                }
              }
            } else if (importType === "entries") {
              if (values[2]?.trim() && !isValidDate(values[2])) errors.push("Fecha inválida");
              if (values[10]?.trim() && !isValidDate(values[10])) errors.push("Fecha vencimiento inválida");
              const productCode = values[4]?.trim();
              if (productCode && !existingMedicationCodes.has(productCode)) {
                errors.push(`Código de producto "${productCode}" no existe`);
              }
            } else if (importType === "outputs") {
              if (!values[0]?.trim() || !isValidDate(values[0])) errors.push("Fecha inválida o faltante");
              const productCode = values[1]?.trim();
              if (!productCode) {
                errors.push("Falta código del producto");
              } else if (!existingMedicationCodes.has(productCode)) {
                errors.push(`Código de producto "${productCode}" no existe en la base de datos`);
              }
            }

            // Guardar en preview solo las primeras 10 filas
            if (preview.length < 10) {
              preview.push({
                rowNumber,
                data: values,
                isValid: errors.length === 0,
                errors
              });
            }

            // Guardar TODOS los errores para mostrarlos
            if (errors.length > 0) {
              errorDetails.push({
                rowNumber,
                errors
              });
              errorCount++;
            } else {
              validCount++;
            }
          }

          const totalLines = lines.length - 1 - emptyCount;
          
          setTotalRows(totalLines);
          setValidRows(validCount);
          setErrorRows(errorCount);
          setAllErrors(errorDetails);
          setCSVPreview(preview);

          // Mensajes de validación
          messages.push({
            type: 'success',
            message: `Total de filas detectadas: ${totalLines}`
          });

          if (validCount > 0) {
            messages.push({
              type: 'success',
              message: `Filas válidas: ${validCount}`
            });
          }

          if (errorCount > 0) {
            messages.push({
              type: 'error',
              message: `Filas con errores: ${errorCount}`
            });
          }

          if (emptyCount > 0) {
            messages.push({
              type: 'warning',
              message: `Filas vacías ignoradas: ${emptyCount}`
            });
          }

          setValidationMessages(messages);
          setShowPreview(true);
          setIsValidated(true);

          if (errorCount === 0 && validCount > 0) {
            toast({
              title: "Validación exitosa",
              description: `Todas las ${validCount} filas son válidas. Puedes proceder con la importación.`,
            });
          } else if (errorCount > 0) {
            toast({
              title: "Validación completada con errores",
              description: `Se encontraron ${errorCount} filas con errores. Revisa los detalles abajo.`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error validating file:', error);
          toast({
            title: "Error al validar",
            description: "Ocurrió un error al validar el archivo.",
            variant: "destructive",
          });
        } finally {
          setValidating(false);
        }
      };
      
      reader.readAsText(uploadedFile);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "Error",
        description: "No se pudo leer el archivo.",
        variant: "destructive",
      });
      setValidating(false);
    }
  };

  const processMedicationsCSV = async (csvText: string) => {
    const separator = useSemicolon ? ';' : ',';
    setProgress(5);
    setProgressMessage("Iniciando procesamiento de productos...");
    
    const lines = csvText.split('\n');
    const totalLines = lines.length - 1;
    
    setProgress(10);
    setProgressMessage(`Validando ${totalLines} filas...`);
    
    const validMedications = [];
    const rowErrors: string[] = [];
    let emptyRowCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        emptyRowCount++;
        continue;
      }
      
      // Actualizar progreso cada 50 filas
      if (i % 50 === 0) {
        const processProgress = 10 + ((i / totalLines) * 30);
        setProgress(processProgress);
        setProgressMessage(`Procesando fila ${i} de ${totalLines}...`);
      }
      
      const values = parseCSVLine(line, separator);
      const descripcion = values[2]?.trim();
      
      if (!descripcion) {
        rowErrors.push(`Fila ${i + 1}: Falta descripción`);
        continue;
      }
      
      const medication = {
        ubicacion: values[0]?.trim() || null,
        codigo: values[1]?.trim() || null,
        descripcion: descripcion,
        forma_farmaceutica: values[3]?.trim() || null,
        laboratorio: values[4]?.trim() || null,
        lote: values[5]?.trim() || null,
        fecha_vencimiento: parseDate(values[6]?.trim()),
        presentation: values[7]?.trim() || '[Falta completar]',
        stock_inicial: parseInt(values[8]) || 0,
        entrada: parseInt(values[9]) || 0,
        salida: parseInt(values[10]) || 0,
        stock_actual: parseInt(values[11]) || 0,
        precio_venta: parseFloat(values[12]?.trim()) || null,
        comentarios: values[13]?.trim() || null,
        status: 'Activo',
        min_stock_level: 10,
        days_before_expiry_alert: 30
      };
      
      validMedications.push(medication);
    }
    
    setProgress(40);
    
    if (validMedications.length === 0) {
      throw new Error('No se encontraron productos válidos para importar.');
    }
    
    setProgressMessage(`Insertando ${validMedications.length} productos en lotes...`);
    
    // Insertar en lotes de 50 registros
    const batchSize = 50;
    const totalBatches = Math.ceil(validMedications.length / batchSize);
    let insertedCount = 0;
    
    for (let i = 0; i < validMedications.length; i += batchSize) {
      const batch = validMedications.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      const batchProgress = 40 + ((currentBatch / totalBatches) * 55);
      setProgress(batchProgress);
      setProgressMessage(`Insertando lote ${currentBatch} de ${totalBatches} (${insertedCount + batch.length}/${validMedications.length})...`);
      
      const { error } = await supabase
        .from('pharmacy_medications')
        .upsert(batch, { 
          onConflict: 'codigo',
          ignoreDuplicates: !replaceExisting // Si replaceExisting=true, no ignorar duplicados
        });
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw new Error(`Error al insertar productos: ${error.message}`);
      }
      
      insertedCount += batch.length;
      
      // Pequeña pausa para permitir que la UI se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setProgress(95);
    setProgressMessage("Finalizando importación...");
    
    queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
    
    setProgress(100);
    setProgressMessage("Importación completada");
    
    // Crear objeto de resultados
    const results: ImportResults = {
      success: true,
      totalProcessed: totalLines,
      successfulRows: insertedCount,
      failedRows: rowErrors.length,
      emptyRows: emptyRowCount,
      errors: rowErrors
    };
    
    setImportResults(results);
    
    // Mostrar resumen
    const summary = [];
    if (insertedCount > 0) summary.push(`${insertedCount} productos importados`);
    if (rowErrors.length > 0) summary.push(`${rowErrors.length} filas omitidas`);
    if (emptyRowCount > 0) summary.push(`${emptyRowCount} filas vacías`);
    
    toast({
      title: "✓ Importación completada exitosamente",
      description: summary.join(', '),
    });
  };

  const processEntriesCSV = async (csvText: string) => {
    const separator = useSemicolon ? ';' : ',';
    setProgress(5);
    setProgressMessage("Iniciando procesamiento de entradas...");
    
    const lines = csvText.split('\n');
    const totalLines = lines.length - 1;
    
    setProgress(10);
    setProgressMessage("Cargando datos de referencia...");
    
    // Cargar mapas de productos y proveedores
    const { data: medications } = await supabase
      .from('pharmacy_medications')
      .select('id, codigo')
      .eq('status', 'Activo');
    
    const { data: suppliers } = await supabase
      .from('pharmacy_suppliers')
      .select('id, name');
    
    const medicationMap = new Map(medications?.map(m => [m.codigo, m.id]) || []);
    const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]) || []);
    
    setProgress(15);
    setProgressMessage(`Procesando ${totalLines} filas...`);
    
    const validEntries = [];
    const rowErrors: string[] = [];
    let emptyRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        emptyRows++;
        continue;
      }
      
      // Actualizar progreso cada 50 filas
      if (i % 50 === 0) {
        const processProgress = 15 + ((i / totalLines) * 35);
        setProgress(processProgress);
        setProgressMessage(`Procesando fila ${i} de ${totalLines}...`);
      }
      
      const values = parseCSVLine(line, separator);
      
      // Buscar proveedor
      let supplierId = null;
      const supplierName = values[0]?.trim();
      if (supplierName) {
        supplierId = supplierMap.get(supplierName.toLowerCase());
      }
      
      // Buscar producto
      const productCode = values[4]?.trim();
      const medicationId = productCode ? medicationMap.get(productCode) : null;
      
      if (!medicationId) {
        rowErrors.push(`Fila ${i + 1}: Producto "${productCode}" no encontrado`);
        continue;
      }
      
      const entry = {
        supplier_id: supplierId,
        invoice_number: values[1]?.trim() || null,
        date: parseDate(values[2]?.trim()) || new Date().toISOString().split('T')[0],
        num_boxes: parseInt(values[3]?.trim()) || null,
        product_code: productCode || null,
        medication_id: medicationId,
        description: values[5]?.trim() || null,
        pharmaceutical_form: values[6]?.trim() || null,
        laboratory: values[7]?.trim() || null,
        batch: values[8]?.trim() || null,
        nsoc_rs: values[9]?.trim() || null,
        expiry_date: parseDate(values[10]?.trim()),
        presentation: values[11]?.trim() || null,
        quantity_requested: parseInt(values[12]?.trim()) || null,
        quantity_received: parseInt(values[13]?.trim()) || null,
        is_accepted: values[14]?.trim()?.toLowerCase() === 'si' ? true : values[14]?.trim()?.toLowerCase() === 'no' ? false : null,
        observations: values[15]?.trim() || null,
        purchase_cost_per_unit: parseFloat(values[16]?.trim()) || null,
        payment_type: values[17]?.trim() || null,
        total_amount: parseFloat(values[18]?.trim()) || null,
        invoice_due_date: parseDate(values[19]?.trim()),
        payment_status: values[20]?.trim() || 'Pendiente'
      };
      
      validEntries.push(entry);
    }
    
    setProgress(50);
    
    if (validEntries.length === 0) {
      throw new Error('No se encontraron entradas válidas para importar.');
    }
    
    setProgressMessage(`Insertando ${validEntries.length} entradas en lotes...`);
    
    // Insertar en lotes de 100 registros
    const batchSize = 100;
    const totalBatches = Math.ceil(validEntries.length / batchSize);
    let insertedCount = 0;
    
    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batch = validEntries.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      const batchProgress = 50 + ((currentBatch / totalBatches) * 45);
      setProgress(batchProgress);
      setProgressMessage(`Insertando lote ${currentBatch} de ${totalBatches} (${insertedCount + batch.length}/${validEntries.length})...`);
      
      const { error } = await supabase
        .from('pharmacy_entries')
        .insert(batch);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw new Error(`Error al insertar entradas: ${error.message}`);
      }
      
      insertedCount += batch.length;
      
      // Pequeña pausa para permitir que la UI se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setProgress(95);
    setProgressMessage("Finalizando importación...");
    
    queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
    
    setProgress(100);
    setProgressMessage("Importación completada");
    
    // Crear objeto de resultados
    const results: ImportResults = {
      success: true,
      totalProcessed: totalLines,
      successfulRows: insertedCount,
      failedRows: rowErrors.length,
      emptyRows: emptyRows,
      errors: rowErrors
    };
    
    setImportResults(results);
    
    // Mostrar resumen
    const summary = [];
    if (insertedCount > 0) summary.push(`${insertedCount} entradas importadas`);
    if (rowErrors.length > 0) summary.push(`${rowErrors.length} filas omitidas`);
    if (emptyRows > 0) summary.push(`${emptyRows} filas vacías`);
    
    toast({
      title: "✓ Importación completada exitosamente",
      description: summary.join(', '),
    });
  };

  const processOutputsCSV = async (csvText: string) => {
    const separator = useSemicolon ? ';' : ',';
    setProgress(5);
    setProgressMessage("Iniciando procesamiento de salidas...");
    
    const lines = csvText.split('\n');
    const totalLines = lines.length - 1; // Excluir header
    
    setProgress(10);
    setProgressMessage("Cargando códigos de productos...");
    
    // Cargar todos los productos de una vez para búsqueda rápida
    const { data: medications, error: medError } = await supabase
      .from('pharmacy_medications')
      .select('id, codigo')
      .eq('status', 'Activo');
    
    if (medError) {
      throw new Error(`Error al cargar productos: ${medError.message}`);
    }
    
    const medicationMap = new Map(medications?.map(m => [m.codigo, m.id]) || []);
    
    setProgress(15);
    setProgressMessage(`Procesando ${totalLines} filas...`);
    
    const validOutputs = [];
    const rowErrors: string[] = [];
    let emptyRows = 0;
    
    // Procesar todas las filas
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        emptyRows++;
        continue;
      }
      
      // Actualizar progreso cada 50 filas
      if (i % 50 === 0) {
        const processProgress = 15 + ((i / totalLines) * 35);
        setProgress(processProgress);
        setProgressMessage(`Procesando fila ${i} de ${totalLines}...`);
      }
      
      const values = parseCSVLine(line, separator);
      
      // Validar fecha
      const dateStr = values[0]?.trim();
      const parsedDate = parseDate(dateStr || '');
      
      if (!parsedDate) {
        rowErrors.push(`Fila ${i + 1}: Fecha inválida "${dateStr}"`);
        continue;
      }
      
      // Validar código de producto
      const productCode = values[1]?.trim();
      if (!productCode) {
        rowErrors.push(`Fila ${i + 1}: Código de producto faltante`);
        continue;
      }
      
      // Buscar medication_id
      const medicationId = medicationMap.get(productCode);
      if (!medicationId) {
        rowErrors.push(`Fila ${i + 1}: Código "${productCode}" no existe en inventario`);
        continue;
      }
      
      // Crear registro de salida solo si es válido
      const output = {
        date: parsedDate,
        product_code: productCode,
        medication_id: medicationId,
        description: values[2]?.trim() || null,
        quantity: parseInt(values[3]?.trim()) || 0,
        sale_cost_per_unit: parseFloat(values[4]?.trim()) || null,
        total: parseFloat(values[5]?.trim()) || null,
        comments: values[6]?.trim() || null
      };
      
      validOutputs.push(output);
    }
    
    setProgress(50);
    
    if (validOutputs.length === 0) {
      throw new Error('No se encontraron salidas válidas para importar.');
    }
    
    setProgressMessage(`Insertando ${validOutputs.length} salidas en lotes...`);
    
    // Insertar en lotes de 100 registros
    const batchSize = 100;
    const totalBatches = Math.ceil(validOutputs.length / batchSize);
    let insertedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < validOutputs.length; i += batchSize) {
      const batch = validOutputs.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      const batchProgress = 50 + ((currentBatch / totalBatches) * 45);
      setProgress(batchProgress);
      setProgressMessage(`Insertando lote ${currentBatch} de ${totalBatches} (${insertedCount + batch.length}/${validOutputs.length})...`);
      
      const { error: insertError } = await supabase
        .from('pharmacy_outputs')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting batch:', insertError);
        failedCount += batch.length;
        rowErrors.push(`Error en lote ${currentBatch}: ${insertError.message}`);
      } else {
        insertedCount += batch.length;
      }
      
      // Pequeña pausa para permitir que la UI se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setProgress(95);
    setProgressMessage("Finalizando importación...");
    
    // Invalidar caché
    queryClient.invalidateQueries({ queryKey: ["pharmacy-outputs"] });
    
    setProgress(100);
    setProgressMessage("Importación completada");
    
    // Crear objeto de resultados
    const results: ImportResults = {
      success: insertedCount > 0,
      totalProcessed: totalLines,
      successfulRows: insertedCount,
      failedRows: failedCount + rowErrors.length,
      emptyRows: emptyRows,
      errors: rowErrors
    };
    
    setImportResults(results);
    
    // Mostrar resumen
    const summary = [];
    if (insertedCount > 0) summary.push(`${insertedCount} registros importados`);
    if (failedCount > 0) summary.push(`${failedCount} registros fallaron`);
    if (rowErrors.length > 0) summary.push(`${rowErrors.length} filas con errores`);
    if (emptyRows > 0) summary.push(`${emptyRows} filas vacías ignoradas`);
    
    toast({
      title: insertedCount > 0 ? "✓ Importación completada exitosamente" : "Error en importación",
      description: summary.join(', '),
      variant: insertedCount === 0 ? "destructive" : "default",
    });
    
    if (rowErrors.length > 0 && rowErrors.length <= 20) {
      console.log('Errores encontrados:', rowErrors);
    }
  };

  const handleImportFromFile = async () => {
    if (!uploadedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidated) {
      toast({
        title: "Error",
        description: "Por favor valida el archivo antes de importar.",
        variant: "destructive",
      });
      return;
    }

    if (errorRows > 0) {
      toast({
        title: "Error",
        description: `No se puede importar. Hay ${errorRows} filas con errores.`,
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setProgressMessage("Iniciando importación...");
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          
          if (importType === "medications") {
            await processMedicationsCSV(csvText);
          } else if (importType === "entries") {
            await processEntriesCSV(csvText);
          } else if (importType === "outputs") {
            await processOutputsCSV(csvText);
          }
          
          // No limpiar el archivo hasta que el usuario vea los resultados
          setIsValidated(false);
          setShowPreview(false);
          setValidationMessages([]);
        } catch (error) {
          console.error('Error processing CSV:', error);
          throw error;
        }
      };
      
      reader.onerror = () => {
        throw new Error("Error al leer el archivo CSV.");
      };
      
      reader.readAsText(uploadedFile);
    } catch (error) {
      console.error('Error importing CSV:', error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo importar el archivo CSV.";
      toast({
        title: "Error al importar",
        description: errorMessage,
        variant: "destructive",
      });
      setProgress(0);
      setProgressMessage("");
    } finally {
      setImporting(false);
    }
  };

  const getColumnHeaders = () => {
    if (importType === "medications") {
      return ["Ubicación", "Código", "Descripción", "Forma Farm.", "Laboratorio", "Lote", "F. Vencimiento"];
    } else if (importType === "entries") {
      return ["Proveedor", "N° Factura", "Fecha", "N° Cajas", "Código", "Descripción", "F. Vencimiento"];
    } else {
      return ["Fecha", "Código", "Descripción", "Cantidad", "Costo Unit.", "Total"];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Importar desde CSV
        </CardTitle>
        <CardDescription>
          Importa productos, entradas o salidas desde un archivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de importación</Label>
          <Select value={importType} onValueChange={(value) => setImportType(value as ImportType)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="medications">Productos</SelectItem>
              <SelectItem value="entries">Entradas</SelectItem>
              <SelectItem value="outputs">Salidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="separator-mode" className="text-sm font-medium">
              Separador de columnas
            </Label>
            <p className="text-sm text-muted-foreground">
              {useSemicolon ? "Punto y coma (;)" : "Coma (,)"}
            </p>
          </div>
          <Switch
            id="separator-mode"
            checked={useSemicolon}
            onCheckedChange={setUseSemicolon}
            disabled={importing}
          />
        </div>

        {importType === "medications" && (
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="replace-mode" className="text-sm font-medium">
                Reemplazar productos existentes
              </Label>
              <p className="text-sm text-muted-foreground">
                {replaceExisting 
                  ? "Los productos con código duplicado serán reemplazados" 
                  : "Los productos con código duplicado serán ignorados"}
              </p>
            </div>
            <Switch
              id="replace-mode"
              checked={replaceExisting}
              onCheckedChange={setReplaceExisting}
              disabled={importing}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Subir archivo CSV</Label>
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={importing || validating}
              className="flex-1"
            />
            <Button 
              onClick={handleValidate} 
              disabled={validating || importing || !uploadedFile}
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              {validating ? "Validando..." : "Validar"}
            </Button>
            <Button 
              onClick={handleImportFromFile} 
              disabled={importing || validating || !uploadedFile || !isValidated || errorRows > 0}
              variant="default"
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar"}
            </Button>
          </div>
          {uploadedFile && !importing && !validating && (
            <p className="text-sm text-muted-foreground">
              Archivo seleccionado: {uploadedFile.name}
            </p>
          )}
          
          {importing && (
            <div className="space-y-3 p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progressMessage}</span>
                <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                Por favor espera mientras se completa la importación...
              </p>
            </div>
          )}
        </div>

        {/* Estadísticas de validación */}
        {isValidated && totalRows > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalRows}</p>
              <p className="text-sm text-muted-foreground">Total de filas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{validRows}</p>
              <p className="text-sm text-muted-foreground">Filas válidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{errorRows}</p>
              <p className="text-sm text-muted-foreground">Filas con errores</p>
            </div>
          </div>
        )}

        {/* Mensajes de validación */}
        {validationMessages.length > 0 && (
          <div className="space-y-2">
            {validationMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-md border text-sm font-medium ${
                  msg.type === 'error'
                    ? 'bg-destructive/10 border-destructive text-destructive'
                    : msg.type === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400'
                    : 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400'
                }`}
              >
                {msg.message}
              </div>
            ))}
          </div>
        )}

        {/* Detalle de errores expandible */}
        {allErrors.length > 0 && (
          <Collapsible defaultOpen={allErrors.length <= 20} className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">
                  Detalle de Errores ({allErrors.length} {allErrors.length === 1 ? 'fila' : 'filas'})
                </h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-destructive/20">
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-2">
              <div className="max-h-96 overflow-y-auto border rounded-md bg-background">
                <div className="divide-y">
                  {allErrors.map((error, idx) => (
                    <div key={idx} className="p-3 hover:bg-muted/50">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm font-semibold text-destructive min-w-[60px]">
                          Fila {error.rowNumber}:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground flex-1">
                          {error.errors.map((err, errIdx) => (
                            <li key={errIdx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground px-2">
                Corrige estos errores en tu archivo CSV antes de importar.
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Resultados de la importación */}
        {importResults && (
          <div className="space-y-4 p-6 border-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-500">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                <span className="text-2xl">✓</span>
                Importación Completada
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImportResults(null);
                  setUploadedFile(null);
                  setCSVPreview([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Cerrar
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Procesadas</p>
                <p className="text-3xl font-bold text-foreground">{importResults.totalProcessed}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Exitosas</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{importResults.successfulRows}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Fallidas</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{importResults.failedRows}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Vacías</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{importResults.emptyRows}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Resumen</h4>
              <p className="text-lg font-medium text-foreground">
                Se procesaron exitosamente <span className="text-green-600 dark:text-green-400 font-bold">{importResults.successfulRows}</span> filas 
                de un total de <span className="font-bold">{importResults.totalProcessed}</span> filas detectadas.
              </p>
              {importResults.failedRows > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {importResults.failedRows} filas no pudieron ser importadas debido a errores de validación.
                </p>
              )}
              {importResults.emptyRows > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {importResults.emptyRows} filas vacías fueron ignoradas.
                </p>
              )}
            </div>

            {importResults.errors.length > 0 && importResults.errors.length <= 10 && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">Errores detectados:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                  {importResults.errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Vista previa del CSV */}
        {showPreview && csvPreview.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Vista previa (primeras 10 filas)</Label>
            <div className="border rounded-md overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium">#</th>
                    <th className="p-2 text-left font-medium">Estado</th>
                    {getColumnHeaders().map((header, idx) => (
                      <th key={idx} className="p-2 text-left font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, idx) => (
                    <tr key={idx} className={`border-t ${!row.isValid ? 'bg-destructive/5' : ''}`}>
                      <td className="p-2 text-muted-foreground">{row.rowNumber}</td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-destructive" title={row.errors.join(', ')}>✗</span>
                        )}
                      </td>
                      {row.data.slice(0, getColumnHeaders().length).map((cell, cellIdx) => (
                        <td key={cellIdx} className="p-2 max-w-xs truncate" title={cell}>
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvPreview.some(row => !row.isValid) && (
              <p className="text-xs text-muted-foreground">
                Las filas marcadas con ✗ tienen errores. Pasa el cursor sobre el símbolo para ver detalles.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

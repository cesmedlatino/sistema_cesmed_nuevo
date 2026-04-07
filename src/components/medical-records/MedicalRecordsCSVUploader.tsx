import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MedicalRecordsCSVUploaderProps {
  onUploadComplete: () => void;
}

interface MedicalRecordCSVData {
  patient_id: string;
  patient_code: string;
  hms: string;
  especialidad: string;
  specialist_id: string;
}

export function MedicalRecordsCSVUploader({ onUploadComplete }: MedicalRecordsCSVUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentRecord, setCurrentRecord] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: Array<{ row: number; error: string; data: any }>;
    details: Array<{ patient_code: string; action: string; message: string }>;
  } | null>(null);

  const downloadTemplate = () => {
    const csvContent = `patient_id;patient_code;hms;especialidad;specialist_id
00067808-52d9-473e-afc6-4e5bffa4246c;PAC-001086-VICOZ;HD001092;DERMATOLOGIA;e30762d6-a7df-4e0f-a4a6-588f6f9f8840
000b6c56-74c4-4599-913d-eef1bd9c430c;PAC-007555-GADEA;HO000129;OFTALMOLOGIA;19004448-86bf-4fbd-bd39-653dc37d9119`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_historias_clinicas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Plantilla descargada",
      description: "Se ha descargado la plantilla de historias clínicas",
    });
  };

  const parseCSV = (csvText: string): MedicalRecordCSVData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    const records: MedicalRecordCSVData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push(record as MedicalRecordCSVData);
    }

    return records;
  };

  const validateMedicalRecordData = (record: MedicalRecordCSVData, rowIndex: number): string[] => {
    const errors: string[] = [];

    if (!record.patient_id || record.patient_id.trim() === '') {
      errors.push(`Fila ${rowIndex}: patient_id es obligatorio`);
    }

    if (!record.specialist_id || record.specialist_id.trim() === '') {
      errors.push(`Fila ${rowIndex}: specialist_id es obligatorio`);
    }

    return errors;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const records = parseCSV(csvText);
        
        setTotalRecords(records.length);
        
        const results: {
          success: number;
          errors: Array<{ row: number; error: string; data: any }>;
          details: Array<{ patient_code: string; action: string; message: string }>;
        } = {
          success: 0,
          errors: [],
          details: []
        };

        for (let i = 0; i < records.length; i++) {
          setCurrentRecord(i + 1);
          setUploadProgress(((i + 1) / records.length) * 100);

          const record = records[i];
          const validationErrors = validateMedicalRecordData(record, i + 2);

          if (validationErrors.length > 0) {
            results.errors.push({
              row: i + 2,
              error: validationErrors.join(', '),
              data: record
            });
            continue;
          }

          try {
            // Verificar que el paciente existe
            const { data: patientExists, error: patientError } = await supabase
              .from('patients')
              .select('id, patient_code, first_name, last_name')
              .eq('id', record.patient_id)
              .single();

            if (patientError || !patientExists) {
              results.errors.push({
                row: i + 2,
                error: 'Paciente no encontrado',
                data: record
              });
              continue;
            }

            // Verificar que el especialista existe
            const { data: specialistExists, error: specialistError } = await supabase
              .from('specialists')
              .select('id')
              .eq('id', record.specialist_id)
              .single();

            if (specialistError || !specialistExists) {
              results.errors.push({
                row: i + 2,
                error: 'Especialista no encontrado',
                data: record
              });
              continue;
            }

            // Crear la historia clínica
            const { error: insertError } = await supabase
              .from('medical_records')
              .insert({
                patient_id: record.patient_id,
                specialist_id: record.specialist_id,
                visit_date: new Date().toISOString().split('T')[0],
                especialidad: record.especialidad,
                hms: record.hms,
                status: 'Abierta',
                form_data: {
                  patient_code: record.patient_code
                }
              });

            if (insertError) {
              results.errors.push({
                row: i + 2,
                error: insertError.message,
                data: record
              });
              continue;
            }

            // Actualizar HMS en el paciente si es necesario
            if (record.hms) {
              await supabase
                .from('patients')
                .update({ hms: record.hms })
                .eq('id', record.patient_id);
            }

            results.success++;
            results.details.push({
              patient_code: patientExists.patient_code,
              action: 'Creada',
              message: `Historia creada para ${patientExists.first_name} ${patientExists.last_name}`
            });

          } catch (error: any) {
            results.errors.push({
              row: i + 2,
              error: error.message || 'Error desconocido',
              data: record
            });
          }
        }

        setUploadResults(results);
        
        toast({
          title: "Importación completada",
          description: `${results.success} historias importadas correctamente`,
        });

        onUploadComplete();

      } catch (error: any) {
        console.error('Error processing CSV:', error);
        toast({
          title: "Error al procesar el archivo",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Historias Clínicas desde CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
            <TabsTrigger value="report">Reporte</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Procesando historias...</span>
                    <span>{currentRecord} de {totalRecords}</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {uploadResults && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">
                      {uploadResults.success} historias importadas correctamente
                    </span>
                  </div>
                  {uploadResults.errors.length > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-semibold">
                        {uploadResults.errors.length} errores encontrados
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold">Formato del archivo:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Usar punto y coma (;) como separador</li>
                  <li>Primera fila debe contener los encabezados</li>
                  <li>Campos obligatorios: patient_id, specialist_id</li>
                  <li>El patient_id y specialist_id deben existir en la base de datos</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            {uploadResults ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {uploadResults.success}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Historias Creadas
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-destructive">
                          {uploadResults.errors.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Errores
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {uploadResults.details.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Detalle de Acciones:</h3>
                    <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                      {uploadResults.details.map((detail, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{detail.patient_code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{detail.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-destructive">Errores de Validación:</h3>
                    <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                      {uploadResults.errors.map((error, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-destructive/10 rounded">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">Fila {error.row}:</div>
                            <div className="text-destructive">{error.error}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              patient_code: {error.data.patient_code}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No hay reportes disponibles. Sube un archivo CSV primero.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

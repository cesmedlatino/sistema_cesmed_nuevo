import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CSVUploaderProps {
  onUploadComplete: () => void;
}

interface PatientCSVData {
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  gender?: string;
  blood_type?: string;
  phone?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  chronic_conditions?: string;
  years?: string;
  months?: string;
  days?: string;
  hms?: string;
}

export function CSVUploader({ onUploadComplete }: CSVUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [useSemicolon, setUseSemicolon] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [skipDniValidation, setSkipDniValidation] = useState(false);
  const [skipNameValidation, setSkipNameValidation] = useState(false);
  const [skipAllErrors, setSkipAllErrors] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentRecord, setCurrentRecord] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    replaced: number;
    errors: Array<{ row: number; error: string; data: any }>;
    details: Array<{ name: string; action: string; message: string }>;
  } | null>(null);

  const generatePatientCode = () => {
    return `PAC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  };

  const generateDNI = () => {
    const randomNumbers = Math.floor(10000000 + Math.random() * 90000000);
    return `DNI${randomNumbers}`;
  };

  const calculateAgeDetails = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const totalMonths = years * 12 + months;
    const totalDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    
    return { age: years, months: totalMonths, days: totalDays };
  };

  const downloadTemplate = () => {
    const separator = useSemicolon ? ';' : ',';
    const csvContent = `first_name${separator}last_name${separator}dni${separator}birth_date${separator}gender${separator}blood_type${separator}phone${separator}email${separator}emergency_contact_name${separator}emergency_contact_phone${separator}address${separator}chronic_conditions${separator}age${separator}months${separator}days${separator}hms
Juan${separator}Pérez${separator}12345678${separator}1990-01-15${separator}Masculino${separator}O+${separator}987654321${separator}juan.perez@email.com${separator}María Pérez${separator}987123456${separator}Av. Principal 123${separator}Diabetes${separator}${separator}${separator}${separator}HC-2023-001`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_pacientes_${useSemicolon ? 'semicolon' : 'comma'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Plantilla Descargada",
      description: `La plantilla CSV se ha descargado correctamente (separador: ${useSemicolon ? 'punto y coma' : 'coma'}).`,
    });
  };

  const parseCSV = (csvText: string): PatientCSVData[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const separator = useSemicolon ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
      const patient: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        patient[header] = value === '' ? null : value;
      });
      
      return patient;
    });
  };

  const validatePatientData = (patient: PatientCSVData, rowIndex: number): string | null => {
    // Campos requeridos
    if (!patient.first_name || patient.first_name.trim() === '') {
      return `Fila ${rowIndex + 2}: El nombre (first_name) es obligatorio`;
    }
    
    if (!patient.last_name || patient.last_name.trim() === '') {
      return `Fila ${rowIndex + 2}: El apellido (last_name) es obligatorio`;
    }

    // Validar género solo si se proporciona
    if (patient.gender && patient.gender.trim() !== '' && !['Masculino', 'Femenino'].includes(patient.gender)) {
      return `Fila ${rowIndex + 2}: El género debe ser 'Masculino' o 'Femenino'`;
    }

    // Validar formato de fecha si se proporciona
    if (patient.birth_date && patient.birth_date.trim() !== '') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(patient.birth_date)) {
        return `Fila ${rowIndex + 2}: La fecha de nacimiento debe tener formato YYYY-MM-DD`;
      }
    }

    // Validar email si se proporciona
    if (patient.email && patient.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patient.email)) {
        return `Fila ${rowIndex + 2}: El email no tiene un formato válido`;
      }
    }

    // Validar campos numéricos si se proporcionan
    if (patient.years && patient.years.trim() !== '') {
      const years = parseInt(patient.years);
      if (isNaN(years) || years < 0 || years > 150) {
        return `Fila ${rowIndex + 2}: Los años deben ser un número válido entre 0 y 150`;
      }
    }

    if (patient.months && patient.months.trim() !== '') {
      const months = parseInt(patient.months);
      if (isNaN(months) || months < 0) {
        return `Fila ${rowIndex + 2}: Los meses deben ser un número válido mayor o igual a 0`;
      }
    }

    if (patient.days && patient.days.trim() !== '') {
      const days = parseInt(patient.days);
      if (isNaN(days) || days < 0) {
        return `Fila ${rowIndex + 2}: Los días deben ser un número válido mayor o igual a 0`;
      }
    }

    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV válido.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResults(null);
    setUploadProgress(0);
    setCurrentRecord(0);

    try {
      const reader = new FileReader();
      const csvText = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Error al leer el archivo'));
          }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file, 'UTF-8');
      });
      
      const patientsData = parseCSV(csvText);
      
      if (patientsData.length === 0) {
        throw new Error("El archivo CSV está vacío o no tiene el formato correcto");
      }

      setTotalRecords(patientsData.length);

      // Validar datos
      const validationErrors: Array<{ row: number; error: string; data: any }> = [];
      const validPatients: PatientCSVData[] = [];

      patientsData.forEach((patient, index) => {
        const error = validatePatientData(patient, index);
        if (error) {
          validationErrors.push({ row: index + 2, error, data: patient });
        } else {
          validPatients.push(patient);
        }
      });

      // Si no se omiten todos los errores y hay errores de validación sin pacientes válidos
      if (!skipAllErrors && validationErrors.length > 0 && validPatients.length === 0) {
        setUploadResults({ success: 0, replaced: 0, errors: validationErrors, details: [] });
        return;
      }

      // Obtener usuario actual
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // Insertar o reemplazar pacientes válidos
      let successCount = 0;
      let replacedCount = 0;
      const insertErrors: Array<{ row: number; error: string; data: any }> = [];
      const details: Array<{ name: string; action: string; message: string }> = [];

      for (let i = 0; i < validPatients.length; i++) {
        const patient = validPatients[i];
        try {
          setCurrentRecord(i + 1);
          setUploadProgress(Math.round(((i + 1) / validPatients.length) * 100));

          // Calcular edad y campos relacionados si existe birth_date
          let ageData = null;
          if (patient.birth_date && patient.birth_date.trim() !== '') {
            ageData = calculateAgeDetails(patient.birth_date);
          }

          // Procesar chronic_conditions
          let chronicConditionsArray: string[] = [];
          if (patient.chronic_conditions && patient.chronic_conditions.trim() !== '') {
            chronicConditionsArray = patient.chronic_conditions.split(',').map(c => c.trim()).filter(c => c !== '');
          }

          // Generar DNI si está vacío o si se omite validación de duplicados
          let patientDNI = (patient.dni && patient.dni.trim() !== '') ? patient.dni : generateDNI();
          
          // Si se omite la validación de DNI, verificar si ya existe y generar uno único
          if (skipDniValidation && patient.dni && patient.dni.trim() !== '') {
            const { data: existingByDni } = await supabase
              .from('patients')
              .select('dni')
              .eq('dni', patientDNI)
              .maybeSingle();
            
            if (existingByDni) {
              // Generar un DNI único añadiendo timestamp
              patientDNI = `${patientDNI}-${Date.now()}`;
            }
          }

          const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase().trim();

          // Buscar paciente existente por nombre completo (solo si no se omite la validación de nombres)
          let existingPatient = null;
          if (!skipNameValidation) {
            const { data: existingPatients } = await supabase
              .from('patients')
              .select('id, first_name, last_name')
              .ilike('first_name', patient.first_name)
              .ilike('last_name', patient.last_name);

            existingPatient = existingPatients?.find(p => 
              `${p.first_name} ${p.last_name}`.toLowerCase().trim() === fullName
            );
          }

          const patientData = {
            first_name: patient.first_name,
            last_name: patient.last_name,
            dni: patientDNI,
            years: ageData ? ageData.years : (patient.years && patient.years.trim() !== '' ? parseInt(patient.years) : null),
            months: ageData ? ageData.months : (patient.months && patient.months.trim() !== '' ? parseInt(patient.months) : null),
            days: ageData ? ageData.days : (patient.days && patient.days.trim() !== '' ? parseInt(patient.days) : null),
            hms: (patient.hms && patient.hms.trim() !== '') ? patient.hms : null,
            gender: (patient.gender && patient.gender.trim() !== '') ? patient.gender : null,
            birth_date: (patient.birth_date && patient.birth_date.trim() !== '') ? patient.birth_date : null,
            phone: (patient.phone && patient.phone.trim() !== '') ? patient.phone : null,
            email: (patient.email && patient.email.trim() !== '') ? patient.email : null,
            address: (patient.address && patient.address.trim() !== '') ? patient.address : null,
            blood_type: (patient.blood_type && patient.blood_type.trim() !== '') ? patient.blood_type : null,
            emergency_contact_name: (patient.emergency_contact_name && patient.emergency_contact_name.trim() !== '') ? patient.emergency_contact_name : null,
            emergency_contact_phone: (patient.emergency_contact_phone && patient.emergency_contact_phone.trim() !== '') ? patient.emergency_contact_phone : null,
            allergies: [],
            chronic_conditions: chronicConditionsArray,
            updated_by: userId
          };

          if (existingPatient && replaceExisting) {
            // Actualizar paciente existente
            const { error } = await supabase
              .from('patients')
              .update(patientData)
              .eq('id', existingPatient.id);

            if (error) {
              insertErrors.push({ 
                row: i + 2, 
                error: error.message, 
                data: patient 
              });
              details.push({
                name: fullName,
                action: 'Error al reemplazar',
                message: error.message
              });
            } else {
              replacedCount++;
              details.push({
                name: fullName,
                action: 'Reemplazado',
                message: 'Paciente actualizado exitosamente'
              });
            }
          } else if (existingPatient && !replaceExisting) {
            // Paciente existe pero no se permite reemplazar
            insertErrors.push({ 
              row: i + 2, 
              error: `Paciente "${fullName}" ya existe. Active "Reemplazar existentes" para actualizar.`, 
              data: patient 
            });
            details.push({
              name: fullName,
              action: 'Omitido',
              message: 'Paciente ya existe'
            });
          } else {
            // Insertar nuevo paciente
            const { error } = await supabase
              .from('patients')
              .insert({
                patient_code: generatePatientCode(),
                ...patientData,
                created_by: userId
              });

            if (error) {
              // Si se omiten todos los errores, continuar con el siguiente
              if (!skipAllErrors) {
                insertErrors.push({ 
                  row: i + 2, 
                  error: error.message.includes('duplicate') ? 'DNI duplicado' : error.message, 
                  data: patient 
                });
                details.push({
                  name: fullName,
                  action: 'Error al crear',
                  message: error.message
                });
              }
            } else {
              successCount++;
              details.push({
                name: fullName,
                action: 'Creado',
                message: 'Paciente creado exitosamente'
              });
            }
          }
        } catch (error: any) {
          // Si se omiten todos los errores, continuar con el siguiente
          if (!skipAllErrors) {
            insertErrors.push({ 
              row: i + 2, 
              error: error.message, 
              data: patient 
            });
            details.push({
              name: `${patient.first_name} ${patient.last_name}`,
              action: 'Error',
              message: error.message
            });
          }
        }
      }

      // Combinar errores de validación e inserción (solo si no se omiten todos los errores)
      const allErrors = skipAllErrors ? [] : [...validationErrors, ...insertErrors];
      const skippedCount = skipAllErrors ? (validationErrors.length + insertErrors.length) : 0;

      setUploadResults({
        success: successCount,
        replaced: replacedCount,
        errors: allErrors,
        details
      });

      if (successCount > 0 || replacedCount > 0) {
        toast({
          title: "Carga Completada",
          description: `${successCount} creados, ${replacedCount} reemplazados${skipAllErrors && skippedCount > 0 ? `, ${skippedCount} omitidos` : ''}.`,
        });
        onUploadComplete();
      }

      if (!skipAllErrors && (insertErrors.length > 0 || validationErrors.length > 0)) {
        toast({
          title: "Proceso Completado con Errores",
          description: `${insertErrors.length + validationErrors.length} registros con errores.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error processing CSV:', error);
      toast({
        title: "Error",
        description: `Error al procesar el archivo: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carga Masiva de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
            <TabsTrigger value="report" disabled={!uploadResults}>
              <FileText className="h-4 w-4 mr-2" />
              Reporte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="separator"
                      checked={useSemicolon}
                      onCheckedChange={setUseSemicolon}
                      disabled={isUploading}
                    />
                    <Label htmlFor="separator" className="cursor-pointer">
                      Separador: {useSemicolon ? 'Punto y coma (;)' : 'Coma (,)'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="replace"
                      checked={replaceExisting}
                      onCheckedChange={setReplaceExisting}
                      disabled={isUploading}
                    />
                    <Label htmlFor="replace" className="cursor-pointer">
                      Reemplazar existentes
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="skip-dni"
                      checked={skipDniValidation}
                      onCheckedChange={setSkipDniValidation}
                      disabled={isUploading}
                    />
                    <Label htmlFor="skip-dni" className="cursor-pointer">
                      Omitir validación de DNI
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="skip-name"
                      checked={skipNameValidation}
                      onCheckedChange={setSkipNameValidation}
                      disabled={isUploading}
                    />
                    <Label htmlFor="skip-name" className="cursor-pointer">
                      Omitir validación de nombres duplicados
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="skip-errors"
                      checked={skipAllErrors}
                      onCheckedChange={setSkipAllErrors}
                      disabled={isUploading}
                    />
                    <Label htmlFor="skip-errors" className="cursor-pointer">
                      Omitir todos los errores
                    </Label>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                disabled={isUploading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla CSV ({useSemicolon ? 'punto y coma' : 'coma'})
              </Button>

              <div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Selecciona un archivo CSV con los datos de los pacientes
                </p>
              </div>

              {isUploading && (
                <div className="space-y-3 py-4">
                  <div className="text-center">
                    <div className="text-sm font-medium mb-2">
                      Procesando archivo... {currentRecord} de {totalRecords} registros
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                    <div className="text-xs text-muted-foreground mt-2">
                      {uploadProgress}% completado
                    </div>
                  </div>
                </div>
              )}

              {uploadResults && (
                <div className="space-y-3">
                  {(uploadResults.success > 0 || uploadResults.replaced > 0) && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-300">
                        {uploadResults.success} creados, {uploadResults.replaced} reemplazados
                      </span>
                    </div>
                  )}

                  {uploadResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-300">
                          {uploadResults.errors.length} errores encontrados
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Campos obligatorios:</strong> first_name, last_name, gender</p>
                <p><strong>DNI:</strong> Opcional. Si está vacío, se generará automáticamente con formato DNI-########</p>
                <p><strong>patient_code:</strong> Se genera automáticamente, no incluir en la plantilla</p>
                <p><strong>Formato de fecha:</strong> YYYY-MM-DD (ej: 1990-01-15)</p>
                <p><strong>Género:</strong> Masculino o Femenino</p>
                <p><strong>Reemplazar existentes:</strong> Busca por nombre completo y actualiza si existe</p>
                <p><strong>Nota:</strong> Si se proporciona birth_date, los campos age, months y days se calcularán automáticamente</p>
                <p><strong>HMS:</strong> Campo de texto opcional para código de historia clínica de referencia</p>
                <p><strong>chronic_conditions:</strong> Separar múltiples condiciones con comas</p>
                <p><strong>Campos opcionales:</strong> dni, birth_date, blood_type, phone, email, emergency_contact_name, emergency_contact_phone, address, chronic_conditions, age, months, days, hms</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            {uploadResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {uploadResults.success}
                        </div>
                        <div className="text-sm text-muted-foreground">Creados</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {uploadResults.replaced}
                        </div>
                        <div className="text-sm text-muted-foreground">Reemplazados</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {uploadResults.errors.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Errores</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detalle del Proceso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {uploadResults.details.map((detail, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            detail.action === 'Creado'
                              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                              : detail.action === 'Reemplazado'
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                              : detail.action === 'Omitido'
                              ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{detail.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {detail.message}
                              </div>
                            </div>
                            <div
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                detail.action === 'Creado'
                                  ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : detail.action === 'Reemplazado'
                                  ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : detail.action === 'Omitido'
                                  ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                  : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {detail.action}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {uploadResults.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Errores de Validación
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {uploadResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="text-sm p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded"
                          >
                            <div className="font-medium text-red-700 dark:text-red-300">
                              Fila {error.row}:
                            </div>
                            <div className="text-red-600 dark:text-red-400">{error.error}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
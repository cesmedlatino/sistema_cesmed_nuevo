import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Calendar,
  X,
  BookOpen,
  Save,
  CheckCircle2,
  Printer,
  Download
} from 'lucide-react';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
import { PinturaImageEditor } from './PinturaImageEditor';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MedicalHistoryCalendarSidebar } from './MedicalHistoryCalendarSidebar';
import { NewFolioDialog } from './NewFolioDialog';
import { AppointmentDetailsSidebar, AppointmentData } from './AppointmentDetailsSidebar';
import { DiseaseSearchField } from './DiseaseSearchField';
import { detectSpecializedTable, groupFieldsByEye } from '../medical-record-designer/specialized-tables/OphthalmologyTableDetector';
import { GenericOphthalmologyTable } from '../medical-record-designer/specialized-tables/GenericOphthalmologyTable'; 
import { VisualAcuityTable } from '../medical-record-designer/specialized-tables/VisualAcuityTable';
import { RefractionInputTable } from '../medical-record-designer/specialized-tables/RefractionInputTable';
import { MedicalMeasurementInput, detectMeasurementType } from '../medical-record-designer/MedicalMeasurementInput';
import { Table2, Scan, Activity } from 'lucide-react';

// Helper to parse date strings as local dates (avoids UTC timezone shift)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};
// Medical tables (imported as needed)

interface PatientMedicalHistoryProps {
  patientId: string;
  patientName: string;
  appointmentData?: AppointmentData | null;
  onClose: () => void;
}

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
}

interface MedicalRecord {
  id: string;
  hms: string;
  visit_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  form_data: any;
  especialidad: string;
  template_id: string | null;
  appointment_id: string | null;
  medical_record_templates: {
    id: string;
    name: string;
    title: string;
    header_config: any;
    body_config: any[];
    footer_config: any;
    logo_url: string;
  };
}

export function PatientMedicalHistory({ patientId, patientName, appointmentData, onClose }: PatientMedicalHistoryProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingImageField, setEditingImageField] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showNewFolioDialog, setShowNewFolioDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; hms: string } | null>(null);
  const [currentRecordAppointment, setCurrentRecordAppointment] = useState<AppointmentData | null>(null);
  const printContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const patient: Patient = {
    id: patientId,
    patient_code: '',
    first_name: patientName.split(' ')[0],
    last_name: patientName.split(' ').slice(1).join(' '),
    dni: ''
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      setPatientData(data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  /**
   * Construye valores iniciales para la historia actual.
   * - Prefiere los valores existentes en form_data (si ya hay algo guardado)
   * - Si faltan datos en la sección de Filiación, los completa usando la info básica del paciente.
   */
  const buildFiliacionDefaults = (record: MedicalRecord): Record<string, any> => {
    const defaults: Record<string, any> = {};
    const templateBody = record.medical_record_templates?.body_config || [];
    const firstName = patient.first_name;
    const lastName = patient.last_name;
    const visitDate = record.visit_date;

    // Calcular edad si tenemos los datos del paciente
    let edadDisplay = "";
    if (patientData) {
      // Preferir siempre los campos de edad ya calculados (años, meses, días)
      if (
        typeof patientData.years === "number" ||
        typeof patientData.months === "number" ||
        typeof patientData.days === "number"
      ) {
        const parts: string[] = [];
        if (typeof patientData.years === "number") {
          parts.push(`${patientData.years} años`);
        }
        if (typeof patientData.months === "number" && patientData.months > 0) {
          parts.push(`${patientData.months} meses`);
        }
        if (typeof patientData.days === "number" && patientData.days > 0) {
          parts.push(`${patientData.days} días`);
        }
        edadDisplay = parts.join(" ");
      } else if (patientData.birth_date) {
        // Como respaldo, calcular edad solo en años a partir de la fecha de nacimiento
        const birthDate = new Date(patientData.birth_date);
        const today = new Date();
        let ageYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          ageYears--;
        }
        edadDisplay = `${ageYears} años`;
      }
    }

    templateBody.forEach((section: any) => {
      const title = (section?.title || '').toLowerCase();
      if (
        title.includes('filiacion') ||
        title.includes('filiación') ||
        title.includes('datos del paciente') ||
        title.includes('identificación') ||
        title.includes('identificacion')
      ) {
        section.fields?.forEach((field: any) => {
          const fieldName = (field?.name || '').toLowerCase();

          if (field.type === 'date' && fieldName.includes('fecha')) {
            defaults[field.id] = visitDate;
          } else if (fieldName.includes('nombre') && !fieldName.includes('apellido')) {
            defaults[field.id] = firstName;
          } else if (fieldName.includes('apellido')) {
            defaults[field.id] = lastName;
          } else if (fieldName.includes('edad') && edadDisplay) {
            defaults[field.id] = edadDisplay;
          } else if (fieldName.includes('domicilio') && patientData?.address) {
            defaults[field.id] = patientData.address;
          } else if ((fieldName.includes('celular') || fieldName.includes('celullar')) && patientData?.phone) {
            defaults[field.id] = patientData.phone;
          }
        });
      }
    });

    return defaults;
  };

  const getInitialFormDataForRecord = (record: MedicalRecord | undefined | null) => {
    if (!record) return {};
    const existing = record.form_data || {};
    // Siempre construimos defaults de filiación y luego dejamos que los valores existentes ganen.
    const filiacionDefaults = buildFiliacionDefaults(record);
    return { ...filiacionDefaults, ...existing };
  };

  useEffect(() => {
    fetchMedicalRecords();
  }, [patientId]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id,
          hms,
          visit_date,
          status,
          created_at,
          updated_at,
          form_data,
          especialidad,
          template_id,
          appointment_id,
          medical_record_templates (
            id,
            name,
            title,
            header_config,
            body_config,
            footer_config,
            logo_url
          )
        `)
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });

      if (error) throw error;

      console.log('Medical records loaded:', data);
      const loadedRecords = (data || []) as MedicalRecord[];
      setRecords(loadedRecords);
      if (loadedRecords.length > 0) {
        console.log('Loading form_data:', loadedRecords[0].form_data);
        setFormData(loadedRecords[0].form_data || {});
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las historias clínicas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const record = records[currentIndex];
    if (record) {
      const initialData = getInitialFormDataForRecord(record);
      console.log('Switching to record:', currentIndex, 'form_data:', record.form_data, 'with defaults:', initialData);
      setFormData(initialData);
    }
  }, [currentIndex, records]);

  // Cuando se cargan los datos completos del paciente por primera vez,
  // recomponemos los campos de Filiación (incluida la Edad) sin sobrescribir
  // lo que el usuario ya haya editado manualmente.
  useEffect(() => {
    if (!patientData || records.length === 0) return;
    const record = records[currentIndex];
    if (!record) return;

    const defaults = buildFiliacionDefaults(record);
    setFormData(prev => ({ ...defaults, ...prev }));
  }, [patientData, records, currentIndex]);

  // Fetch appointment details for the current record
  useEffect(() => {
    const record = records[currentIndex];
    if (!record) {
      setCurrentRecordAppointment(null);
      return;
    }

    // If current index is 0 and we have appointmentData from props, use it
    if (currentIndex === 0 && appointmentData) {
      setCurrentRecordAppointment(appointmentData);
      return;
    }

    // Otherwise, fetch appointment from record's appointment_id
    if (record.appointment_id) {
      fetchAppointmentDetails(record.appointment_id);
    } else {
      setCurrentRecordAppointment(null);
    }
  }, [currentIndex, records, appointmentData]);

  const fetchAppointmentDetails = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          notes,
          status,
          consulting_rooms:consulting_room_id (
            id,
            name,
            floor
          ),
          specialists:specialist_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('id', appointmentId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentRecordAppointment({
          id: data.id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          reason: data.reason || undefined,
          notes: data.notes || undefined,
          status: data.status || undefined,
          consulting_room: data.consulting_rooms ? {
            id: (data.consulting_rooms as any).id,
            name: (data.consulting_rooms as any).name,
            floor: (data.consulting_rooms as any).floor,
          } : undefined,
          specialist: data.specialists ? {
            id: (data.specialists as any).id,
            first_name: (data.specialists as any).first_name,
            last_name: (data.specialists as any).last_name,
          } : undefined,
        });
      } else {
        setCurrentRecordAppointment(null);
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      setCurrentRecordAppointment(null);
    }
  };

  const currentRecord = records[currentIndex];

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    if (!currentRecord) return;
    setShowRegisterDialog(true);
  };

  const handleConfirmSave = async (registerAttention: boolean) => {
    if (!currentRecord) return;
    setShowRegisterDialog(false);

    try {
      setSaving(true);
      
      const updateData: any = { form_data: formData };
      
      // Si se desea registrar la atención, marcar el campo correspondiente
      if (registerAttention) {
        updateData.atencion_registrada = true;
        updateData.fecha_atencion_registrada = new Date().toISOString();
      }

      const { error } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', currentRecord.id);

      if (error) throw error;

      toast({
        title: registerAttention ? 'Atención Registrada' : 'Guardado exitoso',
        description: registerAttention 
          ? `La atención ha sido registrada para la historia ${currentRecord.hms}`
          : 'Los cambios se han guardado correctamente',
      });

      // Actualizar el record local
      setRecords(prev => prev.map(r => 
        r.id === currentRecord.id 
          ? { ...r, form_data: formData, atencion_registrada: registerAttention }
          : r
      ));
    } catch (error) {
      console.error('Error saving medical record:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNewFolioCreated = async () => {
    // Refresh the records list
    await fetchMedicalRecords();
    // Set to the first (most recent) record
    setCurrentIndex(0);
  };

  const handleDeleteRecord = (recordId: string, hms: string) => {
    setRecordToDelete({ id: recordId, hms });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      toast({
        title: 'Folio eliminado',
        description: `El folio ${recordToDelete.hms} ha sido eliminado correctamente`,
      });

      // Refresh records and adjust index
      await fetchMedicalRecords();
      if (currentIndex >= records.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el folio',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentRecord) return;
    if (!printContentRef.current) return;

    setGeneratingPdf(true);
    try {
      toast({
        title: "Generando PDF...",
        description: "Por favor espere mientras se procesa el documento.",
      });

      // Use html2canvas to capture the exact visual rendering (WYSIWYG)
      const element = printContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Historia_${currentRecord.hms}_${patientName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF generado',
        description: `Se ha descargado ${fileName}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo generar el PDF',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    console.log('Rendering field:', field.id, field.name, 'value:', value, 'formData:', formData);
    
    // Check if this field should use a specialized measurement input
    const measurementType = detectMeasurementType(field.name);
    if (measurementType && (field.type === 'text_short' || field.type === 'text_medium')) {
      return (
        <MedicalMeasurementInput
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          measurementType={measurementType}
          placeholder={field.name}
          size="sm"
        />
      );
    }

    // Check if this is a disease/diagnosis field that should use CIE-10 search
    const fieldNameLower = (field.name || '').toLowerCase();
    const fieldIdLower = (field.id || '').toLowerCase();
    const isDiseaseField = 
      fieldNameLower.includes('enfermedad') || 
      fieldNameLower.includes('diagnóstico') || 
      fieldNameLower.includes('diagnostico') ||
      fieldNameLower.includes('cie-10') ||
      fieldNameLower.includes('cie10') ||
      fieldIdLower.includes('enfermedad') ||
      fieldIdLower.includes('diagnostico');

    // Use disease search for disease-related text fields
    if (isDiseaseField && (field.type === 'text_short' || field.type === 'text_medium' || field.type === 'text_long')) {
      return (
        <DiseaseSearchField
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          placeholder={`Buscar ${field.name.toLowerCase()} (CIE-10)...`}
          multiple={false}
          className="w-full"
        />
      );
    }

    switch (field.type) {
      case 'text_short':
      case 'text_medium':
      case 'text_long':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            className="bg-background w-full"
          />
        );

      case 'text_multiline':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            rows={4}
            className="bg-background w-full resize-none"
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="bg-background w-full">
              <SelectValue placeholder="Seleccione una opción" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'yes_no':
        return (
          <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.id, val)} className="w-full">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Sí" id={`${field.id}-yes`} />
              <Label htmlFor={`${field.id}-yes`}>Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id={`${field.id}-no`} />
              <Label htmlFor={`${field.id}-no`}>No</Label>
            </div>
          </RadioGroup>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal bg-background w-full",
                  !value && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "dd/MM/yyyy") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFieldChange(field.id, date?.toISOString().split('T')[0])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'image_drawing':
        const isEditing = editingImageField === field.id;
        const hasImage = value && typeof value === 'string';
        
        if (isEditing && field.base_image_url) {
          return (
            <div className="w-full">
              <PinturaImageEditor
                imageUrl={field.base_image_url}
                onSave={(blob) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    handleFieldChange(field.id, reader.result as string);
                    setEditingImageField(null);
                  };
                  reader.readAsDataURL(blob);
                }}
                className="border rounded-lg"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingImageField(null)}
                className="mt-2"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {hasImage ? (
              <div className="relative">
                <img 
                  src={value} 
                  alt={field.name} 
                  className="max-w-full max-h-64 object-contain border rounded"
                />
                {field.base_image_url && (
                  <Button
                    size="sm"
                    onClick={() => setEditingImageField(field.id)}
                    className="mt-2"
                  >
                    Editar Anotaciones
                  </Button>
                )}
              </div>
            ) : field.base_image_url ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingImageField(field.id)}
              >
                Anotar Imagen
              </Button>
            ) : (
              <span className="text-muted-foreground text-sm">Sin imagen base configurada</span>
            )}
          </div>
        );
      
      case 'disease':
      case 'disease_search':
        return (
          <DiseaseSearchField
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            placeholder="Buscar enfermedad (CIE-10)..."
            multiple={field.multiple || false}
          />
        );
      
      default:
        // Check if field name contains disease-related keywords
        const fieldNameLower = (field.name || '').toLowerCase();
        const isDiseaseField = 
          fieldNameLower.includes('enfermedad') || 
          fieldNameLower.includes('diagnóstico') || 
          fieldNameLower.includes('diagnostico') ||
          fieldNameLower.includes('patología') ||
          fieldNameLower.includes('patologia') ||
          fieldNameLower.includes('cie-10') ||
          fieldNameLower.includes('cie10');
        
        if (isDiseaseField) {
          return (
            <DiseaseSearchField
              value={value}
              onChange={(val) => handleFieldChange(field.id, val)}
              placeholder="Buscar enfermedad (CIE-10)..."
              multiple={field.multiple || false}
            />
          );
        }
        
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            className="bg-background w-full"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-[90vw] h-[90vh]">
          <CardContent className="flex items-center justify-center h-full">
            <div className="animate-pulse">Cargando historia clínica...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-[90vw] max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historia Clínica - {patientName}</CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin Historia Clínica</h3>
            <p className="text-muted-foreground mb-4">
              Este paciente aún no tiene registros en su historia clínica.
            </p>
            <Button onClick={() => setShowNewFolioDialog(true)}>
              Crear Nuevo Folio
            </Button>
          </CardContent>
        </Card>
        <NewFolioDialog
          open={showNewFolioDialog}
          onClose={() => setShowNewFolioDialog(false)}
          patientId={patientId}
          patientData={patientData}
          currentTemplateId={null} // No existing record, allow template selection
          appointmentData={appointmentData ? {
            id: appointmentData.id,
            appointment_date: appointmentData.appointment_date,
            appointment_time: appointmentData.appointment_time,
            reason: appointmentData.reason,
            notes: appointmentData.notes,
            consulting_room: appointmentData.consulting_room,
            specialist: appointmentData.specialist,
          } : null}
          onFolioCreated={handleNewFolioCreated}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 medical-history-print-container print:static print:inset-auto print:bg-white print:backdrop-blur-none print:p-0 print:block print:z-auto">
      <Card className="w-[95vw] h-[95vh] flex flex-col shadow-2xl print:shadow-none print:border-none print:w-full print:h-auto print:block">
        <CardHeader className="border-b shrink-0 bg-gradient-to-r from-primary/5 to-primary/10 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Historia Clínica
                  <Badge variant="outline" className="font-mono">{currentRecord?.hms}</Badge>
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  {patientName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={generatingPdf}
              >
                <Download className="h-4 w-4 mr-2" />
                {generatingPdf ? 'Generando...' : 'Descargar PDF'}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden flex print:overflow-visible print:block">
          {/* Sidebar con Calendario de Historias */}
          <MedicalHistoryCalendarSidebar
            records={records}
            currentIndex={currentIndex}
            onSelectRecord={setCurrentIndex}
            onCreateNewFolio={() => setShowNewFolioDialog(true)}
            onDeleteRecord={handleDeleteRecord}
            patientName={patientName}
          />
          {/* Área de contenido con efecto de hoja */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-muted/20 to-background p-8 print:p-0 print:bg-white print:overflow-visible">
            {currentRecord && (
              <div className="max-w-4xl mx-auto print:max-w-full print:mx-0">
                {/* Hoja de Historia con efecto de papel */}
                <div 
                  ref={printContentRef}
                  className="bg-white shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none"
                  style={{
                    boxShadow: '0 20px 60px -20px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
                  }}
                >
                  {/* Encabezado de la Hoja */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b-4 border-primary/20 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {currentRecord.medical_record_templates?.logo_url && (
                          <div className="w-16 h-16 bg-white border-2 border-primary/20 rounded flex items-center justify-center overflow-hidden shadow-sm">
                            <img 
                              src={currentRecord.medical_record_templates.logo_url} 
                              alt="Logo" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-bold text-primary">
                            {currentRecord.medical_record_templates?.title || 'HISTORIA CLÍNICA'}
                          </h2>
                          <p className="text-sm text-muted-foreground font-medium">
                            {currentRecord.medical_record_templates?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">HMS</div>
                        <div className="font-mono text-lg font-bold text-primary">
                          {currentRecord.hms}
                        </div>
                        <Badge variant={
                          currentRecord.status === 'Completada' ? 'default' :
                          currentRecord.status === 'En Progreso' ? 'secondary' : 'outline'
                        } className="mt-1">
                          {currentRecord.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-white/50 rounded p-3">
                      <div>
                        <span className="font-semibold text-muted-foreground">Paciente:</span>
                        <span className="ml-2 font-medium">{patientName}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Especialidad:</span>
                        <span className="ml-2 font-medium">{currentRecord.especialidad}</span>
                      </div>
                    </div>
                  </div>

                  {/* Separador de Fecha de Atención */}
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-y border-primary/20 py-3 px-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-primary/20">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {format(parseLocalDate(currentRecord.visit_date), 'EEEE, dd MMMM yyyy', { locale: es })}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                    </div>
                  </div>

                  {/* Contenido de la Hoja */}
                  <div className="p-8 space-y-8">
                    {currentRecord.medical_record_templates?.body_config?.map((section: any, sectionIndex: number) => {
                      // Mostrar filiación solo en la primera hoja
                      if (sectionIndex === 0 && currentIndex > 0) return null;
                      
                      // Detectar si es una sección con tabla especializada OD/OI
                      const tableType = detectSpecializedTable(section);
                      const hasODOI = groupFieldsByEye(section).some(g => g.odFieldId && g.oiFieldId);
                      
                      // Si es una sección con campos OD/OI, usar tabla especializada
                      if (tableType || hasODOI) {
                        return (
                          <div key={section.id} className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b-2 border-primary/20">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-bold text-primary">{section.roman_numeral}</span>
                              </div>
                              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                {section.title}
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                  Tabla OD/OI
                                </span>
                              </h3>
                            </div>
                            <div className="pl-2">
                              {tableType === 'visual_acuity' ? (
                                <VisualAcuityTable
                                  section={section}
                                  formData={formData}
                                  onFieldChange={handleFieldChange}
                                />
                              ) : tableType === 'refraction' ? (
                                <RefractionInputTable
                                  section={section}
                                  formData={formData}
                                  onFieldChange={handleFieldChange}
                                />
                              ) : (
                                <GenericOphthalmologyTable
                                  section={section}
                                  formData={formData}
                                  onFieldChange={handleFieldChange}
                                  colorScheme={
                                    tableType === 'keratometry' ? 'orange' :
                                    tableType === 'iop' ? 'green' :
                                    tableType === 'cct' ? 'teal' :
                                    tableType === 'biomicroscopic' ? 'purple' :
                                    'blue'
                                  }
                                  icon={
                                    tableType === 'iop' ? <Activity className="h-5 w-5" /> :
                                    tableType === 'biomicroscopic' ? <Scan className="h-5 w-5" /> :
                                    <Table2 className="h-5 w-5" />
                                  }
                                  hideTitle
                                />
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={section.id} className="space-y-4">
                          <div className="flex items-center gap-3 pb-3 border-b-2 border-primary/20">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{section.roman_numeral}</span>
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {section.title}
                            </h3>
                          </div>
                          <div className="space-y-4 pl-2">
                            {(() => {
                              const fields = section.fields || [];
                              const rows: any[][] = [];
                              let currentRow: any[] = [];
                              let currentRowWidth = 0;
                              const containerWidth = 700; // Ajustado para mejor responsive

                              fields.forEach((field: any) => {
                                const fieldWidth = field.width || 200;
                                const isResponsive = field.responsive !== false;

                                if (!isResponsive) {
                                  if (currentRow.length > 0) {
                                    rows.push([...currentRow]);
                                    currentRow = [];
                                    currentRowWidth = 0;
                                  }
                                  rows.push([field]);
                                } else {
                                  if (currentRowWidth + fieldWidth > containerWidth && currentRow.length > 0) {
                                    rows.push([...currentRow]);
                                    currentRow = [field];
                                    currentRowWidth = fieldWidth;
                                  } else {
                                    currentRow.push(field);
                                    currentRowWidth += fieldWidth;
                                  }
                                }
                              });

                              if (currentRow.length > 0) {
                                rows.push(currentRow);
                              }

                              return rows.map((row, rowIndex) => (
                                <div 
                                  key={rowIndex} 
                                  className="flex flex-wrap gap-4 w-full"
                                >
                                  {row.map((field: any) => {
                                    const isFullWidth = field.responsive === false;
                                    const minWidth = field.width ? `${Math.min(field.width, 300)}px` : '200px';

                                    return (
                                      <div 
                                        key={field.id}
                                        className={cn(
                                          "space-y-2 flex-shrink-0",
                                          isFullWidth ? "w-full" : "flex-1"
                                        )}
                                        style={{
                                          minWidth: isFullWidth ? '100%' : minWidth,
                                          maxWidth: isFullWidth ? '100%' : '100%'
                                        }}
                                      >
                                        <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                                          {field.name}
                                          {field.required && <span className="text-destructive">*</span>}
                                        </Label>
                                        <div className="w-full">
                                          {renderField(field)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pie de Página */}
                  {(currentRecord.medical_record_templates?.footer_config?.signature_url || 
                    currentRecord.medical_record_templates?.footer_config?.text) && (
                    <div className="border-t-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-6">
                      <div className="flex flex-col items-center space-y-4">
                        {currentRecord.medical_record_templates.footer_config.signature_url && (
                          <div className="w-48 h-16 bg-white border-2 border-dashed border-primary/20 rounded flex items-center justify-center overflow-hidden">
                            <img 
                              src={currentRecord.medical_record_templates.footer_config.signature_url} 
                              alt="Firma" 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        {currentRecord.medical_record_templates.footer_config.text && (
                          <p className="text-center text-sm font-semibold text-muted-foreground">
                            {currentRecord.medical_record_templates.footer_config.text}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Última actualización: {format(new Date(currentRecord.updated_at), 'PPpp', { locale: es })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar derecho con detalles de cita */}
          <AppointmentDetailsSidebar 
            appointment={currentRecordAppointment}
            selectedDate={currentRecord ? parseLocalDate(currentRecord.visit_date) : undefined}
          />
        </div>
      </Card>

      {/* Dialog for register attention confirmation */}
      <AlertDialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Guardar Cambios
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>¿Desea registrar la atención con los cambios realizados?</p>
              <div className="bg-muted p-3 rounded-lg mt-2">
                <p className="font-medium">Historia: {currentRecord?.hms || 'N/A'}</p>
                <p>Paciente: {patientName}</p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {format(new Date(), 'EEEE, dd MMMM yyyy HH:mm', { locale: es })}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowRegisterDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={() => handleConfirmSave(false)}
              disabled={saving}
            >
              Solo Guardar
            </Button>
            <AlertDialogAction 
              onClick={() => handleConfirmSave(true)}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Registrar Atención
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for confirming delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Folio?</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar el folio <strong className="text-foreground">{recordToDelete?.hms}</strong>.
              Esta acción no se puede deshacer. El número de folio quedará disponible para ser usado nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Eliminar Folio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for creating new folio */}
      <NewFolioDialog
        open={showNewFolioDialog}
        onClose={() => setShowNewFolioDialog(false)}
        patientId={patientId}
        patientData={patientData}
        currentTemplateId={currentRecord?.template_id || null}
        appointmentData={appointmentData ? {
          id: appointmentData.id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          reason: appointmentData.reason,
          notes: appointmentData.notes,
          consulting_room: appointmentData.consulting_room,
          specialist: appointmentData.specialist,
        } : null}
        onFolioCreated={handleNewFolioCreated}
      />
    </div>
  );
}

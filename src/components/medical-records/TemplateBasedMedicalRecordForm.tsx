import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Save, X, ImageIcon, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PinturaImageEditor } from './PinturaImageEditor';
import { PrescriptionLensesTable } from './PrescriptionLensesTable';
import { BiomicroscopicExamTable } from './BiomicroscopicExamTable';
import { RefractionTable } from './RefractionTable';
import { PreSurgicalEvaluationTable } from './PreSurgicalEvaluationTable';
import { MedicalHistoryCheckboxes } from './MedicalHistoryCheckboxes';
import { VisualNeedsCheckboxes } from './VisualNeedsCheckboxes';
import { UniformsPreOperatoryTable } from '../medical-record-designer/UniformsPreOperatoryTable';
import { CorrectionMethodsTable } from './CorrectionMethodsTable';
import { KeratometryTable } from './KeratometryTable';
import { ScotopicPupilDiameterTable } from './ScotopicPupilDiameterTable';
import { KappaAngleTable } from './KappaAngleTable';
import { CCTTable } from './CCTTable';
import { Z40Table } from './Z40Table';
import { WWTable } from './WWTable';
import { VacuumRingML7Table } from './VacuumRingML7Table';
import { FinalRefractionCorrectionTable } from './FinalRefractionCorrectionTable';
interface MedicalRecordTemplate {
  id: string;
  name: string;
  header_config: any;
  body_config: any[];
  footer_config: any;
}

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface TemplateBasedMedicalRecordFormProps {
  patient: Patient;
  onSave: () => void;
  onCancel: () => void;
  recordId?: string;
}

export function TemplateBasedMedicalRecordForm({ patient, onSave, onCancel, recordId }: TemplateBasedMedicalRecordFormProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MedicalRecordTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalRecordTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingImageField, setEditingImageField] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    if (recordId) {
      fetchExistingRecord();
    }
  }, [recordId]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const transformedTemplates: MedicalRecordTemplate[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        header_config: template.header_config || {},
        body_config: Array.isArray(template.body_config) ? template.body_config : [],
        footer_config: template.footer_config || {}
      }));
      
      setTemplates(transformedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchExistingRecord = async () => {
    if (!recordId) return;

    try {
      const { data: record, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;

      const templateId = (record as any).template_id;
      const recordFormData = (record as any).form_data;

      if (record && templateId) {
        const { data: templateData, error: templateError } = await supabase
          .from('medical_record_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (templateError) throw templateError;

        if (templateData) {
          const template: MedicalRecordTemplate = {
            id: templateData.id,
            name: templateData.name,
            header_config: templateData.header_config || {},
            body_config: Array.isArray(templateData.body_config) ? templateData.body_config : [],
            footer_config: templateData.footer_config || {}
          };
          
          setSelectedTemplate(template);
          setFormData(recordFormData || {});
        }
      }
    } catch (error) {
      console.error('Error fetching existing record:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la historia clínica",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate(null);
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      if (!recordId) {
        // Pre-llenar los campos de filiación con datos del paciente
        const patientData = populatePatientFields(template);
        setFormData(patientData);
      }
    }
  };

  // Función para pre-llenar los campos de filiación con datos del paciente
  const populatePatientFields = (template: MedicalRecordTemplate) => {
    const patientData: Record<string, any> = {};
    
    // Calcular edad si existe fecha de nacimiento
    const getAge = () => {
      if (!patient.birth_date) return '';
      const today = new Date();
      const birth = new Date(patient.birth_date);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age.toString();
    };

    // Obtener fecha de hoy en formato ISO
    const today = new Date().toISOString().split('T')[0];
    
    // Buscar campos de filiación y mapear datos del paciente
    template.body_config?.forEach((section: any) => {
      if (section.title.toLowerCase().includes('filiacion') || 
          section.title.toLowerCase().includes('filiación') ||
          section.title.toLowerCase().includes('datos del paciente') ||
          section.title.toLowerCase().includes('identificación')) {
        section.fields?.forEach((field: any) => {
          const fieldName = field.name.toLowerCase();
          
          // Mapear campos comunes de filiación
          if (fieldName.includes('nombre') && !fieldName.includes('apellido') && !fieldName.includes('completo')) {
            patientData[field.id] = patient.first_name;
          } else if (fieldName.includes('apellido')) {
            patientData[field.id] = patient.last_name;
          } else if (fieldName.includes('nombre completo') || fieldName.includes('paciente')) {
            patientData[field.id] = `${patient.first_name} ${patient.last_name}`;
          } else if (fieldName.includes('dni') || fieldName.includes('documento') || fieldName.includes('cedula') || fieldName.includes('cédula') || fieldName.includes('identificación')) {
            patientData[field.id] = patient.dni;
          } else if (fieldName.includes('codigo') || fieldName.includes('código')) {
            patientData[field.id] = patient.patient_code;
          } else if (fieldName.includes('edad')) {
            patientData[field.id] = getAge();
          } else if (fieldName.includes('sexo') || fieldName.includes('género') || fieldName.includes('genero')) {
            patientData[field.id] = patient.gender || '';
          } else if (fieldName.includes('teléfono') || fieldName.includes('telefono') || fieldName.includes('celular') || fieldName.includes('móvil') || fieldName.includes('movil')) {
            patientData[field.id] = patient.phone || '';
          } else if (fieldName.includes('email') || fieldName.includes('correo') || fieldName.includes('e-mail')) {
            patientData[field.id] = patient.email || '';
          } else if (fieldName.includes('dirección') || fieldName.includes('direccion') || fieldName.includes('domicilio') || fieldName.includes('residencia')) {
            patientData[field.id] = patient.address || '';
          } else if (fieldName.includes('fecha de nacimiento') || fieldName.includes('nacimiento') || fieldName.includes('fecha nac')) {
            patientData[field.id] = patient.birth_date || '';
          } else if (field.type === 'date' && (
            fieldName.includes('fecha') ||
            fieldName.includes('consulta') ||
            fieldName.includes('ingreso') ||
            fieldName.includes('admisión') ||
            fieldName.includes('admision') ||
            fieldName.includes('hoy') ||
            fieldName.includes('actual')
          )) {
            // Auto-llenar campos de fecha con la fecha de hoy
            patientData[field.id] = today;
          }
        });
      }
    });
    
    return patientData;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    console.log('TemplateForm: Field change:', fieldId, value);
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const getFieldBaseImageUrl = (field: any) => {
    console.log('TemplateForm: Getting base image URL for field:', field.name, field);
    
    // Verificar si hay URL directa en el campo
    if (field.base_image_url && field.base_image_url.trim() !== '') {
      console.log('TemplateForm: Found direct base_image_url:', field.base_image_url);
      return field.base_image_url;
    }
    
    // Verificar en opciones
    if (field.options?.base_image_url && field.options.base_image_url.trim() !== '') {
      console.log('TemplateForm: Found base_image_url in options:', field.options.base_image_url);
      return field.options.base_image_url;
    }
    
    // Mapeo por nombre de campo
    const fieldName = field.name.toLowerCase();
    console.log('TemplateForm: Checking field name mapping for:', fieldName);
    
    const imageMap: Record<string, string> = {
      'cuerpo': 'https://yxjjodjpumynmklmhuox.supabase.co/storage/v1/object/public/template-images/body-outline.png',
      'cabeza': 'https://yxjjodjpumynmklmhuox.supabase.co/storage/v1/object/public/template-images/head-outline.png',
      'torso': 'https://yxjjodjpumynmklmhuox.supabase.co/storage/v1/object/public/template-images/torso-outline.png',
      'extremidades': 'https://yxjjodjpumynmklmhuox.supabase.co/storage/v1/object/public/template-images/limbs-outline.png'
    };
    
    for (const [key, url] of Object.entries(imageMap)) {
      if (fieldName.includes(key)) {
        console.log('TemplateForm: Found mapped image URL:', url);
        return url;
      }
    }
    
    console.log('TemplateForm: No base image URL found');
    return null;
  };

  const handleImageUpload = async (fieldId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `medical-records/${patient.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('template-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(filePath);

      handleFieldChange(fieldId, publicUrl);

      toast({
        title: "Imagen subida",
        description: "La imagen se ha subido correctamente.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      });
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    
    // Aplicar estilo con ancho y responsividad de la plantilla
    const fieldWidth = field.width || 200;
    const fieldStyle: React.CSSProperties = field.responsive 
      ? { minWidth: `${fieldWidth}px`, flex: '1' }
      : { width: `${fieldWidth}px` };

    switch (field.type) {
      case 'text_short':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            style={fieldStyle}
          />
        );

      case 'text_medium':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            style={fieldStyle}
          />
        );

      case 'text_long':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            style={fieldStyle}
          />
        );

      case 'text_multiline':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            rows={4}
            style={fieldStyle}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger style={fieldStyle}>
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
          <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.id, val)} style={fieldStyle}>
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
                  "justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
                style={fieldStyle}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "dd/MM/yyyy") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFieldChange(field.id, date?.toISOString().split('T')[0])}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        );

      case 'image_drawing':
        const baseImageUrl = getFieldBaseImageUrl(field);
        const isEditing = editingImageField === field.id;
        const hasAnnotatedImage = value && typeof value === 'string' && value.startsWith('data:image');
        
        console.log('TemplateForm: Rendering image_drawing field', {
          fieldId: field.id,
          fieldName: field.name,
          baseImageUrl,
          isEditing,
          hasAnnotatedImage
        });

        if (isEditing) {
          return (
            <div className="w-full">
              <PinturaImageEditor
                imageUrl={baseImageUrl || ''}
                onSave={(blob) => {
                  console.log('TemplateForm: Saving annotated image for field:', field.id);
                  // Convert blob to data URL
                  const reader = new FileReader();
                  reader.onload = () => {
                    handleFieldChange(field.id, reader.result as string);
                    setEditingImageField(null);
                  };
                  reader.readAsDataURL(blob);
                }}
                className="border rounded-lg"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingImageField(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {/* Imagen anotada */}
            {hasAnnotatedImage && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Imagen con anotaciones:</p>
                <div className="flex justify-center">
                  <img 
                    src={value} 
                    alt="Imagen anotada" 
                    className="max-w-full max-h-64 object-contain rounded border"
                  />
                </div>
              </div>
            )}

            {/* Imagen base cuando no hay anotaciones */}
            {!hasAnnotatedImage && baseImageUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Imagen base:</p>
                <div className="flex justify-center">
                  <img 
                    src={baseImageUrl} 
                    alt="Imagen base" 
                    className="max-w-full max-h-64 object-contain border rounded"
                  />
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 justify-center">
              {baseImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('TemplateForm: Starting to edit field:', field.id);
                    setEditingImageField(field.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {hasAnnotatedImage ? 'Editar anotaciones' : 'Anotar imagen'}
                </Button>
              )}

              {hasAnnotatedImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('TemplateForm: Clearing annotations for field:', field.id);
                    handleFieldChange(field.id, '');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar anotaciones
                </Button>
              )}

              {!baseImageUrl && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No hay imagen base configurada</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(field.id, file);
                    }}
                    className="hidden"
                    id={`file-${field.id}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`file-${field.id}`)?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Subir imagen
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
          />
        );
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "Debe seleccionar una plantilla",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Crear datos del registro médico con todos los campos requeridos
      const recordData = {
        patient_id: patient.id,
        template_id: selectedTemplate.id,
        visit_date: new Date().toISOString().split('T')[0],
        form_data: formData,
        chief_complaint: selectedTemplate.name || "Historia clínica basada en plantilla",
        diagnosis: "En evaluación",
        status: "Abierta",
        specialist_id: null,
        present_illness: null,
        physical_examination: null,
        treatment_plan: null,
        lab_results: null,
        imaging_results: null,
        follow_up_instructions: null,
        next_appointment_date: null,
        vital_signs: null,
        appointment_id: null
      };

      if (recordId) {
        const { error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', recordId);

        if (error) throw error;

        toast({
          title: "Historia Actualizada",
          description: "La historia clínica se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('medical_records')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Historia Creada",
          description: "La nueva historia clínica se ha creado correctamente",
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving medical record:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la historia clínica",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lg">Cargando plantillas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {recordId ? 'Editar' : 'Nueva'} Historia Clínica - {patient.first_name} {patient.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Plantilla</Label>
              <Select 
                value={selectedTemplate?.id || 'none'} 
                onValueChange={handleTemplateSelect}
                disabled={!!recordId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccione una plantilla</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-6">
                {selectedTemplate.body_config?.map((section: any) => {
                  // Usar tabla específica para Métodos de Corrección en CRefract02 (Sección II)
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('metodos de correccion') ||
                      section.title?.toLowerCase().includes('métodos de corrección') ||
                      section.roman_numeral === 'II'
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <CorrectionMethodsTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para Queratometría en CRefract02 (Sección III)
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('queratometria') ||
                      section.title?.toLowerCase().includes('queratometría') ||
                      section.roman_numeral === 'III'
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <KeratometryTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para Diámetro Pupilar Escotópica en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('diametro pupilar') ||
                      section.title?.toLowerCase().includes('diámetro pupilar') ||
                      section.title?.toLowerCase().includes('escotopica') ||
                      section.title?.toLowerCase().includes('escotópica') ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return (n.includes('diametro') || n.includes('diámetro')) && n.includes('pupilar');
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <ScotopicPupilDiameterTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para Ángulo Kappa en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('angulo kappa') ||
                      section.title?.toLowerCase().includes('ángulo kappa') ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return n.includes('angulo') && n.includes('kappa');
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <KappaAngleTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para CCT en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('cct') ||
                      section.roman_numeral === 'VI' ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return n.includes('cct') || n.includes('grosor corneal central') || n.includes('um') || n.includes('µm') || n.includes('micras');
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <CCTTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para Z4;0 en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('z4;0') ||
                      section.title?.toLowerCase().includes('z4,0') ||
                      section.title?.toLowerCase().includes('z 4.0') ||
                      section.title?.toLowerCase().includes('z40') ||
                      section.title?.toLowerCase().includes('z 4 0') ||
                      section.title?.toLowerCase().includes('wavefront') ||
                      section.title?.toLowerCase().includes('frente de onda') ||
                      section.title?.toLowerCase().includes('aberrac') ||
                      section.roman_numeral === 'VII' ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return (
                          n.includes('z4;0') || n.includes('z4,0') || n.includes('z 4.0') || n.includes('z40') || n.includes('z 4 0') ||
                          n.includes('zernike') || n.includes('wavefront') || n.includes('frente de onda') || n.includes('aberrac')
                        );
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <Z40Table
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para W-W en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('w-w') ||
                      section.title?.toLowerCase().includes('w w') ||
                      section.title?.toLowerCase().includes('wtw') ||
                      section.title?.toLowerCase().includes('white to white') ||
                      section.title?.toLowerCase().includes('white-to-white') ||
                      section.roman_numeral === 'VIII' ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return (
                          n.includes('w-w') || n.includes('w w') || n.includes('wtw') || n.includes('white to white') || n.includes('white-to-white') ||
                          n.includes('hvid') || ((n.includes('iris') || n.includes('irid')) && (n.includes('diametro') || n.includes('diámetro'))) || n.includes('mm')
                        );
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <WWTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
                  // Usar tabla específica para ANILLO DE VACÍO ml 7 en CRefract02
                  if (
                    (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
                    (
                      section.title?.toLowerCase().includes('anillo de vacio') ||
                      section.title?.toLowerCase().includes('anillo de vacío') ||
                      section.title?.toLowerCase().includes('ml 7') ||
                      section.title?.toLowerCase().includes('ml7') ||
                      section.roman_numeral === 'IX' ||
                      (section.fields?.some((f: any) => {
                        const n = String(f.name || '').toLowerCase();
                        return (
                          ((n.includes('anillo') && (n.includes('vacio') || n.includes('vacío'))) || n.includes('ml 7') || n.includes('ml7')) && n.includes('mm')
                        );
                      }))
                    )
                  ) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <VacuumRingML7Table
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }
// Usar tabla específica para REFRACCIÓN FINAL A CORREGIR en CRefract02
if (
  (selectedTemplate.name?.toLowerCase().includes('crefract02')) &&
  (
    section.title?.toLowerCase().includes('refraccion final a corregir') ||
    section.title?.toLowerCase().includes('refracción final a corregir') ||
    section.title?.toLowerCase().includes('refraccion final') ||
    section.title?.toLowerCase().includes('refracción final') ||
    section.roman_numeral === 'X' ||
    (section.fields?.some((f: any) => {
      const n = String(f.name || '').toLowerCase();
      return (
        (n.includes('refraccion') || n.includes('refracción')) &&
        (n.includes('final') || n.includes('corregir')) &&
        (n.includes('esfera') || n.includes('cilindro') || n.includes('eje'))
      );
    }))
  )
) {
  return (
    <Card key={section.id}>
      <CardContent className="pt-6">
        <FinalRefractionCorrectionTable
          formData={formData}
          onFieldChange={handleFieldChange}
          section={section}
        />
      </CardContent>
    </Card>
  );
}
// Usar tabla específica para la sección de prescripción de lentes
                  if (section.id === '21aff962-2434-45f6-9046-bed8e3163f96' || 
                      section.title?.toLowerCase().includes('prescripcion de lentes') ||
                      section.title?.toLowerCase().includes('prescripción de lentes')) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <PrescriptionLensesTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }

                  // Usar tabla específica para la sección de examen biomicroscópico
                  if (section.id === '4416ab77-a41a-49db-9736-c69a570c39d7' || 
                      section.title?.toLowerCase().includes('examen biomicroscópico') ||
                      section.title?.toLowerCase().includes('biomicroscópico')) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <BiomicroscopicExamTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }

                  // Usar tabla específica para los campos de refracción en la sección de Enfermedad Actual
                  if (section.title?.toLowerCase().includes('enfermedad actual')) {
                    const hasRefractionFields = section.fields?.some((field: any) =>
                      field.name.toLowerCase().includes('refracción av sc') ||
                      field.name.toLowerCase().includes('refracción av cc')
                    );
                    
                    if (hasRefractionFields) {
                      return (
                        <Card key={section.id}>
                          <CardContent className="pt-6">
                            <RefractionTable
                              formData={formData}
                              onFieldChange={handleFieldChange}
                              section={section}
                            />
                          </CardContent>
                        </Card>
                      );
                    }
                  }

                  // Usar tabla específica para la sección de evaluación pre-quirúrgica de cirugía refractiva
                  if (section.title?.toLowerCase().includes('evaluacion pre quirúrgica') ||
                      section.title?.toLowerCase().includes('evaluación pre quirúrgica') ||
                      section.title?.toLowerCase().includes('evaluacion prequirurgica') ||
                      section.title?.toLowerCase().includes('evaluación prequirúrgica')) {
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <PreSurgicalEvaluationTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }

                  // Usar tabla Uniforms específica para la sección de exámenes preoperatorios de HC CiruRef
                  if (section.title?.toLowerCase().includes('examenes preoperatorios') ||
                      section.title?.toLowerCase().includes('exámenes preoperatorios')) {
                    // Verificar si hay campos con tipo uniforms_preoperatory_exam_table
                    const hasUniformsTable = section.fields?.some((field: any) =>
                      field.type === 'uniforms_preoperatory_exam_table'
                    );
                    
                    if (hasUniformsTable) {
                      const uniformsField = section.fields.find((field: any) => 
                        field.type === 'uniforms_preoperatory_exam_table'
                      );
                      
                      return (
                        <Card key={section.id}>
                          <CardContent className="pt-6">
                            <UniformsPreOperatoryTable
                              onDataChange={(data) => {
                                // Actualizar cada campo individual del formulario usando Uniforms
                                Object.entries(data).forEach(([key, value]) => {
                                  handleFieldChange(`${uniformsField.id}_${key}`, value);
                                });
                              }}
                              initialData={
                                // Extraer los datos existentes para esta tabla Uniforms
                                Object.keys(formData)
                                  .filter(key => key.startsWith(`${uniformsField.id}_`))
                                  .reduce((acc, key) => {
                                    const cleanKey = key.replace(`${uniformsField.id}_`, '');
                                    acc[cleanKey] = formData[key];
                                    return acc;
                                  }, {} as Record<string, any>)
                              }
                            />
                          </CardContent>
                        </Card>
                      );
                    }
                    
                    // Fallback a la tabla regular si no hay tabla Uniforms
                    return (
                      <Card key={section.id}>
                        <CardContent className="pt-6">
                          <PreSurgicalEvaluationTable
                            formData={formData}
                            onFieldChange={handleFieldChange}
                            section={section}
                          />
                        </CardContent>
                      </Card>
                    );
                  }

                  // Usar checkboxes para la sección de antecedentes patológicos
                  if (section.title?.toLowerCase().includes('antecedentes patológicos') ||
                      section.title?.toLowerCase().includes('antecedentes patologicos')) {
                    const hasCheckboxFields = section.fields?.some((field: any) =>
                      field.name.toLowerCase().includes('hta') ||
                      field.name.toLowerCase().includes('diabetes') ||
                      field.name.toLowerCase().includes('otros')
                    );
                    
                    if (hasCheckboxFields) {
                      return (
                        <Card key={section.id}>
                          <CardContent className="pt-6">
                            <MedicalHistoryCheckboxes
                              formData={formData}
                              onFieldChange={handleFieldChange}
                              section={section}
                            />
                          </CardContent>
                        </Card>
                      );
                    }
                  }

                  // Usar checkboxes para la sección de necesidad visual del paciente
                  if (section.title?.toLowerCase().includes('necesidad visual del paciente') ||
                      section.title?.toLowerCase().includes('necesidad visual')) {
                    const hasVisualNeedsFields = section.fields?.some((field: any) =>
                      field.name.toLowerCase().includes('lejos') ||
                      field.name.toLowerCase().includes('cerca')
                    );
                    
                    if (hasVisualNeedsFields) {
                      return (
                        <Card key={section.id}>
                          <CardContent className="pt-6">
                            <VisualNeedsCheckboxes
                              formData={formData}
                              onFieldChange={handleFieldChange}
                              section={section}
                            />
                          </CardContent>
                        </Card>
                      );
                    }
                  }

                  // Renderizado normal para otras secciones
                  return (
                    <Card key={section.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {section.roman_numeral}. {section.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                      <div className="space-y-4">
                        {(() => {
                          const fields = section.fields || [];
                          const rows: any[][] = [];
                          let currentRow: any[] = [];
                          let currentRowWidth = 0;
                          const containerWidth = 800; // Ancho aproximado del contenedor

                          fields.forEach((field: any) => {
                            const fieldWidth = field.width || 200;
                            const isResponsive = field.responsive !== false;

                            if (!isResponsive) {
                              // Campo no responsivo: ocupa toda la fila
                              if (currentRow.length > 0) {
                                rows.push([...currentRow]);
                                currentRow = [];
                                currentRowWidth = 0;
                              }
                              rows.push([field]);
                            } else {
                              // Campo responsivo: puede compartir fila
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
                              className="flex flex-wrap gap-4"
                              style={{ 
                                justifyContent: row.length === 1 && !row[0].responsive ? 'flex-start' : 'flex-start',
                                alignItems: 'flex-start'
                              }}
                            >
                              {row.map((field: any) => (
                                <div 
                                  key={field.id}
                                  className="space-y-2"
                                  style={{
                                    display: field.responsive === false ? 'block' : 'inline-block',
                                    width: field.responsive === false ? '100%' : 'auto'
                                  }}
                                >
                                  <Label className="flex items-center gap-1">
                                    {field.name}
                                    {field.required && <span className="text-red-500">*</span>}
                                  </Label>
                                  {renderField(field)}
                                </div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={loading || !selectedTemplate}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : recordId ? 'Actualizar' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

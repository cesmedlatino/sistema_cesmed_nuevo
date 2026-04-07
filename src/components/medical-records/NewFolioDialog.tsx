import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  title: string | null;
  correlative_prefix: string | null;
  correlative_current: number | null;
  correlative_zeros: number | null;
  specialty_id: string | null;
  body_config: any;
}

interface PatientData {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  address?: string;
  phone?: string;
  years?: number;
  months?: number;
  days?: number;
  birth_date?: string;
}

export interface AppointmentDataForFolio {
  id: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  notes?: string;
  consulting_room?: {
    id: string;
    name: string;
  };
  specialist?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface NewFolioDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientData: PatientData | null;
  appointmentData?: AppointmentDataForFolio | null;
  currentTemplateId?: string | null; // If provided, use this template automatically
  onFolioCreated: () => void;
}

export function NewFolioDialog({
  open,
  onClose,
  patientId,
  patientData,
  appointmentData,
  currentTemplateId,
  onFolioCreated,
}: NewFolioDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // If currentTemplateId is provided, use it directly
  const useCurrentTemplate = !!currentTemplateId;

  useEffect(() => {
    if (open) {
      if (currentTemplateId) {
        // Use the current template directly
        setSelectedTemplateId(currentTemplateId);
        fetchSingleTemplate(currentTemplateId);
      } else {
        fetchTemplates();
      }
    }
  }, [open, currentTemplateId]);

  const fetchSingleTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select('id, name, title, correlative_prefix, correlative_current, correlative_zeros, specialty_id, body_config')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      if (data) {
        setTemplates([data]);
        setSelectedTemplateId(data.id);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la plantilla',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select('id, name, title, correlative_prefix, correlative_current, correlative_zeros, specialty_id, body_config')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las plantillas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const buildFiliacionFormData = (template: Template): Record<string, any> => {
    const formData: Record<string, any> = {};
    const templateBody = template.body_config || [];
    // Use appointment date if available, otherwise today
    const visitDate = appointmentData?.appointment_date || new Date().toISOString().split('T')[0];

    // Calculate age if we have patient data
    let edadDisplay = "";
    if (patientData) {
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
      // Filiación section
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
            formData[field.id] = visitDate;
          } else if (fieldName.includes('nombre') && !fieldName.includes('apellido')) {
            formData[field.id] = patientData?.first_name || '';
          } else if (fieldName.includes('apellido')) {
            formData[field.id] = patientData?.last_name || '';
          } else if (fieldName.includes('edad') && edadDisplay) {
            formData[field.id] = edadDisplay;
          } else if (fieldName.includes('domicilio') && patientData?.address) {
            formData[field.id] = patientData.address;
          } else if ((fieldName.includes('celular') || fieldName.includes('celullar')) && patientData?.phone) {
            formData[field.id] = patientData.phone;
          }
        });
      }
      
      // Also fill in appointment-related fields in any section
      section.fields?.forEach((field: any) => {
        const fieldName = (field?.name || '').toLowerCase();
        
        // Fill motivo/razón de consulta from appointment
        if (appointmentData?.reason) {
          if (
            fieldName.includes('motivo') ||
            fieldName.includes('razón') ||
            fieldName.includes('razon') ||
            fieldName.includes('consulta')
          ) {
            if (!formData[field.id]) {
              formData[field.id] = appointmentData.reason;
            }
          }
        }
        
        // Fill notas from appointment
        if (appointmentData?.notes) {
          if (fieldName.includes('nota') || fieldName.includes('observacion')) {
            if (!formData[field.id]) {
              formData[field.id] = appointmentData.notes;
            }
          }
        }
      });
    });

    return formData;
  };

  const handleCreate = async () => {
    if (!selectedTemplateId) {
      toast({
        title: 'Seleccione una plantilla',
        description: 'Debe seleccionar una plantilla para crear el nuevo folio',
        variant: 'destructive',
      });
      return;
    }

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) return;

    try {
      setCreating(true);

      // Build filiación form data with patient info and appointment data
      const filiacionFormData = buildFiliacionFormData(selectedTemplate);
      
      // Use appointment date if available
      const visitDate = appointmentData?.appointment_date || new Date().toISOString().split('T')[0];

      // Create the new medical record with appointment_id if available
      const { data: newRecord, error } = await supabase
        .from('medical_records')
        .insert({
          patient_id: patientId,
          template_id: selectedTemplateId,
          visit_date: visitDate,
          status: 'Abierta',
          form_data: filiacionFormData,
          appointment_id: appointmentData?.id || null,
          specialist_id: appointmentData?.specialist?.id || null,
        })
        .select('id, hms')
        .single();

      if (error) throw error;

      toast({
        title: 'Nuevo Folio Creado',
        description: `Se ha creado el folio ${newRecord?.hms || 'nuevo'} exitosamente`,
      });

      onFolioCreated();
      onClose();
    } catch (error) {
      console.error('Error creating new folio:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el nuevo folio',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Nuevo Folio de Historia Clínica
          </DialogTitle>
          <DialogDescription>
            Cree un nuevo folio para{' '}
            <span className="font-semibold">
              {patientData ? `${patientData.first_name} ${patientData.last_name}` : 'el paciente'}
            </span>
            . Los datos de filiación se pre-llenarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Plantilla de Historia Clínica</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : useCurrentTemplate && templates.length > 0 ? (
              // Show fixed template info when using current template
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{templates[0].name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Prefijo: {templates[0].correlative_prefix} (Continuación de la plantilla actual)
                </p>
              </div>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Prefijo: {template.correlative_prefix}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {patientData && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <h4 className="text-sm font-semibold text-muted-foreground">Datos de Filiación a Pre-llenar:</h4>
              <div className="text-sm space-y-0.5">
                <p><span className="text-muted-foreground">Nombres:</span> {patientData.first_name}</p>
                <p><span className="text-muted-foreground">Apellidos:</span> {patientData.last_name}</p>
                {patientData.address && (
                  <p><span className="text-muted-foreground">Domicilio:</span> {patientData.address}</p>
                )}
                {patientData.phone && (
                  <p><span className="text-muted-foreground">Celular:</span> {patientData.phone}</p>
                )}
              </div>
            </div>
          )}

          {appointmentData && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <h4 className="text-sm font-semibold text-primary">Datos de la Cita Actual:</h4>
              <div className="text-sm space-y-0.5">
                <p><span className="text-muted-foreground">Fecha:</span> {appointmentData.appointment_date}</p>
                <p><span className="text-muted-foreground">Hora:</span> {appointmentData.appointment_time}</p>
                {appointmentData.reason && (
                  <p><span className="text-muted-foreground">Motivo:</span> {appointmentData.reason}</p>
                )}
                {appointmentData.consulting_room && (
                  <p><span className="text-muted-foreground">Consultorio:</span> {appointmentData.consulting_room.name}</p>
                )}
                {appointmentData.specialist && (
                  <p><span className="text-muted-foreground">Especialista:</span> Dr(a). {appointmentData.specialist.first_name} {appointmentData.specialist.last_name}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating || !selectedTemplateId}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Folio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

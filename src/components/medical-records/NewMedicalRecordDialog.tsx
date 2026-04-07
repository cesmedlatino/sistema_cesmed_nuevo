import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  years?: number;
  gender?: string;
}

interface Template {
  id: string;
  name: string;
  specialty_id: string | null;
  correlative_prefix: string | null;
  correlative_current: number | null;
  correlative_zeros: number | null;
}

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
  specialty_id: string | null;
  specialty?: {
    id: string;
    name: string;
  };
}

interface NewMedicalRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preselectedPatientId?: string;
}

export function NewMedicalRecordDialog({ open, onOpenChange, onSuccess, preselectedPatientId }: NewMedicalRecordDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>("");
  const [previewHms, setPreviewHms] = useState<string>("");
  const [customHms, setCustomHms] = useState<string>("");
  const [isEditingHms, setIsEditingHms] = useState(false);
  const [loadingHms, setLoadingHms] = useState(false);

  // Fetch the actual next HMS from database based on existing records
  const fetchNextHms = async (template: Template) => {
    if (!template.correlative_prefix) return "";
    
    setLoadingHms(true);
    try {
      const prefix = template.correlative_prefix;
      const zeros = template.correlative_zeros || 6;
      
      // Query the max HMS for this prefix from medical_records
      const { data, error } = await supabase
        .from('medical_records')
        .select('hms')
        .like('hms', `${prefix}-%`)
        .order('hms', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      let nextNumber = 1;
      
      if (data && data.length > 0 && data[0].hms) {
        // Extract the numeric part from the last HMS (e.g., "HD-007712" -> 7712)
        const lastHms = data[0].hms;
        const numericPart = lastHms.split('-')[1];
        if (numericPart) {
          const lastNumber = parseInt(numericPart, 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }
      
      const generatedHms = `${prefix}-${nextNumber.toString().padStart(zeros, '0')}`;
      setPreviewHms(generatedHms);
      return generatedHms;
    } catch (error) {
      console.error('Error fetching next HMS:', error);
      // Fallback to template correlative
      const nextNumber = (template.correlative_current || 0) + 1;
      const zeros = template.correlative_zeros || 6;
      const fallbackHms = `${template.correlative_prefix}-${nextNumber.toString().padStart(zeros, '0')}`;
      setPreviewHms(fallbackHms);
      return fallbackHms;
    } finally {
      setLoadingHms(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchSpecialists();
      if (preselectedPatientId) {
        setSelectedPatient(preselectedPatientId);
        handlePatientSelect(preselectedPatientId);
      }
    }
  }, [open, preselectedPatientId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchPatients();
    } else {
      setPatients([]);
    }
  }, [searchTerm]);

  // Auto-select specialist and generate preview HMS when template is selected
  useEffect(() => {
    if (selectedTemplate && specialists.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        // Fetch preview HMS from database
        fetchNextHms(template);
        
        // Find a specialist with the same specialty
        if (template.specialty_id) {
          const matchingSpecialist = specialists.find(s => s.specialty_id === template.specialty_id);
          if (matchingSpecialist) {
            setSelectedSpecialist(matchingSpecialist.id);
          }
        }
      }
    } else {
      setPreviewHms("");
    }
  }, [selectedTemplate, templates, specialists]);

  const searchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_code, first_name, last_name, dni, phone, address, birth_date, years, gender')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%,patient_code.ilike.%${searchTerm}%`)
        .order('last_name')
        .limit(10);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handlePatientSelect = async (patientId: string) => {
    setSelectedPatient(patientId);
    
    // Fetch complete patient data
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_code, first_name, last_name, dni, phone, address, birth_date, years, gender')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      setSelectedPatientData(data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select('id, name, specialty_id, correlative_prefix, correlative_current, correlative_zeros')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    }
  };

  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select(`
          id, 
          first_name, 
          last_name, 
          specialty_id,
          specialty:medical_specialties(id, name)
        `)
        .eq('status', 'Activo')
        .order('last_name');

      if (error) throw error;
      setSpecialists(data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    }
  };

  const handleCreate = async () => {
    if (!selectedPatient || !selectedTemplate) {
      toast({
        title: "Campos requeridos",
        description: "Debe seleccionar un paciente y una plantilla",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get template to map field IDs
      const { data: templateData, error: templateError } = await supabase
        .from('medical_record_templates')
        .select('body_config')
        .eq('id', selectedTemplate)
        .single();

      if (templateError) throw templateError;

      // Get specialty name from selected specialist
      const selectedSpecialistData = specialists.find(s => s.id === selectedSpecialist);
      const especialidad = selectedSpecialistData?.specialty?.name || null;

      // Prepare form_data with Filiación section pre-filled
      const visitDate = new Date().toISOString().split('T')[0];
      const formData: any = {};

      if (selectedPatientData && templateData?.body_config) {
        // Find Filiación section
        const filiacionSection = (templateData.body_config as any[]).find(
          section => section.title?.toUpperCase().includes('FILIACIÓN')
        );

        if (filiacionSection?.fields) {
          // Calculate age display
          let edadDisplay = '';
          if (selectedPatientData.birth_date) {
            const birthDate = new Date(selectedPatientData.birth_date);
            const today = new Date();
            const years = today.getFullYear() - birthDate.getFullYear();
            edadDisplay = `${years} años`;
          } else if (selectedPatientData.years) {
            edadDisplay = `${selectedPatientData.years} años`;
          }

          // Map patient data to template field IDs
          filiacionSection.fields.forEach((field: any) => {
            const fieldName = field.name?.toLowerCase();
            
            if (fieldName?.includes('fecha')) {
              formData[field.id] = visitDate;
            } else if (fieldName?.includes('nombres')) {
              formData[field.id] = selectedPatientData.first_name || '';
            } else if (fieldName?.includes('apellidos')) {
              formData[field.id] = selectedPatientData.last_name || '';
            } else if (fieldName?.includes('edad')) {
              formData[field.id] = edadDisplay;
            } else if (fieldName?.includes('domicilio')) {
              formData[field.id] = selectedPatientData.address || '';
            } else if (fieldName?.includes('celular') || fieldName?.includes('celullar')) {
              formData[field.id] = selectedPatientData.phone || '';
            }
            // Estado Civil y Ocupación se dejan vacíos (no hay datos en patients)
          });
        }
      }

      // Use custom HMS if provided, otherwise let the database generate it
      const hmsToUse = customHms.trim() || null;

      const { data, error } = await supabase
        .from('medical_records')
        .insert({
          patient_id: selectedPatient,
          template_id: selectedTemplate,
          specialist_id: selectedSpecialist || null,
          especialidad: especialidad,
          visit_date: visitDate,
          status: 'Abierta',
          form_data: formData,
          hms: hmsToUse
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Historia Clínica Creada",
        description: `HMS: ${data.hms || 'N/A'} - La historia se ha creado exitosamente`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating medical record:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la historia clínica",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient("");
    setSelectedPatientData(null);
    setSelectedTemplate("");
    setSelectedSpecialist("");
    setSearchTerm("");
    setPatients([]);
    setPreviewHms("");
    setCustomHms("");
    setIsEditingHms(false);
  };

  const handleEditHms = () => {
    setCustomHms(previewHms);
    setIsEditingHms(true);
  };

  const handleConfirmHms = () => {
    setIsEditingHms(false);
  };

  const handleCancelEditHms = () => {
    setCustomHms("");
    setIsEditingHms(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Historia Clínica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Paciente *</Label>
            {selectedPatientData ? (
              <div className="p-3 bg-muted rounded-md border">
                <p className="font-medium">
                  {selectedPatientData.first_name} {selectedPatientData.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  DNI: {selectedPatientData.dni} | Código: {selectedPatientData.patient_code}
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="patient-search"
                  placeholder="Buscar por nombre, DNI o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {patients.length > 0 && (
                  <Select value={selectedPatient} onValueChange={handlePatientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.patient_code} - {patient.first_name} {patient.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Plantilla de Historia *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingHms && (
              <div className="p-2 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Calculando número de historia...</p>
              </div>
            )}
            {previewHms && !loadingHms && (
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
                {isEditingHms ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">Nº Historia:</span>
                    <Input
                      value={customHms}
                      onChange={(e) => setCustomHms(e.target.value)}
                      className="h-7 text-sm font-bold flex-1"
                      placeholder={previewHms}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={handleConfirmHms}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleCancelEditHms}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary">
                      Nº Historia: <span className="font-bold">{customHms || previewHms}</span>
                      {customHms && customHms !== previewHms && (
                        <span className="ml-2 text-xs text-muted-foreground">(editado)</span>
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={handleEditHms}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialist">Especialista (Opcional)</Label>
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialista" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.first_name} {specialist.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Historia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

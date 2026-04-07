
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MedicalRecord {
  id?: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  status: string;
  specialist_name?: string;
  present_illness?: string;
  physical_examination?: string;
  treatment_plan?: string;
  lab_results?: string;
  imaging_results?: string;
  follow_up_instructions?: string;
  next_appointment_date?: string;
  vital_signs?: any;
}

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
}

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
}

interface MedicalRecordFormProps {
  patient: Patient;
  record?: MedicalRecord;
  onSave: () => void;
  onCancel: () => void;
}

export function MedicalRecordForm({ patient, record, onSave, onCancel }: MedicalRecordFormProps) {
  const { toast } = useToast();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [formData, setFormData] = useState({
    visit_date: record?.visit_date || new Date().toISOString().split('T')[0],
    chief_complaint: record?.chief_complaint || "",
    present_illness: record?.present_illness || "",
    physical_examination: record?.physical_examination || "",
    diagnosis: record?.diagnosis || "",
    treatment_plan: record?.treatment_plan || "",
    lab_results: record?.lab_results || "",
    imaging_results: record?.imaging_results || "",
    follow_up_instructions: record?.follow_up_instructions || "",
    next_appointment_date: record?.next_appointment_date || "",
    status: record?.status || "Abierta",
    specialist_id: "",
    vital_signs: record?.vital_signs || {}
  });

  useEffect(() => {
    fetchSpecialists();
  }, []);

  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('id, first_name, last_name')
        .eq('status', 'Activo')
        .order('first_name');

      if (error) throw error;
      setSpecialists(data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const recordData = {
        patient_id: patient.id,
        visit_date: formData.visit_date,
        chief_complaint: formData.chief_complaint,
        present_illness: formData.present_illness,
        physical_examination: formData.physical_examination,
        diagnosis: formData.diagnosis,
        treatment_plan: formData.treatment_plan,
        lab_results: formData.lab_results,
        imaging_results: formData.imaging_results,
        follow_up_instructions: formData.follow_up_instructions,
        next_appointment_date: formData.next_appointment_date || null,
        status: formData.status,
        specialist_id: formData.specialist_id || null,
        vital_signs: formData.vital_signs
      };

      if (record?.id) {
        const { error } = await supabase
          .from('medical_records')
          .update(recordData)
          .eq('id', record.id);

        if (error) throw error;

        toast({
          title: "Historia Clínica Actualizada",
          description: "La historia clínica se ha actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('medical_records')
          .insert(recordData);

        if (error) throw error;

        toast({
          title: "Historia Clínica Creada",
          description: "La nueva historia clínica se ha registrado correctamente.",
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
    }
  };

  const statuses = ["Abierta", "Cerrada", "En seguimiento"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {record?.id ? "Editar Historia Clínica" : "Nueva Historia Clínica"}
        </CardTitle>
        <div className="text-sm text-gray-600">
          Paciente: {patient.first_name} {patient.last_name} - {patient.patient_code}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visit_date">Fecha de Visita</Label>
              <Input
                id="visit_date"
                type="date"
                value={formData.visit_date}
                onChange={(e) => setFormData(prev => ({ ...prev, visit_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Especialista</Label>
              <Select 
                value={formData.specialist_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, specialist_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especialista" />
                </SelectTrigger>
                <SelectContent>
                  {specialists.map((specialist) => (
                    <SelectItem key={specialist.id} value={specialist.id}>
                      Dr. {specialist.first_name} {specialist.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="next_appointment_date">Próxima Cita</Label>
              <Input
                id="next_appointment_date"
                type="date"
                value={formData.next_appointment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_appointment_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="chief_complaint">Motivo de Consulta</Label>
            <Input
              id="chief_complaint"
              value={formData.chief_complaint}
              onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
              placeholder="Motivo principal de la consulta"
              required
            />
          </div>

          <div>
            <Label htmlFor="present_illness">Historia de la Enfermedad Actual</Label>
            <Textarea
              id="present_illness"
              value={formData.present_illness}
              onChange={(e) => setFormData(prev => ({ ...prev, present_illness: e.target.value }))}
              placeholder="Descripción detallada de la enfermedad actual"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="physical_examination">Examen Físico</Label>
            <Textarea
              id="physical_examination"
              value={formData.physical_examination}
              onChange={(e) => setFormData(prev => ({ ...prev, physical_examination: e.target.value }))}
              placeholder="Hallazgos del examen físico"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnóstico</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Diagnóstico médico"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="treatment_plan">Plan de Tratamiento</Label>
            <Textarea
              id="treatment_plan"
              value={formData.treatment_plan}
              onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              placeholder="Plan de tratamiento recomendado"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lab_results">Resultados de Laboratorio</Label>
              <Textarea
                id="lab_results"
                value={formData.lab_results}
                onChange={(e) => setFormData(prev => ({ ...prev, lab_results: e.target.value }))}
                placeholder="Resultados de exámenes de laboratorio"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="imaging_results">Resultados de Imágenes</Label>
              <Textarea
                id="imaging_results"
                value={formData.imaging_results}
                onChange={(e) => setFormData(prev => ({ ...prev, imaging_results: e.target.value }))}
                placeholder="Resultados de estudios de imagen"
                rows={3}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="follow_up_instructions">Instrucciones de Seguimiento</Label>
            <Textarea
              id="follow_up_instructions"
              value={formData.follow_up_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
              placeholder="Instrucciones para el seguimiento del paciente"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {record?.id ? "Actualizar" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

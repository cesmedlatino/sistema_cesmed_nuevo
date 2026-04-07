
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_code: string;
}

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
  specialist_code: string;
}

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedHour?: number;
  onAppointmentCreated?: () => void;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedHour,
  onAppointmentCreated
}: NewAppointmentDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    patient_id: '',
    specialist_id: '',
    reason: '',
    duration: 30
  });

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchSpecialists();
    }
  }, [open]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_code')
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('id, first_name, last_name, specialist_code')
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
    if (!selectedDate || selectedHour === undefined) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const appointmentTime = `${selectedHour.toString().padStart(2, '0')}:00:00`;
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: formData.patient_id,
          specialist_id: formData.specialist_id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: appointmentTime,
          reason: formData.reason,
          duration_minutes: formData.duration,
          status: 'Programada',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Cita programada',
        description: 'La cita se ha creado exitosamente',
      });

      // Reset form
      setFormData({
        patient_id: '',
        specialist_id: '',
        reason: '',
        duration: 30
      });

      onOpenChange(false);
      onAppointmentCreated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la cita',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFormattedDateTime = () => {
    if (!selectedDate || selectedHour === undefined) return '';
    return `${format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })} a las ${selectedHour}:00`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Cita Médica</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            {getFormattedDateTime()}
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient_id">Paciente *</Label>
            <Select 
              value={formData.patient_id} 
              onValueChange={(value) => setFormData({...formData, patient_id: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} - {patient.patient_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialist_id">Especialista *</Label>
            <Select 
              value={formData.specialist_id} 
              onValueChange={(value) => setFormData({...formData, specialist_id: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialista" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    {specialist.first_name} {specialist.last_name} - {specialist.specialist_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration">Duración (minutos)</Label>
            <Select 
              value={formData.duration.toString()} 
              onValueChange={(value) => setFormData({...formData, duration: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Motivo de la consulta</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="Descripción del motivo de la consulta"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cita'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

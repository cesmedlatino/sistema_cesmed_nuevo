import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NewMedicalRecordDialog } from '@/components/medical-records/NewMedicalRecordDialog';

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

interface ConsultingRoom {
  id: string;
  name: string;
  floor: string;
}

interface AppointmentData {
  id: string;
  patient_id: string;
  specialist_id: string;
  consulting_room_id: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  reason: string;
  status: string;
  notes?: string;
  payment_id?: string | null;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_code: string;
  };
  specialists?: {
    id: string;
    first_name: string;
    last_name: string;
    specialist_code: string;
  };
  consulting_rooms?: {
    id: string;
    name: string;
    floor: string;
  };
}

interface PaymentData {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
  confirmado: boolean;
  estado_pago: string;
  observaciones: string | null;
  concepto: { nombre: string };
  modalidad: { nombre: string } | null;
  tipo_confirmacion: string | null;
  archivo_confirmacion: string | null;
}

interface EditAppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentData | null;
  onAppointmentUpdated?: () => void;
}

export function EditAppointmentForm({
  open,
  onOpenChange,
  appointment,
  onAppointmentUpdated
}: EditAppointmentFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [showNewMedicalRecordDialog, setShowNewMedicalRecordDialog] = useState(false);
  const [patientInfoOpen, setPatientInfoOpen] = useState(false);
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(true);
  const [appointmentInfoOpen, setAppointmentInfoOpen] = useState(true);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    patient_id: '',
    specialist_id: '',
    consulting_room_id: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: 30,
    reason: '',
    status: 'Programada',
    notes: ''
  });

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchSpecialists();
      fetchConsultingRooms();
      if (appointment?.payment_id) {
        fetchPaymentData(appointment.payment_id);
      }
      if (appointment?.patient_id) {
        fetchMedicalRecord(appointment.patient_id);
      }
    }
  }, [open, appointment?.payment_id, appointment?.patient_id]);

  // Cargar datos de la cita cuando cambia el appointment
  useEffect(() => {
    if (appointment && open) {
      console.log('EditAppointmentForm - Cargando datos de la cita:', appointment);
      
      // Convertir la fecha al formato correcto para el input date
      let formattedDate = appointment.appointment_date;
      if (formattedDate) {
        const date = new Date(formattedDate + 'T00:00:00');
        formattedDate = date.toISOString().split('T')[0];
      }
      
      const newFormData = {
        patient_id: appointment.patient_id || '',
        specialist_id: appointment.specialist_id || '',
        consulting_room_id: appointment.consulting_room_id || 'UNASSIGNED',
        appointment_date: formattedDate || '',
        appointment_time: appointment.appointment_time || '',
        duration_minutes: appointment.duration_minutes || 30,
        reason: appointment.reason || '',
        status: appointment.status || 'Programada',
        notes: appointment.notes || ''
      };
      
      console.log('EditAppointmentForm - Estableciendo datos del formulario:', newFormData);
      setFormData(newFormData);
    }
  }, [appointment, open]);

  // Limpiar formulario cuando se cierra
  useEffect(() => {
    if (!open) {
      console.log('EditAppointmentForm - Limpiando formulario al cerrar');
      setFormData({
        patient_id: '',
        specialist_id: '',
        consulting_room_id: '',
        appointment_date: '',
        appointment_time: '',
        duration_minutes: 30,
        reason: '',
        status: 'Programada',
        notes: ''
      });
      setPaymentData(null);
      setMedicalRecord(null);
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

  const fetchConsultingRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('consulting_rooms')
        .select('id, name, floor')
        .eq('status', 'Disponible')
        .order('name');

      if (error) throw error;
      setConsultingRooms(data || []);
    } catch (error) {
      console.error('Error fetching consulting rooms:', error);
    }
  };

  const fetchPaymentData = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          id,
          fecha_pago,
          monto_pagado,
          confirmado,
          estado_pago,
          observaciones,
          tipo_confirmacion,
          archivo_confirmacion,
          concepto!inner(nombre),
          modalidad(nombre)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      setPaymentData(data as PaymentData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setPaymentData(null);
    }
  };

  const fetchMedicalRecord = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setMedicalRecord(data);
    } catch (error) {
      console.error('Error fetching medical record:', error);
      setMedicalRecord(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment) return;

    setLoading(true);
    try {
      console.log('Actualizando cita con datos:', formData);
      
      // Verificar si existe un pago asociado y si está confirmado
      if (appointment.payment_id) {
        const { data: payment, error: paymentError } = await supabase
          .from('pagos')
          .select('confirmado, estado_pago')
          .eq('id', appointment.payment_id)
          .single();

        if (paymentError) {
          console.error('Error al verificar el pago:', paymentError);
        } else if (payment && !payment.confirmado) {
          toast({
            title: 'Pago no confirmado',
            description: 'No se puede actualizar la cita porque el pago asociado no está confirmado. Por favor, confirme el pago primero.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }
      
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: formData.patient_id,
          specialist_id: formData.specialist_id,
          consulting_room_id: formData.consulting_room_id === 'UNASSIGNED' ? null : formData.consulting_room_id,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          duration_minutes: formData.duration_minutes,
          reason: formData.reason,
          status: formData.status
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: 'Cita actualizada',
        description: 'La cita se ha actualizada exitosamente',
      });

      onOpenChange(false);
      onAppointmentUpdated?.();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la cita',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // El formulario se limpia en el useEffect cuando open es false
  };

  const selectedPatient = patients.find(p => p.id === formData.patient_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cita Médica</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sección: Información del Paciente */}
          <Collapsible open={patientInfoOpen} onOpenChange={setPatientInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">Información del Paciente</h3>
                  {!patientInfoOpen && selectedPatient && (
                    <span className="text-sm text-muted-foreground">
                      {selectedPatient.first_name} {selectedPatient.last_name} - {selectedPatient.patient_code}
                    </span>
                  )}
                </div>
                {patientInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
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
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Sección: Información de la Historia */}
          {selectedPatient && (
            <Collapsible open={medicalHistoryOpen} onOpenChange={setMedicalHistoryOpen}>
              <div className="rounded-lg border bg-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Información de la Historia</h3>
                    {!medicalHistoryOpen && medicalRecord && (
                      <span className="text-sm text-muted-foreground">
                        {medicalRecord.hms} - {medicalRecord.especialidad}
                      </span>
                    )}
                  </div>
                  {medicalHistoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    {medicalRecord ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Número de Historia</Label>
                            <p className="font-medium">{medicalRecord.hms}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Especialidad</Label>
                            <p className="font-medium">{medicalRecord.especialidad || 'No especificada'}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Última modificación</Label>
                          <p className="font-medium">
                            {new Date(medicalRecord.updated_at).toLocaleString('es-PE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-4">El paciente no tiene historia clínica registrada</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewMedicalRecordDialog(true)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          Crear Nueva Historia
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Sección: Información de la Cita */}
          <Collapsible open={appointmentInfoOpen} onOpenChange={setAppointmentInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <h3 className="font-semibold text-lg">Información de la Cita</h3>
                {appointmentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
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
                    <Label htmlFor="consulting_room_id">Consultorio</Label>
                    <Select 
                      value={formData.consulting_room_id} 
                      onValueChange={(value) => setFormData({...formData, consulting_room_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar consultorio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNASSIGNED">Sin asignar</SelectItem>
                        {consultingRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} {room.floor && `- Piso ${room.floor}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="appointment_date">Fecha *</Label>
                      <Input
                        id="appointment_date"
                        type="date"
                        value={formData.appointment_date}
                        onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="appointment_time">Hora *</Label>
                      <Input
                        id="appointment_time"
                        type="time"
                        value={formData.appointment_time}
                        onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration_minutes">Duración (min)</Label>
                      <Select 
                        value={formData.duration_minutes.toString()} 
                        onValueChange={(value) => setFormData({...formData, duration_minutes: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="20">20 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                          <SelectItem value="90">90 minutos</SelectItem>
                          <SelectItem value="120">120 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status">Estado de la Cita</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Programada">Programada</SelectItem>
                        <SelectItem value="Completada">Completada</SelectItem>
                        <SelectItem value="Anulada">Anulada</SelectItem>
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
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Sección: Información del Pago */}
          <Collapsible open={paymentInfoOpen} onOpenChange={setPaymentInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <h3 className="font-semibold text-lg">Información del Pago</h3>
                {paymentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  {paymentData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Concepto</Label>
                          <p className="font-medium">{paymentData.concepto.nombre}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Monto Pagado</Label>
                          <p className="font-medium">S/. {paymentData.monto_pagado.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Fecha de Pago</Label>
                          <p className="font-medium">
                            {new Date(paymentData.fecha_pago).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Estado</Label>
                          <div className="flex gap-2 items-center">
                            <Badge variant={paymentData.confirmado ? "default" : "secondary"}>
                              {paymentData.confirmado ? 'Confirmado' : 'No Confirmado'}
                            </Badge>
                            <Badge variant="outline">{paymentData.estado_pago}</Badge>
                          </div>
                        </div>
                      </div>

                      {paymentData.modalidad && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Modalidad de Pago</Label>
                          <p className="font-medium">{paymentData.modalidad.nombre}</p>
                        </div>
                      )}

                      {paymentData.tipo_confirmacion && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Tipo de Confirmación</Label>
                          <p className="font-medium">{paymentData.tipo_confirmacion}</p>
                        </div>
                      )}

                      {paymentData.archivo_confirmacion && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Archivo de Confirmación</Label>
                          <a 
                            href={paymentData.archivo_confirmacion} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            Ver comprobante
                          </a>
                        </div>
                      )}

                      {paymentData.observaciones && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Observaciones</Label>
                          <p className="text-sm">{paymentData.observaciones}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No hay información de pago asociada a esta cita.</p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar Cita'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>

      <NewMedicalRecordDialog
        open={showNewMedicalRecordDialog}
        onOpenChange={setShowNewMedicalRecordDialog}
        preselectedPatientId={selectedPatient?.id}
        onSuccess={() => {
          if (selectedPatient) {
            fetchMedicalRecord(selectedPatient.id);
          }
          setShowNewMedicalRecordDialog(false);
        }}
      />
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAvailabilityCheck } from '@/hooks/useAvailabilityCheck';
import { useSpecialistSchedules } from '@/hooks/useSpecialistSchedules';
import { SpecialistScheduleDetails } from '@/components/appointments/SpecialistScheduleDetails';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, FileText, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { NewMedicalRecordDialog } from '@/components/medical-records/NewMedicalRecordDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CalendarEvent {
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
  patients?: any;
  specialists?: any;
  consulting_rooms?: any;
}

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: CalendarEvent | null;
  onSuccess: () => void;
}

export function EditAppointmentDialog({ 
  open, 
  onOpenChange, 
  appointment,
  onSuccess 
}: EditAppointmentDialogProps) {
  const { toast } = useToast();
  const { checkAvailability, checking } = useAvailabilityCheck();
  
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [consultingRooms, setConsultingRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);
  const [scheduleDetailsVisible, setScheduleDetailsVisible] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showNewMedicalRecordDialog, setShowNewMedicalRecordDialog] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  
  // Estados para controlar secciones colapsables (inician colapsadas)
  const [patientInfoOpen, setPatientInfoOpen] = useState(false);
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(false);
  const [appointmentInfoOpen, setAppointmentInfoOpen] = useState(false);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(false);

  const [formData, setFormData] = useState({
    specialist_id: '',
    consulting_room_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    duration: 20,
    reason: '',
    status: 'Programada',
    notes: ''
  });

  const { schedules, loading: schedulesLoading } = useSpecialistSchedules(formData.specialist_id);

  // Calcular hora de fin
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Cargar listas y datos relacionados cuando se abre el diálogo
  useEffect(() => {
    if (open && appointment) {
      console.log('EditAppointmentDialog - abriendo con cita:', appointment.id);

      // Listas base
      fetchSpecialists();
      fetchConsultingRooms();

      // Datos de historia clínica
      if (appointment.patient_id) {
        fetchMedicalRecord(appointment.patient_id);
      }

      // Datos de pago
      if (appointment.payment_id) {
        setPaymentId(appointment.payment_id);
        fetchPaymentData(appointment.payment_id);
      } else {
        setPaymentId(null);
        setPaymentData(null);
        setPaymentConfirmed(false);
      }
    }
  }, [open, appointment?.id, appointment?.patient_id, appointment?.payment_id]);

  // Cargar datos de la cita en el formulario cuando cambia la cita o se abre el diálogo
  useEffect(() => {
    if (open && appointment) {
      console.log('EditAppointmentDialog - cargando datos de la cita en formulario');

      // Asegurar formato correcto de fecha para el input date (YYYY-MM-DD)
      let formattedDate = appointment.appointment_date;
      if (formattedDate) {
        const date = new Date(formattedDate + 'T00:00:00');
        formattedDate = date.toISOString().split('T')[0];
      }

      const duration = appointment.duration_minutes || 30;
      const endTime = calculateEndTime(appointment.appointment_time, duration);

      const newFormData = {
        specialist_id: appointment.specialist_id || '',
        consulting_room_id: appointment.consulting_room_id || '',
        appointment_date: formattedDate || '',
        start_time: appointment.appointment_time || '',
        end_time: endTime,
        duration,
        reason: appointment.reason || 'Consulta Médica',
        status: appointment.status || 'Programada',
        notes: appointment.notes || ''
      };

      console.log('EditAppointmentDialog - formData establecido (primera carga):', newFormData);
      setFormData(newFormData);

      // Segunda carga inmediata para evitar el bug de no mostrar datos en la primera apertura
      setTimeout(() => {
        console.log('EditAppointmentDialog - formData establecido (segunda carga):', newFormData);
        setFormData(prev => ({ ...prev, ...newFormData }));
      }, 0);
    }
  }, [open, appointment]);

  // Limpiar estado cuando se cierra el diálogo
  useEffect(() => {
    if (!open) {
      setFormData({
        specialist_id: '',
        consulting_room_id: '',
        appointment_date: '',
        start_time: '',
        end_time: '',
        duration: 20,
        reason: '',
        status: 'Programada',
        notes: ''
      });
      setPaymentId(null);
      setPaymentData(null);
      setPaymentConfirmed(false);
      setMedicalRecord(null);
      setShowScheduleDetails(false);
      setScheduleDetailsVisible(false);
    }
  }, [open]);

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

  const handleRefreshAppointmentInfo = () => {
    if (!appointment) return;

    console.log('EditAppointmentDialog - recargando datos de la cita manualmente');

    let formattedDate = appointment.appointment_date;
    if (formattedDate) {
      const date = new Date(formattedDate + 'T00:00:00');
      formattedDate = date.toISOString().split('T')[0];
    }

    const duration = appointment.duration_minutes || 30;
    const endTime = calculateEndTime(appointment.appointment_time, duration);

    const newFormData = {
      specialist_id: appointment.specialist_id || '',
      consulting_room_id: appointment.consulting_room_id || '',
      appointment_date: formattedDate || '',
      start_time: appointment.appointment_time || '',
      end_time: endTime,
      duration,
      reason: appointment.reason || 'Consulta Médica',
      status: appointment.status || 'Programada',
      notes: appointment.notes || ''
    };

    setFormData(newFormData);
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
          *,
          concepto:concepto_id (nombre, monto),
          modalidad:modalidad_id (nombre)
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      if (data) {
        setPaymentData(data);
        setPaymentConfirmed(data.confirmado || false);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    }
  };

  const fetchMedicalRecord = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          medical_record_templates (name),
          specialists (first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setMedicalRecord(data);
      }
    } catch (error) {
      console.error('Error fetching medical record:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointment?.patient_id) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un paciente',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentConfirmed) {
      toast({
        title: 'Error',
        description: 'El pago debe estar confirmado antes de crear la cita',
        variant: 'destructive',
      });
      return;
    }

    const availabilityResult = await checkAvailability(
      formData.specialist_id,
      formData.appointment_date,
      formData.start_time,
      formData.end_time,
      formData.consulting_room_id || undefined,
      appointment.id  // Pasar el ID de la cita para excluirla de la validación
    );

    if (!availabilityResult.is_available) {
      toast({
        title: 'Horario no disponible',
        description: availabilityResult.conflict_reason || 'El horario seleccionado no está disponible',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: appointment.patient_id,
          specialist_id: formData.specialist_id,
          consulting_room_id: formData.consulting_room_id || null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.start_time,
          duration_minutes: formData.duration,
          reason: formData.reason,
          status: formData.status,
          notes: formData.notes || null,
          payment_id: paymentId,
          payment_confirmed: paymentConfirmed,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Cita actualizada correctamente',
      });

      onSuccess();
      onOpenChange(false);
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

  const handlePaymentSuccess = async (newPaymentId: string) => {
    setPaymentId(newPaymentId);
    await fetchPaymentData(newPaymentId);
    setShowPaymentDialog(false);
  };

  const handleMedicalRecordCreated = async () => {
    if (appointment?.patient_id) {
      await fetchMedicalRecord(appointment.patient_id);
    }
    setShowNewMedicalRecordDialog(false);
  };

  if (!appointment) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cita Médica</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información del Paciente */}
            <Collapsible open={patientInfoOpen} onOpenChange={setPatientInfoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg">
                <div className="flex flex-col items-start">
                  <h3 className="text-lg font-semibold">Información del Paciente</h3>
                  <span className="text-xs text-muted-foreground">
                    Detalles de la Información del Paciente
                  </span>
                  {!patientInfoOpen && appointment.patients && (
                    <span className="mt-1 text-sm text-muted-foreground">
                      {appointment.patients.first_name} {appointment.patients.last_name} - {appointment.patients.patient_code}
                    </span>
                  )}
                </div>
                {patientInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.patient_code}</div>
                  </div>
                  <div>
                    <Label>DNI</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.dni}</div>
                  </div>
                  <div>
                    <Label>Nombres</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.first_name}</div>
                  </div>
                  <div>
                    <Label>Apellidos</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.last_name}</div>
                  </div>
                  <div>
                    <Label>Género</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.gender}</div>
                  </div>
                  <div>
                    <Label>Fecha de Nacimiento</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.birth_date}</div>
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.email || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <div className="text-sm p-2 bg-muted rounded">{appointment.patients?.address || 'N/A'}</div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Información de la Historia */}
            <Collapsible open={medicalHistoryOpen} onOpenChange={setMedicalHistoryOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg">
                <div className="flex flex-col items-start">
                  <h3 className="text-lg font-semibold">Información de la Historia</h3>
                  <span className="text-xs text-muted-foreground">
                    Detalles de la Información de la Historia
                  </span>
                  {!medicalHistoryOpen && medicalRecord && (
                    <span className="mt-1 text-sm text-muted-foreground">
                      {medicalRecord.hms} - {medicalRecord.especialidad}
                    </span>
                  )}
                </div>
                {medicalHistoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {medicalRecord ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p><strong>Nro Historia:</strong> {medicalRecord.hms}</p>
                      <p><strong>Última modificación:</strong> {new Date(medicalRecord.updated_at).toLocaleString()}</p>
                      <p><strong>Especialidad:</strong> {medicalRecord.especialidad}</p>
                      <p><strong>Plantilla:</strong> {medicalRecord.medical_record_templates?.name}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewMedicalRecordDialog(true)}
                        className="w-full"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Crear Nueva Historia (Otra Especialidad)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">El paciente no tiene historia clínica registrada</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewMedicalRecordDialog(true)}
                      className="w-full"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Crear Nueva Historia
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Información de la Cita */}
            <Collapsible open={appointmentInfoOpen} onOpenChange={setAppointmentInfoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg">
                <div className="flex flex-col items-start">
                  <h3 className="text-lg font-semibold">Información de la Cita</h3>
                  {formData.appointment_date && (
                    <span className="text-sm text-muted-foreground">
                      {formData.appointment_date} | {formData.start_time} - {formData.end_time} ({formData.duration} min)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <RotateCw
                    className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRefreshAppointmentInfo();
                    }}
                  />
                  {appointmentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialist">Especialista *</Label>
                    <Select
                      value={formData.specialist_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, specialist_id: value });
                        setShowScheduleDetails(true);
                      }}
                    >
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

                  <div>
                    <Label htmlFor="consulting_room">Consultorio</Label>
                    <Select
                      value={formData.consulting_room_id}
                      onValueChange={(value) => setFormData({ ...formData, consulting_room_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar consultorio" />
                      </SelectTrigger>
                      <SelectContent>
                        {consultingRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} - Piso {room.floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date">Fecha *</Label>
                    <Input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="start_time">Hora de Inicio *</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setFormData({
                          ...formData,
                          start_time: newStartTime,
                          end_time: calculateEndTime(newStartTime, formData.duration)
                        });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duración (minutos) *</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          duration: newDuration,
                          end_time: calculateEndTime(formData.start_time, newDuration)
                        });
                      }}
                      min="5"
                      step="5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_time">Hora de Fin</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="reason">Motivo de la Consulta *</Label>
                    <Input
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Estado</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Programada">Programada</SelectItem>
                        <SelectItem value="Sin Programar">Sin Programar</SelectItem>
                        <SelectItem value="Completada">Completada</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                        <SelectItem value="En Proceso">En Proceso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {showScheduleDetails && formData.specialist_id && (
                  <SpecialistScheduleDetails
                    specialistId={formData.specialist_id}
                    schedules={schedules}
                    isVisible={scheduleDetailsVisible}
                    onToggle={() => setScheduleDetailsVisible(!scheduleDetailsVisible)}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Información del Pago */}
            <Collapsible open={paymentInfoOpen} onOpenChange={setPaymentInfoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted rounded-lg">
                <div className="flex flex-col items-start">
                  <h3 className="text-lg font-semibold">Información del Pago</h3>
                  <span className="text-xs text-muted-foreground">
                    Detalles de la Información del Pago
                  </span>
                  {!paymentInfoOpen && paymentData && (
                    <span className="mt-1 text-sm text-muted-foreground">
                      {paymentData.concepto?.nombre} - S/ {paymentData.monto_pagado} - {paymentData.estado_pago}
                    </span>
                  )}
                </div>
                {paymentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {paymentData ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <p><strong>Concepto:</strong> {paymentData.concepto?.nombre}</p>
                      <p><strong>Monto:</strong> S/ {paymentData.monto_pagado}</p>
                      <p><strong>Estado:</strong> {paymentData.estado_pago}</p>
                      <p><strong>Confirmado:</strong> {paymentConfirmed ? 'Sí' : 'No'}</p>
                      {paymentData.modalidad && (
                        <p><strong>Modalidad:</strong> {paymentData.modalidad.nombre}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPaymentDialog(true)}
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Modificar Pago
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">No hay pago registrado para esta cita</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPaymentDialog(true)}
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Registrar Pago
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || checking || !paymentConfirmed}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        patientId={appointment.patient_id}
        onPaymentSaved={handlePaymentSuccess}
        paymentId={paymentId || undefined}
      />

      <NewMedicalRecordDialog
        open={showNewMedicalRecordDialog}
        onOpenChange={setShowNewMedicalRecordDialog}
        onSuccess={handleMedicalRecordCreated}
        preselectedPatientId={appointment.patient_id}
      />
    </>
  );
}

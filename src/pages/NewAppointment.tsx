import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAvailabilityCheck } from '@/hooks/useAvailabilityCheck';
import { useSpecialistSchedules } from '@/hooks/useSpecialistSchedules';
import { SpecialistScheduleDetails } from '@/components/appointments/SpecialistScheduleDetails';
import { PatientSearch } from '@/components/medical-records/PatientSearch';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { ArrowLeft, UserPlus, CreditCard, FileText, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { SpecialistDayScheduleDialog } from '@/components/appointments/SpecialistDayScheduleDialog';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { NewMedicalRecordDialog } from '@/components/medical-records/NewMedicalRecordDialog';
import { PatientMedicalRecordsSelector } from '@/components/medical-records/PatientMedicalRecordsSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getLocalDateString } from '@/lib/utils';

// Helper para obtener la hora más próxima en intervalos de 15 minutos
const getNextQuarterHour = (): string => {
  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();
  
  // Calcular el próximo intervalo de 15 minutos
  const nextQuarter = Math.ceil(minutes / 15) * 15;
  
  if (nextQuarter === 60) {
    const nextHour = hours + 1;
    if (nextHour >= 24) {
      return '00:00';
    }
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${nextQuarter.toString().padStart(2, '0')}`;
};

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
}

interface MedicalRecord {
  id: string;
  hms: string;
  especialidad: string | null;
  visit_date: string;
  status: string | null;
  specialist_id: string | null;
  specialist?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
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

export function NewAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { checkAvailability, checking } = useAvailabilityCheck();
  
  // Determinar si estamos en modo edición
  const isEditMode = searchParams.get('mode') === 'edit';
  const appointmentId = searchParams.get('id');
  
  // Validar que appointmentId sea un UUID válido
  const isValidUUID = (str: string | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<MedicalRecord | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showNewMedicalRecordDialog, setShowNewMedicalRecordDialog] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);
  // Estados para controlar secciones colapsables
  const [patientInfoOpen, setPatientInfoOpen] = useState(false);
  const [medicalHistoryOpen, setMedicalHistoryOpen] = useState(true);
  const [appointmentInfoOpen, setAppointmentInfoOpen] = useState(true);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Función auxiliar para calcular hora de fin (definida primero para usarla en getDefaultFormData)
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Inicializar con valores por defecto para nueva cita
  const getDefaultFormData = () => {
    const todayDate = getLocalDateString();
    const nextTime = getNextQuarterHour();
    return {
      specialist_id: '',
      consulting_room_id: '',
      appointment_date: todayDate,
      start_time: nextTime,
      end_time: calculateEndTime(nextTime, 20),
      duration: 20,
      reason: 'Consulta',
      status: 'Programada'
    };
  };

  const [formData, setFormData] = useState(getDefaultFormData());

  const { schedules, loading: schedulesLoading } = useSpecialistSchedules(formData.specialist_id);

  useEffect(() => {
    fetchSpecialists();
    fetchConsultingRooms();
  }, []);

  // Effect para cargar datos en modo edición
  useEffect(() => {
    if (isEditMode && appointmentId && isValidUUID(appointmentId)) {
      fetchAppointmentData(appointmentId);
    } else if (isEditMode) {
      // Si no hay appointmentId válido pero hay parámetros, cargar desde query params
      loadFromQueryParams();
    }
  }, [isEditMode, appointmentId]);

  // Reset selected medical record when patient changes
  useEffect(() => {
    if (!selectedPatient) {
      setSelectedMedicalRecord(null);
    }
  }, [selectedPatient]);

  const loadFromQueryParams = async () => {
    try {
      const patientId = searchParams.get('patient_id');
      const specialistId = searchParams.get('specialist_id');
      const consultingRoomId = searchParams.get('consulting_room_id');
      const appointmentDate = searchParams.get('appointment_date');
      const appointmentTime = searchParams.get('appointment_time');
      const durationMinutes = searchParams.get('duration_minutes');
      const reason = searchParams.get('reason');
      const status = searchParams.get('status');
      const paymentIdParam = searchParams.get('payment_id');

      // Cargar paciente
      if (patientId && isValidUUID(patientId)) {
        await fetchPatientData(patientId);
      }

      // Precargar formulario
      setFormData({
        specialist_id: specialistId || '',
        consulting_room_id: consultingRoomId || '',
        appointment_date: appointmentDate || '',
        start_time: appointmentTime || '',
        end_time: appointmentTime && durationMinutes ? 
          calculateEndTime(appointmentTime, parseInt(durationMinutes)) : '',
        duration: durationMinutes ? parseInt(durationMinutes) : 30,
        reason: reason || '',
        status: status || 'Programada'
      });

      // Cargar pago si existe
      if (paymentIdParam && isValidUUID(paymentIdParam)) {
        setPaymentId(paymentIdParam);
        await fetchPaymentData(paymentIdParam);
      }
    } catch (error) {
      console.error('Error loading from query params:', error);
    }
  };

  const fetchAppointmentData = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner (
            id,
            patient_code,
            first_name,
            last_name,
            dni,
            birth_date,
            gender,
            phone,
            email,
            address
          ),
          specialists!inner (
            id,
            first_name,
            last_name,
            specialist_code
          ),
          consulting_rooms (
            id,
            name,
            floor
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      if (data) {
        console.log('Datos de la cita cargados:', data);
        
        // Cargar datos del paciente
        if (data.patients) {
          setSelectedPatient(data.patients);
        }

        // Precargar formulario con datos de la cita
        setFormData({
          specialist_id: data.specialist_id || '',
          consulting_room_id: data.consulting_room_id || '',
          appointment_date: data.appointment_date || '',
          start_time: data.appointment_time || '',
          end_time: data.appointment_time && data.duration_minutes ? 
            calculateEndTime(data.appointment_time, data.duration_minutes) : '',
          duration: data.duration_minutes || 30,
          reason: data.reason || '',
          status: data.status || 'Programada'
        });

        // Cargar datos de pago si existen
        if (data.payment_id) {
          setPaymentId(data.payment_id);
          setPaymentConfirmed(data.payment_confirmed || false);
          await fetchPaymentData(data.payment_id);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la cita',
        variant: 'destructive',
      });
    }
  };

  const fetchPatientData = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedPatient(data);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del paciente',
        variant: 'destructive',
      });
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
          *,
          concepto:concepto_id (
            id,
            nombre,
            descripcion,
            monto
          ),
          modalidad:modalidad_id (
            id,
            nombre,
            descripcion
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      if (data) {
        setPaymentData(data);
        setPaymentConfirmed(data.confirmado || false);
        console.log('Datos de pago cargados:', data);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del pago',
        variant: 'destructive',
      });
    }
  };

  const handleMedicalRecordSelect = (record: MedicalRecord | null) => {
    setSelectedMedicalRecord(record);
    
    // Auto-fill specialist and consulting room based on selected medical record
    if (record?.specialist_id) {
      const specialist = specialists.find(s => s.id === record.specialist_id);
      let defaultConsultingRoomId = '';
      
      if (specialist) {
        const fullName = `${specialist.first_name} ${specialist.last_name}`.toLowerCase();
        
        // Asignar consultorio por defecto según especialista
        if (fullName.includes('jose carlos huaman') || fullName.includes('josé carlos huaman')) {
          const oftRoom = consultingRooms.find(r => 
            r.name.toLowerCase().includes('oftalmol') || 
            r.name.toLowerCase().includes('tercer piso')
          );
          if (oftRoom) defaultConsultingRoomId = oftRoom.id;
        } else if (fullName.includes('oryana meza')) {
          const dermRoom = consultingRooms.find(r => 
            r.name.toLowerCase().includes('dermatol') || 
            r.name.toLowerCase().includes('segundo piso')
          );
          if (dermRoom) defaultConsultingRoomId = dermRoom.id;
        }
      }
      
      setFormData(prev => ({
        ...prev, 
        specialist_id: record.specialist_id || prev.specialist_id,
        consulting_room_id: defaultConsultingRoomId || prev.consulting_room_id
      }));
    }
  };

  const handleSpecialistChange = (specialistId: string) => {
    // Buscar el especialista para asignar consultorio por defecto
    const specialist = specialists.find(s => s.id === specialistId);
    let defaultConsultingRoomId = '';
    
    if (specialist) {
      const fullName = `${specialist.first_name} ${specialist.last_name}`.toLowerCase();
      
      // Asignar consultorio por defecto según especialista
      if (fullName.includes('jose carlos huaman') || fullName.includes('josé carlos huaman')) {
        const oftRoom = consultingRooms.find(r => 
          r.name.toLowerCase().includes('oftalmol') || 
          r.name.toLowerCase().includes('tercer piso')
        );
        if (oftRoom) defaultConsultingRoomId = oftRoom.id;
      } else if (fullName.includes('oryana meza')) {
        const dermRoom = consultingRooms.find(r => 
          r.name.toLowerCase().includes('dermatol') || 
          r.name.toLowerCase().includes('segundo piso')
        );
        if (dermRoom) defaultConsultingRoomId = dermRoom.id;
      }
    }
    
    setFormData(prev => ({
      ...prev, 
      specialist_id: specialistId,
      consulting_room_id: defaultConsultingRoomId || prev.consulting_room_id
    }));
    setShowScheduleDetails(false);
  };

  const handleStartTimeChange = (startTime: string) => {
    setFormData(prev => ({
      ...prev,
      start_time: startTime,
      end_time: calculateEndTime(startTime, prev.duration)
    }));
  };

  const handleDurationChange = (duration: number) => {
    setFormData(prev => ({
      ...prev,
      duration,
      end_time: prev.start_time ? calculateEndTime(prev.start_time, duration) : ''
    }));
  };

  const handlePaymentSaved = (newPaymentId: string, conceptoNombre?: string) => {
    // Validar que el paymentId sea un UUID válido
    if (newPaymentId && isValidUUID(newPaymentId)) {
      setPaymentId(newPaymentId);
      setPaymentConfirmed(true);
      
      // Actualizar el motivo con el concepto seleccionado
      if (conceptoNombre) {
        setFormData(prev => ({ ...prev, reason: conceptoNombre }));
      }
      
      // Cargar los datos del pago
      fetchPaymentData(newPaymentId);
      toast({
        title: 'Pago registrado',
        description: 'El pago ha sido registrado exitosamente. Ahora puede proceder a crear la cita.',
      });
    } else {
      console.error('PaymentId inválido recibido:', newPaymentId);
      toast({
        title: 'Advertencia',
        description: 'El pago se registró pero hubo un problema con el ID. Por favor recargue la página.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones específicas con mensajes detallados
    if (!selectedPatient) {
      toast({
        title: 'Paciente requerido',
        description: 'Por favor seleccione un paciente para la cita',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.specialist_id) {
      toast({
        title: 'Especialista requerido',
        description: 'Por favor seleccione un especialista',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.appointment_date) {
      toast({
        title: 'Fecha requerida',
        description: 'Por favor seleccione una fecha para la cita',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.start_time) {
      toast({
        title: 'Hora requerida',
        description: 'Por favor seleccione una hora de inicio',
        variant: 'destructive',
      });
      return;
    }

    // Validar pago confirmado solo en modo creación
    if (!isEditMode && !paymentConfirmed) {
      toast({
        title: 'Pago requerido',
        description: 'Debe registrar y confirmar el pago antes de programar la cita',
        variant: 'destructive',
      });
      return;
    }

    // Verificar que el pago esté confirmado en la base de datos
    if (paymentId && isValidUUID(paymentId)) {
      const { data: payment, error: paymentError } = await supabase
        .from('pagos')
        .select('confirmado, estado_pago')
        .eq('id', paymentId)
        .single();

      if (paymentError) {
        console.error('Error al verificar el pago:', paymentError);
        toast({
          title: 'Error',
          description: 'No se pudo verificar el estado del pago',
          variant: 'destructive',
        });
        return;
      }

      if (payment && !payment.confirmado) {
        toast({
          title: 'Pago no confirmado',
          description: 'El pago no está confirmado. Por favor, confirme el pago antes de crear la cita.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Verificar disponibilidad solo si no estamos editando
    if (!isEditMode) {
      const availability = await checkAvailability(
        formData.specialist_id,
        formData.appointment_date,
        formData.start_time,
        formData.end_time,
        formData.consulting_room_id || undefined
      );

      if (!availability?.is_available) {
        toast({
          title: 'Horario no disponible',
          description: availability?.conflict_reason || 'No se puede crear la cita en este horario',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Validar que el usuario esté autenticado
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Validar que todos los IDs sean UUIDs válidos
      if (!isValidUUID(selectedPatient.id)) {
        throw new Error('ID de paciente inválido');
      }

      if (!isValidUUID(formData.specialist_id)) {
        throw new Error('ID de especialista inválido');
      }

      if (formData.consulting_room_id && !isValidUUID(formData.consulting_room_id)) {
        throw new Error('ID de consultorio inválido');
      }

      if (paymentId && !isValidUUID(paymentId)) {
        throw new Error('ID de pago inválido');
      }
      
      const appointmentData = {
        patient_id: selectedPatient.id,
        specialist_id: formData.specialist_id,
        consulting_room_id: formData.consulting_room_id || null,
        appointment_date: formData.appointment_date,
        appointment_time: formData.start_time,
        reason: formData.reason || null,
        duration_minutes: formData.duration,
        status: formData.status,
        payment_id: paymentId && isValidUUID(paymentId) ? paymentId : null,
        payment_confirmed: paymentConfirmed,
        ...(isEditMode ? { updated_by: user.id } : { created_by: user.id })
      };
      
      if (isEditMode && appointmentId && isValidUUID(appointmentId)) {
        // Actualizar cita existente
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId);

        if (error) {
          console.error('Error updating appointment:', error);
          throw new Error(error.message || 'Error al actualizar la cita');
        }

        toast({
          title: 'Cita actualizada',
          description: 'La cita se ha actualizado exitosamente',
        });
      } else {
        // Crear nueva cita
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (error) {
          console.error('Error creating appointment:', error);
          throw new Error(error.message || 'Error al crear la cita');
        }

        console.log('Cita creada exitosamente:', data);

        toast({
          title: 'Cita programada',
          description: 'La cita se ha creado exitosamente',
        });
      }

      navigate('/appointments');
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: 'Error',
        description: error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la cita`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Gestión de Citas Médicas
          </Button>
          <h1 className="text-3xl font-bold">{isEditMode ? 'Editar Cita Médica' : 'Nueva Cita Médica'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección: Información del Paciente */}
          <Collapsible open={patientInfoOpen} onOpenChange={setPatientInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">Información del Paciente</h3>
                  {!patientInfoOpen && selectedPatient && (
                    <span className="text-sm text-muted-foreground">
                      {selectedPatient.first_name} {selectedPatient.last_name} - {selectedPatient.dni}
                    </span>
                  )}
                </div>
                {patientInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <PatientSearch
                        onPatientSelect={(patient) => {
                          setSelectedPatient(patient);
                        }}
                        selectedPatient={selectedPatient}
                        onMedicalRecordSelect={handleMedicalRecordSelect}
                        selectedMedicalRecord={selectedMedicalRecord}
                        showMedicalRecords={false}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="mt-8"
                      onClick={() => setShowNewPatientDialog(true)}
                      title="Nuevo Paciente"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedPatient && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                      <h4 className="font-medium mb-3">Datos del Paciente</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Código</Label>
                          <p className="font-medium">{selectedPatient.patient_code}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">DNI</Label>
                          <p className="font-medium">{selectedPatient.dni}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Nombre Completo</Label>
                          <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Género</Label>
                          <p className="font-medium">{selectedPatient.gender || 'No especificado'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Fecha de Nacimiento</Label>
                          <p className="font-medium">
                            {selectedPatient.birth_date 
                              ? new Date(selectedPatient.birth_date).toLocaleDateString('es-PE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'No registrada'
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Teléfono</Label>
                          <p className="font-medium">{selectedPatient.phone || 'No registrado'}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{selectedPatient.email || 'No registrado'}</p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-muted-foreground">Dirección</Label>
                          <p className="font-medium">{selectedPatient.address || 'No registrada'}</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                    {!medicalHistoryOpen && selectedMedicalRecord && (
                      <span className="text-sm text-muted-foreground">
                        {selectedMedicalRecord.hms} - {selectedMedicalRecord.especialidad}
                      </span>
                    )}
                  </div>
                  {medicalHistoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    {/* Lista de historias del paciente para seleccionar */}
                    <PatientMedicalRecordsSelector 
                      key={`records-${selectedPatient.id}-${recordsRefreshKey}`}
                      patientId={selectedPatient.id}
                      selectedRecord={selectedMedicalRecord}
                      onSelectRecord={handleMedicalRecordSelect}
                      onCreateNew={() => setShowNewMedicalRecordDialog(true)}
                    />
                    
                    {/* Info de la historia seleccionada */}
                    {selectedMedicalRecord ? (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Número de Historia</Label>
                            <p className="font-medium">{selectedMedicalRecord.hms}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Especialidad</Label>
                            <p className="font-medium">{selectedMedicalRecord.especialidad || 'No especificada'}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Fecha de Visita</Label>
                          <p className="font-medium">
                            {new Date(selectedMedicalRecord.visit_date).toLocaleDateString('es-PE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="pt-2 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewMedicalRecordDialog(true)}
                            className="flex items-center gap-2 w-full"
                          >
                            <FileText className="h-4 w-4" />
                            Crear Nueva Historia (Otra Especialidad)
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Sección: Información de la Cita */}
          <Collapsible open={appointmentInfoOpen} onOpenChange={setAppointmentInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">Información de la Cita</h3>
                  {!appointmentInfoOpen && formData.appointment_date && formData.start_time && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(formData.appointment_date).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} - {formData.start_time} a {formData.end_time} ({formData.duration} min)
                    </span>
                  )}
                </div>
                {appointmentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="specialist_id">Especialista *</Label>
                      <Select 
                        value={formData.specialist_id} 
                        onValueChange={handleSpecialistChange}
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
                          {consultingRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} {room.floor && `- Piso ${room.floor}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.specialist_id && (
                    <SpecialistScheduleDetails
                      specialistId={formData.specialist_id}
                      schedules={schedules}
                      isVisible={showScheduleDetails}
                      onToggle={() => setShowScheduleDetails(!showScheduleDetails)}
                    />
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="appointment_date">Fecha *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="appointment_date"
                          type="date"
                          value={formData.appointment_date}
                          onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                          required
                          className="flex-1"
                        />
                        {formData.specialist_id && formData.appointment_date && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 h-10 w-10 hover:bg-primary/10"
                            onClick={() => setShowScheduleDialog(true)}
                            title="Ver horarios disponibles"
                          >
                            <CalendarDays className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="start_time">Hora de Inicio *</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_time">Hora de Fin</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Select 
                      value={formData.duration.toString()} 
                      onValueChange={(value) => handleDurationChange(parseInt(value))}
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

                  <div>
                    <Label htmlFor="reason">Motivo de la consulta</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      placeholder="Descripción del motivo de la consulta"
                      rows={4}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Sección: Información de Pago */}
          <Collapsible open={paymentInfoOpen} onOpenChange={setPaymentInfoOpen}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <h3 className="font-semibold text-lg">Información de Pago</h3>
                  {!paymentInfoOpen && paymentConfirmed && paymentData && (
                    <span className="text-sm text-muted-foreground">
                      {paymentData.concepto?.nombre} - S/ {paymentData.monto_pagado?.toFixed(2)} - {paymentData.estado_pago}
                    </span>
                  )}
                </div>
                {paymentInfoOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div className="space-y-1">
                        <p className="font-medium">
                          {paymentConfirmed ? 'Pago Confirmado' : 'Pago Pendiente'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {paymentConfirmed 
                            ? 'El pago ha sido registrado y confirmado' 
                            : isEditMode 
                              ? 'Puede actualizar el estado del pago'
                              : 'Para programar la cita, debe registrar y confirmar el pago'
                          }
                        </p>
                        {paymentConfirmed && paymentData && (
                          <div className="mt-2 space-y-1 text-sm">
                            <p><span className="font-medium">Concepto:</span> {paymentData.concepto?.nombre || 'N/A'}</p>
                            <p><span className="font-medium">Monto:</span> S/ {paymentData.monto_pagado?.toFixed(2) || '0.00'}</p>
                            <p><span className="font-medium">Estado:</span> {paymentData.estado_pago || 'N/A'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={paymentConfirmed ? "outline" : "default"}
                      onClick={() => setShowPaymentDialog(true)}
                      disabled={!selectedPatient}
                    >
                      {paymentConfirmed ? 'Ver Pago' : 'Registrar Pago'}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading || checking || !paymentId || !paymentConfirmed}
            >
              {loading ? 'Guardando...' : isEditMode ? 'Actualizar Cita' : 'Crear Cita'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/appointments')}
            >
              Cancelar
            </Button>
          </div>
        </form>

        <NewPatientDialog
          isOpen={showNewPatientDialog}
          onClose={() => setShowNewPatientDialog(false)}
          onPatientCreated={(patient) => {
            setSelectedPatient(patient);
            setSelectedMedicalRecord(null);
            setShowNewPatientDialog(false);
          }}
        />

        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onPaymentSaved={handlePaymentSaved}
          patientId={selectedPatient?.id}
          specialistId={formData.specialist_id}
          paymentId={paymentId || undefined}
        />

        <NewMedicalRecordDialog
          open={showNewMedicalRecordDialog}
          onOpenChange={setShowNewMedicalRecordDialog}
          preselectedPatientId={selectedPatient?.id}
          onSuccess={() => {
            // Incrementar key para que el selector recargue las historias
            setRecordsRefreshKey(prev => prev + 1);
            setSelectedMedicalRecord(null);
            setShowNewMedicalRecordDialog(false);
          }}
        />

        {formData.specialist_id && formData.appointment_date && (
          <SpecialistDayScheduleDialog
            open={showScheduleDialog}
            onOpenChange={setShowScheduleDialog}
            specialistId={formData.specialist_id}
            specialistName={
              specialists.find(s => s.id === formData.specialist_id)
                ? `${specialists.find(s => s.id === formData.specialist_id)!.first_name} ${specialists.find(s => s.id === formData.specialist_id)!.last_name}`
                : 'Especialista'
            }
            date={formData.appointment_date}
            onSelectTime={(time) => handleStartTimeChange(time)}
          />
        )}
      </div>
    </AppLayout>
  );
}
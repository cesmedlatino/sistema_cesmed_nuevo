
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAvailabilityCheck } from '@/hooks/useAvailabilityCheck';
import { useSpecialistSchedules } from '@/hooks/useSpecialistSchedules';
import { SpecialistScheduleDetails } from './SpecialistScheduleDetails';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, User, Phone, Calendar, Clock, MapPin, ChevronLeft, AlertCircle, CreditCard, Wallet } from 'lucide-react';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { NewPatientDialog } from '@/components/patients/NewPatientDialog';
import { getLocalDateString } from '@/lib/utils';

// Helper para obtener la hora más próxima en intervalos de 15 minutos
const getNextQuarterHour = (): string => {
  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();
  
  // Calcular el próximo intervalo de 15 minutos
  const nextQuarter = Math.ceil(minutes / 15) * 15;
  
  if (nextQuarter === 60) {
    // Si llegamos a 60, pasar a la siguiente hora
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
  first_name: string;
  last_name: string;
  patient_code: string;
  dni: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
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

interface Appointment {
  id: string;
  patient_id: string;
  specialist_id: string;
  consulting_room_id: string;
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
    dni?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
    email?: string;
  };
  specialists?: {
    id: string;
    first_name: string;
    last_name: string;
    specialist_code: string;
    color: string;
  };
  consulting_rooms?: {
    id: string;
    name: string;
    floor: string;
  };
}

interface NewAppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppointmentCreated?: () => void;
  appointment?: Appointment | null;
  mode?: 'create' | 'edit';
  selectedDate?: Date;
  selectedHour?: number;
}

export function NewAppointmentForm({
  open,
  onOpenChange,
  onAppointmentCreated,
  appointment = null,
  mode = 'create',
  selectedDate,
  selectedHour
}: NewAppointmentFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [consultingRooms, setConsultingRooms] = useState<ConsultingRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [registeredPaymentId, setRegisteredPaymentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { checkAvailability, checking } = useAvailabilityCheck();

  const [formData, setFormData] = useState({
    patient_id: '',
    specialist_id: '',
    consulting_room_id: '',
    appointment_date: '',
    start_time: '',
    end_time: '',
    duration: 20,
    reason: '',
    status: 'Programada'
  });

  const { schedules, loading: schedulesLoading } = useSpecialistSchedules(formData.specialist_id);

  // Helper function to validate and filter items with valid IDs
  const filterValidItems = <T extends { id: string }>(items: T[]): T[] => {
    return items.filter(item => item.id && item.id.trim() !== '' && item.id !== 'undefined' && item.id !== 'null');
  };

  // Cargar datos del appointment cuando está en modo edición
  useEffect(() => {
    if (open && mode === 'edit' && appointment) {
      console.log('Cargando datos de la cita para editar:', appointment);
      
      // Buscar el paciente completo
      if (appointment.patients) {
        setSelectedPatient({
          id: appointment.patients.id,
          first_name: appointment.patients.first_name,
          last_name: appointment.patients.last_name,
          patient_code: appointment.patients.patient_code,
          dni: appointment.patients.dni || '',
          birth_date: appointment.patients.birth_date || '',
          gender: appointment.patients.gender || '',
          phone: appointment.patients.phone || '',
          email: appointment.patients.email || ''
        });
      }
      
      setFormData({
        patient_id: appointment.patient_id || '',
        specialist_id: appointment.specialist_id || '',
        consulting_room_id: appointment.consulting_room_id || '',
        appointment_date: appointment.appointment_date || '',
        start_time: appointment.appointment_time || '',
        end_time: calculateEndTime(appointment.appointment_time || '', appointment.duration_minutes || 30),
        duration: appointment.duration_minutes || 30,
        reason: appointment.reason || '',
        status: appointment.status || 'Programada'
      });
    } else if (open && mode === 'create') {
      // Reset form para crear nueva cita con valores por defecto
      setSelectedPatient(null);
      const todayDate = getLocalDateString();
      const nextTime = getNextQuarterHour();
      setFormData({
        patient_id: '',
        specialist_id: '',
        consulting_room_id: '',
        appointment_date: todayDate,
        start_time: nextTime,
        end_time: calculateEndTime(nextTime, 20),
        duration: 20,
        reason: 'Consulta',
        status: 'Programada'
      });
    }
  }, [open, mode, appointment]);

  // Configurar fecha y hora cuando se pasan como props (para crear nueva cita desde calendario)
  useEffect(() => {
    if (open && mode === 'create' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let timeStr = '';
      
      if (selectedHour !== undefined) {
        timeStr = `${selectedHour.toString().padStart(2, '0')}:00`;
      }
      
      setFormData(prev => ({
        ...prev,
        appointment_date: dateStr,
        start_time: timeStr,
        end_time: timeStr ? calculateEndTime(timeStr, prev.duration) : ''
      }));
    }
  }, [open, mode, selectedDate, selectedHour]);

  useEffect(() => {
    if (open) {
      fetchPatients();
      fetchSpecialists();
      fetchConsultingRooms();
    }
  }, [open]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, patient_code, dni, birth_date, gender, phone, email')
        .order('first_name');

      if (error) throw error;
      
      // Filter out patients with invalid IDs
      const validPatients = filterValidItems(data || []);
      setPatients(validPatients);
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
      
      // Filter out specialists with invalid IDs
      const validSpecialists = filterValidItems(data || []);
      setSpecialists(validSpecialists);
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
      
      // Filter out consulting rooms with invalid IDs
      const validRooms = filterValidItems(data || []);
      setConsultingRooms(validRooms);
    } catch (error) {
      console.error('Error fetching consulting rooms:', error);
    }
  };

  const searchPatients = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('search_patients', { search_term: searchTerm });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handlePatientSearch = (value: string) => {
    setPatientSearchTerm(value);
    searchPatients(value);
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setShowPatientSearch(false);
    setPatientSearchTerm('');
    setSearchResults([]);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return `${age - 1} años`;
    }
    return `${age} años`;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSpecialistChange = (specialistId: string) => {
    // Buscar el especialista para asignar consultorio por defecto
    const specialist = specialists.find(s => s.id === specialistId);
    let defaultConsultingRoomId = '';
    
    if (specialist) {
      const fullName = `${specialist.first_name} ${specialist.last_name}`.toLowerCase();
      
      // Asignar consultorio por defecto según especialista
      if (fullName.includes('jose carlos huaman') || fullName.includes('josé carlos huaman')) {
        // Buscar "Consultorio oftalmológico" o similar
        const oftRoom = consultingRooms.find(r => 
          r.name.toLowerCase().includes('oftalmol') || 
          r.name.toLowerCase().includes('tercer piso')
        );
        if (oftRoom) defaultConsultingRoomId = oftRoom.id;
      } else if (fullName.includes('oryana meza')) {
        // Buscar "Consultorio Dermatológico" o similar
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appointment_date || !formData.start_time || !formData.specialist_id) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    // Solo verificar disponibilidad si es una nueva cita o si cambió el horario/especialista/consultorio
    if (mode === 'create' || 
        (mode === 'edit' && appointment && (
          formData.specialist_id !== appointment.specialist_id ||
          formData.appointment_date !== appointment.appointment_date ||
          formData.start_time !== appointment.appointment_time ||
          formData.consulting_room_id !== appointment.consulting_room_id
        ))) {
      
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
      
      // Verificar si hay un pago registrado y si está confirmado
      if (registeredPaymentId) {
        const { data: payment, error: paymentError } = await supabase
          .from('pagos')
          .select('confirmado, estado_pago')
          .eq('id', registeredPaymentId)
          .single();

        if (paymentError) {
          console.error('Error al verificar el pago:', paymentError);
          toast({
            title: 'Error',
            description: 'No se pudo verificar el estado del pago',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (payment && !payment.confirmado) {
          toast({
            title: 'Pago no confirmado',
            description: 'No se puede crear la cita porque el pago no está confirmado. Por favor, confirme el pago antes de continuar.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }
      
      if (mode === 'create') {
        const appointmentData = {
          patient_id: formData.patient_id,
          specialist_id: formData.specialist_id,
          consulting_room_id: formData.consulting_room_id || null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.start_time,
          reason: formData.reason,
          duration_minutes: formData.duration,
          status: formData.status,
          payment_id: registeredPaymentId || null,
          created_by: user?.id
        };
        
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single();

        if (error) throw error;

        setCreatedAppointmentId(data.id);

        toast({
          title: 'Cita programada',
          description: 'La cita se ha creado exitosamente',
        });
      } else {
        // Modo edición - verificar si existe un pago asociado
        if (appointment?.payment_id) {
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
        
        const appointmentData = {
          patient_id: formData.patient_id,
          specialist_id: formData.specialist_id,
          consulting_room_id: formData.consulting_room_id || null,
          appointment_date: formData.appointment_date,
          appointment_time: formData.start_time,
          reason: formData.reason,
          duration_minutes: formData.duration,
          status: formData.status,
          updated_by: user?.id
        };

        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment!.id);

        if (error) throw error;

        toast({
          title: 'Cita actualizada',
          description: 'La cita se ha actualizado exitosamente',
        });
      }

      // Reset form solo si es creación
      if (mode === 'create') {
        setFormData({
          patient_id: '',
          specialist_id: '',
          consulting_room_id: '',
          appointment_date: '',
          start_time: '',
          end_time: '',
          duration: 20,
          reason: '',
          status: 'Programada'
        });
        setSelectedPatient(null);
        setCreatedAppointmentId(null);
      }

      onOpenChange(false);
      onAppointmentCreated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `No se pudo ${mode === 'create' ? 'crear' : 'actualizar'} la cita`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRegistered = (paymentId: string, conceptoNombre?: string) => {
    // Validar que el paymentId sea un UUID válido antes de procesarlo
    if (paymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      setRegisteredPaymentId(paymentId);
      
      // Actualizar el motivo con el concepto seleccionado
      if (conceptoNombre) {
        setFormData(prev => ({ ...prev, reason: conceptoNombre }));
      }
      
      toast({
        title: 'Pago registrado',
        description: 'El pago se ha registrado correctamente',
      });
      setPaymentDialogOpen(false);
    } else {
      console.error('PaymentId inválido recibido:', paymentId);
      toast({
        title: 'Advertencia', 
        description: 'El pago se procesó pero hubo un problema con el ID. Continúe con la creación de la cita.',
      });
      setPaymentDialogOpen(false);
    }
  };

  const handleNewPatientCreated = (patient: Patient) => {
    selectPatient(patient);
    setNewPatientDialogOpen(false);
    toast({
      title: 'Paciente creado',
      description: 'El paciente ha sido creado y seleccionado para la cita',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <ChevronLeft 
              className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" 
              onClick={() => onOpenChange(false)}
            />
            <DialogTitle className="text-xl font-semibold">
              {mode === 'create' ? 'Nueva Cita Médica' : 'Editar Cita Médica'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Paciente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Paciente
                </CardTitle>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setNewPatientDialogOpen(true)}
                >
                  Nuevo Paciente
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedPatient || showPatientSearch ? (
                <div className="space-y-3">
                  <Label>Buscar Paciente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, apellido o DNI..."
                      value={patientSearchTerm}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {searchResults.length > 0 && !selectedPatient && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto bg-background">
                      {searchResults.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => selectPatient(patient)}
                          className="p-3 hover:bg-muted cursor-pointer"
                        >
                          <div className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {patient.patient_code} • DNI: {patient.dni}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {selectedPatient && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-blue-900">
                          {selectedPatient.first_name} {selectedPatient.last_name}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Código:</span>
                            <div className="font-medium">{selectedPatient.patient_code}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">DNI:</span>
                            <div className="font-medium">{selectedPatient.dni}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Edad:</span>
                            <div className="font-medium">{calculateAge(selectedPatient.birth_date)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sexo:</span>
                            <div className="font-medium">{selectedPatient.gender}</div>
                          </div>
                        </div>
                        {selectedPatient.phone && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedPatient.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Información de la Cita */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información de la Cita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {room.name} {room.floor && `- Piso ${room.floor}`}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sección de detalles del especialista */}
              {formData.specialist_id && (
                <SpecialistScheduleDetails
                  specialistId={formData.specialist_id}
                  schedules={schedules}
                  isVisible={showScheduleDetails}
                  onToggle={() => setShowScheduleDetails(!showScheduleDetails)}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="appointment_date">Fecha *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="appointment_date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="start_time">Hora de Inicio *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="end_time">Hora de Fin</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      readOnly
                      className="pl-10 bg-muted"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {mode === 'edit' && (
                  <div>
                    <Label htmlFor="status">Estado</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({...formData, status: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Programada">
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Programada
                          </Badge>
                        </SelectItem>
                        <SelectItem value="Sin Programar">
                          <Badge variant="outline" className="text-gray-600 border-gray-300">
                            Sin Programar
                          </Badge>
                        </SelectItem>
                        <SelectItem value="Completada">
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Completada
                          </Badge>
                        </SelectItem>
                        <SelectItem value="Anulada">
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Anulada
                          </Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
            </CardContent>
          </Card>

          {/* Payment Information Section */}
          {mode === 'create' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Wallet className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Pago Pendiente</h4>
                      <p className="text-sm text-gray-600">Para programar la cita, debe registrar y confirmar el pago</p>
                    </div>
                  </div>
                  <Button 
                    type="button"
                    onClick={() => setPaymentDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!selectedPatient}
                  >
                    {registeredPaymentId ? 'Editar Pago' : 'Registrar Pago'}
                  </Button>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> La cita médica solo puede pasar al estado "Programada" si el pago ha sido confirmado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading || checking || !selectedPatient}
            >
              {loading ? (mode === 'create' ? 'Creando...' : 'Actualizando...') : (mode === 'create' ? 'Crear Cita' : 'Actualizar Cita')}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Payment Dialog */}
      {mode === 'create' && (
        <PaymentDialog
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          patientId={selectedPatient?.id}
          specialistId={formData.specialist_id}
          paymentId={registeredPaymentId || undefined}
          onPaymentSaved={handlePaymentRegistered}
        />
      )}

      {/* New Patient Dialog */}
      <NewPatientDialog
        isOpen={newPatientDialogOpen}
        onClose={() => setNewPatientDialogOpen(false)}
        onPatientCreated={handleNewPatientCreated}
      />
    </Dialog>
  );
}

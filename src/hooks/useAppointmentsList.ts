
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface AppointmentListItem {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  specialist_name: string;
  consulting_room_name: string;
  reason: string;
  status: string;
  specialist_id: string;
  patient_id: string;
  consulting_room_id: string;
  duration_minutes: number;
  payment_confirmed: boolean;
  payment_modality: string | null;
  payment_modality_icon: string | null;
  payment_status: string | null;
}

export type DateFilterType = 'all' | 'today' | 'date' | 'month';

interface SearchFilters {
  searchTerm: string;
  specialist_id?: string;
  dateFilterType: DateFilterType;
  selectedDate?: Date;
  selectedMonth?: Date;
}

export function useAppointmentsList() {
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ 
    searchTerm: '', 
    dateFilterType: 'today',
    selectedDate: new Date(),
    selectedMonth: new Date()
  });
  const { toast } = useToast();

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          status,
          specialist_id,
          patient_id,
          consulting_room_id,
          duration_minutes,
          payment_confirmed,
          patients!inner(first_name, last_name),
          specialists!inner(first_name, last_name),
          consulting_rooms(name),
          pagos(
            estado_pago,
            modalidad:modalidad_id(
              nombre,
              icono
            )
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Apply date filters only if not 'all'
      if (filters.dateFilterType !== 'all') {
        let startDate: string;
        let endDate: string;
        const today = format(new Date(), 'yyyy-MM-dd');

        switch (filters.dateFilterType) {
          case 'today':
            startDate = today;
            endDate = today;
            break;
          case 'date':
            const selectedDateStr = filters.selectedDate 
              ? format(filters.selectedDate, 'yyyy-MM-dd') 
              : today;
            startDate = selectedDateStr;
            endDate = selectedDateStr;
            break;
          case 'month':
            const monthDate = filters.selectedMonth || new Date();
            startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
            endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
            break;
          default:
            startDate = today;
            endDate = today;
        }

        query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: AppointmentListItem[] = (data || []).map(appointment => {
        // Handle pagos - can be object or array depending on relationship
        const pagosData = Array.isArray(appointment.pagos) 
          ? appointment.pagos[0] 
          : appointment.pagos;
        
        return {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          patient_name: `${appointment.patients.first_name} ${appointment.patients.last_name}`,
          specialist_name: `${appointment.specialists.first_name} ${appointment.specialists.last_name}`,
          consulting_room_name: appointment.consulting_rooms?.name || 'No asignado',
          reason: appointment.reason || 'Consulta médica',
          status: appointment.status || 'Programada',
          specialist_id: appointment.specialist_id || '',
          patient_id: appointment.patient_id || '',
          consulting_room_id: appointment.consulting_room_id || '',
          duration_minutes: appointment.duration_minutes || 30,
          payment_confirmed: appointment.payment_confirmed || false,
          payment_modality: pagosData?.modalidad?.nombre || null,
          payment_modality_icon: pagosData?.modalidad?.icono || null,
          payment_status: pagosData?.estado_pago || null
        };
      });

      setAppointments(formattedData);
      setFilteredAppointments(formattedData);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Error al cargar citas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Apply search term filter
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(appointment => {
        // Search across all relevant fields
        const searchableFields = [
          appointment.appointment_date,
          appointment.appointment_time,
          appointment.patient_name,
          appointment.specialist_name,
          appointment.consulting_room_name,
          appointment.reason,
          appointment.status,
          appointment.payment_confirmed ? 'pagado' : 'pendiente',
          appointment.payment_modality || ''
        ];
        
        return searchableFields.some(field => 
          field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply specialist filter (for component-level filtering)
    if (filters.specialist_id && filters.specialist_id.trim() !== '') {
      filtered = filtered.filter(appointment => 
        appointment.specialist_id === filters.specialist_id
      );
    }

    // Ordenar los resultados filtrados por fecha y hora
    filtered.sort((a, b) => {
      const dateA = new Date(a.appointment_date + 'T' + a.appointment_time);
      const dateB = new Date(b.appointment_date + 'T' + b.appointment_time);
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredAppointments(filtered);
  };

  const updateSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  };

  const updateSpecialistFilter = (specialistId: string) => {
    setFilters(prev => ({
      ...prev,
      specialist_id: specialistId
    }));
  };

  const clearFilters = () => {
    setFilters({ 
      searchTerm: '', 
      dateFilterType: 'today',
      selectedDate: new Date(),
      selectedMonth: new Date()
    });
  };

  const updateDateFilter = (type: DateFilterType) => {
    setFilters(prev => ({
      ...prev,
      dateFilterType: type
    }));
  };

  const updateSelectedDate = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      selectedDate: date
    }));
  };

  const updateSelectedMonth = (date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      selectedMonth: date
    }));
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Cita eliminada',
        description: 'La cita ha sido eliminada correctamente.',
      });

      fetchAppointments();
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error al eliminar cita',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteMultipleAppointments = async (appointmentIds: string[]) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', appointmentIds);

      if (error) throw error;

      toast({
        title: 'Citas eliminadas',
        description: `Se eliminaron ${appointmentIds.length} citas correctamente.`,
      });

      fetchAppointments();
    } catch (error: any) {
      console.error('Error deleting appointments:', error);
      toast({
        title: 'Error al eliminar citas',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Anulada' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Cita anulada',
        description: 'La cita ha sido anulada correctamente.',
      });

      fetchAppointments();
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      toast({
        title: 'Error al anular cita',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filters.dateFilterType, filters.selectedDate, filters.selectedMonth]);

  useEffect(() => {
    applyFilters();
  }, [filters.searchTerm, filters.specialist_id, appointments]);

  return {
    appointments: filteredAppointments,
    loading,
    searchTerm: filters.searchTerm,
    dateFilterType: filters.dateFilterType,
    selectedDate: filters.selectedDate,
    selectedMonth: filters.selectedMonth,
    updateSearch,
    updateSpecialistFilter,
    updateDateFilter,
    updateSelectedDate,
    updateSelectedMonth,
    clearFilters,
    deleteAppointment,
    deleteMultipleAppointments,
    cancelAppointment,
    refetch: fetchAppointments,
  };
}

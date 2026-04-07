import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface CoreStats {
  totalPatients: number;
  activeSpecialists: number;
  todayAppointments: number;
  pendingPrescriptions: number;
  totalMedicalRecords: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

interface PharmacyStats {
  totalMedications: number;
  lowStockMedications: number;
  expiringMedications: number;
  totalInventoryValue: number;
  monthlyEntries: number;
  monthlyOutputs: number;
}

interface OpticsStats {
  totalProducts: number;
  lowStockProducts: number;
  totalInventoryValue: number;
  monthlyEntries: number;
  monthlyOutputs: number;
}

interface DailyMovement {
  date: string;
  displayDate: string;
  appointments: number;
  prescriptions: number;
  medicalRecords: number;
}

interface AppointmentsByStatus {
  name: string;
  value: number;
  color: string;
}

interface ModuleDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DashboardStats {
  core: CoreStats;
  pharmacy: PharmacyStats;
  optics: OpticsStats;
  dailyMovements: DailyMovement[];
  appointmentsByStatus: AppointmentsByStatus[];
  moduleDistribution: ModuleDistribution[];
  loading: boolean;
}

export function useDashboardStats() {
  const [loading, setLoading] = useState(true);
  const [coreStats, setCoreStats] = useState<CoreStats>({
    totalPatients: 0,
    activeSpecialists: 0,
    todayAppointments: 0,
    pendingPrescriptions: 0,
    totalMedicalRecords: 0,
    completedAppointments: 0,
    cancelledAppointments: 0
  });
  const [pharmacyStats, setPharmacyStats] = useState<PharmacyStats>({
    totalMedications: 0,
    lowStockMedications: 0,
    expiringMedications: 0,
    totalInventoryValue: 0,
    monthlyEntries: 0,
    monthlyOutputs: 0
  });
  const [opticsStats, setOpticsStats] = useState<OpticsStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalInventoryValue: 0,
    monthlyEntries: 0,
    monthlyOutputs: 0
  });
  const [dailyMovements, setDailyMovements] = useState<DailyMovement[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<AppointmentsByStatus[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const monthStart = startOfMonth(new Date()).toISOString().split('T')[0];
  const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0];

  const fetchCoreStats = async () => {
    try {
      const [
        patientsRes,
        specialistsRes,
        todayApptsRes,
        prescriptionsRes,
        medicalRecordsRes,
        completedApptsRes,
        cancelledApptsRes
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('specialists').select('*', { count: 'exact', head: true }).eq('status', 'Activo'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('status', 'Activa'),
        supabase.from('medical_records').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'Completada'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'Anulada')
      ]);

      setCoreStats({
        totalPatients: patientsRes.count || 0,
        activeSpecialists: specialistsRes.count || 0,
        todayAppointments: todayApptsRes.count || 0,
        pendingPrescriptions: prescriptionsRes.count || 0,
        totalMedicalRecords: medicalRecordsRes.count || 0,
        completedAppointments: completedApptsRes.count || 0,
        cancelledAppointments: cancelledApptsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching core stats:', error);
    }
  };

  const fetchPharmacyStats = async () => {
    try {
      const [
        medicationsRes,
        entriesRes,
        outputsRes
      ] = await Promise.all([
        supabase.from('pharmacy_medications').select('id, stock_actual, min_stock_level, precio_venta, fecha_vencimiento'),
        supabase.from('pharmacy_entries').select('importe').gte('date', monthStart).lte('date', monthEnd),
        supabase.from('pharmacy_outputs').select('total').gte('date', monthStart).lte('date', monthEnd)
      ]);

      const medications = medicationsRes.data || [];
      const lowStock = medications.filter(m => (m.stock_actual || 0) <= (m.min_stock_level || 0)).length;
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiring = medications.filter(m => m.fecha_vencimiento && new Date(m.fecha_vencimiento) <= thirtyDaysFromNow).length;
      const inventoryValue = medications.reduce((sum, m) => sum + ((m.stock_actual || 0) * (m.precio_venta || 0)), 0);
      const monthlyEntriesTotal = (entriesRes.data || []).reduce((sum, e) => sum + (e.importe || 0), 0);
      const monthlyOutputsTotal = (outputsRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

      setPharmacyStats({
        totalMedications: medications.length,
        lowStockMedications: lowStock,
        expiringMedications: expiring,
        totalInventoryValue: inventoryValue,
        monthlyEntries: monthlyEntriesTotal,
        monthlyOutputs: monthlyOutputsTotal
      });
    } catch (error) {
      console.error('Error fetching pharmacy stats:', error);
    }
  };

  const fetchOpticsStats = async () => {
    try {
      const [
        productsRes,
        entriesRes,
        outputsRes
      ] = await Promise.all([
        supabase.from('optics_products').select('id, stock_actual, stock_minimo, precio_venta'),
        supabase.from('optics_entries').select('importe').gte('date', monthStart).lte('date', monthEnd),
        supabase.from('optics_outputs').select('total').gte('date', monthStart).lte('date', monthEnd)
      ]);

      const products = productsRes.data || [];
      const lowStock = products.filter(p => (p.stock_actual || 0) <= (p.stock_minimo || 0)).length;
      const inventoryValue = products.reduce((sum, p) => sum + ((p.stock_actual || 0) * (p.precio_venta || 0)), 0);
      const monthlyEntriesTotal = (entriesRes.data || []).reduce((sum, e) => sum + (e.importe || 0), 0);
      const monthlyOutputsTotal = (outputsRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0);

      setOpticsStats({
        totalProducts: products.length,
        lowStockProducts: lowStock,
        totalInventoryValue: inventoryValue,
        monthlyEntries: monthlyEntriesTotal,
        monthlyOutputs: monthlyOutputsTotal
      });
    } catch (error) {
      console.error('Error fetching optics stats:', error);
    }
  };

  const fetchDailyMovements = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'yyyy-MM-dd');
      });

      const [appointmentsRes, prescriptionsRes, medicalRecordsRes] = await Promise.all([
        supabase.from('appointments').select('appointment_date').in('appointment_date', last7Days),
        supabase.from('prescriptions').select('issue_date').in('issue_date', last7Days),
        supabase.from('medical_records').select('visit_date').in('visit_date', last7Days)
      ]);

      const movements = last7Days.map(date => {
        const displayDate = format(new Date(date + 'T12:00:00'), 'EEE dd', { locale: es });
        return {
          date,
          displayDate,
          appointments: (appointmentsRes.data || []).filter(a => a.appointment_date === date).length,
          prescriptions: (prescriptionsRes.data || []).filter(p => p.issue_date === date).length,
          medicalRecords: (medicalRecordsRes.data || []).filter(m => m.visit_date === date).length
        };
      });

      setDailyMovements(movements);
    } catch (error) {
      console.error('Error fetching daily movements:', error);
    }
  };

  const fetchAppointmentsByStatus = async () => {
    try {
      const { data } = await supabase
        .from('appointments')
        .select('status')
        .eq('appointment_date', today);

      const statusCounts = (data || []).reduce((acc, apt) => {
        const status = apt.status || 'Sin Estado';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusColors: Record<string, string> = {
        'Programada': '#3b82f6',
        'Completada': '#22c55e',
        'Anulada': '#ef4444',
        'Sin Programar': '#f97316',
        'En Espera': '#8b5cf6',
        'Sin Estado': '#6b7280'
      };

      const byStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        color: statusColors[name] || '#6b7280'
      }));

      setAppointmentsByStatus(byStatus);
    } catch (error) {
      console.error('Error fetching appointments by status:', error);
    }
  };

  const moduleDistribution = useMemo<ModuleDistribution[]>(() => [
    { name: 'Farmacia', value: pharmacyStats.totalMedications, color: '#22c55e' },
    { name: 'Óptica', value: opticsStats.totalProducts, color: '#3b82f6' }
  ], [pharmacyStats.totalMedications, opticsStats.totalProducts]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchCoreStats(),
        fetchPharmacyStats(),
        fetchOpticsStats(),
        fetchDailyMovements(),
        fetchAppointmentsByStatus()
      ]);
      setLoading(false);
    };

    fetchAll();
  }, []);

  return {
    core: coreStats,
    pharmacy: pharmacyStats,
    optics: opticsStats,
    dailyMovements,
    appointmentsByStatus,
    moduleDistribution,
    loading,
    refetch: () => {
      fetchCoreStats();
      fetchPharmacyStats();
      fetchOpticsStats();
      fetchDailyMovements();
      fetchAppointmentsByStatus();
    }
  };
}

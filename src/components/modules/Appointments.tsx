
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AppointmentStatsCard } from '@/components/appointments/AppointmentStatsCard';
import { AppointmentsList } from '@/components/appointments/AppointmentsList';
import { useAppointmentStats } from '@/hooks/useAppointmentStats';

export function Appointments() {
  const navigate = useNavigate();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | undefined>();
  const { stats, loading, refetch: refetchStats } = useAppointmentStats();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSpecialistClick = (specialistId: string) => {
    setSelectedSpecialistId(specialistId === selectedSpecialistId ? undefined : specialistId);
  };

  return (
    <div className="space-y-4">
      {/* Header con título y botón */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Citas Médicas</h1>
          <Button 
            onClick={() => navigate('/appointments/new')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Estadísticas por Especialista - Hoy */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Citas por Especialista - Hoy
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse p-3">
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        ) : stats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {stats.map((stat) => (
              <AppointmentStatsCard
                key={stat.specialist_id}
                specialistName={stat.specialist_name}
                specialistColor={stat.specialist_color}
                totalToday={stat.total_today}
                completedToday={stat.completed_today}
                scheduledToday={stat.scheduled_today}
                cancelledToday={stat.cancelled_today}
                unscheduledToday={stat.unscheduled_today}
                isSelected={selectedSpecialistId === stat.specialist_id}
                onClick={() => handleSpecialistClick(stat.specialist_id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-sm text-muted-foreground">No hay especialistas con citas para hoy</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista de Citas */}
      <AppointmentsList 
        selectedSpecialistId={selectedSpecialistId}
        key={refreshKey}
        onAppointmentUpdated={() => {
          refetchStats();
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
}

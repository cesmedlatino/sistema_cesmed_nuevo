import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getLocalDateString } from "@/lib/utils";

interface PaymentData {
  patient_id: string;
  specialist_id?: string | null;
  concepto_id: string;
  monto_pagado: number;
  modalidad_id: string;
  tipo_confirmacion: string;
  estado_pago: string;
  monto_adelanto?: number | null;
  saldo?: number | null;
  tiene_adjunto: boolean;
  archivo_confirmacion?: string | null;
  confirmado: boolean;
  observaciones?: string;
}

// Función para calcular el turno basado en día y hora actuales (Lima timezone)
function calculateTurno(): string | null {
  // Obtener la hora actual en Lima (GMT-5)
  const now = new Date();
  const limaOffset = -5 * 60; // Lima is UTC-5
  const localOffset = now.getTimezoneOffset();
  const limaTime = new Date(now.getTime() + (localOffset + limaOffset) * 60 * 1000);
  
  const dayOfWeek = limaTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = limaTime.getHours();
  const minutes = limaTime.getMinutes();
  const currentTime = hours * 60 + minutes; // Minutos desde medianoche
  
  const morningStart = 8 * 60; // 08:00
  const morningEnd = 12 * 60; // 12:00
  const afternoonStart = 15 * 60 + 30; // 15:30
  
  // Lunes a Viernes (1-5)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (currentTime >= morningStart && currentTime < morningEnd) {
      return 'Mañana';
    }
    if (currentTime >= afternoonStart) {
      return 'Tarde';
    }
  }
  
  // Sábado (6)
  if (dayOfWeek === 6) {
    if (currentTime >= morningStart && currentTime < morningEnd) {
      return 'Mañana';
    }
  }
  
  return null; // Fuera de horario laboral
}

export function usePaymentMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calcular el turno automáticamente
      const turno = calculateTurno();
      
      // Use local date to avoid timezone issues with CURRENT_DATE
      const fecha_pago = getLocalDateString();
      
      const { data, error } = await supabase
        .from('pagos')
        .insert({
          ...paymentData,
          fecha_pago,
          turno,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: 'Pago registrado',
        description: 'El pago se ha registrado exitosamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar el pago',
        variant: 'destructive',
      });
    }
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, paymentData }: { id: string; paymentData: PaymentData }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pagos')
        .update({
          ...paymentData,
          updated_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: 'Pago actualizado',
        description: 'El pago se ha actualizado exitosamente',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el pago',
        variant: 'destructive',
      });
    }
  });

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `payment-confirmations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('template-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('template-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  return {
    createPayment,
    updatePayment,
    uploadFile,
    isCreating: createPayment.isPending,
    isUpdating: updatePayment.isPending
  };
}
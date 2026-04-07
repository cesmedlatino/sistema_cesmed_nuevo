import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPLIES_CATEGORIES } from "./useSuppliesProducts";

export interface AttentionConsumption {
  id: string;
  medical_record_id: string;
  medication_id: string;
  quantity: number;
  tipo_atencion: string | null;
  observations: string | null;
  created_at: string;
  medication?: {
    id: string;
    codigo: string;
    descripcion: string;
  };
}

export function useSuppliesAttentionConsumption(medicalRecordId?: string) {
  return useQuery({
    queryKey: ["supplies-attention-consumption", medicalRecordId],
    queryFn: async () => {
      // Get supplies medications first
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map((m) => m.id);
      if (supplyIds.length === 0) return [];

      let query = supabase
        .from("supplies_attention_consumption")
        .select(`
          *,
          medication:pharmacy_medications(id, codigo, descripcion)
        `)
        .in("medication_id", supplyIds)
        .order("created_at", { ascending: false });

      if (medicalRecordId) {
        query = query.eq("medical_record_id", medicalRecordId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AttentionConsumption[];
    },
    enabled: !!medicalRecordId,
  });
}

export function useCreateAttentionConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medicalRecordId,
      medicationId,
      quantity,
      tipoAtencion,
      observations,
      consultingRoomId,
    }: {
      medicalRecordId: string;
      medicationId: string;
      quantity: number;
      tipoAtencion?: string;
      observations?: string;
      consultingRoomId?: string;
    }) => {
      // Create consumption record
      const { data, error } = await supabase
        .from("supplies_attention_consumption")
        .insert({
          medical_record_id: medicalRecordId,
          medication_id: medicationId,
          quantity,
          tipo_atencion: tipoAtencion || null,
          observations: observations || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If consulting room is specified, decrease stock from consulting room
      if (consultingRoomId) {
        const { data: stockData } = await supabase
          .from("supplies_consulting_room_stock")
          .select("id, quantity")
          .eq("consulting_room_id", consultingRoomId)
          .eq("medication_id", medicationId)
          .maybeSingle();

        if (stockData && stockData.quantity >= quantity) {
          await supabase
            .from("supplies_consulting_room_stock")
            .update({ quantity: stockData.quantity - quantity })
            .eq("id", stockData.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-attention-consumption"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      toast.success("Consumo registrado correctamente");
    },
    onError: (error) => {
      console.error("Error creating consumption:", error);
      toast.error("Error al registrar el consumo");
    },
  });
}

export function useDeleteAttentionConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplies_attention_consumption")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-attention-consumption"] });
      toast.success("Consumo eliminado");
    },
    onError: (error) => {
      console.error("Error deleting consumption:", error);
      toast.error("Error al eliminar el consumo");
    },
  });
}

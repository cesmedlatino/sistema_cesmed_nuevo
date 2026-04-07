import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPLIES_CATEGORIES } from "./useSuppliesProducts";

export interface ConsultingRoomStock {
  id: string;
  consulting_room_id: string;
  medication_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  consulting_room?: {
    id: string;
    name: string;
    floor: string | null;
  };
  medication?: {
    id: string;
    codigo: string;
    descripcion: string;
    category: string | null;
  };
}

export function useSuppliesConsultingRoomStock(consultingRoomId?: string) {
  return useQuery({
    queryKey: ["supplies-consulting-room-stock", consultingRoomId],
    queryFn: async () => {
      // Get supplies medications first
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map((m) => m.id);
      if (supplyIds.length === 0) return [];

      let query = supabase
        .from("supplies_consulting_room_stock")
        .select(`
          *,
          consulting_room:consulting_rooms(id, name, floor),
          medication:pharmacy_medications(id, codigo, descripcion, category)
        `)
        .in("medication_id", supplyIds)
        .gt("quantity", 0);

      if (consultingRoomId) {
        query = query.eq("consulting_room_id", consultingRoomId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ConsultingRoomStock[];
    },
  });
}

export function useAddToConsultingRoomStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      consultingRoomId,
      medicationId,
      quantity,
    }: {
      consultingRoomId: string;
      medicationId: string;
      quantity: number;
    }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from("supplies_consulting_room_stock")
        .select("id, quantity")
        .eq("consulting_room_id", consultingRoomId)
        .eq("medication_id", medicationId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("supplies_consulting_room_stock")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplies_consulting_room_stock")
          .insert({ consulting_room_id: consultingRoomId, medication_id: medicationId, quantity });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
    },
    onError: (error) => {
      console.error("Error adding to consulting room stock:", error);
      toast.error("Error al agregar al stock de consultorio");
    },
  });
}

export function useConsumeFromConsultingRoomStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      consultingRoomId,
      medicationId,
      quantity,
    }: {
      consultingRoomId: string;
      medicationId: string;
      quantity: number;
    }) => {
      const { data: existing } = await supabase
        .from("supplies_consulting_room_stock")
        .select("id, quantity")
        .eq("consulting_room_id", consultingRoomId)
        .eq("medication_id", medicationId)
        .single();

      if (!existing || existing.quantity < quantity) {
        throw new Error("Stock insuficiente en el consultorio");
      }

      const { error } = await supabase
        .from("supplies_consulting_room_stock")
        .update({ quantity: existing.quantity - quantity })
        .eq("id", existing.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
    },
    onError: (error: any) => {
      console.error("Error consuming from consulting room stock:", error);
      toast.error(error.message || "Error al consumir del stock de consultorio");
    },
  });
}

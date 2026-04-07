import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLocalDateString } from "@/lib/utils";

export interface ConsultingRoomOutputItem {
  id: string;
  output_id: string;
  medication_id: string;
  quantity: number;
  product_code: string | null;
  description: string | null;
  medication?: {
    codigo: string;
    descripcion: string;
  };
}

export interface ConsultingRoomOutput {
  id: string;
  output_number: string;
  consulting_room_id: string;
  date: string;
  delivery_date: string | null;
  status: string | null;
  observations: string | null;
  created_at: string;
  consulting_room?: {
    id: string;
    name: string;
    floor: string | null;
  };
  items?: ConsultingRoomOutputItem[];
}

export function useSuppliesConsultingRoomOutputs(consultingRoomId?: string) {
  return useQuery({
    queryKey: ["supplies-consulting-room-outputs", consultingRoomId],
    queryFn: async () => {
      let query = supabase
        .from("supplies_consulting_room_outputs")
        .select(`
          *,
          consulting_room:consulting_rooms(id, name, floor)
        `)
        .order("date", { ascending: false });

      if (consultingRoomId) {
        query = query.eq("consulting_room_id", consultingRoomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch items for each output
      const outputIds = (data || []).map((o: any) => o.id);
      if (outputIds.length === 0) return [];

      const { data: itemsData, error: itemsError } = await supabase
        .from("supplies_consulting_room_output_items")
        .select(`
          *,
          medication:pharmacy_medications(codigo, descripcion)
        `)
        .in("output_id", outputIds);

      if (itemsError) throw itemsError;

      const itemsMap: Record<string, ConsultingRoomOutputItem[]> = {};
      (itemsData || []).forEach((item: any) => {
        if (!itemsMap[item.output_id]) itemsMap[item.output_id] = [];
        itemsMap[item.output_id].push(item);
      });

      return (data || []).map((output: any) => ({
        ...output,
        items: itemsMap[output.id] || [],
      })) as ConsultingRoomOutput[];
    },
  });
}

export function useCreateConsultingRoomOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      consultingRoomId,
      deliveryDate,
      observations,
      items,
    }: {
      consultingRoomId: string;
      deliveryDate?: string;
      observations?: string;
      items: { medicationId: string; quantity: number; productCode?: string; description?: string }[];
    }) => {
      // Generate output number
      const { data: lastOutput } = await supabase
        .from("supplies_consulting_room_outputs")
        .select("output_number")
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      const lastValue = lastOutput?.[0]?.output_number || "";
      const match = lastValue.match(/SUM-SC(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;

      const outputNumber = `SUM-SC${nextNumber.toString().padStart(5, "0")}`;

      // Create output
      const { data: output, error: outputError } = await supabase
        .from("supplies_consulting_room_outputs")
        .insert({
          output_number: outputNumber,
          consulting_room_id: consultingRoomId,
          date: getLocalDateString(),
          delivery_date: deliveryDate || null,
          observations: observations || null,
          status: "Entregado",
        })
        .select()
        .single();

      if (outputError) throw outputError;

      // Create items
      const itemsToInsert = items.map((item) => ({
        output_id: output.id,
        medication_id: item.medicationId,
        quantity: item.quantity,
        product_code: item.productCode || null,
        description: item.description || null,
      }));

      const { error: itemsError } = await supabase
        .from("supplies_consulting_room_output_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Update consulting room stock
      for (const item of items) {
        const { data: existing } = await supabase
          .from("supplies_consulting_room_stock")
          .select("id, quantity")
          .eq("consulting_room_id", consultingRoomId)
          .eq("medication_id", item.medicationId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("supplies_consulting_room_stock")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("supplies_consulting_room_stock")
            .insert({
              consulting_room_id: consultingRoomId,
              medication_id: item.medicationId,
              quantity: item.quantity,
            });
        }

        // Decrease general stock
        const { data: medData } = await supabase
          .from("pharmacy_medications")
          .select("stock_actual")
          .eq("id", item.medicationId)
          .single();

        if (medData) {
          await supabase
            .from("pharmacy_medications")
            .update({ stock_actual: Math.max(0, (medData.stock_actual || 0) - item.quantity) })
            .eq("id", item.medicationId);
        }
      }

      return { output, outputNumber };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      toast.success(`Salida ${data.outputNumber} registrada correctamente`);
    },
    onError: (error) => {
      console.error("Error creating output:", error);
      toast.error("Error al registrar la salida");
    },
  });
}

export interface UpdateOutputItem {
  id?: string;
  medicationId: string;
  quantity: number;
  productCode?: string;
  description?: string;
  originalQuantity?: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function useUpdateConsultingRoomOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      consultingRoomId,
      status,
      observations,
      deliveryDate,
      items,
      originalItems,
    }: {
      id: string;
      consultingRoomId: string;
      status?: string;
      observations?: string;
      deliveryDate?: string;
      items?: UpdateOutputItem[];
      originalItems?: ConsultingRoomOutputItem[];
    }) => {
      const updateData: Record<string, any> = {};
      if (status !== undefined) updateData.status = status;
      if (observations !== undefined) updateData.observations = observations;
      if (deliveryDate !== undefined) updateData.delivery_date = deliveryDate;

      const { error } = await supabase
        .from("supplies_consulting_room_outputs")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Handle items updates if provided
      if (items && originalItems) {
        // Process deleted items - restore stock
        for (const item of items.filter(i => i.isDeleted && i.id)) {
          const originalItem = originalItems.find(o => o.id === item.id);
          if (originalItem) {
            // Decrease consulting room stock
            const { data: roomStock } = await supabase
              .from("supplies_consulting_room_stock")
              .select("id, quantity")
              .eq("consulting_room_id", consultingRoomId)
              .eq("medication_id", originalItem.medication_id)
              .maybeSingle();

            if (roomStock) {
              await supabase
                .from("supplies_consulting_room_stock")
                .update({ quantity: Math.max(0, roomStock.quantity - originalItem.quantity) })
                .eq("id", roomStock.id);
            }

            // Increase general stock
            const { data: medData } = await supabase
              .from("pharmacy_medications")
              .select("stock_actual")
              .eq("id", originalItem.medication_id)
              .single();

            if (medData) {
              await supabase
                .from("pharmacy_medications")
                .update({ stock_actual: (medData.stock_actual || 0) + originalItem.quantity })
                .eq("id", originalItem.medication_id);
            }

            // Delete item from database
            await supabase
              .from("supplies_consulting_room_output_items")
              .delete()
              .eq("id", originalItem.id);
          }
        }

        // Process new items
        for (const item of items.filter(i => i.isNew && !i.isDeleted)) {
          // Insert new item
          await supabase
            .from("supplies_consulting_room_output_items")
            .insert({
              output_id: id,
              medication_id: item.medicationId,
              quantity: item.quantity,
              product_code: item.productCode || null,
              description: item.description || null,
            });

          // Increase consulting room stock
          const { data: existing } = await supabase
            .from("supplies_consulting_room_stock")
            .select("id, quantity")
            .eq("consulting_room_id", consultingRoomId)
            .eq("medication_id", item.medicationId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("supplies_consulting_room_stock")
              .update({ quantity: existing.quantity + item.quantity })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("supplies_consulting_room_stock")
              .insert({
                consulting_room_id: consultingRoomId,
                medication_id: item.medicationId,
                quantity: item.quantity,
              });
          }

          // Decrease general stock
          const { data: medData } = await supabase
            .from("pharmacy_medications")
            .select("stock_actual")
            .eq("id", item.medicationId)
            .single();

          if (medData) {
            await supabase
              .from("pharmacy_medications")
              .update({ stock_actual: Math.max(0, (medData.stock_actual || 0) - item.quantity) })
              .eq("id", item.medicationId);
          }
        }

        // Process modified existing items (quantity changed)
        for (const item of items.filter(i => i.id && !i.isNew && !i.isDeleted)) {
          const originalItem = originalItems.find(o => o.id === item.id);
          if (originalItem && originalItem.quantity !== item.quantity) {
            const quantityDiff = item.quantity - originalItem.quantity;

            // Update item quantity
            await supabase
              .from("supplies_consulting_room_output_items")
              .update({ quantity: item.quantity })
              .eq("id", item.id);

            // Update consulting room stock
            const { data: roomStock } = await supabase
              .from("supplies_consulting_room_stock")
              .select("id, quantity")
              .eq("consulting_room_id", consultingRoomId)
              .eq("medication_id", originalItem.medication_id)
              .maybeSingle();

            if (roomStock) {
              await supabase
                .from("supplies_consulting_room_stock")
                .update({ quantity: Math.max(0, roomStock.quantity + quantityDiff) })
                .eq("id", roomStock.id);
            }

            // Update general stock
            const { data: medData } = await supabase
              .from("pharmacy_medications")
              .select("stock_actual")
              .eq("id", originalItem.medication_id)
              .single();

            if (medData) {
              await supabase
                .from("pharmacy_medications")
                .update({ stock_actual: Math.max(0, (medData.stock_actual || 0) - quantityDiff) })
                .eq("id", originalItem.medication_id);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      toast.success("Salida actualizada correctamente");
    },
    onError: (error) => {
      console.error("Error updating output:", error);
      toast.error("Error al actualizar la salida");
    },
  });
}

export function useAnnulConsultingRoomOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get output details first
      const { data: output, error: fetchError } = await supabase
        .from("supplies_consulting_room_outputs")
        .select("*, items:supplies_consulting_room_output_items(*)")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Reverse stock changes for each item
      for (const item of output.items || []) {
        // Decrease consulting room stock
        const { data: roomStock } = await supabase
          .from("supplies_consulting_room_stock")
          .select("id, quantity")
          .eq("consulting_room_id", output.consulting_room_id)
          .eq("medication_id", item.medication_id)
          .maybeSingle();

        if (roomStock) {
          await supabase
            .from("supplies_consulting_room_stock")
            .update({ quantity: Math.max(0, roomStock.quantity - item.quantity) })
            .eq("id", roomStock.id);
        }

        // Increase general stock
        const { data: medData } = await supabase
          .from("pharmacy_medications")
          .select("stock_actual")
          .eq("id", item.medication_id)
          .single();

        if (medData) {
          await supabase
            .from("pharmacy_medications")
            .update({ stock_actual: (medData.stock_actual || 0) + item.quantity })
            .eq("id", item.medication_id);
        }
      }

      // Update status to Anulado
      const { error } = await supabase
        .from("supplies_consulting_room_outputs")
        .update({ status: "Anulado" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      toast.success("Salida anulada correctamente. Se restauró el stock.");
    },
    onError: (error) => {
      console.error("Error annulling output:", error);
      toast.error("Error al anular la salida");
    },
  });
}

export function useDeleteConsultingRoomOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete items first (cascade might not be set up)
      await supabase
        .from("supplies_consulting_room_output_items")
        .delete()
        .eq("output_id", id);

      const { error } = await supabase
        .from("supplies_consulting_room_outputs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-outputs"] });
      toast.success("Salida eliminada correctamente");
    },
    onError: (error) => {
      console.error("Error deleting output:", error);
      toast.error("Error al eliminar la salida");
    },
  });
}

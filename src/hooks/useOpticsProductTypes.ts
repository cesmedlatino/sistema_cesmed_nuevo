import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsProductType {
  id: string;
  value: string;
  label: string;
  status: string;
  created_at: string;
}

export function useOpticsProductTypes() {
  return useQuery({
    queryKey: ["optics-product-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optics_product_types")
        .select("*")
        .eq("status", "Activo")
        .order("label", { ascending: true });

      if (error) throw error;
      return data as OpticsProductType[];
    },
  });
}

export function useCreateOpticsProductType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productType: { value: string; label: string }) => {
      const { data, error } = await supabase
        .from("optics_product_types")
        .insert({
          value: productType.value.toLowerCase().replace(/\s+/g, '_'),
          label: productType.label,
          status: "Activo",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-product-types"] });
      toast({
        title: "Tipo creado",
        description: "El tipo de producto se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOpticsProductType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { data, error } = await supabase
        .from("optics_product_types")
        .update({ label })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-product-types"] });
      toast({
        title: "Tipo actualizado",
        description: "El tipo de producto se ha actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteOpticsProductType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("optics_product_types")
        .update({ status: "Inactivo" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-product-types"] });
      toast({
        title: "Tipo eliminado",
        description: "El tipo de producto se ha eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

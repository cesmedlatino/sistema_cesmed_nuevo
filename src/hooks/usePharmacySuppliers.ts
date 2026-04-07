
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PharmacySupplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  observations?: string;
  specialty?: string;
  ruc?: string;
  razon_social?: string;
  created_at: string;
}

export const usePharmacySuppliers = () => {
  return useQuery({
    queryKey: ["pharmacy-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_suppliers")
        .select("*")
        .eq("status", "Activo")
        .order("name");
      
      if (error) throw error;
      return data as PharmacySupplier[];
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (supplier: Omit<PharmacySupplier, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("pharmacy_suppliers")
        .insert([supplier])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-suppliers"] });
      toast({
        title: "Proveedor creado",
        description: "El proveedor se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el proveedor.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (supplier: Partial<PharmacySupplier> & { id: string }) => {
      const { id, ...updateData } = supplier;
      const { data, error } = await supabase
        .from("pharmacy_suppliers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-suppliers"] });
      toast({
        title: "Proveedor actualizado",
        description: "Los datos del proveedor se han actualizado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el proveedor.",
        variant: "destructive",
      });
    },
  });
};

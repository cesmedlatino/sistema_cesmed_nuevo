import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InvoiceHeader {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string | null;
  status: string;
  total_amount: number;
  igv: number;
  total_a_pagar: number;
  supplier_id: string | null;
  payment_type: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export const useInvoiceHeaders = () => {
  return useQuery({
    queryKey: ["invoice-headers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_headers")
        .select(`
          *,
          supplier:pharmacy_suppliers(id, name)
        `)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data as InvoiceHeader[];
    },
  });
};

export const useCreateInvoiceHeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (header: Omit<InvoiceHeader, "id" | "created_at" | "updated_at" | "supplier">) => {
      const { data, error } = await supabase
        .from("invoice_headers")
        .insert([header])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-headers"] });
    },
    onError: (error: any) => {
      console.error("Error creating invoice header:", error);
      toast.error("Error al crear el encabezado de factura");
    },
  });
};

export const useUpdateInvoiceHeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoice_number, ...data }: Partial<InvoiceHeader> & { invoice_number: string }) => {
      const { error } = await supabase
        .from("invoice_headers")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("invoice_number", invoice_number);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-headers"] });
    },
    onError: (error: any) => {
      console.error("Error updating invoice header:", error);
      toast.error("Error al actualizar el encabezado de factura");
    },
  });
};

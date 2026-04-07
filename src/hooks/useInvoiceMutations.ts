import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useToggleInvoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceNumber, currentStatus }: { invoiceNumber: string; currentStatus: string }) => {
      const newStatus = currentStatus === "Cancelado" ? "Pendiente" : "Cancelado";
      
      console.log("Cambiando estado de factura:", { invoiceNumber, currentStatus, newStatus });
      
      // Para cambios entre Pendiente y Cancelado, primero actualizamos las entradas
      // y luego el encabezado para evitar conflictos con triggers
      
      // Step 1: Update all pharmacy_entries with this invoice number
      const { data: entriesData, error: entriesError } = await supabase
        .from("pharmacy_entries")
        .update({ payment_status: newStatus })
        .eq("invoice_number", invoiceNumber)
        .select();

      if (entriesError) {
        console.error("Error updating pharmacy_entries:", entriesError);
        throw entriesError;
      }

      console.log("Pharmacy entries actualizados:", entriesData);

      // Step 2: Update invoice_headers - importante hacerlo después de las entradas
      const { data: headerData, error: headerError } = await supabase
        .from("invoice_headers")
        .update({ status: newStatus })
        .eq("invoice_number", invoiceNumber)
        .select();

      if (headerError) {
        console.error("Error updating invoice_headers:", headerError);
        throw headerError;
      }

      console.log("Invoice header actualizado:", headerData);

      return { invoiceNumber, newStatus };
    },
    onMutate: async ({ invoiceNumber, currentStatus }) => {
      console.log("onMutate: Cancelando queries existentes...");
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["invoice-headers"] });
      
      // NO hacemos optimistic update porque causa conflictos con los triggers
      // Solo retornamos el contexto para rollback en caso de error
      const previousInvoices = queryClient.getQueryData(["invoice-headers"]);
      
      return { previousInvoices };
    },
    onSuccess: async (data) => {
      console.log("onSuccess: Mutación exitosa, invalidando queries...", data);
      
      // Invalidate and refetch to get the latest data from the server
      await queryClient.invalidateQueries({ queryKey: ["invoice-headers"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
      
      console.log("onSuccess: Queries invalidadas, refetch completado");
      
      toast.success(`Factura ${data.newStatus === "Cancelado" ? "cancelada" : "reactivada"} exitosamente`);
    },
    onError: (error, variables, context) => {
      console.error("Error toggling invoice status:", error);
      // Rollback on error
      if (context?.previousInvoices) {
        queryClient.setQueryData(["invoice-headers"], context.previousInvoices);
      }
      toast.error("Error al cambiar el estado de la factura");
    },
  });
};

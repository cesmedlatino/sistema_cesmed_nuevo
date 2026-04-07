import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string | null;
  specialist_id: string | null;
  medical_record_id: string | null;
  issue_date: string;
  medications: any;
  instructions: string | null;
  status: string | null;
  duration_days: number | null;
  refills_allowed: number | null;
  created_at: string;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    dni: string;
    hms: string | null;
  };
  specialist?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  medical_record?: {
    id: string;
    hms: string | null;
  };
}

interface PrescriptionFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export const usePrescriptions = (filters?: PrescriptionFilters) => {
  return useQuery({
    queryKey: ["prescriptions", filters],
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select(`
          *,
          patient:patients(id, first_name, last_name, dni, hms),
          specialist:specialists(id, first_name, last_name),
          medical_record:medical_records(id, hms)
        `)
        .order("created_at", { ascending: false });

      // Date filters
      if (filters?.startDate) {
        query = query.gte("issue_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("issue_date", filters.endDate);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filtering for more flexibility
      let filteredData = data as Prescription[];
      
      if (filters?.search && filters.search.trim() !== "") {
        const searchLower = filters.search.toLowerCase().trim();
        filteredData = filteredData.filter((prescription) => {
          // Search by prescription number
          if (prescription.prescription_number?.toLowerCase().includes(searchLower)) return true;
          
          // Search by patient name
          const patientName = prescription.patient 
            ? `${prescription.patient.first_name} ${prescription.patient.last_name}`.toLowerCase()
            : "";
          if (patientName.includes(searchLower)) return true;
          
          // Search by patient DNI
          if (prescription.patient?.dni?.toLowerCase().includes(searchLower)) return true;
          
          // Search by HMS (Historia Médica)
          if (prescription.patient?.hms?.toLowerCase().includes(searchLower)) return true;
          if (prescription.medical_record?.hms?.toLowerCase().includes(searchLower)) return true;
          
          // Search by medication names
          const medications = prescription.medications;
          if (Array.isArray(medications)) {
            for (const med of medications) {
              if (med.medicamento?.toLowerCase().includes(searchLower)) return true;
              if (med.descripcion?.toLowerCase().includes(searchLower)) return true;
            }
          }
          
          return false;
        });
      }

      return filteredData;
    },
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { error } = await supabase
        .from("prescriptions")
        .delete()
        .eq("id", prescriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Receta eliminada",
        description: "La receta se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdatePrescriptionStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ prescriptionId, status }: { prescriptionId: string; status: string }) => {
      const { error } = await supabase
        .from("prescriptions")
        .update({ status })
        .eq("id", prescriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la receta se ha actualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    },
  });
};

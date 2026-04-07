import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CatalogTarget = "optica" | "general";

export interface LabelTemplate {
  id: string;
  name: string;
  paperSize: { width: number; height: number; id: string };
  elements: any[];
  zoomUsed?: number;
  isDefault: boolean;
  isPublic: boolean;
  catalogTarget: CatalogTarget;
  createdAt: string;
  updatedAt: string;
}

interface DbLabelTemplate {
  id: string;
  name: string;
  paper_width_mm: number;
  paper_height_mm: number;
  paper_size_id: string;
  elements: any[];
  zoom_used: number | null;
  is_default: boolean;
  is_public: boolean;
  catalog_target: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Transform DB row to frontend format
const toFrontend = (row: DbLabelTemplate): LabelTemplate => ({
  id: row.id,
  name: row.name,
  paperSize: {
    width: Number(row.paper_width_mm),
    height: Number(row.paper_height_mm),
    id: row.paper_size_id,
  },
  elements: row.elements || [],
  zoomUsed: row.zoom_used ?? undefined,
  isDefault: row.is_default,
  isPublic: row.is_public,
  catalogTarget: (row.catalog_target as CatalogTarget) || "optica",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function useOpticsLabelTemplates() {
  return useQuery({
    queryKey: ["optics-label-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optics_label_templates")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data as DbLabelTemplate[]).map(toFrontend);
    },
  });
}

export function useDefaultLabelTemplate() {
  return useQuery({
    queryKey: ["optics-label-template-default"],
    queryFn: async () => {
      const { data: defaultData, error: defaultError } = await supabase
        .from("optics_label_templates")
        .select("*")
        .eq("is_default", true)
        .eq("catalog_target", "optica")
        .maybeSingle();

      if (defaultError) throw defaultError;
      if (defaultData) return toFrontend(defaultData as DbLabelTemplate);

      const { data: latestData, error: latestError } = await supabase
        .from("optics_label_templates")
        .select("*")
        .eq("catalog_target", "optica")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;
      return latestData ? toFrontend(latestData as DbLabelTemplate) : null;
    },
  });
}

export function useGeneralLabelTemplate() {
  return useQuery({
    queryKey: ["optics-label-template-general"],
    queryFn: async () => {
      // First try to get the default general template
      const { data: defaultData, error: defaultError } = await supabase
        .from("optics_label_templates")
        .select("*")
        .eq("catalog_target", "general")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (defaultError) throw defaultError;
      return defaultData ? toFrontend(defaultData as DbLabelTemplate) : null;
    },
  });
}

export function useCreateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<LabelTemplate, "id" | "createdAt" | "updatedAt">) => {
      // Si es predeterminada, primero quitar el flag de las demás
      if (template.isDefault) {
        await supabase
          .from("optics_label_templates")
          .update({ is_default: false })
          .eq("is_default", true);
      }

      const { data, error } = await supabase
        .from("optics_label_templates")
        .insert({
          name: template.name,
          paper_width_mm: template.paperSize.width,
          paper_height_mm: template.paperSize.height,
          paper_size_id: template.paperSize.id,
          elements: template.elements,
          zoom_used: template.zoomUsed ?? null,
          is_default: template.isDefault,
          is_public: template.isPublic ?? false,
          catalog_target: template.catalogTarget ?? "optica",
        })
        .select()
        .single();

      if (error) throw error;
      return toFrontend(data as DbLabelTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Plantilla guardada");
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast.error("Error al guardar la plantilla");
    },
  });
}

export function useUpdateLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: LabelTemplate) => {
      // Si es predeterminada, primero quitar el flag de las demás
      if (template.isDefault) {
        await supabase
          .from("optics_label_templates")
          .update({ is_default: false })
          .neq("id", template.id);
      }

      const { data, error } = await supabase
        .from("optics_label_templates")
        .update({
          name: template.name,
          paper_width_mm: template.paperSize.width,
          paper_height_mm: template.paperSize.height,
          paper_size_id: template.paperSize.id,
          elements: template.elements,
          zoom_used: template.zoomUsed ?? null,
          is_default: template.isDefault,
          is_public: template.isPublic,
          catalog_target: template.catalogTarget ?? "optica",
        })
        .eq("id", template.id)
        .select()
        .single();

      if (error) throw error;
      return toFrontend(data as DbLabelTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Plantilla actualizada");
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("Error al actualizar la plantilla");
    },
  });
}

export function useSetDefaultTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      // Quitar predeterminada de todas
      await supabase
        .from("optics_label_templates")
        .update({ is_default: false })
        .eq("is_default", true);

      // Establecer la nueva predeterminada
      const { error } = await supabase
        .from("optics_label_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Plantilla establecida como predeterminada");
    },
    onError: (error) => {
      console.error("Error setting default:", error);
      toast.error("Error al establecer predeterminada");
    },
  });
}

export function useTogglePublicTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isPublic }: { templateId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("optics_label_templates")
        .update({ is_public: isPublic })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Visibilidad actualizada");
    },
    onError: (error) => {
      console.error("Error toggling public:", error);
      toast.error("Error al cambiar visibilidad");
    },
  });
}

export function useSetCatalogTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, catalogTarget }: { templateId: string; catalogTarget: CatalogTarget }) => {
      const { error } = await supabase
        .from("optics_label_templates")
        .update({ catalog_target: catalogTarget })
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Catálogo de destino actualizado");
    },
    onError: (error) => {
      console.error("Error setting catalog target:", error);
      toast.error("Error al cambiar catálogo de destino");
    },
  });
}

export function useDeleteLabelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("optics_label_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-default"] });
      queryClient.invalidateQueries({ queryKey: ["optics-label-template-general"] });
      toast.success("Plantilla eliminada");
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast.error("Error al eliminar la plantilla");
    },
  });
}

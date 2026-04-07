import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Trash2, FileText, Palette, FileDown, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TemplateTestForm } from './TemplateTestForm';
import { TemplatePDFPreview } from './TemplatePDFPreview';
import type { MedicalRecordTemplate } from './MedicalRecordTemplateDesigner';

interface TemplateListProps {
  onEdit: (template: MedicalRecordTemplate) => void;
  onPreview: (template: MedicalRecordTemplate) => void;
  onDesign: (template: MedicalRecordTemplate) => void;
}

export function TemplateList({ onEdit, onPreview, onDesign }: TemplateListProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MedicalRecordTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [templateToTest, setTemplateToTest] = useState<MedicalRecordTemplate | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [templateForPDF, setTemplateForPDF] = useState<MedicalRecordTemplate | null>(null);

  const handleTestTemplate = useCallback((template: MedicalRecordTemplate) => {
    setTemplateToTest(template);
    setTestDialogOpen(true);
  }, []);

  const handleCloseTestDialog = useCallback(() => {
    setTestDialogOpen(false);
    setTemplateToTest(null);
  }, []);

  const handleOpenPDFPreview = useCallback((template: MedicalRecordTemplate) => {
    setTemplateForPDF(template);
    setPdfDialogOpen(true);
  }, []);

  const handleClosePDFDialog = useCallback(() => {
    setPdfDialogOpen(false);
    setTemplateForPDF(null);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select(`
          *,
          medical_specialties (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert the database response to our template format
      const convertedTemplates: MedicalRecordTemplate[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        specialty_id: template.specialty_id || '',
        is_active: template.is_active || false,
        header_config: (template.header_config as any) || {},
        body_config: (template.body_config as any) || [],
        footer_config: (template.footer_config as any) || {},
        design_config: (template as any).design_config || undefined,
        medical_specialties: (template as any).medical_specialties
      }));
      
      setTemplates(convertedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;

    try {
      const { error } = await supabase
        .from('medical_record_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Plantilla Eliminada",
        description: "La plantilla se ha eliminado correctamente.",
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (template: MedicalRecordTemplate) => {
    try {
      const { error } = await supabase
        .from('medical_record_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Estado Actualizado",
        description: `La plantilla ha sido ${!template.is_active ? 'activada' : 'desactivada'}.`,
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la plantilla",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lg">Cargando plantillas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No hay plantillas creadas</p>
            <p className="text-sm text-gray-500">Haga clic en "Nueva Plantilla" para crear su primera plantilla</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge 
                    variant={template.is_active ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => toggleActive(template)}
                  >
                    {template.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {(template as any).medical_specialties?.name || 'Sin especialidad'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 mb-4">
                  Secciones: {template.body_config?.length || 0}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleTestTemplate(template)}
                    className="text-xs bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700"
                    title="Ejecutar plantilla"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Ejecutar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onPreview(template)}
                    className="text-xs"
                    title="Vista previa"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onEdit(template)}
                    className="text-xs"
                    title="Editar plantilla"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onDesign(template)}
                    className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100"
                    title="Personalizar diseño"
                  >
                    <Palette className="h-3 w-3 mr-1" />
                    Diseño
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleOpenPDFPreview(template)}
                    className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-700"
                    title="Descargar PDF profesional"
                  >
                    <FileDown className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleDelete(template.id!)}
                  className="w-full mt-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Eliminar plantilla"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog para probar plantilla */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Probar Plantilla: {templateToTest?.name}</DialogTitle>
          </DialogHeader>
          {templateToTest && (
            <TemplateTestForm 
              template={templateToTest}
              onClose={handleCloseTestDialog}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog para generar PDF */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-green-600" />
              Generar PDF: {templateForPDF?.name}
            </DialogTitle>
          </DialogHeader>
          {templateForPDF && (
            <TemplatePDFPreview 
              template={templateForPDF}
              onClose={handleClosePDFDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

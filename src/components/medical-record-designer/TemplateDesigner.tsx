
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, X, Palette, Layout, Type, Settings, Printer, Monitor } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { MedicalRecordTemplate } from './MedicalRecordTemplateDesigner';
import { StylePanel } from './design/StylePanel';
import { LayoutPanel } from './design/LayoutPanel';
import { PreviewPanel } from './design/PreviewPanel';
import { PresetThemes } from './design/PresetThemes';

interface TemplateDesignerProps {
  template: MedicalRecordTemplate;
  onSave: () => void;
  onCancel: () => void;
}

export function TemplateDesigner({ template, onSave, onCancel }: TemplateDesignerProps) {
  const { toast } = useToast();
  const [currentTemplate, setCurrentTemplate] = useState<MedicalRecordTemplate>(template);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'screen' | 'print'>('screen');

  const handleSave = async () => {
    if (!currentTemplate.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la plantilla es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const templateData = {
        name: currentTemplate.name,
        specialty_id: currentTemplate.specialty_id || null,
        is_active: currentTemplate.is_active,
        header_config: currentTemplate.header_config as any,
        body_config: currentTemplate.body_config as any,
        footer_config: currentTemplate.footer_config as any,
        design_config: currentTemplate.design_config as any
      };

      if (currentTemplate.id) {
        const { error } = await supabase
          .from('medical_record_templates')
          .update(templateData)
          .eq('id', currentTemplate.id);

        if (error) throw error;
        
        toast({
          title: "Diseño Actualizado",
          description: "El diseño de la plantilla se ha actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('medical_record_templates')
          .insert([templateData]);

        if (error) throw error;
        
        toast({
          title: "Diseño Guardado",
          description: "El diseño de la plantilla se ha guardado correctamente.",
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving template design:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el diseño de la plantilla",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Diseñador de Estilos</h2>
          <p className="text-gray-600">Personaliza el diseño de: {currentTemplate.name}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'screen' ? 'default' : 'ghost'}
              onClick={() => setViewMode('screen')}
              className="h-8"
            >
              <Monitor className="h-4 w-4 mr-1" />
              Pantalla
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'print' ? 'default' : 'ghost'}
              onClick={() => setViewMode('print')}
              className="h-8"
            >
              <Printer className="h-4 w-4 mr-1" />
              Impresión A4
            </Button>
          </div>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Diseño'}
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal" className="w-full h-full">
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <Tabs defaultValue="presets" className="w-full h-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="presets" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Temas
                </TabsTrigger>
                <TabsTrigger value="style" className="text-xs">
                  <Type className="h-3 w-3 mr-1" />
                  Estilo
                </TabsTrigger>
                <TabsTrigger value="layout" className="text-xs">
                  <Layout className="h-3 w-3 mr-1" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Config
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="presets" className="mt-4 overflow-y-auto">
                <PresetThemes 
                  template={currentTemplate}
                  onTemplateChange={setCurrentTemplate}
                />
              </TabsContent>
              
              <TabsContent value="style" className="mt-4 overflow-y-auto">
                <StylePanel 
                  template={currentTemplate}
                  onTemplateChange={setCurrentTemplate}
                />
              </TabsContent>
              
              <TabsContent value="layout" className="mt-4 overflow-y-auto">
                <LayoutPanel 
                  template={currentTemplate}
                  onTemplateChange={setCurrentTemplate}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-4 overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuración Avanzada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">
                      Opciones de configuración adicionales próximamente
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={70}>
            <PreviewPanel template={currentTemplate} viewMode={viewMode} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { HeaderEditor } from './HeaderEditor';
import { BodyEditor } from './BodyEditor';
import { FooterEditor } from './FooterEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MedicalRecordTemplate } from './MedicalRecordTemplateDesigner';

interface TemplateEditorProps {
  template: MedicalRecordTemplate;
  onSave: () => void;
  onCancel: () => void;
}

interface MedicalSpecialty {
  id: string;
  name: string;
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<MedicalRecordTemplate>(template);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_specialties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSpecialties(data || []);
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la plantilla es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.specialty_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar una especialidad",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Convert the template data to match the database schema
      const templateData = {
        name: formData.name,
        specialty_id: formData.specialty_id,
        is_active: formData.is_active,
        header_config: formData.header_config as any,
        body_config: formData.body_config as any,
        footer_config: formData.footer_config as any
      };

      if (formData.id) {
        const { error } = await supabase
          .from('medical_record_templates')
          .update(templateData)
          .eq('id', formData.id);

        if (error) throw error;

        toast({
          title: "Plantilla Actualizada",
          description: "La plantilla se ha actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('medical_record_templates')
          .insert(templateData);

        if (error) throw error;

        toast({
          title: "Plantilla Creada",
          description: "La nueva plantilla se ha creado correctamente.",
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre de la Plantilla</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de la plantilla"
              />
            </div>
            
            <div>
              <Label>Especialidad</Label>
              <Select 
                value={formData.specialty_id} 
                onValueChange={(value) => setFormData({ ...formData, specialty_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Plantilla Activa</Label>
          </div>
        </CardContent>
      </Card>

      {/* Editor de Encabezado */}
      <HeaderEditor
        headerConfig={formData.header_config}
        onChange={(config) => setFormData({ ...formData, header_config: config })}
      />

      {/* Editor de Cuerpo */}
      <BodyEditor
        bodyConfig={formData.body_config}
        onChange={(config) => setFormData({ ...formData, body_config: config })}
      />

      {/* Editor de Pie */}
      <FooterEditor
        footerConfig={formData.footer_config}
        onChange={(config) => setFormData({ ...formData, footer_config: config })}
      />

      {/* Botones de Acción */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </div>
  );
}

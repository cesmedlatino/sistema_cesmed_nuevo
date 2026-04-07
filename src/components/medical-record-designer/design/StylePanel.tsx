
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { MedicalRecordTemplate } from '../MedicalRecordTemplateDesigner';

interface StylePanelProps {
  template: MedicalRecordTemplate;
  onTemplateChange: (template: MedicalRecordTemplate) => void;
}

export function StylePanel({ template, onTemplateChange }: StylePanelProps) {
  const updateDesignConfig = (updates: any) => {
    const updatedTemplate = {
      ...template,
      design_config: {
        ...template.design_config!,
        ...updates
      }
    };
    onTemplateChange(updatedTemplate);
  };

  const updateColors = (colorUpdates: any) => {
    updateDesignConfig({
      colors: {
        ...template.design_config!.colors,
        ...colorUpdates
      }
    });
  };

  const updateTypography = (typographyUpdates: any) => {
    updateDesignConfig({
      typography: {
        ...template.design_config!.typography,
        ...typographyUpdates
      }
    });
  };

  const updateLayout = (layoutUpdates: any) => {
    updateDesignConfig({
      layout: {
        ...template.design_config!.layout,
        ...layoutUpdates
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Colores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary-color" className="text-xs">Color Primario</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="primary-color"
                type="color"
                value={template.design_config?.colors.primary || '#5c1c8c'}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={template.design_config?.colors.primary || '#5c1c8c'}
                onChange={(e) => updateColors({ primary: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondary-color" className="text-xs">Color Secundario</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="secondary-color"
                type="color"
                value={template.design_config?.colors.secondary || '#7cc444'}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={template.design_config?.colors.secondary || '#7cc444'}
                onChange={(e) => updateColors({ secondary: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="accent-color" className="text-xs">Color de Acento</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="accent-color"
                type="color"
                value={template.design_config?.colors.accent || '#e11d48'}
                onChange={(e) => updateColors({ accent: e.target.value })}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={template.design_config?.colors.accent || '#e11d48'}
                onChange={(e) => updateColors({ accent: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="background-color" className="text-xs">Color de Fondo</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="background-color"
                type="color"
                value={template.design_config?.colors.background || '#ffffff'}
                onChange={(e) => updateColors({ background: e.target.value })}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={template.design_config?.colors.background || '#ffffff'}
                onChange={(e) => updateColors({ background: e.target.value })}
                className="flex-1 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tipografía</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Fuente de Títulos</Label>
            <Select 
              value={template.design_config?.typography.headingFont || 'Arial'}
              onValueChange={(value) => updateTypography({ headingFont: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Calibri">Calibri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Fuente del Texto</Label>
            <Select 
              value={template.design_config?.typography.bodyFont || 'Arial'}
              onValueChange={(value) => updateTypography({ bodyFont: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Calibri">Calibri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tamaño de Fuente: {template.design_config?.typography.fontSize || 14}px</Label>
            <Slider
              value={[template.design_config?.typography.fontSize || 14]}
              onValueChange={(value) => updateTypography({ fontSize: value[0] })}
              max={20}
              min={8}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Diseño</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Espaciado: {template.design_config?.layout.spacing || 16}px</Label>
            <Slider
              value={[template.design_config?.layout.spacing || 16]}
              onValueChange={(value) => updateLayout({ spacing: value[0] })}
              max={32}
              min={4}
              step={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-xs">Radio de Bordes: {template.design_config?.layout.borderRadius || 8}px</Label>
            <Slider
              value={[template.design_config?.layout.borderRadius || 8]}
              onValueChange={(value) => updateLayout({ borderRadius: value[0] })}
              max={20}
              min={0}
              step={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label className="text-xs">Nivel de Sombra: {template.design_config?.layout.shadowLevel || 1}</Label>
            <Slider
              value={[template.design_config?.layout.shadowLevel || 1]}
              onValueChange={(value) => updateLayout({ shadowLevel: value[0] })}
              max={5}
              min={0}
              step={1}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

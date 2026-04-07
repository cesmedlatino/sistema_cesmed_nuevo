
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { GripVertical, Palette, ArrowUp, ArrowDown, Maximize, Minimize } from 'lucide-react';
import type { MedicalRecordTemplate, SectionDesign } from '../MedicalRecordTemplateDesigner';

interface LayoutPanelProps {
  template: MedicalRecordTemplate;
  onTemplateChange: (template: MedicalRecordTemplate) => void;
}

export function LayoutPanel({ template, onTemplateChange }: LayoutPanelProps) {
  const initializeSectionDesigns = () => {
    if (!template.design_config?.sections || template.design_config.sections.length === 0) {
      const sections: SectionDesign[] = template.body_config.map((section, index) => ({
        id: section.id,
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderColor: '#e5e7eb',
        order: index,
        width: 100,
        fields: section.fields.map((field, fieldIndex) => ({
          id: field.id,
          width: 50,
          order: fieldIndex,
          labelColor: '#374151',
          inputStyle: 'default'
        }))
      }));

      const updatedTemplate = {
        ...template,
        design_config: {
          ...template.design_config!,
          sections
        }
      };
      onTemplateChange(updatedTemplate);
      return sections;
    }
    return template.design_config.sections;
  };

  const sectionDesigns = initializeSectionDesigns();

  const updateSectionDesign = (sectionId: string, updates: Partial<SectionDesign>) => {
    const updatedSections = sectionDesigns.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );

    const updatedTemplate = {
      ...template,
      design_config: {
        ...template.design_config!,
        sections: updatedSections
      }
    };
    onTemplateChange(updatedTemplate);
  };

  const moveSectionUp = (sectionId: string) => {
    const currentIndex = sectionDesigns.findIndex(s => s.id === sectionId);
    if (currentIndex > 0) {
      const newSections = [...sectionDesigns];
      [newSections[currentIndex], newSections[currentIndex - 1]] = 
      [newSections[currentIndex - 1], newSections[currentIndex]];
      
      newSections.forEach((section, index) => {
        section.order = index;
      });

      const updatedTemplate = {
        ...template,
        design_config: {
          ...template.design_config!,
          sections: newSections
        }
      };
      onTemplateChange(updatedTemplate);
    }
  };

  const moveSectionDown = (sectionId: string) => {
    const currentIndex = sectionDesigns.findIndex(s => s.id === sectionId);
    if (currentIndex < sectionDesigns.length - 1) {
      const newSections = [...sectionDesigns];
      [newSections[currentIndex], newSections[currentIndex + 1]] = 
      [newSections[currentIndex + 1], newSections[currentIndex]];
      
      newSections.forEach((section, index) => {
        section.order = index;
      });

      const updatedTemplate = {
        ...template,
        design_config: {
          ...template.design_config!,
          sections: newSections
        }
      };
      onTemplateChange(updatedTemplate);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Organización de Secciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {template.body_config.map((section) => {
            const sectionDesign = sectionDesigns.find(s => s.id === section.id);
            return (
              <Card key={section.id} className="border-l-4" style={{ borderLeftColor: sectionDesign?.borderColor || '#e5e7eb' }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <h4 className="text-sm font-medium">{section.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {section.fields.length} campos
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSectionUp(section.id)}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveSectionDown(section.id)}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Color de Fondo</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          type="color"
                          value={sectionDesign?.backgroundColor || '#ffffff'}
                          onChange={(e) => updateSectionDesign(section.id, { backgroundColor: e.target.value })}
                          className="w-8 h-6 p-0 border rounded"
                        />
                        <Input
                          type="text"
                          value={sectionDesign?.backgroundColor || '#ffffff'}
                          onChange={(e) => updateSectionDesign(section.id, { backgroundColor: e.target.value })}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color del Borde</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          type="color"
                          value={sectionDesign?.borderColor || '#e5e7eb'}
                          onChange={(e) => updateSectionDesign(section.id, { borderColor: e.target.value })}
                          className="w-8 h-6 p-0 border rounded"
                        />
                        <Input
                          type="text"
                          value={sectionDesign?.borderColor || '#e5e7eb'}
                          onChange={(e) => updateSectionDesign(section.id, { borderColor: e.target.value })}
                          className="flex-1 text-xs h-6"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">Ancho de Sección</Label>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSectionDesign(section.id, { width: 50 })}
                          className="h-6 px-2 text-xs"
                        >
                          <Minimize className="h-3 w-3 mr-1" />
                          50%
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSectionDesign(section.id, { width: 75 })}
                          className="h-6 px-2 text-xs"
                        >
                          75%
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSectionDesign(section.id, { width: 100 })}
                          className="h-6 px-2 text-xs"
                        >
                          <Maximize className="h-3 w-3 mr-1" />
                          100%
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[sectionDesign?.width || 100]}
                        onValueChange={(value) => updateSectionDesign(section.id, { width: value[0] })}
                        max={100}
                        min={30}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono min-w-[3rem] text-right">
                        {sectionDesign?.width || 100}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

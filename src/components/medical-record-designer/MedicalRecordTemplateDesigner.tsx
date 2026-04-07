import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save, Eye, Printer } from 'lucide-react';
import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { TemplatePreview } from './TemplatePreview';
import { PrintableTemplatePreview } from './PrintableTemplatePreview';
import { TemplateDesigner } from './TemplateDesigner';

export interface MedicalRecordTemplate {
  id?: string;
  name: string;
  specialty_id: string;
  is_active: boolean;
  header_config: {
    logo_url?: string;
    title?: string;
    record_number_prefix?: string;
    record_number_zeros?: number;
  };
  body_config: TemplateSection[];
  footer_config: {
    signature_url?: string;
    text?: string;
  };
  design_config?: TemplateDesignConfig;
}

export interface TemplateDesignConfig {
  theme: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    fontSize: number;
  };
  layout: {
    spacing: number;
    borderRadius: number;
    shadowLevel: number;
  };
  sections: SectionDesign[];
}

export interface SectionDesign {
  id: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  order: number;
  width: number;
  fields: FieldDesign[];
}

export interface FieldDesign {
  id: string;
  width: number;
  order: number;
  labelColor: string;
  inputStyle: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  roman_numeral: string;
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text_short' | 'text_medium' | 'text_long' | 'text_multiline' | 'select' | 'yes_no' | 'date' | 'image_drawing' | 'preoperatory_exam_table' | 'uniforms_preoperatory_exam_table';
  required: boolean;
  options?: string[];
  base_image_url?: string;
  width?: number;
  responsive?: boolean;
}

export function MedicalRecordTemplateDesigner() {
  const [selectedTemplate, setSelectedTemplate] = useState<MedicalRecordTemplate | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'preview' | 'design' | 'print'>('list');

  const handleNewTemplate = () => {
    const newTemplate: MedicalRecordTemplate = {
      name: 'Nueva Plantilla',
      specialty_id: '',
      is_active: true,
      header_config: {
        record_number_prefix: 'HC',
        record_number_zeros: 6
      },
      body_config: [],
      footer_config: {},
      design_config: {
        theme: 'modern',
        colors: {
          primary: '#5c1c8c',
          secondary: '#7cc444',
          accent: '#e11d48',
          background: '#ffffff',
          text: '#1f2937'
        },
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Arial',
          fontSize: 14
        },
        layout: {
          spacing: 16,
          borderRadius: 8,
          shadowLevel: 1
        },
        sections: []
      }
    };
    setSelectedTemplate(newTemplate);
    setView('edit');
  };

  const handleEditTemplate = (template: MedicalRecordTemplate) => {
    setSelectedTemplate(template);
    setView('edit');
  };

  const handlePreviewTemplate = (template: MedicalRecordTemplate) => {
    setSelectedTemplate(template);
    setView('preview');
  };

  const handleDesignTemplate = (template: MedicalRecordTemplate) => {
    // Ensure design_config exists
    if (!template.design_config) {
      template.design_config = {
        theme: 'modern',
        colors: {
          primary: '#5c1c8c',
          secondary: '#7cc444',
          accent: '#e11d48',
          background: '#ffffff',
          text: '#1f2937'
        },
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Arial',
          fontSize: 14
        },
        layout: {
          spacing: 16,
          borderRadius: 8,
          shadowLevel: 1
        },
        sections: []
      };
    }
    setSelectedTemplate(template);
    setView('design');
  };

  const handleBackToList = () => {
    setSelectedTemplate(null);
    setView('list');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Diseñador de Historias Clínicas</h1>
          <p className="text-gray-600">Crea y administra plantillas para historias clínicas</p>
        </div>
        
        {view === 'list' && (
          <Button onClick={handleNewTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        )}
        
        {view !== 'list' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackToList}>
              Volver a la Lista
            </Button>
            {view === 'edit' && selectedTemplate && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handlePreviewTemplate(selectedTemplate)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setView('print')}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Versión Imprimible
                </Button>
              </>
            )}
            {view === 'preview' && selectedTemplate && (
              <Button 
                variant="outline" 
                onClick={() => setView('print')}
              >
                <Printer className="h-4 w-4 mr-2" />
                Versión Imprimible
              </Button>
            )}
          </div>
        )}
      </div>

      {view === 'list' && (
        <TemplateList 
          onEdit={handleEditTemplate}
          onPreview={handlePreviewTemplate}
          onDesign={handleDesignTemplate}
        />
      )}

      {view === 'edit' && selectedTemplate && (
        <TemplateEditor 
          template={selectedTemplate}
          onSave={() => setView('list')}
          onCancel={handleBackToList}
        />
      )}

      {view === 'preview' && selectedTemplate && (
        <TemplatePreview 
          template={selectedTemplate}
          onEdit={() => setView('edit')}
        />
      )}

      {view === 'design' && selectedTemplate && (
        <TemplateDesigner 
          template={selectedTemplate}
          onSave={() => setView('list')}
          onCancel={handleBackToList}
        />
      )}

      {view === 'print' && selectedTemplate && (
        <PrintableTemplatePreview 
          template={selectedTemplate}
        />
      )}
    </div>
  );
}

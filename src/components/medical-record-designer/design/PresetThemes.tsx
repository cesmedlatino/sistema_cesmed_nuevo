
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Palette } from 'lucide-react';
import type { MedicalRecordTemplate, TemplateDesignConfig } from '../MedicalRecordTemplateDesigner';

interface PresetThemesProps {
  template: MedicalRecordTemplate;
  onTemplateChange: (template: MedicalRecordTemplate) => void;
}

const PRESET_THEMES: { name: string; config: TemplateDesignConfig }[] = [
  {
    name: 'Moderno',
    config: {
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
  },
  {
    name: 'Clásico',
    config: {
      theme: 'classic',
      colors: {
        primary: '#1e40af',
        secondary: '#059669',
        accent: '#dc2626',
        background: '#f9fafb',
        text: '#374151'
      },
      typography: {
        headingFont: 'Times New Roman',
        bodyFont: 'Times New Roman',
        fontSize: 12
      },
      layout: {
        spacing: 12,
        borderRadius: 4,
        shadowLevel: 0
      },
      sections: []
    }
  },
  {
    name: 'Minimalista',
    config: {
      theme: 'minimal',
      colors: {
        primary: '#000000',
        secondary: '#6b7280',
        accent: '#3b82f6',
        background: '#ffffff',
        text: '#111827'
      },
      typography: {
        headingFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 13
      },
      layout: {
        spacing: 20,
        borderRadius: 0,
        shadowLevel: 0
      },
      sections: []
    }
  },
  {
    name: 'Profesional',
    config: {
      theme: 'professional',
      colors: {
        primary: '#0f172a',
        secondary: '#475569',
        accent: '#0ea5e9',
        background: '#f8fafc',
        text: '#334155'
      },
      typography: {
        headingFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 14
      },
      layout: {
        spacing: 14,
        borderRadius: 6,
        shadowLevel: 2
      },
      sections: []
    }
  },
  {
    name: 'Cálido',
    config: {
      theme: 'warm',
      colors: {
        primary: '#92400e',
        secondary: '#059669',
        accent: '#dc2626',
        background: '#fffbeb',
        text: '#451a03'
      },
      typography: {
        headingFont: 'Georgia',
        bodyFont: 'Georgia',
        fontSize: 14
      },
      layout: {
        spacing: 16,
        borderRadius: 8,
        shadowLevel: 1
      },
      sections: []
    }
  },
  {
    name: 'Médico',
    config: {
      theme: 'medical',
      colors: {
        primary: '#0c4a6e',
        secondary: '#047857',
        accent: '#be123c',
        background: '#f0f9ff',
        text: '#0c4a6e'
      },
      typography: {
        headingFont: 'Arial',
        bodyFont: 'Arial',
        fontSize: 13
      },
      layout: {
        spacing: 15,
        borderRadius: 6,
        shadowLevel: 1
      },
      sections: []
    }
  }
];

export function PresetThemes({ template, onTemplateChange }: PresetThemesProps) {
  const applyTheme = (themeConfig: TemplateDesignConfig) => {
    const updatedTemplate = {
      ...template,
      design_config: {
        ...themeConfig,
        sections: template.design_config?.sections || []
      }
    };
    onTemplateChange(updatedTemplate);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Temas Predefinidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRESET_THEMES.map((preset) => {
            const isActive = template.design_config?.theme === preset.config.theme;
            
            return (
              <Card
                key={preset.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/50'
                }`}
                onClick={() => applyTheme(preset.config)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{preset.name}</h4>
                      {isActive && (
                        <Badge variant="default" className="h-5">
                          <Check className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Colores:</span>
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: preset.config.colors.primary }}
                        title="Color primario"
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: preset.config.colors.secondary }}
                        title="Color secundario"
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: preset.config.colors.accent }}
                        title="Color de acento"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs" style={{
                    fontFamily: preset.config.typography.bodyFont,
                    fontSize: `${preset.config.typography.fontSize}px`,
                    backgroundColor: preset.config.colors.background
                  }}>
                    <div 
                      className="font-semibold mb-1"
                      style={{ 
                        color: preset.config.colors.primary,
                        fontFamily: preset.config.typography.headingFont
                      }}
                    >
                      EJEMPLO DE SECCIÓN
                    </div>
                    <div style={{ color: preset.config.colors.text }}>
                      Campo de ejemplo con este estilo - {preset.config.typography.headingFont}, {preset.config.typography.fontSize}px
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start text-xs"
            onClick={() => {
              const modernTheme = PRESET_THEMES.find(t => t.name === 'Moderno')?.config;
              if (modernTheme) {
                const resetTemplate = {
                  ...template,
                  design_config: {
                    ...modernTheme,
                    sections: template.design_config?.sections || []
                  }
                };
                onTemplateChange(resetTemplate);
              }
            }}
          >
            Restablecer a Tema Moderno
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

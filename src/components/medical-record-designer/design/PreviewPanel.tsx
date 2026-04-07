
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import type { MedicalRecordTemplate } from '../MedicalRecordTemplateDesigner';

interface PreviewPanelProps {
  template: MedicalRecordTemplate;
  viewMode?: 'screen' | 'print';
}

export function PreviewPanel({ template, viewMode = 'screen' }: PreviewPanelProps) {
  const designConfig = template.design_config;
  
  const getShadowClass = (level: number) => {
    const shadows = [
      'shadow-none',
      'shadow-sm',
      'shadow-md',
      'shadow-lg',
      'shadow-xl',
      'shadow-2xl'
    ];
    return shadows[level] || 'shadow-sm';
  };

  const renderFieldPreview = (field: any, sectionDesign?: any) => {
    const fieldDesign = sectionDesign?.fields?.find((f: any) => f.id === field.id);
    const fieldWidth = fieldDesign?.width || 50;
    
    const fieldStyle = {
      width: `${fieldWidth}%`,
      fontFamily: designConfig?.typography.bodyFont || 'Arial',
      fontSize: `${designConfig?.typography.fontSize || 14}px`,
      color: designConfig?.colors.text || '#1f2937'
    };

    switch (field.type) {
      case 'text_short':
        return (
          <div style={fieldStyle} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-8 border rounded px-2"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            />
          </div>
        );
      case 'text_medium':
        return (
          <div style={fieldStyle} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-8 border rounded px-2"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            />
          </div>
        );
      case 'text_long':
        return (
          <div style={{ ...fieldStyle, width: '100%' }} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-8 border rounded px-2"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            />
          </div>
        );
      case 'text_multiline':
        return (
          <div style={{ ...fieldStyle, width: '100%' }} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-16 border rounded px-2"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            />
          </div>
        );
      case 'select':
        return (
          <div style={fieldStyle} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-8 border rounded px-2 flex items-center text-gray-500"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            >
              Seleccionar...
            </div>
          </div>
        );
      case 'yes_no':
        return (
          <div style={fieldStyle} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" disabled className="mr-1" />
                Sí
              </label>
              <label className="flex items-center">
                <input type="radio" disabled className="mr-1" />
                No
              </label>
            </div>
          </div>
        );
      case 'date':
        return (
          <div style={fieldStyle} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="h-8 border rounded px-2 flex items-center text-gray-500"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            >
              dd/mm/aaaa
            </div>
          </div>
        );
      case 'image_drawing':
        return (
          <div style={{ ...fieldStyle, width: '100%' }} className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: fieldDesign?.labelColor || designConfig?.colors.text }}>
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div 
              className="border-2 border-dashed rounded p-4 h-32 flex flex-col items-center justify-center bg-gray-50"
              style={{ 
                borderRadius: `${designConfig?.layout.borderRadius || 8}px`,
                borderColor: designConfig?.colors.primary || '#5c1c8c'
              }}
            >
              {field.base_image_url ? (
                <div className="text-center">
                  <img 
                    src={field.base_image_url} 
                    alt="Imagen base" 
                    className="w-16 h-16 object-cover rounded mb-1"
                  />
                  <p className="text-xs text-gray-500">Imagen base</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Área de dibujo</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          Vista Previa del Diseño 
          {viewMode === 'print' && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              A4 - 210x297mm
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-auto">
        <div 
          className={`mx-auto ${viewMode === 'print' ? 'w-[210mm] min-h-[297mm] shadow-lg border' : 'w-full'}`}
          style={{
            ...(viewMode === 'print' && {
              aspectRatio: '210/297',
              backgroundColor: '#ffffff',
              transform: 'scale(0.8)',
              transformOrigin: 'top center'
            })
          }}
        >
          <div 
            className={`p-6 rounded-lg ${viewMode === 'screen' ? getShadowClass(designConfig?.layout.shadowLevel || 1) : ''}`}
            style={{ 
              backgroundColor: designConfig?.colors.background || '#ffffff',
              fontFamily: designConfig?.typography.bodyFont || 'Arial',
              fontSize: `${designConfig?.typography.fontSize || 14}px`,
              borderRadius: viewMode === 'print' ? '0px' : `${designConfig?.layout.borderRadius || 8}px`,
              minHeight: viewMode === 'print' ? '297mm' : 'auto'
            }}
          >
          {/* Header */}
          <div className="mb-6 pb-4 border-b" style={{ borderColor: designConfig?.colors.primary || '#5c1c8c' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {template.header_config.logo_url && (
                  <div className="w-12 h-12 bg-gray-100 border rounded flex items-center justify-center">
                    <img 
                      src={template.header_config.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <h1 
                  className="text-xl font-bold"
                  style={{ 
                    color: designConfig?.colors.primary || '#5c1c8c',
                    fontFamily: designConfig?.typography.headingFont || 'Arial'
                  }}
                >
                  {template.header_config.title || 'HISTORIA CLÍNICA'}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-sm" style={{ color: designConfig?.colors.text || '#1f2937' }}>
                  Nro de Historia Clínica:
                </div>
                <div 
                  className="font-mono text-lg font-semibold"
                  style={{ color: designConfig?.colors.primary || '#5c1c8c' }}
                >
                  {template.header_config.record_number_prefix || 'HC'}-
                  {'0'.repeat(template.header_config.record_number_zeros || 6)}1
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-6">
            {template.body_config
              .sort((a, b) => {
                const aDesign = designConfig?.sections?.find(s => s.id === a.id);
                const bDesign = designConfig?.sections?.find(s => s.id === b.id);
                return (aDesign?.order || 0) - (bDesign?.order || 0);
              })
              .map((section) => {
                const sectionDesign = designConfig?.sections?.find(s => s.id === section.id);
                return (
                  <div 
                    key={section.id}
                    className="p-4 rounded border-l-4"
                    style={{ 
                      backgroundColor: sectionDesign?.backgroundColor || '#ffffff',
                      borderLeftColor: sectionDesign?.borderColor || designConfig?.colors.primary || '#5c1c8c',
                      width: `${sectionDesign?.width || 100}%`,
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      borderRadius: `${designConfig?.layout.borderRadius || 8}px`
                    }}
                  >
                    <h2 
                      className="text-base font-semibold mb-4"
                      style={{ 
                        color: sectionDesign?.textColor || designConfig?.colors.primary || '#5c1c8c',
                        fontFamily: designConfig?.typography.headingFont || 'Arial'
                      }}
                    >
                      {section.roman_numeral}. {section.title}
                    </h2>
                    <div className="flex flex-wrap gap-4">
                      {section.fields.map((field) => renderFieldPreview(field, sectionDesign))}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          {(template.footer_config.signature_url || template.footer_config.text) && (
            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: designConfig?.colors.primary || '#5c1c8c' }}>
              {template.footer_config.signature_url && (
                <div className="mb-4">
                  <img 
                    src={template.footer_config.signature_url} 
                    alt="Firma" 
                    className="h-12 mx-auto"
                  />
                </div>
              )}
              {template.footer_config.text && (
                <p className="text-sm font-medium" style={{ color: designConfig?.colors.text || '#1f2937' }}>
                  {template.footer_config.text}
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

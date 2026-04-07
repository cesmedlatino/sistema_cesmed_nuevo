import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ImageIcon } from 'lucide-react';
import type { MedicalRecordTemplate } from './MedicalRecordTemplateDesigner';

interface PrintableTemplatePreviewProps {
  template: MedicalRecordTemplate;
}

export function PrintableTemplatePreview({ template }: PrintableTemplatePreviewProps) {
  const renderFieldPreview = (field: any) => {
    // Calcular el ancho basado en la configuración del campo
    const fieldWidth = field.width ? `${field.width}px` : 'auto';
    
    switch (field.type) {
      case 'text_short':
        return <div className="border-b border-gray-800 h-6 print:h-5" style={{ width: fieldWidth, minWidth: '100px' }}></div>;
      case 'text_medium':
        return <div className="border-b border-gray-800 h-6 print:h-5" style={{ width: fieldWidth, minWidth: '150px' }}></div>;
      case 'text_long':
        return <div className="border-b border-gray-800 h-6 print:h-5" style={{ width: fieldWidth, minWidth: '200px' }}></div>;
      case 'text_multiline':
        return <div className="border border-gray-800 h-16 print:h-12" style={{ width: fieldWidth, minWidth: '200px' }}></div>;
      case 'select':
        return (
          <div className="space-y-1">
            <div className="border border-gray-800 h-8 print:h-6 flex items-center px-2 text-gray-700 print:text-black" style={{ width: fieldWidth, minWidth: '120px' }}>
              Seleccionar opción
            </div>
            {field.options && field.options.length > 0 && (
              <div className="text-xs text-gray-600 print:text-black ml-2">
                Opciones: {field.options.join(', ')}
              </div>
            )}
          </div>
        );
      case 'yes_no':
        return (
          <div className="flex gap-4" style={{ width: fieldWidth, minWidth: '120px' }}>
            <label className="flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-800 rounded-sm"></div> Sí
            </label>
            <label className="flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-800 rounded-sm"></div> No
            </label>
          </div>
        );
      case 'date':
        return <div className="border border-gray-800 h-8 print:h-6 flex items-center px-2 text-gray-700 print:text-black" style={{ width: fieldWidth, minWidth: '120px' }}>___/___/_____</div>;
      case 'image_drawing':
        return (
          <div className="space-y-2">
            <div 
              className="border-2 border-gray-800 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 print:bg-white"
              style={{ 
                width: fieldWidth, 
                height: '192px', // 48 * 4 = 192px (h-48)
                minWidth: '200px',
                maxWidth: '100%'
              }}
            >
              {field.base_image_url ? (
                <div className="text-center">
                  <img 
                    src={field.base_image_url} 
                    alt="Imagen base" 
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                  <p className="text-xs text-gray-700 print:text-black">Imagen base para dibujo</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-gray-600 print:text-black mb-2" />
                  <p className="text-sm text-gray-700 print:text-black">Área de dibujo</p>
                  <p className="text-xs text-gray-600 print:text-black">Se puede anotar sobre la imagen</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <div className="border-b border-gray-800 h-6 print:h-5" style={{ width: fieldWidth, minWidth: '100px' }}></div>;
    }
  };

  const handlePrint = () => {
    // Ocultar el botón de imprimir antes de imprimir
    const printButton = document.getElementById('print-button');
    const originalDisplay = printButton?.style.display;
    if (printButton) {
      printButton.style.display = 'none';
    }

    // Imprimir
    window.print();

    // Restaurar el botón después de imprimir
    if (printButton && originalDisplay !== undefined) {
      printButton.style.display = originalDisplay;
    }
  };

  return (
    <div className="template-print-container">
      <div className="flex justify-between items-center print:hidden mb-6">
        <h2 className="text-xl font-semibold">Versión Imprimible: {template.name}</h2>
        <Button id="print-button" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Documento para imprimir */}
      <div className="template-print-content w-full max-w-none mx-auto bg-white print:bg-white print:shadow-none">
        <div className="p-4 sm:p-6 lg:p-8 print:p-4">
          {/* Encabezado */}
          <div className="mb-8 border-b border-gray-800 pb-6 print:mb-6 print:pb-4">
            <div className="flex items-center gap-6">
              {template.header_config.logo_url && (
                <div className="w-32 h-32 print:w-24 print:h-24 bg-gray-100 print:bg-white border-2 border-gray-800 rounded flex items-center justify-center overflow-hidden">
                  <img 
                    src={template.header_config.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h1 className="text-4xl print:text-3xl font-bold text-black">
                    {template.header_config.title || 'HISTORIA CLÍNICA'}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-sm print:text-xs text-gray-800 print:text-black">Nro de Historia Clínica:</div>
                  <div className="font-mono text-lg print:text-base font-semibold text-black">
                    {template.header_config.record_number_prefix || 'HC'}-
                    {'0'.repeat(template.header_config.record_number_zeros || 6)}1
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="space-y-8 print:space-y-6">
            {template.body_config.map((section, index) => (
              <div key={section.id}>
                <h2 className="text-lg print:text-base font-semibold mb-4 print:mb-3 border-b border-gray-800 pb-2 print:pb-1 text-black">
                  {section.roman_numeral}. {section.title}
                </h2>
                <div className="space-y-4 print:space-y-3">
                  {(() => {
                    const rows: any[] = [];
                    let currentRow: any[] = [];
                    let currentRowWidth = 0;
                    const maxRowWidth = 1200; // Ancho máximo de contenedor
                    
                    section.fields.forEach((field) => {
                      // Campo no responsivo - siempre ocupa una fila completa
                      if (field.responsive === false) {
                        // Si hay campos acumulados en la fila actual, los agregamos como fila
                        if (currentRow.length > 0) {
                          rows.push({ type: 'responsive-row', fields: [...currentRow] });
                          currentRow = [];
                          currentRowWidth = 0;
                        }
                        // Agregamos el campo no responsivo como fila individual
                        rows.push({ type: 'non-responsive', field });
                      } else {
                        // Campo responsivo - intentamos agregarlo a la fila actual
                        const fieldWidth = field.width || 200;
                        const fieldTotalWidth = fieldWidth + 24; // Incluimos margin
                        
                        // Si agregar este campo excede el ancho máximo, comenzamos nueva fila
                        if (currentRow.length > 0 && currentRowWidth + fieldTotalWidth > maxRowWidth) {
                          rows.push({ type: 'responsive-row', fields: [...currentRow] });
                          currentRow = [];
                          currentRowWidth = 0;
                        }
                        
                        currentRow.push(field);
                        currentRowWidth += fieldTotalWidth;
                      }
                    });
                    
                    // Agregamos la última fila si tiene campos
                    if (currentRow.length > 0) {
                      rows.push({ type: 'responsive-row', fields: currentRow });
                    }
                    
                    return rows.map((row, rowIndex) => {
                      if (row.type === 'non-responsive') {
                        const field = row.field;
                        return (
                          <div key={`${field.id}-${rowIndex}`} className="w-full">
                            <div className="space-y-1 print:space-y-0.5">
                              <label className="text-sm print:text-xs font-medium flex items-center gap-1 text-black">
                                {field.name}
                                {field.required && <span className="text-red-600 print:text-black">*</span>}
                              </label>
                              <div style={{ width: field.width ? `${field.width}px` : 'auto', maxWidth: '100%' }}>
                                {renderFieldPreview(field)}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Fila responsiva con múltiples campos
                        return (
                          <div key={`row-${rowIndex}`} className="flex flex-wrap gap-6 print:gap-4">
                            {row.fields.map((field: any) => (
                              <div 
                                key={field.id} 
                                className="flex-shrink-0"
                                style={{ 
                                  width: field.width ? `${field.width}px` : '200px',
                                  minWidth: '150px',
                                  maxWidth: '100%'
                                }}
                              >
                                <div className="space-y-1 print:space-y-0.5">
                                  <label className="text-sm print:text-xs font-medium flex items-center gap-1 text-black">
                                    {field.name}
                                    {field.required && <span className="text-red-600 print:text-black">*</span>}
                                  </label>
                                  {renderFieldPreview(field)}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Pie */}
          {(template.footer_config.signature_url || template.footer_config.text) && (
            <div className="mt-12 print:mt-8 pt-8 print:pt-6 border-t border-gray-800">
              <div className="flex flex-col items-center space-y-4 print:space-y-3">
                {template.footer_config.signature_url && (
                  <div className="w-48 print:w-36 h-16 print:h-12 bg-gray-100 print:bg-white border-2 border-gray-800 rounded flex items-center justify-center overflow-hidden">
                    <img 
                      src={template.footer_config.signature_url} 
                      alt="Firma" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                {template.footer_config.text && (
                  <p className="text-center text-sm print:text-xs font-medium text-black">
                    {template.footer_config.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
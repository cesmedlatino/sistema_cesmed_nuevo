import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import type { MedicalRecordTemplate, TemplateField } from './MedicalRecordTemplateDesigner';

export function useTemplatePDFGenerator() {
  const { toast } = useToast();

  // Detectar si es una sección de evaluación diagnóstica
  const isDiagnosticSection = (section: any): boolean => {
    const title = (section.title || '').toLowerCase();
    return title.includes('evaluación diagnóstica') || 
           title.includes('evaluacion diagnostica') ||
           title.includes('diagnostico');
  };

  // Generar PDF desde un elemento HTML renderizado
  const generatePDFFromElement = async (element: HTMLElement, fileName: string) => {
    try {
      toast({
        title: "Generando PDF...",
        description: "Por favor espere mientras se procesa el documento.",
      });

      // Capturar el elemento como canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(fileName);

      toast({
        title: "PDF Generado",
        description: `Se ha descargado el archivo ${fileName}`,
      });

    } catch (error) {
      console.error('Error generating PDF from element:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  const generatePDF = async (template: MedicalRecordTemplate) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let currentY = margin;

      const designConfig = template.design_config;
      const primaryColor = designConfig?.colors?.primary || '#5c1c8c';
      const textColor = designConfig?.colors?.text || '#1f2937';

      // Convert hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 92, g: 28, b: 140 };
      };

      const primary = hexToRgb(primaryColor);
      const text = hexToRgb(textColor);

      // === HEADER SECTION ===
      
      // Logo placeholder (left side)
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY, 18, 18, 'S');
      if (template.header_config.logo_url) {
        doc.setFontSize(5);
        doc.setTextColor(150, 150, 150);
        doc.text('LOGO', margin + 9, currentY + 10, { align: 'center' });
      }

      // Title and template name (next to logo)
      const titleX = margin + 22;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(text.r, text.g, text.b);
      const title = template.header_config.title || 'HISTORIA CLÍNICA';
      doc.text(title.toUpperCase(), titleX, currentY + 7);

      // Template name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text(template.name, titleX, currentY + 13);

      // Record number (right side)
      const recordPrefix = template.header_config.record_number_prefix || 'HC';
      const recordZeros = template.header_config.record_number_zeros || 6;
      const recordNumber = `${recordPrefix}-${'0'.repeat(recordZeros)}1`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text('Nro de Historia Clínica:', pageWidth - margin, currentY + 5, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(recordNumber, pageWidth - margin, currentY + 11, { align: 'right' });

      // Status badge
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(pageWidth - margin - 20, currentY + 14, 20, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text('En Progreso', pageWidth - margin - 10, currentY + 17.5, { align: 'center' });

      currentY += 24;

      // Patient info section (two columns)
      doc.setFontSize(8);
      doc.setTextColor(text.r, text.g, text.b);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Paciente:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text('Juan Carlos Pérez García', margin + 16, currentY);

      doc.setFont('helvetica', 'bold');
      doc.text('DNI:', pageWidth / 2, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text('12345678', pageWidth / 2 + 8, currentY);

      currentY += 5;

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de Visita:', margin, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString('es-PE'), margin + 25, currentY);

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de Creación:', pageWidth / 2, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleString('es-PE'), pageWidth / 2 + 30, currentY);

      currentY += 10;

      // Separator line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      currentY += 8;

      // === BODY SECTIONS ===
      const sections = template.body_config || [];
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Check if we need a new page
        if (currentY > pageHeight - 35) {
          doc.addPage();
          currentY = margin;
        }

         // Section header
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(10);
         doc.setTextColor(text.r, text.g, text.b);
         doc.text(`${section.roman_numeral}. ${section.title.toUpperCase()}`, margin, currentY);

         currentY += 2;
        
         // Section underline
         doc.setDrawColor(220, 220, 220);
         doc.setLineWidth(0.2);
         doc.line(margin, currentY, pageWidth - margin, currentY);

        currentY += 6;

        // Process fields into rows based on width
        const fields = section.fields || [];
        const containerWidth = 800; // Reference width from the viewer
        const isDiagnostic = isDiagnosticSection(section);

        const rows: TemplateField[][] = [];
        let currentRow: TemplateField[] = [];
        let currentRowWidth = 0;

        fields.forEach((field) => {
          const fieldWidth = field.width || 200;
           const isResponsive = field.responsive !== false;
           // Textareas in diagnostic sections should be full-width
           const isFullWidth = isDiagnostic && field.type === 'text_multiline';

           if (!isResponsive || isFullWidth) {
            // Non-responsive field: takes full row
            if (currentRow.length > 0) {
              rows.push([...currentRow]);
              currentRow = [];
              currentRowWidth = 0;
            }
            rows.push([field]);
          } else {
            // Responsive field: can share row
            if (currentRowWidth + fieldWidth > containerWidth && currentRow.length > 0) {
              rows.push([...currentRow]);
              currentRow = [field];
              currentRowWidth = fieldWidth;
            } else {
              currentRow.push(field);
              currentRowWidth += fieldWidth;
            }
          }
        });

        if (currentRow.length > 0) {
          rows.push(currentRow);
        }

        // Render rows
        for (const row of rows) {
          // Check if we need a new page
          if (currentY > pageHeight - 25) {
            doc.addPage();
            currentY = margin;
          }

          const fieldsInRow = row.length;
          const fieldPdfWidth = (contentWidth - (fieldsInRow - 1) * 5) / fieldsInRow;

          // Calculate row height based on field types
          let rowHeight = 10;
          row.forEach(field => {
            if (field.type === 'text_multiline') rowHeight = Math.max(rowHeight, 14);
            if (field.type === 'image_drawing') rowHeight = Math.max(rowHeight, 30);
            if (field.type === 'preoperatory_exam_table' || field.type === 'uniforms_preoperatory_exam_table') {
              rowHeight = Math.max(rowHeight, 25);
            }
          });

          // Render each field in the row
          row.forEach((field, fieldIndex) => {
            const fieldX = margin + fieldIndex * (fieldPdfWidth + 5);
            const isFullWidth = field.responsive === false;
            const actualFieldWidth = isFullWidth ? contentWidth : fieldPdfWidth;

            renderFieldInPDF(doc, field, fieldX, currentY, actualFieldWidth, primary, text);
          });

          currentY += rowHeight;
        }

        currentY += 6;
      }

      // === FOOTER SECTION ===
      if (template.footer_config.text || template.footer_config.signature_url) {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = pageHeight - 40;
        }

        // Signature line
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(pageWidth / 2 - 25, currentY + 15, pageWidth / 2 + 25, currentY + 15);

        if (template.footer_config.text) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(text.r, text.g, text.b);
          doc.text(template.footer_config.text, pageWidth / 2, currentY + 20, { align: 'center' });
        }
      }

      // Save PDF
      const fileName = `plantilla_${template.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Generado",
        description: `Se ha descargado el archivo ${fileName}`,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    }
  };

  // Helper function to render a field in PDF
  const renderFieldInPDF = (
    doc: jsPDF, 
    field: TemplateField, 
    x: number, 
    y: number, 
    width: number,
    primary: { r: number; g: number; b: number },
    text: { r: number; g: number; b: number }
  ) => {
    // Field label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(text.r, text.g, text.b);
    doc.text(field.name, x, y);
    
    // Required marker
    if (field.required) {
      const labelWidth = doc.getTextWidth(field.name);
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text(' *', x + labelWidth, y);
    }

    // Field value placeholder
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    switch (field.type) {
      case 'text_short':
      case 'text_medium':
      case 'text_long':
      case 'select':
      case 'yes_no':
      case 'date':
        doc.text('No especificado', x, y + 4);
        break;

      case 'text_multiline':
        doc.text('No especificado', x, y + 4);
        break;

      case 'image_drawing':
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(x, y + 2, width - 5, 22, 'S');
        doc.setFontSize(7);
        doc.text('Área de imagen/dibujo', x + (width - 5) / 2, y + 14, { align: 'center' });
        break;

      case 'preoperatory_exam_table':
      case 'uniforms_preoperatory_exam_table':
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(x, y + 2, width - 5, 18, 'S');
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y + 2, width - 5, 5, 'F');
        doc.setFontSize(7);
        doc.setTextColor(text.r, text.g, text.b);
        doc.text('Tabla de exámenes', x + 3, y + 5.5);
        break;

      default:
        doc.text('No especificado', x, y + 4);
    }
  };

  return { generatePDF };
}

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncomeReport, IncomeReportItem } from "@/hooks/useIncomeReport";
import { useClinicData } from "@/hooks/useClinicData";
import { getLocalDateString } from "@/lib/utils";
import { Download, Printer, FileText, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Print-specific table component
function PrintableShiftTable({ 
  turno, 
  fecha, 
  items, 
  subtotal,
  egresos,
  total 
}: { 
  turno: "Mañana" | "Tarde";
  fecha: string;
  items: IncomeReportItem[];
  subtotal: number;
  egresos: number;
  total: number;
}) {
  if (items.length === 0) {
    return (
      <div className="mb-6">
        <div className="border-b-2 border-primary pb-2 mb-3">
          <h3 className="text-lg font-bold text-primary">Turno {turno}</h3>
          <p className="text-xs text-muted-foreground capitalize">{fecha}</p>
        </div>
        <p className="text-center text-muted-foreground py-4 italic">
          No hay registros para este turno
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 page-break-inside-avoid">
      <div className="border-b-2 border-primary pb-2 mb-3">
        <h3 className="text-lg font-bold text-primary">Turno {turno}</h3>
        <p className="text-xs text-muted-foreground capitalize">{fecha}</p>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="border border-primary/30 px-2 py-1.5 text-center w-8">N°</th>
            <th className="border border-primary/30 px-2 py-1.5 text-center w-10">DOC</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Nro Documento</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Sistema</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Paciente</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Concepto</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Especialidad</th>
            <th className="border border-primary/30 px-2 py-1.5 text-left">Modo Pago</th>
            <th className="border border-primary/30 px-2 py-1.5 text-right w-20">Importe</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}>
              <td className="border border-muted px-2 py-1 text-center">{item.numero}</td>
              <td className="border border-muted px-2 py-1 text-center font-semibold text-primary">{item.doc_abreviatura}</td>
              <td className="border border-muted px-2 py-1 font-mono text-[10px]">{item.nro_documento}</td>
              <td className="border border-muted px-2 py-1">{item.sistema}</td>
              <td className="border border-muted px-2 py-1 font-medium">{item.nombres_apellidos}</td>
              <td className="border border-muted px-2 py-1">{item.concepto}</td>
              <td className="border border-muted px-2 py-1 text-muted-foreground">{item.especialidad || "-"}</td>
              <td className="border border-muted px-2 py-1">{item.modo_pago}</td>
              <td className="border border-muted px-2 py-1 text-right font-medium">S/ {item.pago.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50">
            <td colSpan={8} className="border border-muted px-2 py-1.5 text-right font-semibold text-blue-700">
              SUB TOTAL
            </td>
            <td className="border border-muted px-2 py-1.5 text-right font-bold text-blue-700">
              S/ {subtotal.toFixed(2)}
            </td>
          </tr>
          <tr className="bg-red-50">
            <td colSpan={8} className="border border-muted px-2 py-1.5 text-right font-semibold text-red-600">
              EGRESOS
            </td>
            <td className="border border-muted px-2 py-1.5 text-right font-bold text-red-600">
              S/ {egresos.toFixed(2)}
            </td>
          </tr>
          <tr className="bg-secondary/20">
            <td colSpan={8} className="border border-muted px-2 py-2 text-right font-bold text-secondary-foreground text-sm">
              TOTAL
            </td>
            <td className="border border-muted px-2 py-2 text-right font-bold text-secondary-foreground text-sm">
              S/ {total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Screen table component
function IncomeReportTable({ 
  turno, 
  fecha, 
  items, 
  subtotal,
  egresos,
  total 
}: { 
  turno: "Mañana" | "Tarde";
  fecha: string;
  items: IncomeReportItem[];
  subtotal: number;
  egresos: number;
  total: number;
}) {
  if (items.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">
            Turno {turno}
          </CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{fecha}</p>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No hay registros para este turno
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">
          Turno {turno}
        </CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{fecha}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center font-semibold">N°</TableHead>
                <TableHead className="w-12 text-center font-semibold">DOC</TableHead>
                <TableHead className="font-semibold">Nro Documento</TableHead>
                <TableHead className="font-semibold">Sistema</TableHead>
                <TableHead className="font-semibold">Nombres y Apellidos</TableHead>
                <TableHead className="font-semibold">Concepto</TableHead>
                <TableHead className="font-semibold">Especialidad</TableHead>
                <TableHead className="font-semibold">Modo de Pago</TableHead>
                <TableHead className="text-right font-semibold">Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="text-center font-medium">{item.numero}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold text-primary">{item.doc_abreviatura}</span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.nro_documento}</TableCell>
                  <TableCell>{item.sistema}</TableCell>
                  <TableCell className="font-medium">{item.nombres_apellidos}</TableCell>
                  <TableCell>{item.concepto}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.especialidad || "-"}
                  </TableCell>
                  <TableCell>{item.modo_pago}</TableCell>
                  <TableCell className="text-right font-medium">
                    S/ {item.pago.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Fila de Subtotal */}
              <TableRow className="bg-accent/50 font-semibold border-t-2">
                <TableCell colSpan={8} className="text-right">
                  SUB TOTAL
                </TableCell>
                <TableCell className="text-right">
                  S/ {subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
              
              {/* Fila de Egresos */}
              <TableRow className="bg-destructive/10 font-semibold">
                <TableCell colSpan={8} className="text-right text-destructive">
                  EGRESOS
                </TableCell>
                <TableCell className="text-right text-destructive">
                  S/ {egresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
              
              {/* Fila de Total */}
              <TableRow className="bg-secondary/20 font-bold text-lg">
                <TableCell colSpan={8} className="text-right text-secondary-foreground">
                  TOTAL
                </TableCell>
                <TableCell className="text-right text-secondary-foreground">
                  S/ {total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to load image as base64 with dimensions
async function loadImageAsBase64WithDimensions(url: string): Promise<{ base64: string; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Create an image to get dimensions
        const img = new Image();
        img.onload = () => {
          resolve({
            base64,
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => resolve(null);
        img.src = base64;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Generate professional PDF report
async function generateProfessionalPDF(
  data: any,
  clinicData: any,
  selectedDate: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Colors
  const primaryColor: [number, number, number] = [92, 28, 140]; // Purple
  const secondaryColor: [number, number, number] = [124, 196, 68]; // Green
  const darkGray: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [128, 128, 128];
  const headerBg: [number, number, number] = [248, 245, 252];
  
  let y = 10;
  
  // Try to load logo with proper dimensions
  const logoUrl = clinicData.logo || "/images/logo-cesmed.png";
  const logoData = await loadImageAsBase64WithDimensions(logoUrl);
  
  // ============ HEADER SECTION ============
  // Header background
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Left accent line
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 4, 45, "F");
  
  // Logo with proper aspect ratio
  let logoWidth = 0;
  if (logoData) {
    try {
      const maxLogoHeight = 28;
      const maxLogoWidth = 45;
      const aspectRatio = logoData.width / logoData.height;
      
      // Calculate dimensions maintaining aspect ratio
      let targetHeight = maxLogoHeight;
      let targetWidth = targetHeight * aspectRatio;
      
      // If width exceeds max, scale down
      if (targetWidth > maxLogoWidth) {
        targetWidth = maxLogoWidth;
        targetHeight = targetWidth / aspectRatio;
      }
      
      logoWidth = targetWidth;
      doc.addImage(logoData.base64, "PNG", margin, 8, targetWidth, targetHeight);
    } catch (e) {
      console.error("Error adding logo:", e);
      logoWidth = 0;
    }
  }
  
  // Company Name
  const textStartX = logoWidth > 0 ? margin + logoWidth + 5 : margin;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(clinicData.name || "CESMED LATINOAMERICANO", textStartX, 18);
  
  // Company details
  doc.setTextColor(...lightGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC: ${clinicData.ruc || "20607644315"}`, textStartX, 24);
  doc.text(clinicData.address || "Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa", textStartX, 29);
  doc.text(`Tel: ${clinicData.phone || "054-407301 | Cel: 959029377"} | ${clinicData.email || "info@cesmedlatinoamericano.com"}`, textStartX, 34);
  
  // Report title on the right
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE CAJA", pageWidth - margin, 18, { align: "right" });
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fechaDisplay = data.fechaFormateada.charAt(0).toUpperCase() + data.fechaFormateada.slice(1);
  doc.text(fechaDisplay, pageWidth - margin, 26, { align: "right" });
  
  // Date badge
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth - margin - 45, 30, 45, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(selectedDate, pageWidth - margin - 22.5, 36.5, { align: "center" });
  
  y = 52;
  
  // Separator line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  // Helper function to draw a shift table
  const drawShiftTable = (
    turnoName: string,
    items: any[],
    subtotal: number,
    egresos: number,
    total: number,
    startY: number
  ): number => {
    let currentY = startY;
    
    // Shift header
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, currentY, 50, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`TURNO ${turnoName.toUpperCase()}`, margin + 25, currentY + 5.5, { align: "center" });
    
    currentY += 12;
    
    if (items.length === 0) {
      doc.setTextColor(...lightGray);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("No hay registros para este turno", pageWidth / 2, currentY + 5, { align: "center" });
      return currentY + 15;
    }
    
    // Table header
    const colWidths = [12, 12, 28, 22, 45, 35, 26];
    const headers = ["N°", "DOC", "Nro Doc", "Sistema", "Paciente", "Concepto", "Pago"];
    
    doc.setFillColor(240, 240, 245);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 7, "F");
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    
    let colX = margin + 2;
    headers.forEach((header, i) => {
      doc.text(header, colX, currentY + 5);
      colX += colWidths[i];
    });
    
    currentY += 8;
    
    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    
    const maxRows = 18; // Limit rows per shift to fit on page
    const displayItems = items.slice(0, maxRows);
    
    displayItems.forEach((item, idx) => {
      // Alternate row background
      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 254);
        doc.rect(margin, currentY - 1, pageWidth - 2 * margin, 6, "F");
      }
      
      doc.setTextColor(...darkGray);
      colX = margin + 2;
      
      // N°
      doc.text(String(item.numero), colX, currentY + 3);
      colX += colWidths[0];
      
      // DOC
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.text(item.doc_abreviatura, colX, currentY + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkGray);
      colX += colWidths[1];
      
      // Nro Doc
      doc.text(item.nro_documento.substring(0, 14), colX, currentY + 3);
      colX += colWidths[2];
      
      // Sistema
      doc.text(item.sistema.substring(0, 10), colX, currentY + 3);
      colX += colWidths[3];
      
      // Paciente
      doc.text(item.nombres_apellidos.substring(0, 28), colX, currentY + 3);
      colX += colWidths[4];
      
      // Concepto
      doc.text(item.concepto.substring(0, 20), colX, currentY + 3);
      colX += colWidths[5];
      
      // Pago
      doc.setFont("helvetica", "bold");
      doc.text(`S/ ${item.pago.toFixed(2)}`, colX, currentY + 3);
      doc.setFont("helvetica", "normal");
      
      currentY += 6;
    });
    
    if (items.length > maxRows) {
      doc.setTextColor(...lightGray);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`... y ${items.length - maxRows} registros más`, margin + 5, currentY + 3);
      currentY += 6;
    }
    
    currentY += 2;
    
    // Totals section
    const totalsX = pageWidth - margin - 60;
    
    // Subtotal
    doc.setFillColor(230, 240, 255);
    doc.rect(totalsX, currentY, 60, 6, "F");
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SUBTOTAL:", totalsX + 2, currentY + 4.5);
    doc.text(`S/ ${subtotal.toFixed(2)}`, totalsX + 58, currentY + 4.5, { align: "right" });
    currentY += 7;
    
    // Egresos
    doc.setFillColor(255, 235, 235);
    doc.rect(totalsX, currentY, 60, 6, "F");
    doc.setTextColor(220, 38, 38);
    doc.text("EGRESOS:", totalsX + 2, currentY + 4.5);
    doc.text(`S/ ${egresos.toFixed(2)}`, totalsX + 58, currentY + 4.5, { align: "right" });
    currentY += 7;
    
    // Total
    doc.setFillColor(...secondaryColor);
    doc.rect(totalsX, currentY, 60, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("TOTAL:", totalsX + 2, currentY + 5);
    doc.text(`S/ ${total.toFixed(2)}`, totalsX + 58, currentY + 5, { align: "right" });
    
    return currentY + 15;
  };
  
  // Draw morning shift
  y = drawShiftTable("Mañana", data.turnoManana, data.subtotalManana, data.egresosManana, data.totalManana, y);
  
  // Draw afternoon shift
  y = drawShiftTable("Tarde", data.turnoTarde, data.subtotalTarde, data.egresosTarde, data.totalTarde, y);
  
  // ============ GRAND TOTAL SECTION ============
  y += 5;
  
  // Grand total box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, "F");
  
  // Decorative accent
  doc.setFillColor(...secondaryColor);
  doc.rect(margin, y, 5, 20, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL GENERAL DEL DÍA", margin + 15, y + 8);
  
  const grandTotal = data.totalManana + data.totalTarde;
  doc.setFontSize(16);
  doc.text(`S/ ${grandTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, pageWidth - margin - 10, y + 13, { align: "right" });
  
  // Summary breakdown
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Mañana: S/ ${data.totalManana.toFixed(2)}  |  Tarde: S/ ${data.totalTarde.toFixed(2)}`, pageWidth - margin - 10, y + 18, { align: "right" });
  
  // ============ FOOTER ============
  const footerY = pageHeight - 15;
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(...lightGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado el ${new Date().toLocaleString("es-PE")}`, margin, footerY);
  doc.text(clinicData.website || "www.cesmedlatinoamericano.com", pageWidth / 2, footerY, { align: "center" });
  doc.text("Página 1 de 1", pageWidth - margin, footerY, { align: "right" });
  
  doc.save(`Reporte_Caja_${selectedDate}.pdf`);
}

export function IncomeReport() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const { data, isLoading, error } = useIncomeReport(selectedDate);
  const clinicData = useClinicData();

  const handleExportExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Hoja Turno Mañana
    if (data.turnoManana.length > 0) {
      const mananaData = [
        ["REPORTE DE INGRESOS - TURNO MAÑANA"],
        [data.fechaFormateada],
        [],
        ["N°", "DOC", "Nro Documento", "Sistema", "Nombres y Apellidos", "Concepto", "Especialidad", "Modo de Pago", "Pago"],
        ...data.turnoManana.map(item => [
          item.numero,
          item.doc_abreviatura,
          item.nro_documento,
          item.sistema,
          item.nombres_apellidos,
          item.concepto,
          item.especialidad || "-",
          item.modo_pago,
          item.pago
        ]),
        [],
        ["", "", "", "", "", "", "", "SUB TOTAL", data.subtotalManana],
        ["", "", "", "", "", "", "", "EGRESOS", data.egresosManana],
        ["", "", "", "", "", "", "", "TOTAL", data.totalManana],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(mananaData);
      XLSX.utils.book_append_sheet(wb, ws1, "Turno Mañana");
    }

    // Hoja Turno Tarde
    if (data.turnoTarde.length > 0) {
      const tardeData = [
        ["REPORTE DE INGRESOS - TURNO TARDE"],
        [data.fechaFormateada],
        [],
        ["N°", "DOC", "Nro Documento", "Sistema", "Nombres y Apellidos", "Concepto", "Especialidad", "Modo de Pago", "Pago"],
        ...data.turnoTarde.map(item => [
          item.numero,
          item.doc_abreviatura,
          item.nro_documento,
          item.sistema,
          item.nombres_apellidos,
          item.concepto,
          item.especialidad || "-",
          item.modo_pago,
          item.pago
        ]),
        [],
        ["", "", "", "", "", "", "", "SUB TOTAL", data.subtotalTarde],
        ["", "", "", "", "", "", "", "EGRESOS", data.egresosTarde],
        ["", "", "", "", "", "", "", "TOTAL", data.totalTarde],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(tardeData);
      XLSX.utils.book_append_sheet(wb, ws2, "Turno Tarde");
    }

    // Hoja Resumen
    const resumenData = [
      ["RESUMEN DEL DÍA"],
      [data.fechaFormateada],
      [],
      ["Turno", "Subtotal", "Egresos", "Total"],
      ["Mañana", data.subtotalManana, data.egresosManana, data.totalManana],
      ["Tarde", data.subtotalTarde, data.egresosTarde, data.totalTarde],
      [],
      ["TOTAL GENERAL", "", "", data.totalManana + data.totalTarde],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, ws3, "Resumen");

    XLSX.writeFile(wb, `Reporte_Ingresos_${selectedDate}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!data) return;
    await generateProfessionalPDF(data, clinicData, selectedDate);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="income-report-print-container">
      {/* ===== SCREEN VERSION ===== */}
      <div className="space-y-6 print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">
              Reporte de Caja
            </h2>
            <p className="text-muted-foreground">
              Consolidado de ingresos y egresos por turno de todos los sistemas
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="fecha" className="whitespace-nowrap">Fecha:</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fecha"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 w-44"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={handleExportExcel} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Screen Content */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-destructive">
                Error al cargar el reporte. Por favor intente nuevamente.
              </p>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <IncomeReportTable
              turno="Mañana"
              fecha={data.fechaFormateada}
              items={data.turnoManana}
              subtotal={data.subtotalManana}
              egresos={data.egresosManana}
              total={data.totalManana}
            />

            <IncomeReportTable
              turno="Tarde"
              fecha={data.fechaFormateada}
              items={data.turnoTarde}
              subtotal={data.subtotalTarde}
              egresos={data.egresosTarde}
              total={data.totalTarde}
            />

            <Card className="bg-gradient-to-r from-primary/5 to-secondary/10">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-sm text-muted-foreground">Resumen del día</p>
                    <p className="font-medium capitalize">{data.fechaFormateada}</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Turno Mañana</p>
                      <p className="text-xl font-bold text-primary">
                        S/ {data.totalManana.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Turno Tarde</p>
                      <p className="text-xl font-bold text-accent-foreground">
                        S/ {data.totalTarde.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center border-l-2 border-secondary pl-8">
                      <p className="text-sm text-muted-foreground">Total General</p>
                      <p className="text-2xl font-bold text-secondary">
                        S/ {(data.totalManana + data.totalTarde).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* ===== PRINT VERSION ===== */}
      {data && (
        <div className="hidden print:block print-report-content">
          {/* Professional Header */}
          <div className="border-b-4 border-primary pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img 
                  src="/images/logo-cesmed.png" 
                  alt="Logo CESMED" 
                  className="h-16 w-auto object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-primary">
                    {clinicData.name || "CESMED LATINOAMERICANO"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    RUC: {clinicData.ruc || "20607644315"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clinicData.address || "Cooperativa Villa Porongoche G-17, Paucarpata - Arequipa"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tel: {clinicData.phone || "054-407301"} | Cel: 959029377
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                  <h2 className="text-lg font-bold">REPORTE DE CAJA</h2>
                </div>
                <p className="text-sm font-medium mt-2 capitalize">{data.fechaFormateada}</p>
                <p className="text-xs text-muted-foreground">{selectedDate}</p>
              </div>
            </div>
          </div>

          {/* Print Tables */}
          <PrintableShiftTable
            turno="Mañana"
            fecha={data.fechaFormateada}
            items={data.turnoManana}
            subtotal={data.subtotalManana}
            egresos={data.egresosManana}
            total={data.totalManana}
          />

          <PrintableShiftTable
            turno="Tarde"
            fecha={data.fechaFormateada}
            items={data.turnoTarde}
            subtotal={data.subtotalTarde}
            egresos={data.egresosTarde}
            total={data.totalTarde}
          />

          {/* Grand Total Summary */}
          <div className="mt-6 border-t-4 border-primary pt-4">
            <div className="bg-primary text-primary-foreground rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold">TOTAL GENERAL DEL DÍA</h3>
                  <p className="text-xs opacity-80">
                    Mañana: S/ {data.totalManana.toFixed(2)} | Tarde: S/ {data.totalTarde.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    S/ {(data.totalManana + data.totalTarde).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>Documento generado el {new Date().toLocaleString("es-PE")} | {clinicData.website || "www.cesmedlatinoamericano.com"}</p>
            <p className="mt-1">Sistema Integrado CESMED - Reporte de Caja</p>
          </div>
        </div>
      )}
    </div>
  );
}

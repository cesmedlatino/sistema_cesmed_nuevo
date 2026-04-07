import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Package, Plus, Search, Warehouse, ClipboardList, MoreHorizontal, Pencil, XCircle, Trash2, Printer, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { useSuppliesConsultingRoomStock } from "@/hooks/useSuppliesConsultingRoomStock";
import { useSuppliesConsultingRoomOutputs, useAnnulConsultingRoomOutput, useDeleteConsultingRoomOutput, ConsultingRoomOutput } from "@/hooks/useSuppliesConsultingRoomOutputs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SuppliesConsultingRoomOutputDialog } from "./SuppliesConsultingRoomOutputDialog";
import { SuppliesDescargaConsumoPage } from "./SuppliesDescargaConsumoPage";
import { SuppliesEditOutputDialog } from "./SuppliesEditOutputDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function SuppliesConsultingRoomStockPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOutputDialogOpen, setIsOutputDialogOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<ConsultingRoomOutput | null>(null);

  // Confirm dialogs
  const [annulDialogOpen, setAnnulDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [outputToAction, setOutputToAction] = useState<ConsultingRoomOutput | null>(null);

  const { data: consultingRooms } = useConsultingRooms();
  const { data: stockData, isLoading: loadingStock } = useSuppliesConsultingRoomStock(selectedRoom === "all" ? undefined : selectedRoom);
  const { data: outputsData, isLoading: loadingOutputs } = useSuppliesConsultingRoomOutputs(selectedRoom === "all" ? undefined : selectedRoom);
  const { user } = useAuth();
  const annulOutput = useAnnulConsultingRoomOutput();
  const deleteOutput = useDeleteConsultingRoomOutput();

  // Get current user's full name
  const [currentUserName, setCurrentUserName] = React.useState<string>("");
  
  React.useEffect(() => {
    const fetchUserName = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("usuario")
        .select("personal:personal_id(nombres, apellidos)")
        .eq("auth_user_id", user.id)
        .single();
      
      if (data?.personal) {
        const personal = data.personal as { nombres: string; apellidos: string };
        setCurrentUserName(`${personal.nombres} ${personal.apellidos}`);
      } else {
        setCurrentUserName(user.email || "Usuario del sistema");
      }
    };
    fetchUserName();
  }, [user]);

  const filteredStock = (stockData || []).filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.medication?.codigo?.toLowerCase().includes(searchLower) ||
      item.medication?.descripcion?.toLowerCase().includes(searchLower) ||
      item.consulting_room?.name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredOutputs = (outputsData || []).filter((output) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      output.output_number?.toLowerCase().includes(searchLower) ||
      output.consulting_room?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Group stock by consulting room
  const stockByRoom: Record<string, typeof filteredStock> = {};
  filteredStock.forEach((item) => {
    const roomId = item.consulting_room_id;
    if (!stockByRoom[roomId]) stockByRoom[roomId] = [];
    stockByRoom[roomId].push(item);
  });

  // Action handlers
  const handleEdit = (output: ConsultingRoomOutput) => {
    setSelectedOutput(output);
    setEditDialogOpen(true);
  };

  const handleAnnul = (output: ConsultingRoomOutput) => {
    if (output.status === "Anulado") {
      toast.error("Este formato ya está anulado");
      return;
    }
    setOutputToAction(output);
    setAnnulDialogOpen(true);
  };

  const handleDelete = (output: ConsultingRoomOutput) => {
    setOutputToAction(output);
    setDeleteDialogOpen(true);
  };

  const confirmAnnul = async () => {
    if (!outputToAction) return;
    await annulOutput.mutateAsync(outputToAction.id);
    setAnnulDialogOpen(false);
    setOutputToAction(null);
  };

  const confirmDelete = async () => {
    if (!outputToAction) return;
    await deleteOutput.mutateAsync(outputToAction.id);
    setDeleteDialogOpen(false);
    setOutputToAction(null);
  };

  // Download Stock as PDF
  const handleDownloadStockPDF = () => {
    if (Object.keys(stockByRoom).length === 0) {
      toast.error("No hay stock para descargar");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Colors
    const greenColor = { r: 0, g: 166, b: 81 };
    const grayText = { r: 100, g: 100, b: 100 };
    const darkText = { r: 30, g: 30, b: 30 };

    // Header line
    doc.setDrawColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setLineWidth(1);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Clinic name
    doc.setFontSize(20);
    doc.setTextColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setFont("helvetica", "bold");
    doc.text("CESMED LATINOAMERICANO", pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.setFont("helvetica", "normal");
    doc.text("Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("Tel: 054-407301 | Cel: 959029377", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 12;

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFont("helvetica", "bold");
    doc.text("INVENTARIO DE STOCK POR CONSULTORIO", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    // Process each room
    Object.entries(stockByRoom).forEach(([_roomId, items]) => {
      const roomName = items[0]?.consulting_room?.name || "Consultorio";
      const roomFloor = items[0]?.consulting_room?.floor;

      // Check if we need a new page
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      // Room header
      doc.setFillColor(greenColor.r, greenColor.g, greenColor.b);
      doc.rect(15, y - 5, pageWidth - 30, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${roomName}${roomFloor ? ` - ${roomFloor}` : ""} (${items.length} productos)`, 20, y + 2);
      y += 12;

      // Table header
      doc.setFillColor(245, 247, 250);
      doc.rect(15, y - 4, pageWidth - 30, 8, "F");
      doc.setTextColor(grayText.r, grayText.g, grayText.b);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Código", 20, y + 1);
      doc.text("Producto", 50, y + 1);
      doc.text("Stock", pageWidth - 30, y + 1, { align: "center" });
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      items.forEach((item, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(15, y - 4, pageWidth - 30, 8, "F");
        }

        doc.setFont("courier", "normal");
        doc.setTextColor(102, 51, 153);
        doc.text(item.medication?.codigo || "", 20, y + 1);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkText.r, darkText.g, darkText.b);
        const desc = item.medication?.descripcion || "";
        const truncatedDesc = desc.length > 60 ? desc.substring(0, 57) + "..." : desc;
        doc.text(truncatedDesc, 50, y + 1);

        doc.setTextColor(greenColor.r, greenColor.g, greenColor.b);
        doc.setFont("helvetica", "bold");
        doc.text(String(item.quantity), pageWidth - 30, y + 1, { align: "center" });

        y += 8;
      });

      y += 10;
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Sistema de Control de Suministros - CESMED LATINOAMERICANO", pageWidth / 2, pageHeight - 10, { align: "center" });

    doc.save(`Stock_Consultorios_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast.success("PDF de stock descargado correctamente");
  };

  // Download Stock as Excel
  const handleDownloadStockExcel = () => {
    if (Object.keys(stockByRoom).length === 0) {
      toast.error("No hay stock para descargar");
      return;
    }

    const workbookData: any[][] = [];
    
    // Header
    workbookData.push(["INVENTARIO DE STOCK POR CONSULTORIO"]);
    workbookData.push([`Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`]);
    workbookData.push([]);
    workbookData.push(["Consultorio", "Ubicación", "Código", "Producto", "Stock"]);

    // Data
    Object.entries(stockByRoom).forEach(([_roomId, items]) => {
      const roomName = items[0]?.consulting_room?.name || "Consultorio";
      const roomFloor = items[0]?.consulting_room?.floor || "";

      items.forEach((item) => {
        workbookData.push([
          roomName,
          roomFloor,
          item.medication?.codigo || "",
          item.medication?.descripcion || "",
          item.quantity,
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(workbookData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Consultorios");
    
    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 40 },
      { wch: 10 },
    ];

    XLSX.writeFile(workbook, `Stock_Consultorios_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast.success("Excel de stock descargado correctamente");
  };

  const handlePrint = (output: ConsultingRoomOutput) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const itemsHTML = (output.items || [])
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${item.product_code || item.medication?.codigo || ""}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description || item.medication?.descripcion || ""}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${item.quantity}</td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salida por Consumo ${output.output_number}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1a1a1a; }
          .container { padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo { width: 80px; height: auto; }
          .clinic-name { font-size: 18px; font-weight: bold; color: #059669; text-transform: uppercase; }
          .clinic-info { font-size: 11px; color: #666; }
          .doc-box { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
          .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .doc-number { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .info-box { background: #f0fdf4; border-radius: 8px; padding: 15px; border-left: 4px solid #10b981; }
          .info-title { font-size: 11px; font-weight: 600; color: #059669; text-transform: uppercase; margin-bottom: 10px; }
          .info-item { margin-bottom: 5px; }
          .info-item label { color: #666; }
          .info-item span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #059669; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .observations { background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
          .observations-title { font-weight: 600; color: #374151; margin-bottom: 8px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature { text-align: center; width: 200px; }
          .signature-line { border-top: 2px solid #059669; padding-top: 8px; }
          .signature-label { font-size: 11px; color: #666; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .footer .name { color: #059669; font-weight: 600; }
          .status-anulado { color: #dc2626; font-weight: bold; font-size: 24px; text-align: center; margin: 20px 0; border: 3px solid #dc2626; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${output.status === "Anulado" ? '<div class="status-anulado">*** ANULADO ***</div>' : ''}
          <div class="header">
            <div class="header-left">
              <img src="/images/logo-cesmed.png" alt="Logo" class="logo" />
              <div>
                <div class="clinic-name">CESMED LATINOAMERICANO</div>
                <div class="clinic-info">Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa</div>
                <div class="clinic-info">Tel: 054-407301 | Cel: 959029377</div>
              </div>
            </div>
            <div class="doc-box">
              <div class="doc-label">Salida por Consumo</div>
              <div class="doc-number">${output.output_number}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Información de Entrega</div>
              <div class="info-item"><label>Fecha de Registro: </label><span>${format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}</span></div>
              <div class="info-item"><label>Fecha de Entrega: </label><span>${output.delivery_date ? format(parseLocalDate(output.delivery_date), "dd/MM/yyyy", { locale: es }) : "-"}</span></div>
              <div class="info-item"><label>Registrado por: </label><span>${currentUserName || "Usuario del sistema"}</span></div>
            </div>
            <div class="info-box">
              <div class="info-title">Destino</div>
              <div class="info-item"><label>Consultorio: </label><span>${output.consulting_room?.name || ""}</span></div>
              <div class="info-item"><label>Ubicación: </label><span>${output.consulting_room?.floor || "No especificada"}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th style="width: 120px;">Código</th>
                <th>Descripción del Producto</th>
                <th style="width: 80px; text-align: center;">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          ${output.observations ? `
            <div class="observations">
              <div class="observations-title">Observaciones:</div>
              <div>${output.observations}</div>
            </div>
          ` : ""}

          <div class="signatures">
            <div class="signature">
              <div class="signature-line">Entregado por</div>
              <div class="signature-label">Almacén de Suministros</div>
            </div>
            <div class="signature">
              <div class="signature-line">Recibido por</div>
              <div class="signature-label">${output.consulting_room?.name || "Consultorio"}</div>
            </div>
          </div>

          <div class="footer">
            <span class="name">CESMED LATINOAMERICANO</span> - Sistema de Control de Suministros Médicos
            <br>Documento generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = (output: ConsultingRoomOutput) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Colors
    const greenColor = { r: 0, g: 166, b: 81 }; // #00A651
    const grayText = { r: 100, g: 100, b: 100 };
    const darkText = { r: 30, g: 30, b: 30 };

    // Header line
    doc.setDrawColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setLineWidth(1);
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Logo placeholder and clinic name
    doc.setFontSize(20);
    doc.setTextColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setFont("helvetica", "bold");
    doc.text("CESMED LATINOAMERICANO", pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(10);
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.setFont("helvetica", "normal");
    doc.text("Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text("Tel: 054-407301 | Cel: 959029377", pageWidth / 2, y, { align: "center" });
    y += 8;

    // Bottom header line
    doc.line(15, y, pageWidth - 15, y);
    y += 12;

    // Document Title
    doc.setFontSize(16);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFont("helvetica", "bold");
    doc.text("SALIDA POR CONSUMO", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(output.output_number, pageWidth / 2, y, { align: "center" });
    y += 12;

    // Status if annulled
    if (output.status === "Anulado") {
      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text("*** ANULADO ***", pageWidth / 2, y, { align: "center" });
      y += 12;
    }

    // Info section with two columns
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Left column
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Fecha de Registro:", leftCol, y);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.text(format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es }), leftCol + 38, y);
    
    // Right column
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Consultorio:", rightCol, y);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.text(output.consulting_room?.name || "", rightCol + 25, y);
    y += 6;

    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Fecha de Entrega:", leftCol, y);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.text(output.delivery_date ? format(parseLocalDate(output.delivery_date), "dd/MM/yyyy", { locale: es }) : format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es }), leftCol + 38, y);
    
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Ubicación:", rightCol, y);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.text(output.consulting_room?.floor || "No especificada", rightCol + 22, y);
    y += 6;

    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Registrado por:", leftCol, y);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.text(currentUserName || "Usuario del sistema", leftCol + 32, y);
    y += 15;

    // Table
    const colWidths = { num: 15, code: 30, desc: 95, qty: 20 };
    const tableWidth = pageWidth - 40;
    
    // Table header with green background
    doc.setFillColor(greenColor.r, greenColor.g, greenColor.b);
    doc.rect(20, y, tableWidth, 10, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    let xPos = 22;
    doc.text("#", xPos + 5, y + 7);
    xPos += colWidths.num;
    doc.text("Código", xPos + 2, y + 7);
    xPos += colWidths.code;
    doc.text("Descripción", xPos + 2, y + 7);
    xPos = pageWidth - 35;
    doc.text("Cant.", xPos, y + 7);
    y += 12;

    // Table rows with alternating background
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    (output.items || []).forEach((item, index) => {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
        // Repeat header on new page
        doc.setFillColor(greenColor.r, greenColor.g, greenColor.b);
        doc.rect(20, y, tableWidth, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        xPos = 22;
        doc.text("#", xPos + 5, y + 7);
        xPos += colWidths.num;
        doc.text("Código", xPos + 2, y + 7);
        xPos += colWidths.code;
        doc.text("Descripción", xPos + 2, y + 7);
        xPos = pageWidth - 35;
        doc.text("Cant.", xPos, y + 7);
        y += 12;
        doc.setFont("helvetica", "normal");
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(20, y - 4, tableWidth, 10, "F");
      }
      
      // Row content
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      xPos = 22;
      doc.text(String(index + 1), xPos + 5, y + 2);
      xPos += colWidths.num;
      
      doc.setFont("courier", "normal");
      doc.setTextColor(102, 51, 153); // Purple color for code
      doc.text(item.product_code || item.medication?.codigo || "", xPos + 2, y + 2);
      doc.setFont("helvetica", "normal");
      
      xPos += colWidths.code;
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      const desc = item.description || item.medication?.descripcion || "";
      const lines = doc.splitTextToSize(desc, colWidths.desc);
      doc.text(lines[0], xPos + 2, y + 2);
      
      doc.setTextColor(greenColor.r, greenColor.g, greenColor.b);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.quantity), pageWidth - 30, y + 2, { align: "center" });
      doc.setFont("helvetica", "normal");
      
      y += 10;
    });

    // Table bottom border
    doc.setDrawColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Observations
    if (output.observations) {
      doc.setFontSize(10);
      doc.setTextColor(grayText.r, grayText.g, grayText.b);
      doc.setFont("helvetica", "bold");
      doc.text("Observaciones:", 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      const obsLines = doc.splitTextToSize(output.observations, pageWidth - 40);
      doc.text(obsLines, 20, y);
      y += obsLines.length * 5 + 5;
    }

    // Signatures section
    const signatureY = Math.max(y + 30, pageHeight - 50);
    
    // Signature line separator
    doc.setDrawColor(greenColor.r, greenColor.g, greenColor.b);
    doc.setLineWidth(0.3);
    doc.line(20, signatureY - 15, pageWidth - 20, signatureY - 15);
    
    // Left signature
    doc.setDrawColor(grayText.r, grayText.g, grayText.b);
    doc.line(35, signatureY, 85, signatureY);
    doc.setFontSize(9);
    doc.setTextColor(grayText.r, grayText.g, grayText.b);
    doc.text("Entregado por", 60, signatureY + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("Almacén de Suministros", 60, signatureY + 10, { align: "center" });

    // Right signature
    doc.setFont("helvetica", "normal");
    doc.line(125, signatureY, 175, signatureY);
    doc.text("Recibido por", 150, signatureY + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(output.consulting_room?.name || "Consultorio", 150, signatureY + 10, { align: "center" });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Documento generado por el Sistema de Control de Suministros - CESMED LATINOAMERICANO", pageWidth / 2, pageHeight - 10, { align: "center" });

    doc.save(`Salida_${output.output_number}.pdf`);
    toast.success("PDF descargado correctamente");
  };

  const isMobile = useIsMobile();

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Stock de Consultorio</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Gestión de suministros asignados a cada consultorio</p>
        </div>
        <Button 
          onClick={() => setIsOutputDialogOpen(true)} 
          className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          size={isMobile ? "sm" : "default"}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isMobile ? "Nueva Salida" : "Nueva Salida a Consultorio"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs - Horizontal scroll on mobile */}
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:max-w-xl sm:grid-cols-3">
            <TabsTrigger value="stock" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <Warehouse className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Stock</span>
              <span className="xs:hidden sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="outputs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Formatos</span>
              <span className="sm:hidden">Salidas</span>
            </TabsTrigger>
            <TabsTrigger value="consumo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Descarga por Consumo</span>
              <span className="sm:hidden">Consumo</span>
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" className="sm:hidden" />
        </ScrollArea>

        {/* Summary buttons for filtering - Grid on mobile */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2">
          <Button
            variant={selectedRoom === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRoom("all")}
            className="flex-col h-auto py-2 sm:flex-row sm:h-9 sm:py-0 gap-1 sm:gap-2"
          >
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>Todos</span>
            </div>
            <Badge variant="secondary" className="bg-background/50 text-xs">
              {(stockData || []).reduce((acc, item) => acc + item.quantity, 0)}
            </Badge>
          </Button>
          {(consultingRooms || []).map((room) => {
            const roomStock = (stockData || []).filter(s => s.consulting_room_id === room.id);
            const totalQty = roomStock.reduce((acc, item) => acc + item.quantity, 0);
            if (totalQty === 0 && selectedRoom !== room.id) return null;
            return (
              <Button
                key={room.id}
                variant={selectedRoom === room.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoom(room.id)}
                className="flex-col h-auto py-2 sm:flex-row sm:h-9 sm:py-0 gap-1 sm:gap-2"
              >
                <div className="flex items-center gap-1 text-center">
                  <Building2 className="h-4 w-4 hidden sm:block" />
                  <span className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{room.name}</span>
                </div>
                {room.floor && <span className="text-[10px] sm:text-xs opacity-70 hidden sm:inline">({room.floor})</span>}
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${selectedRoom === room.id ? "bg-background/50" : ""}`}
                >
                  {totalQty}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Search - Full width on mobile */}
        <div className="mt-3 sm:mt-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <TabsContent value="stock" className="mt-4 sm:mt-6">
          {/* Download buttons - Responsive */}
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleDownloadStockExcel} className="text-xs sm:text-sm">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Descargar Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadStockPDF} className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Descargar PDF</span>
            </Button>
          </div>
          {loadingStock ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : Object.keys(stockByRoom).length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(stockByRoom).map(([roomId, items]) => {
                const roomName = items[0]?.consulting_room?.name || "Consultorio";
                const roomFloor = items[0]?.consulting_room?.floor;
                return (
                  <Card key={roomId}>
                    <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                        <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="truncate">{roomName}</span>
                        {roomFloor && <span className="text-xs sm:text-sm font-normal text-muted-foreground">- {roomFloor}</span>}
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {items.length} {isMobile ? "" : "productos"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 sm:px-6">
                      {/* Desktop: Table view */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-center">Stock Disponible</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono">{item.medication?.codigo}</TableCell>
                                <TableCell>{item.medication?.descripcion}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}>
                                    {item.quantity}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Mobile: Card list view */}
                      <div className="sm:hidden space-y-2">
                        {items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="font-mono text-xs text-muted-foreground">{item.medication?.codigo}</p>
                              <p className="text-sm font-medium truncate">{item.medication?.descripcion}</p>
                            </div>
                            <Badge 
                              variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}
                              className="shrink-0 text-sm px-3"
                            >
                              {item.quantity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center text-muted-foreground">
                <Warehouse className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No hay stock asignado a consultorios</p>
                <p className="text-xs sm:text-sm">Registre una salida para asignar productos</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="outputs" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Formatos de Salida Registrados</span>
                <span className="sm:hidden">Formatos de Salida</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loadingOutputs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredOutputs.length > 0 ? (
                <>
                  {/* Desktop: Table view */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nro. Formato</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Consultorio</TableHead>
                          <TableHead className="text-center">Productos</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOutputs.map((output) => (
                          <TableRow key={output.id}>
                            <TableCell className="font-mono font-semibold">{output.output_number}</TableCell>
                            <TableCell>{format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}</TableCell>
                            <TableCell>{output.consulting_room?.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{output.items?.length || 0}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={output.status === "Entregado" ? "default" : output.status === "Anulado" ? "destructive" : "secondary"}
                              >
                                {output.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(output)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrint(output)}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadPDF(output)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Descargar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleAnnul(output)}
                                    disabled={output.status === "Anulado"}
                                    className="text-amber-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Anular
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(output)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: Card list view */}
                  <div className="sm:hidden space-y-3">
                    {filteredOutputs.map((output) => (
                      <div 
                        key={output.id} 
                        className="p-3 bg-muted/50 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono font-semibold text-sm">{output.output_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseLocalDate(output.date), "dd/MM/yyyy", { locale: es })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={output.status === "Entregado" ? "default" : output.status === "Anulado" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {output.status}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(output)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrint(output)}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(output)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  PDF
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleAnnul(output)}
                                  disabled={output.status === "Anulado"}
                                  className="text-amber-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Anular
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(output)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{output.consulting_room?.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {output.items?.length || 0} productos
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No se encontraron formatos de salida
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumo" className="mt-6">
          <SuppliesDescargaConsumoPage />
        </TabsContent>
      </Tabs>

      <SuppliesConsultingRoomOutputDialog open={isOutputDialogOpen} onOpenChange={setIsOutputDialogOpen} />
      
      <SuppliesEditOutputDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        output={selectedOutput} 
      />

      {/* Annul Confirmation Dialog */}
      <AlertDialog open={annulDialogOpen} onOpenChange={setAnnulDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este formato de salida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará el formato <strong>{outputToAction?.output_number}</strong> y restaurará el stock de los productos al inventario general. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAnnul}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este formato de salida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el formato <strong>{outputToAction?.output_number}</strong>. Los movimientos de stock asociados no serán revertidos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

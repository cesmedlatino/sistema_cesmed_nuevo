import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Package, TrendingUp, TrendingDown, 
  Search, Filter, BarChart3, 
  FileSpreadsheet, ArrowUpRight, ArrowDownLeft 
} from "lucide-react";
import { useOpticsProducts } from "@/hooks/useOpticsProducts";
import { useOpticsEntries } from "@/hooks/useOpticsEntries";
import { useOpticsOutputs } from "@/hooks/useOpticsOutputs";
import { useOpticsProductTypes } from "@/hooks/useOpticsProductTypes";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Helper to parse dates as local
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function OpticsReportsPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  
  const { data: products = [] } = useOpticsProducts();
  const { data: entries = [] } = useOpticsEntries();
  const { data: outputs = [] } = useOpticsOutputs();
  const { data: productTypes = [] } = useOpticsProductTypes();

  // Filtered data based on current filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.marca?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = selectedType === "all" || product.tipo === selectedType;
      
      let matchesStock = true;
      if (stockFilter === "low") {
        matchesStock = product.stock_actual <= product.stock_minimo && product.stock_actual > 0;
      } else if (stockFilter === "out") {
        matchesStock = product.stock_actual <= 0;
      } else if (stockFilter === "normal") {
        matchesStock = product.stock_actual > product.stock_minimo;
      }
      
      return matchesSearch && matchesType && matchesStock;
    });
  }, [products, searchTerm, selectedType, stockFilter]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchTerm ||
        entry.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFrom && dateTo) {
        const entryDate = parseLocalDate(entry.date);
        const fromDate = startOfDay(parseLocalDate(dateFrom));
        const toDate = endOfDay(parseLocalDate(dateTo));
        matchesDate = isWithinInterval(entryDate, { start: fromDate, end: toDate });
      }
      
      return matchesSearch && matchesDate;
    });
  }, [entries, searchTerm, dateFrom, dateTo]);

  const filteredOutputs = useMemo(() => {
    return outputs.filter(output => {
      const matchesSearch = !searchTerm ||
        output.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        output.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        output.nro_comprobante?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateFrom && dateTo) {
        const outputDate = parseLocalDate(output.date);
        const fromDate = startOfDay(parseLocalDate(dateFrom));
        const toDate = endOfDay(parseLocalDate(dateTo));
        matchesDate = isWithinInterval(outputDate, { start: fromDate, end: toDate });
      }
      
      return matchesSearch && matchesDate;
    });
  }, [outputs, searchTerm, dateFrom, dateTo]);

  // Stats calculations
  const catalogStats = useMemo(() => ({
    total: filteredProducts.length,
    monturas: filteredProducts.filter(p => p.tipo === "montura").length,
    lentes: filteredProducts.filter(p => ["lentes_contacto", "lentes_graduados"].includes(p.tipo)).length,
    lowStock: filteredProducts.filter(p => p.stock_actual <= p.stock_minimo).length,
    totalValue: filteredProducts.reduce((sum, p) => sum + (p.stock_actual * p.precio_venta), 0),
  }), [filteredProducts]);

  const entriesStats = useMemo(() => ({
    total: filteredEntries.length,
    totalUnits: filteredEntries.reduce((sum, e) => sum + e.quantity_received, 0),
    totalValue: filteredEntries.reduce((sum, e) => sum + e.importe, 0),
  }), [filteredEntries]);

  const outputsStats = useMemo(() => ({
    total: filteredOutputs.length,
    totalUnits: filteredOutputs.reduce((sum, o) => sum + o.quantity, 0),
    totalValue: filteredOutputs.reduce((sum, o) => sum + o.total, 0),
  }), [filteredOutputs]);

  // Excel Export functions
  const exportToExcel = (data: any[][], fileName: string, sheetName: string) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  const generateCatalogExcel = () => {
    const headers = ["Código", "Nombre", "Tipo", "Marca", "Modelo", "Stock Actual", "Stock Mínimo", "Precio Compra", "Precio Venta", "Ubicación", "Estado"];
    const rows = filteredProducts.map(p => [
      p.codigo,
      p.nombre,
      getTypeLabel(p.tipo),
      p.marca || "N/A",
      p.modelo || "N/A",
      p.stock_actual,
      p.stock_minimo,
      p.precio_compra,
      p.precio_venta,
      p.ubicacion || "N/A",
      p.stock_actual <= 0 ? "Sin Stock" : p.stock_actual <= p.stock_minimo ? "Stock Bajo" : "Normal"
    ]);
    exportToExcel([headers, ...rows], `Catalogo_Optica_${format(new Date(), "dd-MM-yyyy")}.xlsx`, "Catálogo");
  };

  const generateInventoryExcel = () => {
    const headers = ["Código", "Nombre", "Tipo", "Marca", "Stock Actual", "Stock Mínimo", "Valor Unitario", "Valor Total", "Ubicación"];
    const rows = filteredProducts.map(p => [
      p.codigo,
      p.nombre,
      getTypeLabel(p.tipo),
      p.marca || "N/A",
      p.stock_actual,
      p.stock_minimo,
      p.precio_venta,
      p.stock_actual * p.precio_venta,
      p.ubicacion || "N/A"
    ]);
    exportToExcel([headers, ...rows], `Inventario_Optica_${format(new Date(), "dd-MM-yyyy")}.xlsx`, "Inventario");
  };

  const generateEntriesExcel = () => {
    const headers = ["Fecha", "Código", "Descripción", "Cantidad", "Costo Unitario", "Importe", "Factura", "Proveedor", "Lote"];
    const rows = filteredEntries.map(e => [
      format(parseLocalDate(e.date), "dd/MM/yyyy"),
      e.product_code || "N/A",
      e.description || "N/A",
      e.quantity_received,
      e.purchase_cost_per_unit,
      e.importe,
      e.invoice_number || "N/A",
      e.supplier?.name || "N/A",
      e.lote || "N/A"
    ]);
    exportToExcel([headers, ...rows], `Entradas_Optica_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`, "Entradas");
  };

  const generateOutputsExcel = () => {
    const headers = ["Fecha", "Comprobante", "Código", "Descripción", "Cantidad", "Precio Unitario", "Total", "Paciente", "Tipo Salida"];
    const rows = filteredOutputs.map(o => [
      format(parseLocalDate(o.date), "dd/MM/yyyy"),
      o.nro_comprobante || "N/A",
      o.product_code || "N/A",
      o.description || "N/A",
      o.quantity,
      o.sale_cost_per_unit,
      o.total,
      o.patient ? `${o.patient.first_name} ${o.patient.last_name}` : "N/A",
      o.tipo_salida
    ]);
    exportToExcel([headers, ...rows], `Salidas_Optica_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`, "Salidas");
  };

  // PDF Generation with corporate branding
  const generatePDF = async (reportType: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Corporate colors (purple primary: #5c1c8c)
    const primaryColor: [number, number, number] = [92, 28, 140];
    const secondaryColor: [number, number, number] = [124, 196, 68];

    // Header with logo and corporate branding
    const drawHeader = () => {
      // Purple header bar
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 35, "F");
      
      // Green accent line
      doc.setFillColor(...secondaryColor);
      doc.rect(0, 35, pageWidth, 3, "F");

      // Logo placeholder (would need actual logo)
      try {
        doc.addImage("/images/logo-cesmed.png", "PNG", margin, 5, 25, 25);
      } catch {
        doc.setFillColor(255, 255, 255);
        doc.circle(margin + 12.5, 17.5, 12, "F");
      }

      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("CESMED", margin + 32, 15);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Centro de Especialidades Médicas", margin + 32, 22);
      doc.text("Sistema de Óptica", margin + 32, 28);

      // Report date
      doc.setFontSize(9);
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - margin - 50, 28);

      yPos = 50;
    };

    // Report title
    const drawTitle = (title: string, subtitle?: string) => {
      doc.setTextColor(...primaryColor);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, yPos);
      yPos += 8;

      if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, margin, yPos);
        yPos += 6;
      }
      yPos += 5;
    };

    // Stats box
    const drawStatsBox = (stats: { label: string; value: string }[]) => {
      const boxHeight = 20;
      const boxWidth = (pageWidth - 2 * margin - (stats.length - 1) * 5) / stats.length;
      
      stats.forEach((stat, index) => {
        const x = margin + index * (boxWidth + 5);
        
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, "F");
        
        doc.setDrawColor(...primaryColor);
        doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, "S");
        
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(stat.label, x + 3, yPos + 7);
        
        doc.setTextColor(...primaryColor);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(stat.value, x + 3, yPos + 15);
        doc.setFont("helvetica", "normal");
      });
      
      yPos += boxHeight + 10;
    };

    // Table drawing function
    const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
      const rowHeight = 8;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      
      // Header row
      doc.setFillColor(...primaryColor);
      doc.rect(margin, yPos, tableWidth, rowHeight, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, yPos + 5.5, { maxWidth: colWidths[i] - 4 });
        xPos += colWidths[i];
      });
      yPos += rowHeight;

      // Data rows
      doc.setFont("helvetica", "normal");
      rows.forEach((row, rowIndex) => {
        // Check for page break
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
          drawHeader();
        }

        // Alternating row colors
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos, tableWidth, rowHeight, "F");
        }

        doc.setTextColor(50, 50, 50);
        xPos = margin;
        row.forEach((cell, i) => {
          doc.text(String(cell || ""), xPos + 2, yPos + 5.5, { maxWidth: colWidths[i] - 4 });
          xPos += colWidths[i];
        });
        
        // Row border
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, yPos + rowHeight, margin + tableWidth, yPos + rowHeight);
        
        yPos += rowHeight;
      });
    };

    // Footer
    const drawFooter = () => {
      const footerY = pageHeight - 15;
      
      doc.setDrawColor(...secondaryColor);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text("CESMED - Sistema de Gestión de Óptica", margin, footerY);
      doc.text(`Página ${doc.internal.pages.length - 1}`, pageWidth - margin - 20, footerY);
    };

    // Generate based on report type
    drawHeader();

    switch (reportType) {
      case "catalog":
        drawTitle("Reporte de Catálogo de Productos", 
          `Total de productos: ${filteredProducts.length} | Filtro: ${selectedType === "all" ? "Todos" : getTypeLabel(selectedType)}`);
        
        drawStatsBox([
          { label: "Total Productos", value: catalogStats.total.toString() },
          { label: "Monturas", value: catalogStats.monturas.toString() },
          { label: "Lentes", value: catalogStats.lentes.toString() },
          { label: "Valor Total", value: `S/. ${catalogStats.totalValue.toFixed(2)}` },
        ]);

        drawTable(
          ["Código", "Nombre", "Tipo", "Marca", "Stock", "P. Venta"],
          filteredProducts.slice(0, 50).map(p => [
            p.codigo,
            p.nombre.substring(0, 25),
            getTypeLabel(p.tipo),
            p.marca || "-",
            p.stock_actual.toString(),
            `S/. ${p.precio_venta.toFixed(2)}`
          ]),
          [25, 55, 30, 30, 20, 25]
        );
        break;

      case "inventory":
        drawTitle("Reporte de Inventario", 
          `Stock filter: ${stockFilter === "all" ? "Todos" : stockFilter === "low" ? "Stock Bajo" : stockFilter === "out" ? "Sin Stock" : "Normal"}`);
        
        drawStatsBox([
          { label: "Total Productos", value: catalogStats.total.toString() },
          { label: "Stock Bajo", value: catalogStats.lowStock.toString() },
          { label: "Valor Inventario", value: `S/. ${catalogStats.totalValue.toFixed(2)}` },
        ]);

        drawTable(
          ["Código", "Nombre", "Stock", "Mínimo", "Estado", "Valor"],
          filteredProducts.slice(0, 50).map(p => [
            p.codigo,
            p.nombre.substring(0, 30),
            p.stock_actual.toString(),
            p.stock_minimo.toString(),
            p.stock_actual <= 0 ? "SIN STOCK" : p.stock_actual <= p.stock_minimo ? "BAJO" : "OK",
            `S/. ${(p.stock_actual * p.precio_venta).toFixed(2)}`
          ]),
          [25, 60, 20, 20, 25, 30]
        );
        break;

      case "entries":
        drawTitle("Reporte de Entradas", 
          dateFrom && dateTo ? `Período: ${format(parseLocalDate(dateFrom), "dd/MM/yyyy")} - ${format(parseLocalDate(dateTo), "dd/MM/yyyy")}` : "Todas las entradas");
        
        drawStatsBox([
          { label: "Total Entradas", value: entriesStats.total.toString() },
          { label: "Unidades Ingresadas", value: entriesStats.totalUnits.toString() },
          { label: "Valor Total", value: `S/. ${entriesStats.totalValue.toFixed(2)}` },
        ]);

        drawTable(
          ["Fecha", "Código", "Descripción", "Cantidad", "Costo", "Importe"],
          filteredEntries.slice(0, 50).map(e => [
            format(parseLocalDate(e.date), "dd/MM/yyyy"),
            e.product_code || "-",
            (e.description || "-").substring(0, 25),
            e.quantity_received.toString(),
            `S/. ${e.purchase_cost_per_unit.toFixed(2)}`,
            `S/. ${e.importe.toFixed(2)}`
          ]),
          [25, 25, 55, 20, 25, 30]
        );
        break;

      case "outputs":
        drawTitle("Reporte de Salidas", 
          dateFrom && dateTo ? `Período: ${format(parseLocalDate(dateFrom), "dd/MM/yyyy")} - ${format(parseLocalDate(dateTo), "dd/MM/yyyy")}` : "Todas las salidas");
        
        drawStatsBox([
          { label: "Total Salidas", value: outputsStats.total.toString() },
          { label: "Unidades Vendidas", value: outputsStats.totalUnits.toString() },
          { label: "Valor Total", value: `S/. ${outputsStats.totalValue.toFixed(2)}` },
        ]);

        drawTable(
          ["Fecha", "Comprobante", "Descripción", "Cantidad", "P. Unit.", "Total"],
          filteredOutputs.slice(0, 50).map(o => [
            format(parseLocalDate(o.date), "dd/MM/yyyy"),
            o.nro_comprobante || "-",
            (o.description || "-").substring(0, 25),
            o.quantity.toString(),
            `S/. ${o.sale_cost_per_unit.toFixed(2)}`,
            `S/. ${o.total.toFixed(2)}`
          ]),
          [25, 30, 50, 20, 25, 30]
        );
        break;
    }

    drawFooter();
    doc.save(`Reporte_Optica_${reportType}_${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  // Helper function to get type label
  const getTypeLabel = (tipo: string) => {
    const typeObj = productTypes.find(t => t.value === tipo);
    return typeObj?.label || tipo;
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setSelectedType("all");
    setStockFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Reportes y Análisis
          </h2>
          <p className="text-muted-foreground">
            Genera reportes detallados del sistema de óptica con filtros dinámicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            <Filter className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* Tabs for different reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Entradas
          </TabsTrigger>
          <TabsTrigger value="outputs" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Salidas
          </TabsTrigger>
        </TabsList>

        {/* Catalog Report */}
        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Reporte de Catálogo de Productos
              </CardTitle>
              <CardDescription>
                Visualiza y exporta el catálogo completo de productos ópticos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código, nombre, marca..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {productTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado de Stock</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="normal">Stock Normal</SelectItem>
                      <SelectItem value="low">Stock Bajo</SelectItem>
                      <SelectItem value="out">Sin Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={generateCatalogExcel} variant="outline" className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button onClick={() => generatePDF("catalog")} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-primary">{catalogStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Productos</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">{catalogStats.monturas}</div>
                    <div className="text-sm text-muted-foreground">Monturas</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{catalogStats.lentes}</div>
                    <div className="text-sm text-muted-foreground">Lentes</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-amber-600">{catalogStats.lowStock}</div>
                    <div className="text-sm text-muted-foreground">Stock Bajo</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-emerald-600">S/. {catalogStats.totalValue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">P. Venta</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 10).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.codigo}</TableCell>
                        <TableCell className="font-medium">{product.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(product.tipo)}</Badge>
                        </TableCell>
                        <TableCell>{product.marca || "-"}</TableCell>
                        <TableCell className="text-right">{product.stock_actual}</TableCell>
                        <TableCell className="text-right">S/. {product.precio_venta.toFixed(2)}</TableCell>
                        <TableCell>
                          {product.stock_actual <= 0 ? (
                            <Badge variant="destructive">Sin Stock</Badge>
                          ) : product.stock_actual <= product.stock_minimo ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">Bajo</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredProducts.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    Mostrando 10 de {filteredProducts.length} productos. Descarga el reporte para ver todos.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Reporte de Inventario
              </CardTitle>
              <CardDescription>
                Análisis del estado actual del inventario y valorización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código, nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Producto</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {productTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado de Stock</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="normal">Stock Normal</SelectItem>
                      <SelectItem value="low">Stock Bajo</SelectItem>
                      <SelectItem value="out">Sin Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={generateInventoryExcel} variant="outline" className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button onClick={() => generatePDF("inventory")} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-primary">{catalogStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Productos</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-amber-600">{catalogStats.lowStock}</div>
                    <div className="text-sm text-muted-foreground">Stock Bajo / Sin Stock</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-emerald-600">S/. {catalogStats.totalValue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Valor Total Inventario</div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Stock Mínimo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.slice(0, 10).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.codigo}</TableCell>
                        <TableCell className="font-medium">{product.nombre}</TableCell>
                        <TableCell className="text-right">{product.stock_actual}</TableCell>
                        <TableCell className="text-right">{product.stock_minimo}</TableCell>
                        <TableCell>
                          {product.stock_actual <= 0 ? (
                            <Badge variant="destructive">Sin Stock</Badge>
                          ) : product.stock_actual <= product.stock_minimo ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">Bajo</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          S/. {(product.stock_actual * product.precio_venta).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredProducts.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    Mostrando 10 de {filteredProducts.length} productos. Descarga el reporte para ver todos.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entries Report */}
        <TabsContent value="entries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                Reporte de Entradas
              </CardTitle>
              <CardDescription>
                Historial de ingresos de productos al inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código, descripción, factura..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 col-span-2">
                  <Button onClick={generateEntriesExcel} variant="outline" className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button onClick={() => generatePDF("entries")} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">{entriesStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Entradas</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-blue-600">{entriesStats.totalUnits}</div>
                    <div className="text-sm text-muted-foreground">Unidades Ingresadas</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-emerald-600">S/. {entriesStats.totalValue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-500/10">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Factura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.slice(0, 10).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseLocalDate(entry.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.product_code || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{entry.description || "-"}</TableCell>
                        <TableCell className="text-right">{entry.quantity_received}</TableCell>
                        <TableCell className="text-right">S/. {entry.purchase_cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">S/. {entry.importe.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.invoice_number || "S/F"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredEntries.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    Mostrando 10 de {filteredEntries.length} entradas. Descarga el reporte para ver todos.
                  </div>
                )}
                {filteredEntries.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay entradas que coincidan con los filtros seleccionados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outputs Report */}
        <TabsContent value="outputs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                Reporte de Salidas
              </CardTitle>
              <CardDescription>
                Historial de salidas de productos del inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Código, descripción, comprobante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 col-span-2">
                  <Button onClick={generateOutputsExcel} variant="outline" className="flex-1">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button onClick={() => generatePDF("outputs")} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">{outputsStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total Salidas</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-orange-600">{outputsStats.totalUnits}</div>
                    <div className="text-sm text-muted-foreground">Unidades Vendidas</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-emerald-600">S/. {outputsStats.totalValue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-red-500/10">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">P. Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Paciente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOutputs.slice(0, 10).map((output) => (
                      <TableRow key={output.id}>
                        <TableCell>{format(parseLocalDate(output.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{output.nro_comprobante || "S/C"}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{output.description || "-"}</TableCell>
                        <TableCell className="text-right">{output.quantity}</TableCell>
                        <TableCell className="text-right">S/. {output.sale_cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">S/. {output.total.toFixed(2)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {output.patient ? `${output.patient.first_name} ${output.patient.last_name}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOutputs.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
                    Mostrando 10 de {filteredOutputs.length} salidas. Descarga el reporte para ver todos.
                  </div>
                )}
                {filteredOutputs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay salidas que coincidan con los filtros seleccionados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

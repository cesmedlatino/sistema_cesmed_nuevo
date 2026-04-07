
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, Package, AlertTriangle, Receipt, Search } from "lucide-react";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { usePharmacyAlerts } from "@/hooks/usePharmacyAlerts";
import { useInventoryMovements } from "@/hooks/usePharmacyInventory";
import { usePharmacyEntries } from "@/hooks/usePharmacyEntries";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

export function PharmacyReports() {
  const [reportType, setReportType] = useState("inventory");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [inventoryReportMode, setInventoryReportMode] = useState<"date" | "complete">("complete");
  
  const { data: medications } = usePharmacyMedications(0); // 0 = sin límite, obtiene todos los registros
  const { data: alerts } = usePharmacyAlerts();
  const { data: movements } = useInventoryMovements();
  const { data: entries } = usePharmacyEntries();

  const generateReport = () => {
    let data: any[][] = [];
    let fileName = "";
    let sheetName = "";

    switch (reportType) {
      case "inventory":
        fileName = `Inventario_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
        sheetName = "Inventario";
        data = generateInventoryReport();
        break;
      case "movements":
        fileName = `Movimientos_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`;
        sheetName = "Movimientos";
        data = generateMovementsReport();
        break;
      case "alerts":
        fileName = `Alertas_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
        sheetName = "Alertas";
        data = generateAlertsReport();
        break;
      case "expiry":
        fileName = `Proximos_Vencer_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
        sheetName = "Próximos a Vencer";
        data = generateExpiryReport();
        break;
      case "invoice":
        fileName = `Reporte_Facturas_${format(new Date(), "dd-MM-yyyy")}.xlsx`;
        sheetName = "Facturas";
        data = generateInvoiceReport();
        break;
    }

    // Crear libro de Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Descargar el archivo
    XLSX.writeFile(wb, fileName);
  };

  const generateInventoryReport = () => {
    const headers = ["Código", "Ubicación", "Descripción", "FF", "Presentación", "Laboratorio", "Lote", "F.V.", "Stock Actual", "Precio de Entrada", "Precio Venta", "Formula Magistral"];
    
    // Ordenar medicamentos por código (parte numérica)
    const sortedMedications = medications ? [...medications].sort((a, b) => {
      const numA = parseInt(a.codigo.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.codigo.replace(/\D/g, '')) || 0;
      return numA - numB;
    }) : [];
    
    const rows = sortedMedications.map(med => [
      med.codigo,
      med.ubicacion || "N/A",
      med.descripcion,
      med.forma_farmaceutica || "N/A",
      med.presentation,
      med.laboratorio || "N/A",
      med.lote || "N/A",
      med.fecha_vencimiento ? format(new Date(med.fecha_vencimiento), "dd/MM/yyyy") : "N/A",
      med.stock_actual,
      med.purchase_price || 0,
      med.precio_venta || 0,
      med.formula_magistral ? "SI" : "NO"
    ]);

    return [headers, ...rows];
  };

  const generateMovementsReport = () => {
    const headers = ["Fecha", "Medicamento", "Código", "Tipo", "Cantidad", "Motivo"];
    const rows = filteredMovements.map(mov => [
      format(new Date(mov.created_at), "dd/MM/yyyy HH:mm"),
      mov.medication?.descripcion || "N/A",
      mov.medication?.codigo || "N/A",
      mov.movement_type,
      mov.quantity,
      mov.movement_reason || "N/A"
    ]);

    return [headers, ...rows];
  };

  const generateAlertsReport = () => {
    const headers = ["Tipo Alerta", "Medicamento", "Código", "Stock Actual", "Stock Mínimo", "Diferencia"];
    const rows = lowStockMedications.map(med => [
      "Stock Bajo",
      med.descripcion,
      med.codigo,
      med.stock_actual,
      med.min_stock_level,
      med.stock_actual - med.min_stock_level
    ]);

    return [headers, ...rows];
  };

  const generateExpiryReport = () => {
    const headers = ["Medicamento", "Código", "Fecha Vencimiento", "Días Restantes", "Stock Actual"];
    const rows = nearExpiryMedications.map(med => {
      const today = new Date();
      const expiry = new Date(med.fecha_vencimiento!);
      const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return [
        med.descripcion,
        med.codigo,
        format(expiry, "dd/MM/yyyy"),
        daysToExpiry,
        med.stock_actual
      ];
    });

    return [headers, ...rows];
  };

  const generateInvoiceReport = () => {
    const headers = ["Factura", "Fecha", "Proveedor", "Descripción", "Cantidad", "Precio Unitario", "Total"];
    const rows: any[][] = [];
    
    invoiceGroups.forEach(group => {
      group.items.forEach((entry, index) => {
        rows.push([
          index === 0 ? group.invoice : "",
          index === 0 ? format(new Date(group.date), "dd/MM/yyyy") : "",
          index === 0 ? group.supplier : "",
          entry.description || "N/A",
          entry.quantity_received || 0,
          entry.purchase_cost_per_unit || 0,
          entry.total_amount || 0
        ]);
      });
      // Add total row
      rows.push([
        "", "", "", "TOTAL FACTURA", "", "", group.total
      ]);
      rows.push([]); // Empty row for spacing
    });

    return [headers, ...rows];
  };

  const filteredMovements = movements?.filter(movement => {
    if (!dateFrom || !dateTo) return true;
    const movementDate = new Date(movement.created_at);
    return movementDate >= new Date(dateFrom) && movementDate <= new Date(dateTo);
  }) || [];

  const lowStockMedications = medications?.filter(med => 
    med.stock_actual <= med.min_stock_level
  ) || [];

  const nearExpiryMedications = medications?.filter(med => {
    if (!med.fecha_vencimiento) return false;
    const today = new Date();
    const expiry = new Date(med.fecha_vencimiento);
    const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysToExpiry <= med.days_before_expiry_alert;
  }) || [];

  // Group entries by invoice
  const invoiceGroups = React.useMemo(() => {
    if (!entries) return [];
    
    const grouped = entries.reduce((acc, entry) => {
      const invoice = entry.invoice_number || "Sin Factura";
      if (!acc[invoice]) {
        acc[invoice] = {
          invoice,
          date: entry.date,
          supplier: entry.supplier?.name || "N/A",
          items: [],
          total: 0
        };
      }
      acc[invoice].items.push(entry);
      acc[invoice].total += entry.total_amount || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [entries]);

  // Filter invoices by search term
  const filteredInvoiceGroups = React.useMemo(() => {
    if (!invoiceSearch) return invoiceGroups;
    
    const searchLower = invoiceSearch.toLowerCase();
    return invoiceGroups.filter(group => 
      group.invoice.toLowerCase().includes(searchLower) ||
      group.supplier.toLowerCase().includes(searchLower)
    );
  }, [invoiceGroups, invoiceSearch]);

  const selectedInvoiceData = invoiceGroups.find(g => g.invoice === selectedInvoice);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Generador de Reportes
          </CardTitle>
          <CardDescription>
            Genere reportes detallados del inventario y movimientos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventario Actual</SelectItem>
                  <SelectItem value="movements">Movimientos</SelectItem>
                  <SelectItem value="alerts">Alertas</SelectItem>
                  <SelectItem value="expiry">Próximos a Vencer</SelectItem>
                  <SelectItem value="invoice">Por Factura en Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportType === "inventory" && (
              <div className="space-y-2">
                <Label>Modo de Inventario</Label>
                <Select value={inventoryReportMode} onValueChange={(value: "date" | "complete") => setInventoryReportMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">Inventario Completo</SelectItem>
                    <SelectItem value="date">Por Fecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {reportType !== "inventory" && (
              <>
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
              </>
            )}
            
            {reportType === "inventory" && inventoryReportMode === "date" && (
              <>
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
              </>
            )}
          </div>
          
          <Button onClick={generateReport} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Generar y Descargar Reporte
          </Button>
        </CardContent>
      </Card>

      {/* Vista previa de reportes */}
      <div className="grid gap-6">
        {/* Reporte por Factura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Reporte por Factura
            </CardTitle>
            <CardDescription>
              Selecciona una factura para ver todos sus ítems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Buscar Factura</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número de factura o proveedor..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Seleccionar Factura</Label>
                  <Select value={selectedInvoice || ""} onValueChange={setSelectedInvoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una factura" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredInvoiceGroups.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No se encontraron facturas
                        </div>
                      ) : (
                        filteredInvoiceGroups.map((group) => (
                          <SelectItem key={group.invoice} value={group.invoice}>
                            {group.invoice} - {group.supplier} - S/. {group.total.toFixed(2)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedInvoiceData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Factura</div>
                      <div className="font-medium">{selectedInvoiceData.invoice}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Proveedor</div>
                      <div className="font-medium">{selectedInvoiceData.supplier}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Fecha</div>
                      <div className="font-medium">
                        {format(new Date(selectedInvoiceData.date), "dd/MM/yyyy", { locale: es })}
                      </div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoiceData.items.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.pharmaceutical_form}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {entry.batch || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.quantity_received || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            S/. {(entry.purchase_cost_per_unit || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            S/. {(entry.total_amount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4} className="text-right">
                          TOTAL FACTURA
                        </TableCell>
                        <TableCell className="text-right">
                          S/. {selectedInvoiceData.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

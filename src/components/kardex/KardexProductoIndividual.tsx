 import React, { useState, useRef } from "react";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { 
   Download, 
   TrendingUp, 
   TrendingDown,
   RefreshCw,
   FileText,
   Search,
   Package,
   DollarSign,
   AlertTriangle,
   Printer
 } from "lucide-react";
 import { useKardexMovements, useKardexProducto } from "@/hooks/useKardexData";
 import { format } from "date-fns";
 import { useQueryClient } from "@tanstack/react-query";
 import { useToast } from "@/hooks/use-toast";
 import * as XLSX from "xlsx";
 import jsPDF from "jspdf";
 
 export function KardexProductoIndividual() {
   const queryClient = useQueryClient();
   const { toast } = useToast();
   const printRef = useRef<HTMLDivElement>(null);
   
   const [sistema, setSistema] = useState<string>("botica");
   const [productoCodigo, setProductoCodigo] = useState<string>("");
   const [searchTerm, setSearchTerm] = useState("");
 
   // Get all movements to build product list
   const { data: allMovements } = useKardexMovements({ sistema });
   
   // Get detailed product kardex
   const { data: kardexProducto, isLoading } = useKardexProducto(sistema, productoCodigo);
 
   // Build unique product list from movements
   const productsList = React.useMemo(() => {
     if (!allMovements) return [];
     const seen = new Map<string, string>();
     allMovements.forEach(m => {
       if (m.producto_codigo && m.producto_codigo.trim() !== "" && !seen.has(m.producto_codigo)) {
         seen.set(m.producto_codigo, m.producto_nombre);
       }
     });
     return Array.from(seen.entries())
       .map(([codigo, nombre]) => ({ codigo, nombre }))
       .filter(p => {
         if (!searchTerm) return true;
         return p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
       });
   }, [allMovements, searchTerm]);
 
   const handleRefresh = () => {
     queryClient.invalidateQueries({ queryKey: ["kardex-producto"] });
     queryClient.invalidateQueries({ queryKey: ["kardex-movements"] });
     toast({
       title: "Actualizado",
       description: "Los datos del kardex se han actualizado.",
     });
   };
 
   const handleExportExcel = () => {
     if (!kardexProducto?.movimientos?.length) return;
 
     const exportData = kardexProducto.movimientos.map((m, idx) => ({
       'Nro': idx + 1,
       'Fecha': format(new Date(m.fecha), "dd/MM/yyyy"),
       'Documento': m.documento_referencia || '-',
       'Tipo': m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
       'Motivo': m.motivo,
       'Ent. Cant': m.tipo_movimiento === 'entrada' ? m.cantidad : '',
       'Ent. P.U.': m.tipo_movimiento === 'entrada' ? m.costo_unitario : '',
       'Ent. Total': m.tipo_movimiento === 'entrada' ? m.costo_total : '',
       'Sal. Cant': m.tipo_movimiento === 'salida' ? m.cantidad : '',
       'Sal. P.U.': m.tipo_movimiento === 'salida' ? m.costo_unitario : '',
       'Sal. Total': m.tipo_movimiento === 'salida' ? m.costo_total : '',
       'Saldo Cant': m.stock_nuevo,
       'Saldo Valor': m.saldo_valor,
     }));
 
     const ws = XLSX.utils.json_to_sheet(exportData);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Kardex");
     XLSX.writeFile(wb, `kardex_${kardexProducto.producto_codigo}_${format(new Date(), "yyyyMMdd")}.xlsx`);
 
     toast({
       title: "Exportado",
       description: "El archivo Excel se ha descargado correctamente.",
     });
   };
 
   const handleExportPDF = () => {
     if (!kardexProducto) return;
 
     const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
     
     // Header
     doc.setFillColor(245, 158, 11);
     doc.rect(0, 0, 297, 25, 'F');
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(16);
     doc.text("KARDEX DE EXISTENCIAS", 148.5, 12, { align: "center" });
     doc.setFontSize(10);
     doc.text("CESMED - Sistema de Control de Inventario", 148.5, 19, { align: "center" });
 
     // Product Info
     doc.setTextColor(0, 0, 0);
     doc.setFontSize(11);
     doc.text(`Código: ${kardexProducto.producto_codigo}`, 15, 35);
     doc.text(`Producto: ${kardexProducto.producto_nombre}`, 15, 42);
     doc.text(`Sistema: ${sistema.charAt(0).toUpperCase() + sistema.slice(1)}`, 15, 49);
     doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 200, 35);
     doc.text(`Stock Actual: ${kardexProducto.stock_actual}`, 200, 42);
     doc.text(`Valor Inventario: S/. ${kardexProducto.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 200, 49);
 
     // Table Headers
     let y = 60;
     doc.setFillColor(240, 240, 240);
     doc.rect(10, y - 5, 277, 8, 'F');
     doc.setFontSize(8);
     doc.setFont('helvetica', 'bold');
     
     const headers = ['Nro', 'Fecha', 'Documento', 'Tipo', 'E.Cant', 'E.P.U.', 'E.Total', 'S.Cant', 'S.P.U.', 'S.Total', 'Saldo', 'Valor'];
     const colWidths = [10, 22, 35, 25, 20, 22, 25, 20, 22, 25, 20, 30];
     let x = 12;
     headers.forEach((h, i) => {
       doc.text(h, x, y);
       x += colWidths[i];
     });
 
     // Table Data
     y += 7;
     doc.setFont('helvetica', 'normal');
     doc.setFontSize(7);
 
     kardexProducto.movimientos.slice(0, 35).forEach((m, idx) => {
       x = 12;
       const row = [
         String(idx + 1),
         format(new Date(m.fecha), "dd/MM/yy"),
         (m.documento_referencia || '-').substring(0, 15),
         m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
         m.tipo_movimiento === 'entrada' ? String(m.cantidad) : '',
         m.tipo_movimiento === 'entrada' && m.costo_unitario ? m.costo_unitario.toFixed(2) : '',
         m.tipo_movimiento === 'entrada' && m.costo_total ? m.costo_total.toFixed(2) : '',
         m.tipo_movimiento === 'salida' ? String(m.cantidad) : '',
         m.tipo_movimiento === 'salida' && m.costo_unitario ? m.costo_unitario.toFixed(2) : '',
         m.tipo_movimiento === 'salida' && m.costo_total ? m.costo_total.toFixed(2) : '',
         String(m.stock_nuevo),
         `S/. ${m.saldo_valor.toFixed(2)}`,
       ];
 
       row.forEach((cell, i) => {
         doc.text(cell, x, y);
         x += colWidths[i];
       });
 
       y += 5;
       if (y > 190) {
         doc.addPage();
         y = 20;
       }
     });
 
     doc.save(`kardex_${kardexProducto.producto_codigo}_${format(new Date(), "yyyyMMdd")}.pdf`);
 
     toast({
       title: "PDF generado",
       description: "El reporte PDF se ha descargado correctamente.",
     });
   };
 
   const handlePrint = () => {
     if (printRef.current) {
       const printContent = printRef.current.innerHTML;
       const printWindow = window.open('', '', 'height=800,width=1200');
       if (printWindow) {
         printWindow.document.write('<html><head><title>Kardex de Existencias</title>');
         printWindow.document.write('<style>');
         printWindow.document.write(`
           body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
           th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
           th { background-color: #f5f5f5; font-weight: bold; }
           .header { background-color: #f59e0b; color: white; padding: 15px; margin-bottom: 15px; }
           .header h1 { margin: 0; font-size: 18px; }
           .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
           .entrada { color: #16a34a; }
           .salida { color: #dc2626; }
           .text-right { text-align: right; }
           .font-bold { font-weight: bold; }
           @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
         `);
         printWindow.document.write('</style></head><body>');
         printWindow.document.write(printContent);
         printWindow.document.write('</body></html>');
         printWindow.document.close();
         printWindow.print();
       }
     }
   };
 
   // Calculate totals
   const totals = React.useMemo(() => {
     if (!kardexProducto?.movimientos) return { entradas: 0, salidas: 0, entradasValor: 0, salidasValor: 0 };
     return kardexProducto.movimientos.reduce((acc, m) => {
       if (m.tipo_movimiento === 'entrada') {
         acc.entradas += m.cantidad;
         acc.entradasValor += m.costo_total || 0;
       } else {
         acc.salidas += m.cantidad;
         acc.salidasValor += m.costo_total || 0;
       }
       return acc;
     }, { entradas: 0, salidas: 0, entradasValor: 0, salidasValor: 0 });
   }, [kardexProducto]);
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex justify-between items-start">
         <div>
           <h2 className="text-3xl font-bold tracking-tight text-amber-700">
             Kardex Individual
           </h2>
           <p className="text-muted-foreground">
             Vista contable detallada por producto
           </p>
         </div>
         <Button variant="outline" onClick={handleRefresh}>
           <RefreshCw className="h-4 w-4 mr-2" />
           Actualizar
         </Button>
       </div>
 
       {/* Filters */}
       <Card>
         <CardContent className="pt-6">
           <div className="grid gap-4 md:grid-cols-4">
             <div>
               <Label>Sistema</Label>
               <Select value={sistema} onValueChange={(v) => { setSistema(v); setProductoCodigo(""); }}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="botica">Botica</SelectItem>
                   <SelectItem value="optica">Óptica</SelectItem>
                   <SelectItem value="suministros">Suministros</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="relative">
               <Label>Buscar Producto</Label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Código o nombre..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9"
                 />
               </div>
             </div>
             <div className="md:col-span-2">
               <Label>Producto</Label>
               <Select value={productoCodigo} onValueChange={setProductoCodigo}>
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar producto" />
                 </SelectTrigger>
                 <SelectContent>
                   {productsList.map((p) => (
                     <SelectItem key={p.codigo} value={p.codigo}>
                       {p.codigo} - {p.nombre}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Product Info & Actions */}
       {kardexProducto && (
         <>
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
               <Badge variant="outline" className="text-lg px-4 py-2">
                 {kardexProducto.producto_codigo}
               </Badge>
               <div>
                 <h3 className="text-xl font-semibold">{kardexProducto.producto_nombre}</h3>
                 <p className="text-sm text-muted-foreground">
                   Sistema: {sistema.charAt(0).toUpperCase() + sistema.slice(1)}
                 </p>
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
               <Button onClick={handleExportExcel} className="bg-amber-600 hover:bg-amber-700">
                 <Download className="h-4 w-4 mr-2" />
                 Excel
               </Button>
             </div>
           </div>
 
           {/* Summary Cards */}
           <div className="grid gap-4 md:grid-cols-5">
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <Package className="h-8 w-8 text-amber-500" />
                   <div>
                     <p className="text-sm text-muted-foreground">Stock Actual</p>
                     <p className="text-2xl font-bold">{kardexProducto.stock_actual}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <TrendingUp className="h-8 w-8 text-green-500" />
                   <div>
                     <p className="text-sm text-muted-foreground">Total Entradas</p>
                     <p className="text-2xl font-bold text-green-600">{totals.entradas}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <TrendingDown className="h-8 w-8 text-red-500" />
                   <div>
                     <p className="text-sm text-muted-foreground">Total Salidas</p>
                     <p className="text-2xl font-bold text-red-600">{totals.salidas}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <DollarSign className="h-8 w-8 text-blue-500" />
                   <div>
                     <p className="text-sm text-muted-foreground">Valor Inventario</p>
                     <p className="text-xl font-bold">S/. {kardexProducto.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <AlertTriangle className={`h-8 w-8 ${kardexProducto.stock_actual <= kardexProducto.stock_minimo ? 'text-red-500' : 'text-green-500'}`} />
                   <div>
                     <p className="text-sm text-muted-foreground">Stock Mínimo</p>
                     <p className="text-2xl font-bold">{kardexProducto.stock_minimo}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
 
           {/* Printable Content */}
           <div ref={printRef}>
             <div className="header hidden print:block">
               <h1>KARDEX DE EXISTENCIAS - CESMED</h1>
               <p>Código: {kardexProducto.producto_codigo} | Producto: {kardexProducto.producto_nombre}</p>
               <p>Sistema: {sistema} | Fecha: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
             </div>
 
             {/* Kardex Table - Professional Accounting Format */}
             <Card>
               <CardHeader>
                 <CardTitle>Movimientos de Kardex</CardTitle>
                 <CardDescription>
                   Formato contable - {kardexProducto.movimientos.length} movimientos registrados
                 </CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow className="bg-muted/50">
                         <TableHead rowSpan={2} className="text-center border-r">Nro</TableHead>
                         <TableHead rowSpan={2} className="text-center border-r">Fecha</TableHead>
                         <TableHead rowSpan={2} className="text-center border-r">Documento</TableHead>
                         <TableHead rowSpan={2} className="text-center border-r">Concepto</TableHead>
                         <TableHead colSpan={3} className="text-center border-r bg-green-50">ENTRADAS</TableHead>
                         <TableHead colSpan={3} className="text-center border-r bg-red-50">SALIDAS</TableHead>
                         <TableHead colSpan={2} className="text-center bg-amber-50">SALDO</TableHead>
                       </TableRow>
                       <TableRow className="bg-muted/30">
                         <TableHead className="text-center text-xs bg-green-50">Cant.</TableHead>
                         <TableHead className="text-center text-xs bg-green-50">P.U.</TableHead>
                         <TableHead className="text-center text-xs border-r bg-green-50">Total</TableHead>
                         <TableHead className="text-center text-xs bg-red-50">Cant.</TableHead>
                         <TableHead className="text-center text-xs bg-red-50">P.U.</TableHead>
                         <TableHead className="text-center text-xs border-r bg-red-50">Total</TableHead>
                         <TableHead className="text-center text-xs bg-amber-50">Cant.</TableHead>
                         <TableHead className="text-center text-xs bg-amber-50">Valor</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {isLoading ? (
                         <TableRow>
                           <TableCell colSpan={12} className="text-center py-10">
                             Cargando movimientos...
                           </TableCell>
                         </TableRow>
                       ) : kardexProducto.movimientos.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={12} className="text-center py-10 text-muted-foreground">
                             No se encontraron movimientos para este producto
                           </TableCell>
                         </TableRow>
                       ) : (
                         kardexProducto.movimientos.map((m, idx) => (
                           <TableRow key={m.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                             <TableCell className="text-center border-r font-mono text-sm">{idx + 1}</TableCell>
                             <TableCell className="text-center border-r whitespace-nowrap">
                               {format(new Date(m.fecha), "dd/MM/yyyy")}
                             </TableCell>
                             <TableCell className="border-r text-sm">
                               {m.documento_referencia || '-'}
                             </TableCell>
                             <TableCell className="border-r">
                               <Badge variant={m.tipo_movimiento === 'entrada' ? 'default' : 'destructive'} 
                                      className={m.tipo_movimiento === 'entrada' ? 'bg-green-100 text-green-700' : ''}>
                                 {m.motivo}
                               </Badge>
                             </TableCell>
                             {/* Entradas */}
                             <TableCell className="text-center font-medium text-green-600 bg-green-50/50">
                               {m.tipo_movimiento === 'entrada' ? m.cantidad : ''}
                             </TableCell>
                             <TableCell className="text-right text-green-600 bg-green-50/50">
                               {m.tipo_movimiento === 'entrada' && m.costo_unitario 
                                 ? `S/. ${m.costo_unitario.toFixed(2)}` : ''}
                             </TableCell>
                             <TableCell className="text-right font-medium text-green-600 border-r bg-green-50/50">
                               {m.tipo_movimiento === 'entrada' && m.costo_total 
                                 ? `S/. ${m.costo_total.toFixed(2)}` : ''}
                             </TableCell>
                             {/* Salidas */}
                             <TableCell className="text-center font-medium text-red-600 bg-red-50/50">
                               {m.tipo_movimiento === 'salida' ? m.cantidad : ''}
                             </TableCell>
                             <TableCell className="text-right text-red-600 bg-red-50/50">
                               {m.tipo_movimiento === 'salida' && m.costo_unitario 
                                 ? `S/. ${m.costo_unitario.toFixed(2)}` : ''}
                             </TableCell>
                             <TableCell className="text-right font-medium text-red-600 border-r bg-red-50/50">
                               {m.tipo_movimiento === 'salida' && m.costo_total 
                                 ? `S/. ${m.costo_total.toFixed(2)}` : ''}
                             </TableCell>
                             {/* Saldo */}
                             <TableCell className="text-center font-bold bg-amber-50/50">
                               {m.stock_nuevo}
                             </TableCell>
                             <TableCell className="text-right font-bold bg-amber-50/50">
                               S/. {m.saldo_valor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                             </TableCell>
                           </TableRow>
                         ))
                       )}
                     </TableBody>
                     {kardexProducto.movimientos.length > 0 && (
                       <TableFooter>
                         <TableRow className="bg-muted font-bold">
                           <TableCell colSpan={4} className="text-right border-r">TOTALES:</TableCell>
                           <TableCell className="text-center text-green-700 bg-green-100">{totals.entradas}</TableCell>
                           <TableCell className="bg-green-100"></TableCell>
                           <TableCell className="text-right text-green-700 border-r bg-green-100">
                             S/. {totals.entradasValor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-center text-red-700 bg-red-100">{totals.salidas}</TableCell>
                           <TableCell className="bg-red-100"></TableCell>
                           <TableCell className="text-right text-red-700 border-r bg-red-100">
                             S/. {totals.salidasValor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                           </TableCell>
                           <TableCell className="text-center bg-amber-100">{kardexProducto.stock_actual}</TableCell>
                           <TableCell className="text-right bg-amber-100">
                             S/. {kardexProducto.valor_inventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                           </TableCell>
                         </TableRow>
                       </TableFooter>
                     )}
                   </Table>
                 </div>
               </CardContent>
             </Card>
           </div>
         </>
       )}
 
       {/* Empty State */}
       {!productoCodigo && (
         <Card className="py-16">
           <CardContent className="text-center">
             <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
             <h3 className="text-lg font-medium mb-2">Seleccione un Producto</h3>
             <p className="text-muted-foreground">
               Elija un sistema y producto para ver su kardex detallado con formato contable profesional.
             </p>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }
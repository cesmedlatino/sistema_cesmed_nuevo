import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Edit, Trash2, Eye, Tag, FileText, FileUp, Package,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import { useCatalogoGeneral, useDeleteCatalogoItem, CatalogoGeneralItem } from "@/hooks/useCatalogoGeneral";
import { CatalogoGeneralProductDialog } from "./CatalogoGeneralProductDialog";
import { CatalogoGeneralImportDialog } from "./CatalogoGeneralImportDialog";
import { Link } from "react-router-dom";

export function CatalogoGeneralPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatalogo, setSelectedCatalogo] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogoGeneralItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const { data: products, isLoading } = useCatalogoGeneral(searchTerm, selectedCatalogo);
  const deleteItem = useDeleteCatalogoItem();

  const handleEdit = (product: CatalogoGeneralItem) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteItem.mutateAsync(productToDelete);
      } catch { /* handled by mutation */ }
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const isFarmacia = selectedCatalogo === "Farmacia";
  const isInventario = selectedCatalogo === "Inventario General";

  // Export helpers
  const getExportData = () => {
    return (products || []).map((p) => ({
      "Código": p.codigo,
      "Catálogo": p.catalogo,
      "Nombre": p.nombre,
      "Clasificación": p.clasificacion || "",
      "Marca": p.marca || "",
      "Modelo": p.modelo || "",
      "Serie": p.serie || "",
      "Precio de Venta": p.precio_venta || 0,
      "Stock Actual": p.stock_actual,
      "Ubicación": p.ubicacion || "",
    }));
  };

  const handleDownloadExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo General");
    XLSX.writeFile(wb, `Catalogo_General_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadPDF = () => {
    const data = getExportData();
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const brandColor = [75, 0, 130];
    const accentColor = [76, 175, 80];
    const tableW = pageW - margin * 2;

    const generateBarcodeDataURL = (code: string): string | null => {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, code, { format: "CODE39", width: 1.5, height: 26, displayValue: false, margin: 0 });
        return canvas.toDataURL("image/png");
      } catch { return null; }
    };

    // Header
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, pageW, 28, "F");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CESMED LATINOAMERICANO", margin + 2, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Cooperativa Villa Porongoche G-17, Paucarpata, Arequipa  •  RUC: 20607644315", margin + 2, 18);

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 28, pageW, 9, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CATÁLOGO GENERAL DE PRODUCTOS", margin + 2, 34.5);
    const dateStr = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, pageW - margin - doc.getTextWidth(dateStr), 34.5);

    // Table header
    const headers = ["Código", "Cód. Barras", "Catálogo", "Nombre", "Clasificación", "Marca", "P. Venta", "Stock"];
    const colRatios = [0.08, 0.13, 0.12, 0.22, 0.15, 0.12, 0.09, 0.07];
    const colWidths = colRatios.map(r => r * tableW);
    const rowH = 12;

    let y = 40;
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(margin, y, tableW, 7, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    let cx = margin;
    headers.forEach((h, i) => { doc.text(h, cx + 2, y + 5); cx += colWidths[i]; });
    y += 7;

    let isEven = false;
    data.forEach((row) => {
      if (y + rowH > pageH - 12) {
        doc.addPage();
        y = 12;
      }
      if (isEven) {
        doc.setFillColor(240, 245, 250);
        doc.rect(margin, y, tableW, rowH, "F");
      }
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);

      cx = margin;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(row["Código"], cx + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      cx += colWidths[0];

      const barcodeImg = generateBarcodeDataURL(row["Código"]);
      if (barcodeImg) doc.addImage(barcodeImg, "PNG", cx + 1, y + 1, colWidths[1] - 3, rowH - 3);
      cx += colWidths[1];

      doc.text(row["Catálogo"].substring(0, 18), cx + 2, y + 5);
      cx += colWidths[2];
      doc.text(row["Nombre"].substring(0, 30), cx + 2, y + 5);
      cx += colWidths[3];
      doc.text((row["Clasificación"] || "—").substring(0, 20), cx + 2, y + 5);
      cx += colWidths[4];
      doc.text((row["Marca"] || "—").substring(0, 18), cx + 2, y + 5);
      cx += colWidths[5];
      doc.text(`S/. ${row["Precio de Venta"].toFixed(2)}`, cx + 2, y + 5);
      cx += colWidths[6];

      const stockVal = row["Stock Actual"];
      if (stockVal <= 0) doc.setTextColor(220, 38, 38);
      else if (stockVal <= 5) doc.setTextColor(234, 88, 12);
      else doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text(String(stockVal), cx + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);

      doc.setDrawColor(210, 218, 230);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowH, margin + tableW, y + rowH);

      y += rowH;
      isEven = !isEven;
    });

    // Summary
    if (y + 18 < pageH - 12) {
      y += 4;
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.roundedRect(margin, y, tableW, 12, 1, 1, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Total productos: ${data.length}`, margin + 6, y + 7.5);
    }

    doc.save(`Catalogo_General_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-700">
          Catálogo General
        </h2>
        <p className="text-muted-foreground">
          Gestión centralizada de productos, mobiliario y equipos
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Total Productos</p>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Farmacia</p>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter(p => p.catalogo === "Farmacia").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Inventario General</p>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products?.filter(p => p.catalogo === "Inventario General").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nombre, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCatalogo} onValueChange={setSelectedCatalogo}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Catálogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los catálogos</SelectItem>
                  <SelectItem value="Farmacia">Farmacia</SelectItem>
                  <SelectItem value="Inventario General">Inventario General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Catálogo PDF
              </Button>
              <Button variant="outline" onClick={handleDownloadExcel}>
                <FileUp className="mr-2 h-4 w-4" />
                Catálogo Excel
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar Excel
              </Button>
              <Button onClick={() => { setSelectedProduct(null); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
          ) : !products?.length ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron productos</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Catálogo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Clasificación</TableHead>
                    <TableHead>Marca</TableHead>
                    {/* Inventario General columns */}
                    {isInventario && <TableHead>Modelo</TableHead>}
                    {isInventario && <TableHead>Serie</TableHead>}
                    {/* Farmacia columns */}
                    {isFarmacia && <TableHead>Precio Venta</TableHead>}
                    <TableHead>Stock Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono font-medium">{product.codigo}</TableCell>
                      <TableCell>
                        <Badge variant={product.catalogo === "Farmacia" ? "default" : "secondary"}>
                          {product.catalogo}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{product.nombre}</TableCell>
                      <TableCell>{product.clasificacion || "—"}</TableCell>
                      <TableCell>{product.marca || "—"}</TableCell>
                      {isInventario && <TableCell>{product.modelo || "—"}</TableCell>}
                      {isInventario && <TableCell>{product.serie || "—"}</TableCell>}
                      {isFarmacia && <TableCell>S/. {(product.precio_venta || 0).toFixed(2)}</TableCell>}
                      <TableCell>
                        <Badge
                          variant={product.stock_actual <= 0 ? "destructive" : product.stock_actual <= 5 ? "outline" : "default"}
                          className={product.stock_actual > 5 ? "bg-green-500" : product.stock_actual > 0 ? "border-orange-500 text-orange-500" : ""}
                        >
                          {product.stock_actual}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Ver producto">
                            <Link to={`/optics/catalogo-general/${product.codigo}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Etiqueta">
                            <Link to={`/optics/catalogo-general/${product.codigo}`}>
                              <Tag className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CatalogoGeneralProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />
      <CatalogoGeneralImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el producto del catálogo general.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

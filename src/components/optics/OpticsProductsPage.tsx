import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  QrCode,
  Glasses,
  Package,
  FileUp,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import { useOpticsProducts, useOpticsStats, useDeleteOpticsProduct } from "@/hooks/useOpticsProducts";
import { useOpticsProductTypes } from "@/hooks/useOpticsProductTypes";
import { OpticsProductDialog } from "./OpticsProductDialog";
import { OpticsProductQRDialog } from "./OpticsProductQRDialog";
import { OpticsExcelImportDialog } from "./OpticsExcelImportDialog";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function OpticsProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const { data: products, isLoading } = useOpticsProducts(undefined, searchTerm, selectedType, selectedStatus);
  const { data: stats } = useOpticsStats();
  const { data: productTypes } = useOpticsProductTypes();
  const deleteProduct = useDeleteOpticsProduct();

  // Read initial filter from URL query params
  useEffect(() => {
    const tipoParam = searchParams.get("tipo");
    const statusParam = searchParams.get("status");
    if (tipoParam) {
      setSelectedType(tipoParam);
    }
    if (statusParam) {
      setSelectedStatus(statusParam);
    }
  }, [searchParams]);

  // Update URL when type changes
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    if (value === "all") {
      searchParams.delete("tipo");
    } else {
      searchParams.set("tipo", value);
    }
    setSearchParams(searchParams);
  };

  // Update URL when status changes
  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    if (value === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", value);
    }
    setSearchParams(searchParams);
  };

  // Build types array for filter dropdown (with "all" option)
  const filterTypes = [
    { value: "all", label: "Todos los tipos" },
    ...(productTypes?.map(t => ({ value: t.value, label: t.label })) || [])
  ];

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleShowQR = (product: any) => {
    setSelectedProduct(product);
    setQrDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct.mutateAsync(productToDelete);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      } catch {
        // Error is handled by the mutation's onError
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      }
    }
  };

  const getExportData = () => {
    return (products || []).map((p) => ({
      "Código": p.codigo,
      "Nombre": p.nombre,
      "Tipo": productTypes?.find(t => t.value === p.tipo)?.label || p.tipo,
      "Marca": p.marca || "",
      "Modelo": p.modelo || "",
      "Material": p.material || "",
      "Color": p.color || "",
      "P. Compra": p.precio_compra || 0,
      "P. Venta": p.precio_venta || 0,
      "Stock Actual": p.stock_actual,
      "Stock Mínimo": p.stock_minimo,
      "Estado": p.status,
      "Ubicación": p.ubicacion || "",
    }));
  };

  const handleDownloadExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo Óptica");
    XLSX.writeFile(wb, `Catalogo_Optica_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadPDF = () => {
    const data = getExportData();
    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const brandColor = [75, 0, 130]; // CESMED corporate purple
    const accentColor = [76, 175, 80]; // CESMED corporate green

    const generateBarcodeDataURL = (code: string): string | null => {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, code, { format: "CODE128", width: 1.5, height: 26, displayValue: false, margin: 0 });
        return canvas.toDataURL("image/png");
      } catch { return null; }
    };

    const tableW = pageW - margin * 2;

    const drawHeader = (isFirst: boolean) => {
      // Full-width top bar
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, pageW, isFirst ? 28 : 8, "F");

      if (isFirst) {
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("CESMED LATINOAMERICANO", margin + 2, 12);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Cooperativa Villa Porongoche G-17, Paucarpata, Arequipa  •  RUC: 20607644315  •  Tel: 054-407301  •  Cel: 959029377", margin + 2, 18);

        // Subtitle bar
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 28, pageW, 9, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("CATÁLOGO DE PRODUCTOS — ÓPTICA", margin + 2, 34.5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const dateStr = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
        doc.text(dateStr, pageW - margin - doc.getTextWidth(dateStr), 34.5);
      }
    };

    const headers = ["Código", "Cód. Barras", "Producto", "Tipo", "Marca", "P. Venta", "Stock", "Estado"];
    // Proportional widths that fill the entire table width
    const colRatios = [0.09, 0.14, 0.26, 0.11, 0.12, 0.09, 0.07, 0.07];
    const colWidths = colRatios.map(r => r * tableW);
    const rowH = 12;

    const drawTableHeader = (startY: number) => {
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(margin, startY, tableW, 7, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      let cx = margin;
      headers.forEach((h, i) => {
        doc.text(h, cx + 2, startY + 5);
        cx += colWidths[i];
      });
      return startY + 7;
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text(`CESMED LATINOAMERICANO — Catálogo Óptica`, margin, pageH - 5);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin - 25, pageH - 5);
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, pageH - 2, pageW, 2, "F");
    };

    const firstPageStart = 40;
    const otherPageStart = 12;
    let tempY = firstPageStart + 7;
    let pages = 1;
    data.forEach(() => {
      if (tempY + rowH > pageH - 12) { pages++; tempY = otherPageStart + 7; }
      tempY += rowH;
    });
    const totalPages = pages;

    drawHeader(true);
    let y = drawTableHeader(firstPageStart);
    let currentPage = 1;
    let isEvenRow = false;

    data.forEach((row) => {
      if (y + rowH > pageH - 12) {
        drawFooter(currentPage, totalPages);
        doc.addPage();
        currentPage++;
        drawHeader(false);
        y = drawTableHeader(otherPageStart);
        isEvenRow = false;
      }

      // Zebra stripe
      if (isEvenRow) {
        doc.setFillColor(240, 245, 250);
        doc.rect(margin, y, tableW, rowH, "F");
      }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);

      let cx = margin;
      // Código
      doc.setFont("helvetica", "bold");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(row["Código"], cx + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      cx += colWidths[0];

      // Barcode image
      const barcodeImg = generateBarcodeDataURL(row["Código"]);
      if (barcodeImg) {
        doc.addImage(barcodeImg, "PNG", cx + 1, y + 1, colWidths[1] - 3, rowH - 3);
      }
      cx += colWidths[1];

      // Producto
      doc.text(row["Nombre"].substring(0, 35), cx + 2, y + 5);
      if (row["Modelo"]) {
        doc.setFontSize(5.5);
        doc.setTextColor(120, 120, 120);
        doc.text(row["Modelo"].substring(0, 40), cx + 2, y + 9);
        doc.setFontSize(7);
        doc.setTextColor(40, 40, 40);
      }
      cx += colWidths[2];

      // Tipo
      doc.text(row["Tipo"].substring(0, 18), cx + 2, y + 5);
      cx += colWidths[3];

      // Marca
      doc.text((row["Marca"] || "—").substring(0, 18), cx + 2, y + 5);
      cx += colWidths[4];

      // Precio
      doc.text(`S/. ${row["P. Venta"].toFixed(2)}`, cx + 2, y + 5);
      cx += colWidths[5];

      // Stock with color
      const stockVal = row["Stock Actual"];
      const stockMin = row["Stock Mínimo"];
      if (stockVal <= 0) {
        doc.setTextColor(220, 38, 38);
      } else if (stockVal <= stockMin) {
        doc.setTextColor(234, 88, 12);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      doc.setFont("helvetica", "bold");
      doc.text(String(stockVal), cx + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      cx += colWidths[6];

      // Estado badge
      const estado = row["Estado"];
      if (estado === "Activo") {
        doc.setFillColor(220, 252, 231);
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setFillColor(254, 226, 226);
        doc.setTextColor(153, 27, 27);
      }
      const badgeW = doc.getTextWidth(estado) + 4;
      doc.roundedRect(cx + 1, y + 1.5, badgeW, 4.5, 1, 1, "F");
      doc.setFontSize(5.5);
      doc.text(estado, cx + 3, y + 5);
      doc.setFontSize(7);
      doc.setTextColor(40, 40, 40);

      // Row bottom border
      doc.setDrawColor(210, 218, 230);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowH, margin + tableW, y + rowH);

      y += rowH;
      isEvenRow = !isEvenRow;
    });

    // Summary box - full width
    if (y + 18 < pageH - 12) {
      y += 4;
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.roundedRect(margin, y, tableW, 12, 1, 1, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`Total productos: ${data.length}`, margin + 6, y + 7.5);
      const totalVal = `Valor total inventario: S/. ${data.reduce((sum, r) => sum + (r["P. Venta"] * r["Stock Actual"]), 0).toFixed(2)}`;
      doc.text(totalVal, pageW - margin - doc.getTextWidth(totalVal) - 6, y + 7.5);
    }

    drawFooter(currentPage, totalPages);
    doc.save(`Catalogo_Optica_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive">Sin Stock</Badge>;
    }
    if (stock <= minStock) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Stock Bajo</Badge>;
    }
    return <Badge className="bg-green-500">En Stock</Badge>;
  };

  const getTypeBadge = (tipo: string) => {
    const typeData = productTypes?.find(t => t.value === tipo);
    const label = typeData?.label || tipo;
    return <Badge variant="secondary">{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-700">
          Catálogo de Productos
        </h2>
        <p className="text-muted-foreground">
          Gestiona el inventario de monturas, lentes y accesorios ópticos
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monturas</CardTitle>
            <Glasses className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monturas || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.lowStockCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/. {(stats?.totalValue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de producto" />
                </SelectTrigger>
                <SelectContent>
                  {filterTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Activo">Activos</SelectItem>
                  <SelectItem value="Inactivo">Inactivos</SelectItem>
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
            <div className="text-center py-8">Cargando productos...</div>
          ) : !products?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">P. Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.nombre}</div>
                        {product.modelo && (
                          <div className="text-xs text-muted-foreground">{product.modelo}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(product.tipo)}</TableCell>
                    <TableCell>{product.marca || "-"}</TableCell>
                    <TableCell className="text-right">
                      S/. {(product.precio_venta || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStockBadge(product.stock_actual, product.stock_minimo)}
                      <div className="text-xs text-muted-foreground mt-1">
                        {product.stock_actual} unid.
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link to={`/optics/product/${product.codigo}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowQR(product)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OpticsProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />

      <OpticsProductQRDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        product={selectedProduct}
      />

      <OpticsExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el producto del inventario. Podrás reactivarlo más tarde si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Boxes, Edit, Trash2, Package, AlertTriangle, DollarSign } from "lucide-react";
import {
  useSuppliesProducts,
  useDeleteSuppliesProduct,
  useSuppliesStats,
  SuppliesProduct,
} from "@/hooks/useSuppliesProducts";
import { useSuppliesCategories } from "@/hooks/useSuppliesCategories";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SuppliesProductDialog } from "./SuppliesProductDialog";

export function SuppliesProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SuppliesProduct | null>(null);

  const { data: products, isLoading } = useSuppliesProducts(500, searchTerm, selectedCategory);
  const { data: stats } = useSuppliesStats();
  const deleteProduct = useDeleteSuppliesProduct();
  const { data: categoriesRows, isLoading: loadingCategories } = useSuppliesCategories();

  const categories = (categoriesRows || []).filter((c) => c.is_active).map((c) => c.name);

  // Sync filter from URL
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    setSelectedCategory(categoryParam || "all");
  }, [searchParams]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value && value !== "all") {
      setSearchParams({ category: value });
    } else {
      setSearchParams({});
    }
  };

  const handleEdit = (product: SuppliesProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteProductId) {
      await deleteProduct.mutateAsync(deleteProductId);
      setDeleteProductId(null);
    }
  };

  const filteredProducts = products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            Catálogo de Suministros
          </h1>
          <p className="text-muted-foreground">
            Gestiona el inventario de suministros médicos
          </p>
        </div>
        <Button onClick={() => { setSelectedProduct(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Suministro
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.outOfStockCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/. {(stats?.totalValue || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {loadingCategories ? (
                    <SelectItem value="__loading__" disabled>
                      Cargando categorías...
                    </SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setSelectedProduct(null); setDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Suministro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando suministros...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron suministros</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">P. Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockBadgeVariant =
                    product.stock_actual <= 0
                      ? "destructive"
                      : product.stock_actual <= product.min_stock_level
                        ? "outline"
                        : "secondary";

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.descripcion}</div>
                          {product.presentation ? (
                            <div className="text-xs text-muted-foreground">{product.presentation}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category || "Sin categoría"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">S/. {(product.precio_venta || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={stockBadgeVariant as any}
                          className={stockBadgeVariant === "outline" ? "border-ring text-foreground" : undefined}
                        >
                          {product.stock_actual <= 0 ? "Sin Stock" : product.stock_actual <= product.min_stock_level ? "Stock Bajo" : "En Stock"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">{product.stock_actual} unid.</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            onClick={() => setDeleteProductId(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar suministro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el suministro del catálogo. Los registros históricos se mantendrán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SuppliesProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={selectedProduct} />
    </div>
  );
}

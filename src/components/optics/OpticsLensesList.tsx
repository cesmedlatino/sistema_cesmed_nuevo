
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  QrCode
} from "lucide-react";
import { useOpticsProducts, useDeleteOpticsProduct } from "@/hooks/useOpticsProducts";
import { OpticsProductDialog } from "./OpticsProductDialog";
import { OpticsProductQRDialog } from "./OpticsProductQRDialog";
import { Link } from "react-router-dom";
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

export function OpticsLensesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qrProduct, setQrProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Fetch lenses (lentes_contacto and lentes_graduados)
  const { data: allProducts, isLoading } = useOpticsProducts(undefined, searchTerm);
  const lenses = allProducts?.filter(p => 
    p.tipo === "lentes_contacto" || p.tipo === "lentes_graduados"
  ) || [];
  
  const deleteProduct = useDeleteOpticsProduct();

  // Calculate stats from real data
  const totalLenses = lenses.length;
  const inStock = lenses.filter(l => l.stock_actual > 0).length;
  const lowStock = lenses.filter(l => l.stock_actual <= l.stock_minimo).length;

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { variant: "destructive" as const, text: "Sin Stock" };
    if (stock <= minStock) return { variant: "destructive" as const, text: "Stock Bajo" };
    if (stock <= minStock * 2) return { variant: "outline" as const, text: "Stock Medio" };
    return { variant: "default" as const, text: "Stock Normal" };
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (productToDelete) {
      await deleteProduct.mutateAsync(productToDelete);
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lunas..."
              className="pl-8 w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setSelectedProduct(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevas Lunas
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lunas</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : totalLenses}</div>
            <p className="text-xs text-muted-foreground">
              Lentes graduados y de contacto
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Stock</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : inStock}</div>
            <p className="text-xs text-muted-foreground">
              Con disponibilidad
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Requieren reabastecimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario de Lunas</CardTitle>
          <CardDescription>
            Lista completa de lunas y lentes disponibles en el inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : lenses.length === 0 ? (
            <p className="text-muted-foreground">No hay lunas registradas</p>
          ) : (
            <div className="space-y-4">
              {lenses.map((lens) => {
                const stockStatus = getStockStatus(lens.stock_actual, lens.stock_minimo);
                return (
                  <div key={lens.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 flex-1">
                      <div>
                        <Link to={`/optics/product/${lens.codigo}`} className="hover:underline">
                          <p className="font-medium">{lens.marca || "Sin marca"}</p>
                          <p className="text-sm text-muted-foreground">{lens.modelo || lens.nombre}</p>
                        </Link>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Tipo</p>
                        <p className="text-sm text-muted-foreground">{lens.tipo_lente || lens.tipo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Material</p>
                        <p className="text-sm text-muted-foreground">{lens.material || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Índice</p>
                        <p className="text-sm text-muted-foreground">{lens.indice_refraccion || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Precio</p>
                        <p className="text-sm text-muted-foreground">S/ {lens.precio_venta.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Stock</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{lens.stock_actual}</span>
                          <Badge variant={stockStatus.variant}>{stockStatus.text}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setQrProduct(lens)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(lens)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setProductToDelete(lens.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <OpticsProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />

      <OpticsProductQRDialog
        product={qrProduct}
        open={!!qrProduct}
        onOpenChange={(open) => !open && setQrProduct(null)}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lunas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará las lunas del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

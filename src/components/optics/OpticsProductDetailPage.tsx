import React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  QrCode, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  MapPin,
  Tag
} from "lucide-react";
import { useOpticsProductByCode } from "@/hooks/useOpticsProducts";
import { useOpticsMovements } from "@/hooks/useOpticsMovements";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ProductLabelCanvas } from "./ProductLabelCanvas";

export function OpticsProductDetailPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const { data: product, isLoading } = useOpticsProductByCode(codigo || "");
  const { data: movements } = useOpticsMovements(product?.id, 20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando producto...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground">Producto no encontrado</div>
        <Button asChild variant="outline">
          <Link to="/optics/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al catálogo
          </Link>
        </Button>
      </div>
    );
  }

  

  const getTypeBadge = (tipo: string) => {
    const typeLabels: Record<string, string> = {
      montura: "Montura",
      lentes_contacto: "Lentes de Contacto",
      lentes_graduados: "Lentes Graduados",
      gafas_sol: "Gafas de Sol",
      accesorio: "Accesorio",
    };
    return typeLabels[tipo] || tipo;
  };

  const getStockStatus = () => {
    if (product.stock_actual <= 0) {
      return { variant: "destructive" as const, text: "Sin Stock" };
    }
    if (product.stock_actual <= product.stock_minimo) {
      return { variant: "outline" as const, text: "Stock Bajo" };
    }
    return { variant: "default" as const, text: "En Stock" };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/optics/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{product.nombre}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{getTypeBadge(product.tipo)}</Badge>
              <span className="font-mono text-muted-foreground">{product.codigo}</span>
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-medium">{product.marca || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{product.modelo || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio de Compra</p>
                <p className="font-medium">S/. {(product.precio_compra || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio de Venta</p>
                <p className="font-bold text-lg">S/. {(product.precio_venta || 0).toFixed(2)}</p>
              </div>
              {product.ubicacion && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Ubicación
                  </p>
                  <p className="font-medium">{product.ubicacion}</p>
                </div>
              )}
              {product.fecha_ingreso && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fecha de Ingreso
                  </p>
                  <p className="font-medium">
                    {format(new Date(product.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              )}
              {product.descripcion && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-medium">{product.descripcion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specific Details */}
          {(product.material || product.color || product.indice_refraccion) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Detalles Específicos
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {product.material && (
                  <div>
                    <p className="text-sm text-muted-foreground">Material</p>
                    <p className="font-medium">{product.material}</p>
                  </div>
                )}
                {product.color && (
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium">{product.color}</p>
                  </div>
                )}
                {product.tamanio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tamaño</p>
                    <p className="font-medium">{product.tamanio}</p>
                  </div>
                )}
                {product.genero && (
                  <div>
                    <p className="text-sm text-muted-foreground">Género</p>
                    <p className="font-medium capitalize">{product.genero}</p>
                  </div>
                )}
                {product.indice_refraccion && (
                  <div>
                    <p className="text-sm text-muted-foreground">Índice de Refracción</p>
                    <p className="font-medium">{product.indice_refraccion}</p>
                  </div>
                )}
                {product.tipo_lente && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Lente</p>
                    <p className="font-medium capitalize">{product.tipo_lente}</p>
                  </div>
                )}
                {product.tratamiento && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Tratamiento</p>
                    <p className="font-medium">{product.tratamiento}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Movements History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historial de Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!movements?.length ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay movimientos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="text-sm">
                          {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mov.movement_type === "entrada" ? "default" : "secondary"}>
                            {mov.movement_type === "entrada" ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {mov.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{mov.movement_reason}</TableCell>
                        <TableCell className="text-right font-medium">
                          {mov.movement_type === "entrada" ? "+" : "-"}{mov.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {mov.previous_stock} → {mov.new_stock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Card */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Disponible</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-5xl font-bold">{product.stock_actual}</div>
              <Badge variant={stockStatus.variant} className="mt-2">
                {stockStatus.text}
              </Badge>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">
                Stock mínimo: {product.stock_minimo} unidades
              </div>
            </CardContent>
          </Card>

          {/* QR Code / Label */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Etiqueta del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <ProductLabelCanvas product={product} showPrintButton />
            </CardContent>
          </Card>

          {/* Supplier */}
          {product.supplier && (
            <Card>
              <CardHeader>
                <CardTitle>Proveedor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{product.supplier.name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

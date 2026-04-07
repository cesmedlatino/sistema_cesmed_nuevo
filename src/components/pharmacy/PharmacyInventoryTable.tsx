import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function PharmacyInventoryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  
  // Debounce search to avoid too many queries
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: medications, isLoading } = usePharmacyMedications(500, debouncedSearch);

  React.useEffect(() => {
    const savedConfig = localStorage.getItem("pharmacy_config");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setColumnVisibility(config.inventoryColumns || {});
      } catch (error) {
        console.error("Error loading column config:", error);
      }
    }
  }, []);

  // Server-side filtering is already applied, just use the data
  const filteredMedications = medications || [];

  if (isLoading) {
    return <div>Cargando inventario...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventario de Productos
              <Badge variant="secondary" className="text-base">
                {filteredMedications.length} productos
              </Badge>
            </CardTitle>
            <CardDescription>
              Mostrando: {filteredMedications.length} productos{debouncedSearch ? " (filtrados)" : " (limitado a 500 registros)"}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, descripción, ubicación o forma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative max-h-[600px] overflow-auto">
          <Table className="relative border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
              <TableRow className="hover:bg-transparent">
                {(columnVisibility.ubicacion ?? true) && <TableHead className="bg-card">Ubicación</TableHead>}
                {(columnVisibility.codigo ?? true) && <TableHead className="bg-card">Código</TableHead>}
                {(columnVisibility.descripcion ?? true) && <TableHead className="bg-card">Descripción</TableHead>}
                {(columnVisibility.ff ?? true) && <TableHead className="bg-card">FF</TableHead>}
                {(columnVisibility.lote ?? true) && <TableHead className="bg-card">Lote</TableHead>}
                {(columnVisibility.fv ?? true) && <TableHead className="bg-card">F.V.</TableHead>}
                {(columnVisibility.presentacion ?? true) && <TableHead className="bg-card">Presentación</TableHead>}
                {(columnVisibility.stock_inicial ?? true) && (
                  <TableHead className="text-right bg-card">Stock Inicial</TableHead>
                )}
                {(columnVisibility.entrada ?? true) && <TableHead className="text-right bg-card">Entrada</TableHead>}
                {(columnVisibility.salida ?? true) && <TableHead className="text-right bg-card">Salida</TableHead>}
                {(columnVisibility.stock_actual ?? true) && (
                  <TableHead className="text-right bg-card">Stock Actual</TableHead>
                )}
                {(columnVisibility.precio_entrada ?? true) && (
                  <TableHead className="text-right bg-card">Precio Entrada</TableHead>
                )}
                {(columnVisibility.precio_venta ?? true) && (
                  <TableHead className="text-right bg-card">Precio Venta</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedications.map((med) => {
                const stockStatus = med.stock_actual <= med.min_stock_level ? "low" : "normal";

                return (
                  <TableRow key={med.id}>
                    {(columnVisibility.ubicacion ?? true) && (
                      <TableCell>
                        <Badge variant="outline">{med.ubicacion || "-"}</Badge>
                      </TableCell>
                    )}
                    {(columnVisibility.codigo ?? true) && (
                      <TableCell>
                        <code className="text-xs font-medium">{med.codigo}</code>
                      </TableCell>
                    )}
                    {(columnVisibility.descripcion ?? true) && (
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium">{med.descripcion}</div>
                          {med.comentarios && (
                            <div className="text-xs text-muted-foreground truncate">{med.comentarios}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {(columnVisibility.ff ?? true) && <TableCell>{med.forma_farmaceutica || "-"}</TableCell>}
                    {(columnVisibility.lote ?? true) && (
                      <TableCell>
                        <span className="text-xs">{med.lote || "-"}</span>
                      </TableCell>
                    )}
                    {(columnVisibility.fv ?? true) && (
                      <TableCell>
                        {med.fecha_vencimiento ? (
                          <span className="text-xs">
                            {format(new Date(med.fecha_vencimiento), "MMM yy", { locale: es })}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}
                    {(columnVisibility.presentacion ?? true) && <TableCell>{med.presentation || "-"}</TableCell>}
                    {(columnVisibility.stock_inicial ?? true) && (
                      <TableCell className="text-right">{med.stock_inicial}</TableCell>
                    )}
                    {(columnVisibility.entrada ?? true) && (
                      <TableCell className="text-right text-green-600">+{med.entrada}</TableCell>
                    )}
                    {(columnVisibility.salida ?? true) && (
                      <TableCell className="text-right text-red-600">-{med.salida}</TableCell>
                    )}
                    {(columnVisibility.stock_actual ?? true) && (
                      <TableCell className="text-right">
                        <Badge variant={stockStatus === "low" ? "destructive" : "default"}>{med.stock_actual}</Badge>
                      </TableCell>
                    )}
                    {(columnVisibility.precio_entrada ?? true) && (
                      <TableCell className="text-right">
                        {med.purchase_price ? <span className="font-medium">S/ {med.purchase_price.toFixed(2)}</span> : "-"}
                      </TableCell>
                    )}
                    {(columnVisibility.precio_venta ?? true) && (
                      <TableCell className="text-right">
                        {med.precio_venta ? <span className="font-medium">S/ {med.precio_venta.toFixed(2)}</span> : "-"}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

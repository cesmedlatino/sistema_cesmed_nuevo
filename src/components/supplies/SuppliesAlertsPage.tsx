import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Search, AlertTriangle, Package, Plus, Eye, Boxes } from "lucide-react";
import { useSuppliesProducts, SUPPLIES_CATEGORIES } from "@/hooks/useSuppliesProducts";
import { differenceInDays } from "date-fns";

type AlertSeverity = "critical" | "warning" | "info";
type AlertType = "out_of_stock" | "low_stock" | "slow_moving";

interface SupplyAlert {
  id: string;
  codigo: string;
  descripcion: string;
  category: string;
  stock_actual: number;
  min_stock_level: number;
  updated_at?: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
}

export function SuppliesAlertsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: products, isLoading } = useSuppliesProducts();

  const alerts = useMemo<SupplyAlert[]>(() => {
    if (!products) return [];

    return products
      .map((product) => {
        let severity: AlertSeverity = "info";
        let type: AlertType = "slow_moving";
        let message = "";

        if (product.stock_actual <= 0) {
          severity = "critical";
          type = "out_of_stock";
          message = "Sin stock disponible";
        } else if (product.stock_actual <= product.min_stock_level) {
          severity = "warning";
          type = "low_stock";
          message = `Stock actual (${product.stock_actual}) por debajo del mínimo (${product.min_stock_level})`;
        } else if (product.updated_at) {
          const daysSinceUpdate = differenceInDays(new Date(), new Date(product.updated_at));
          if (daysSinceUpdate >= 30) {
            severity = "info";
            type = "slow_moving";
            message = `Sin movimiento desde hace ${daysSinceUpdate} días`;
          } else {
            return null; // No alert
          }
        } else {
          return null; // No alert
        }

        return {
          id: product.id,
          codigo: product.codigo,
          descripcion: product.descripcion,
          category: product.category,
          stock_actual: product.stock_actual,
          min_stock_level: product.min_stock_level,
          updated_at: product.updated_at,
          severity,
          type,
          message,
        };
      })
      .filter(Boolean) as SupplyAlert[];
  }, [products]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !searchTerm ||
        alert.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = selectedSeverity === "all" || alert.severity === selectedSeverity;
      const matchesType = selectedType === "all" || alert.type === selectedType;

      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [alerts, searchTerm, selectedSeverity, selectedType]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "warning":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Advertencia</Badge>;
      case "info":
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Centro de Alertas de Suministros
          </h1>
          <p className="text-muted-foreground">
            Monitoreo de stock y movimientos de inventario
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Sin stock</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Stock bajo</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Informativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{infoCount}</div>
            <p className="text-xs text-muted-foreground">Lento movimiento</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
                <SelectItem value="warning">Advertencias</SelectItem>
                <SelectItem value="info">Informativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="out_of_stock">Sin stock</SelectItem>
                <SelectItem value="low_stock">Stock bajo</SelectItem>
                <SelectItem value="slow_moving">Lento movimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">Sin alertas</p>
              <p className="text-sm">Todos los suministros están en orden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell className="font-mono text-sm">{alert.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{alert.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.category || "Sin categoría"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{alert.stock_actual}</span>
                      <span className="text-muted-foreground"> / {alert.min_stock_level}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      {alert.message}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" title="Ver producto" asChild>
                          <Link to={`/supplies/products?search=${alert.codigo}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Registrar entrada" asChild>
                          <Link to="/supplies/entries">
                            <Plus className="h-4 w-4" />
                          </Link>
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
    </div>
  );
}

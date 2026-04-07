import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  AlertCircle, 
  PackageX, 
  TrendingDown, 
  Search,
  Eye,
  ShoppingCart,
  Filter,
  Bell,
  BellOff,
  Package
} from "lucide-react";
import { useOpticsProducts } from "@/hooks/useOpticsProducts";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AlertSeverity = "critical" | "warning" | "info";
type AlertType = "out_of_stock" | "low_stock" | "expiring_soon" | "slow_moving";

interface ProductAlert {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  stockActual: number;
  stockMinimo: number;
  lastMovement?: string;
  createdAt: Date;
}

export function OpticsAlertsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const { data: products, isLoading } = useOpticsProducts();

  // Generate alerts from products
  const alerts = useMemo(() => {
    if (!products) return [];

    const alertsList: ProductAlert[] = [];

    products.forEach((product) => {
      // Critical: Out of stock
      if (product.stock_actual <= 0) {
        alertsList.push({
          id: `${product.id}-out-of-stock`,
          productId: product.id,
          productName: product.nombre,
          productCode: product.codigo,
          productType: product.tipo,
          severity: "critical",
          type: "out_of_stock",
          message: "Sin existencias disponibles",
          stockActual: product.stock_actual,
          stockMinimo: product.stock_minimo,
          lastMovement: product.updated_at,
          createdAt: new Date(product.updated_at || product.created_at),
        });
      }
      // Warning: Low stock (but not zero)
      else if (product.stock_actual <= product.stock_minimo) {
        alertsList.push({
          id: `${product.id}-low-stock`,
          productId: product.id,
          productName: product.nombre,
          productCode: product.codigo,
          productType: product.tipo,
          severity: "warning",
          type: "low_stock",
          message: `Stock por debajo del mínimo (${product.stock_minimo} unid.)`,
          stockActual: product.stock_actual,
          stockMinimo: product.stock_minimo,
          lastMovement: product.updated_at,
          createdAt: new Date(product.updated_at || product.created_at),
        });
      }

      // Info: Slow moving (no updates in 30+ days, has stock)
      if (product.stock_actual > 0 && product.updated_at) {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(product.updated_at));
        if (daysSinceUpdate >= 30) {
          alertsList.push({
            id: `${product.id}-slow-moving`,
            productId: product.id,
            productName: product.nombre,
            productCode: product.codigo,
            productType: product.tipo,
            severity: "info",
            type: "slow_moving",
            message: `Sin movimiento en ${daysSinceUpdate} días`,
            stockActual: product.stock_actual,
            stockMinimo: product.stock_minimo,
            lastMovement: product.updated_at,
            createdAt: new Date(product.updated_at),
          });
        }
      }
    });

    // Sort by severity (critical first) and then by date
    return alertsList.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [products]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        alert.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.productCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || alert.type === selectedType;
      const matchesSeverity = selectedSeverity === "all" || alert.severity === selectedSeverity;
      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [alerts, searchTerm, selectedType, selectedSeverity]);

  // Statistics
  const stats = useMemo(() => {
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;
    const infoCount = alerts.filter((a) => a.severity === "info").length;
    const outOfStockCount = alerts.filter((a) => a.type === "out_of_stock").length;
    const lowStockCount = alerts.filter((a) => a.type === "low_stock").length;
    const slowMovingCount = alerts.filter((a) => a.type === "slow_moving").length;

    return {
      total: alerts.length,
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      outOfStock: outOfStockCount,
      lowStock: lowStockCount,
      slowMoving: slowMovingCount,
    };
  }, [alerts]);

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Crítico</Badge>;
      case "warning":
        return <Badge variant="outline" className="gap-1 border-orange-300 bg-orange-50 text-orange-700"><AlertTriangle className="h-3 w-3" /> Advertencia</Badge>;
      case "info":
        return <Badge variant="secondary" className="gap-1"><TrendingDown className="h-3 w-3" /> Informativo</Badge>;
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case "out_of_stock":
        return <PackageX className="h-4 w-4 text-destructive" />;
      case "low_stock":
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case "slow_moving":
        return <Package className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: AlertType) => {
    switch (type) {
      case "out_of_stock":
        return "Sin Stock";
      case "low_stock":
        return "Stock Bajo";
      case "slow_moving":
        return "Sin Movimiento";
      default:
        return type;
    }
  };

  const getProductTypeName = (type: string) => {
    const types: Record<string, string> = {
      montura: "Montura",
      lentes_contacto: "Lentes de Contacto",
      lentes_graduados: "Lentes Graduados",
      gafas_sol: "Gafas de Sol",
      accesorios: "Accesorios",
      estuches: "Estuches",
      liquidos: "Líquidos",
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Centro de Alertas
          </h2>
          <p className="text-muted-foreground">
            Monitoreo de inventario y notificaciones del sistema
          </p>
        </div>
        <Link to="/optics/entries">
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Registrar Entrada
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={`${stats.total === 0 ? 'border-green-200 bg-green-50/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alertas</CardTitle>
            {stats.total === 0 ? (
              <BellOff className="h-4 w-4 text-green-600" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total === 0 ? "Todo en orden" : "Requieren atención"}
            </p>
          </CardContent>
        </Card>

        <Card className={`${stats.critical > 0 ? 'border-red-200 bg-red-50/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
            <PackageX className={`h-4 w-4 ${stats.critical > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.critical > 0 ? 'text-destructive' : ''}`}>
              {stats.critical}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos sin stock
            </p>
          </CardContent>
        </Card>

        <Card className={`${stats.warning > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advertencias</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.warning > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.warning > 0 ? 'text-orange-600' : ''}`}>
              {stats.warning}
            </div>
            <p className="text-xs text-muted-foreground">
              Stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informativas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.info}</div>
            <p className="text-xs text-muted-foreground">
              Sin movimiento reciente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Listado de Alertas
          </CardTitle>
          <CardDescription>
            Todas las alertas activas del sistema de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las severidades</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
                <SelectItem value="warning">Advertencias</SelectItem>
                <SelectItem value="info">Informativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo de alerta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                <SelectItem value="low_stock">Stock Bajo</SelectItem>
                <SelectItem value="slow_moving">Sin Movimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for quick filtering */}
          <Tabs defaultValue="all" className="mb-4">
            <TabsList>
              <TabsTrigger value="all" onClick={() => { setSelectedSeverity("all"); setSelectedType("all"); }}>
                Todas ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="critical" onClick={() => { setSelectedSeverity("critical"); setSelectedType("all"); }}>
                <AlertCircle className="h-3 w-3 mr-1 text-destructive" />
                Críticas ({stats.critical})
              </TabsTrigger>
              <TabsTrigger value="warning" onClick={() => { setSelectedSeverity("warning"); setSelectedType("all"); }}>
                <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                Advertencias ({stats.warning})
              </TabsTrigger>
              <TabsTrigger value="info" onClick={() => { setSelectedSeverity("info"); setSelectedType("all"); }}>
                <TrendingDown className="h-3 w-3 mr-1" />
                Informativas ({stats.info})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {stats.total === 0 ? "¡Todo en orden!" : "No hay alertas que coincidan"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total === 0
                  ? "No hay alertas activas en el sistema"
                  : "Intenta ajustar los filtros de búsqueda"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className={
                      alert.severity === "critical" ? "bg-red-50/30" :
                      alert.severity === "warning" ? "bg-orange-50/30" : ""
                    }>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(alert.type)}
                          <span className="text-xs font-medium">{getTypeName(alert.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{alert.productName}</div>
                          <div className="text-xs text-muted-foreground">{alert.productCode}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getProductTypeName(alert.productType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{alert.message}</span>
                        {alert.lastMovement && (
                          <div className="text-xs text-muted-foreground">
                            Último mov: {format(new Date(alert.lastMovement), "dd MMM yyyy", { locale: es })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`font-bold ${alert.stockActual === 0 ? 'text-destructive' : alert.stockActual <= alert.stockMinimo ? 'text-orange-600' : ''}`}>
                          {alert.stockActual}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mín: {alert.stockMinimo}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(alert.severity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link to={`/optics/products/${alert.productId}`}>
                            <Button variant="ghost" size="icon" title="Ver producto">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to="/optics/entries">
                            <Button variant="ghost" size="icon" title="Registrar entrada">
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary Footer */}
          {filteredAlerts.length > 0 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-muted-foreground">
              <span>
                Mostrando {filteredAlerts.length} de {stats.total} alertas
              </span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <PackageX className="h-4 w-4 text-destructive" /> {stats.outOfStock} sin stock
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-orange-500" /> {stats.lowStock} stock bajo
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> {stats.slowMoving} sin movimiento
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

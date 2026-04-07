import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Pill,
  Package,
  TrendingUp,
  AlertTriangle,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  CalendarIcon,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { usePharmacyStats, usePharmacyAlerts } from "@/hooks/usePharmacyAlerts";
import { usePharmacyEntries } from "@/hooks/usePharmacyEntries";
import { usePharmacyOutputs } from "@/hooks/usePharmacyOutputs";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { PharmacyMedicationsList } from "@/components/pharmacy/PharmacyMedicationsList";
import { PharmacyInventoryMovements } from "@/components/pharmacy/PharmacyInventoryMovements";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

type FilterType = "total" | "today" | "thisWeek" | "lastMonth" | "month" | "year" | "date";

export function Pharmacy() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterType, setFilterType] = useState<FilterType>("total");
  const [medicationsFilter, setMedicationsFilter] = useState<"all" | "low_stock" | "near_expiry">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: stats } = usePharmacyStats();
  const { data: alerts } = usePharmacyAlerts();
  const { data: entries } = usePharmacyEntries();
  const { data: outputs } = usePharmacyOutputs();
  const { data: medications } = usePharmacyMedications();

  // Filter data based on selected filter
  const filteredData = useMemo(() => {
    if (!entries || !outputs) return { entries: [], outputs: [] };

    // If "total" filter is selected, return all data
    if (filterType === "total") {
      return { entries, outputs };
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (filterType) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "thisWeek":
        // Use Monday as start of week to match PostgreSQL DATE_TRUNC('week')
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "month":
        startDate = startOfMonth(new Date(selectedMonth));
        endDate = endOfMonth(new Date(selectedMonth));
        break;
      case "year":
        startDate = new Date(parseInt(selectedYear), 0, 1);
        endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
        break;
      case "date":
        if (!selectedDate) return { entries: [], outputs: [] };
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      default:
        startDate = startOfDay(now);
    }

    const filteredEntries = entries.filter((entry) => {
      // Parse the date string as YYYY-MM-DD in local timezone
      const [year, month, day] = entry.date.split("-").map(Number);
      const entryDate = new Date(year, month - 1, day);
      const entryTime = entryDate.getTime();
      return entryTime >= startDate.getTime() && entryTime <= endDate.getTime();
    });

    const filteredOutputs = outputs.filter((output) => {
      // Parse the date string as YYYY-MM-DD in local timezone
      const [year, month, day] = output.date.split("-").map(Number);
      const outputDate = new Date(year, month - 1, day);
      const outputTime = outputDate.getTime();
      return outputTime >= startDate.getTime() && outputTime <= endDate.getTime();
    });

    return { entries: filteredEntries, outputs: filteredOutputs };
  }, [entries, outputs, filterType, selectedMonth, selectedYear, selectedDate]);

  // Calculate totals from medications
  const medicationStats = useMemo(() => {
    if (!medications)
      return {
        total_medications: 0,
        low_stock_count: 0,
        near_expiry_count: 0,
        total_inventory_value: 0,
      };

    const totalMedications = medications.length;
    const lowStockCount = medications.filter((med) => med.stock_actual <= (med.min_stock_level || 10)).length;

    // Count medications that will expire within the alert days
    const now = new Date();
    const nearExpiryCount = medications.filter((med) => {
      if (!med.fecha_vencimiento) return false;
      const expiryDate = new Date(med.fecha_vencimiento);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= (med.days_before_expiry_alert || 30) && daysUntilExpiry > 0;
    }).length;

    // Calculate inventory value using precio_venta
    const totalInventoryValue = medications.reduce((sum, med) => {
      const salePrice = med.precio_venta || 0;
      const stock = med.stock_actual || 0;
      return sum + salePrice * stock;
    }, 0);

    return {
      total_medications: totalMedications,
      low_stock_count: lowStockCount,
      near_expiry_count: nearExpiryCount,
      total_inventory_value: totalInventoryValue,
    };
  }, [medications]);

  // Calculate totals using direct counts and sums
  const totalEntriesCount = filteredData.entries.length;
  const totalOutputsCount = filteredData.outputs.length;
  const totalEntriesAmount = filteredData.entries.reduce((sum, entry) => sum + (entry.total_amount || 0), 0);
  const totalOutputsAmount = filteredData.outputs.reduce((sum, output) => sum + (output.total || 0), 0);

  // Prepare chart data
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, { date: string; entradas: number; salidas: number }>();

    filteredData.entries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), "dd/MM");
      const existing = dataMap.get(dateKey) || { date: dateKey, entradas: 0, salidas: 0 };
      existing.entradas += entry.total_amount || 0;
      dataMap.set(dateKey, existing);
    });

    filteredData.outputs.forEach((output) => {
      const dateKey = format(new Date(output.date), "dd/MM");
      const existing = dataMap.get(dateKey) || { date: dateKey, entradas: 0, salidas: 0 };
      existing.salidas += output.total || 0;
      dataMap.set(dateKey, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split("/").map(Number);
      const [dayB, monthB] = b.date.split("/").map(Number);
      return monthA - monthB || dayA - dayB;
    });
  }, [filteredData]);

  const pieData = [
    { name: "Stock Bajo", value: medicationStats.low_stock_count, color: "#f97316" },
    { name: "Por Vencer", value: medicationStats.near_expiry_count, color: "#ef4444" },
    {
      name: "Normal",
      value: medicationStats.total_medications - medicationStats.low_stock_count - medicationStats.near_expiry_count,
      color: "#22c55e",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-purple-700">Sistema de Farmacia</h2>
          <p className="text-muted-foreground">Gestión integral de medicamentos e inventario</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="medications">Productos</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Período</CardTitle>
              <CardDescription>Selecciona el período para visualizar las estadísticas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Tabs
                  value={filterType}
                  onValueChange={(value) => setFilterType(value as FilterType)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="total">Total</TabsTrigger>
                    <TabsTrigger value="today">Hoy</TabsTrigger>
                    <TabsTrigger value="thisWeek">Semana Actual</TabsTrigger>
                    <TabsTrigger value="lastMonth">Mes Anterior</TabsTrigger>
                    <TabsTrigger value="month">Mes</TabsTrigger>
                    <TabsTrigger value="year">Año</TabsTrigger>
                    <TabsTrigger value="date">Fecha</TabsTrigger>
                  </TabsList>
                </Tabs>

                {filterType === "month" && (
                  <div className="w-full">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    />
                  </div>
                )}

                {filterType === "year" && (
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar año" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filterType === "date" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Estadísticas principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={() => {
                setMedicationsFilter("all");
                setActiveTab("medications");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Medicamentos</CardTitle>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{medicationStats.total_medications}</div>
                <p className="text-xs text-muted-foreground">Medicamentos activos</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={() => {
                setMedicationsFilter("low_stock");
                setActiveTab("medications");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{medicationStats.low_stock_count}</div>
                <p className="text-xs text-muted-foreground">Requieren reposición</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={() => {
                setMedicationsFilter("near_expiry");
                setActiveTab("medications");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{medicationStats.near_expiry_count}</div>
                <p className="text-xs text-muted-foreground">Próximos a vencimiento</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => setActiveTab("inventory")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalEntriesCount}</div>
                <p className="text-xs text-muted-foreground">
                  S/. {totalEntriesAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => setActiveTab("inventory")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Salidas</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalOutputsCount}</div>
                <p className="text-xs text-muted-foreground">
                  S/. {totalOutputsAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg"
              onClick={() => {
                setMedicationsFilter("all");
                setActiveTab("medications");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  S/. {medicationStats.total_inventory_value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Valor total del stock</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Movimientos de Inventario</CardTitle>
                <CardDescription>Entradas y salidas por día</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend />
                    <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
                    <Bar dataKey="salidas" fill="#3b82f6" name="Salidas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado del Inventario</CardTitle>
                <CardDescription>Distribución por estado</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {alerts && alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Alertas del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-3">Medicamentos con Stock Bajo</h3>
                    <div className="space-y-2">
                      {alerts
                        .filter((alert) => alert.alert_type === "Stock Bajo")
                        .map((alert) => (
                          <div key={alert.medication_id} className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm">{alert.commercial_name}</span>
                            <Badge variant="destructive" className="ml-2">
                              {alert.current_stock} / {alert.min_stock_level}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  {alerts.some((alert) => alert.alert_type === "Próximo a Vencer") && (
                    <div>
                      <h3 className="text-sm font-semibold text-orange-600 mb-3">Medicamentos Próximos a Vencer</h3>
                      <div className="space-y-2">
                        {alerts
                          .filter((alert) => alert.alert_type === "Próximo a Vencer")
                          .map((alert) => (
                            <div key={alert.medication_id} className="flex items-center justify-between py-2 border-b">
                              <span className="text-sm">{alert.commercial_name}</span>
                              <Badge variant="secondary" className="ml-2">
                                {alert.days_to_expiry} días
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="medications">
          <PharmacyMedicationsList initialFilter={medicationsFilter} />
        </TabsContent>

        <TabsContent value="inventory">
          <PharmacyInventoryMovements
            filterType={filterType}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

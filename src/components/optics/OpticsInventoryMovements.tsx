
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MonthYearPicker } from "@/components/pharmacy/MonthYearPicker";
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  Calendar as CalendarIcon,
  Package,
  CalendarDays,
  X
} from "lucide-react";
import { useOpticsEntries } from "@/hooks/useOpticsEntries";
import { useOpticsOutputs } from "@/hooks/useOpticsOutputs";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DateFilterType = "today" | "date" | "month" | "total";

interface Movement {
  id: string;
  type: "Entrada" | "Salida";
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  total: number;
  date: string;
  reference: string;
  createdAt: string;
}

export function OpticsInventoryMovements() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const { data: entries, isLoading: isLoadingEntries } = useOpticsEntries();
  const { data: outputs, isLoading: isLoadingOutputs } = useOpticsOutputs();

  const isLoading = isLoadingEntries || isLoadingOutputs;

  // Helper to parse date string as local date
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Get Lima timezone date
  const getLimaDate = (): Date => {
    const now = new Date();
    const limaOffset = -5 * 60; // Lima is UTC-5
    const localOffset = now.getTimezoneOffset();
    const diff = limaOffset - localOffset;
    return new Date(now.getTime() + diff * 60 * 1000);
  };

  // Combine entries and outputs into unified movements
  const allMovements = useMemo((): Movement[] => {
    const movementsList: Movement[] = [];

    // Add entries
    if (entries) {
      entries.forEach((entry) => {
        movementsList.push({
          id: entry.id,
          type: "Entrada",
          productName: entry.product?.nombre || entry.description || "Producto",
          productCode: entry.product_code || entry.product?.codigo || "",
          quantity: entry.quantity_received || 0,
          unitCost: entry.purchase_cost_per_unit || 0,
          total: entry.importe || (entry.quantity_received || 0) * (entry.purchase_cost_per_unit || 0),
          date: entry.date,
          reference: entry.invoice_number || "",
          createdAt: entry.created_at,
        });
      });
    }

    // Add outputs
    if (outputs) {
      outputs.forEach((output) => {
        movementsList.push({
          id: output.id,
          type: "Salida",
          productName: output.product?.nombre || output.description || "Producto",
          productCode: output.product_code || output.product?.codigo || "",
          quantity: output.quantity || 0,
          unitCost: output.sale_cost_per_unit || 0,
          total: output.total || (output.quantity || 0) * (output.sale_cost_per_unit || 0),
          date: output.date,
          reference: output.nro_comprobante || output.tipo_salida || "",
          createdAt: output.created_at,
        });
      });
    }

    // Sort by created_at descending
    return movementsList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries, outputs]);

  // Filter movements by date
  const dateFilteredMovements = useMemo(() => {
    const limaToday = getLimaDate();

    return allMovements.filter((m) => {
      const movementDate = parseLocalDate(m.date);

      switch (dateFilter) {
        case "today": {
          const todayStart = startOfDay(limaToday);
          const todayEnd = endOfDay(limaToday);
          return isWithinInterval(movementDate, { start: todayStart, end: todayEnd });
        }
        case "date": {
          if (!selectedDate) return true;
          const dateStart = startOfDay(selectedDate);
          const dateEnd = endOfDay(selectedDate);
          return isWithinInterval(movementDate, { start: dateStart, end: dateEnd });
        }
        case "month": {
          const [year, month] = selectedMonth.split("-").map(Number);
          const monthStart = startOfMonth(new Date(year, month - 1));
          const monthEnd = endOfMonth(new Date(year, month - 1));
          return isWithinInterval(movementDate, { start: monthStart, end: monthEnd });
        }
        case "total":
        default:
          return true;
      }
    });
  }, [allMovements, dateFilter, selectedDate, selectedMonth]);

  // Filter by search term
  const filteredMovements = useMemo(() => {
    if (!searchTerm) return dateFilteredMovements;
    
    const term = searchTerm.toLowerCase();
    return dateFilteredMovements.filter(m => 
      m.productName.toLowerCase().includes(term) ||
      m.productCode.toLowerCase().includes(term) ||
      m.reference.toLowerCase().includes(term)
    );
  }, [dateFilteredMovements, searchTerm]);

  // Calculate stats from filtered data
  const entryMovements = filteredMovements.filter(m => m.type === "Entrada");
  const exitMovements = filteredMovements.filter(m => m.type === "Salida");
  const totalEntryValue = entryMovements.reduce((sum, m) => sum + m.total, 0);
  const totalExitValue = exitMovements.reduce((sum, m) => sum + m.total, 0);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setDatePopoverOpen(false);
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Hoy";
      case "date":
        return selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Fecha";
      case "month":
        return format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: es });
      case "total":
        return "Total";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={dateFilter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setDateFilter("today")}
        >
          Hoy
        </Button>

        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter === "date" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("date")}
              className="gap-1"
            >
              <CalendarDays className="h-4 w-4" />
              {dateFilter === "date" && selectedDate
                ? format(selectedDate, "dd/MM/yyyy")
                : "Fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-1">
          <Button
            variant={dateFilter === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("month")}
            className="gap-1"
          >
            <CalendarIcon className="h-4 w-4" />
            Mes
          </Button>
          {dateFilter === "month" && (
            <MonthYearPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          )}
        </div>

        <Button
          variant={dateFilter === "total" ? "default" : "outline"}
          size="sm"
          onClick={() => setDateFilter("total")}
        >
          Total
        </Button>

        {dateFilter !== "today" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFilter("today");
              setSelectedDate(new Date());
            }}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-2">
          Mostrando: <strong>{getFilterLabel()}</strong> ({filteredMovements.length} registros)
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por producto, código, referencia..."
            className="pl-8 w-96"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : entryMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              Movimientos de entrada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : exitMovements.length}</div>
            <p className="text-xs text-muted-foreground">
              Movimientos de salida
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Entradas</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `S/ ${totalEntryValue.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total ingresado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Salidas</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `S/ ${totalExitValue.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total egresado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
          <CardDescription>
            Registro completo de entradas y salidas del inventario óptico
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : filteredMovements.length === 0 ? (
            <p className="text-muted-foreground">No hay movimientos registrados para el período seleccionado</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredMovements.map((movement) => {
                const Icon = movement.type === "Entrada" ? TrendingUp : TrendingDown;
                const iconColor = movement.type === "Entrada" ? "text-green-600" : "text-red-600";
                const badgeVariant = movement.type === "Entrada" ? "default" as const : "secondary" as const;
                
                return (
                  <div key={movement.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Icon className={cn("h-4 w-4", iconColor)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="font-medium">{movement.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {movement.productCode} • {movement.reference}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Cantidad</p>
                          <p className="text-sm text-muted-foreground">{movement.quantity} unidades</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Costo Unit.</p>
                          <p className="text-sm text-muted-foreground">
                            S/ {movement.unitCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Fecha</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseLocalDate(movement.date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={badgeVariant}>{movement.type}</Badge>
                      <span className="text-sm font-medium">
                        S/ {movement.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

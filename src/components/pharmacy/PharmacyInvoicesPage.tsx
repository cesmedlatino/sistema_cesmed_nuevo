import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter, CheckCircle2, Search } from 'lucide-react';
import { useInvoiceHeaders } from '@/hooks/useInvoiceHeaders';
import { useToggleInvoiceStatus } from '@/hooks/useInvoiceMutations';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { useDebounce } from '@/hooks/use-debounce';

type StatusFilter = 'Pendiente' | 'Pagado' | 'Parcial' | 'Cancelado' | 'Sin Factura';

// Helper function to get current month in YYYY-MM format
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function PharmacyInvoicesPage() {
  // Temporary filter states (before applying)
  const [tempActiveFilters, setTempActiveFilters] = useState<StatusFilter[]>([]);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [tempSelectedMonth, setTempSelectedMonth] = useState<string>(getCurrentMonth());
  
  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState<StatusFilter[]>([]);
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [appliedSelectedMonth, setAppliedSelectedMonth] = useState<string>(getCurrentMonth());
  
  // Search and date type filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<'fecha' | 'vencimiento' | 'mes'>('mes');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const { data: invoiceHeaders, isLoading } = useInvoiceHeaders();
  const toggleInvoiceStatus = useToggleInvoiceStatus();

  const toggleFilter = (filter: StatusFilter) => {
    setTempActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const applyFilters = () => {
    setAppliedFilters(tempActiveFilters);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setAppliedSelectedMonth(tempSelectedMonth);
  };

  const clearFilters = () => {
    setTempActiveFilters([]);
    setTempStartDate('');
    setTempEndDate('');
    setTempSelectedMonth(getCurrentMonth());
    setAppliedFilters([]);
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedSelectedMonth(getCurrentMonth());
    setSearchTerm('');
  };

  const getStatusDisplay = (status: string): string => {
    if (status === 'Pagado') return 'Pagado';
    if (status === 'Parcial') return 'Parcial';
    return 'Pendiente';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'Pagado':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'Parcial':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'Cancelado':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'Sin Factura':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleToggleInvoiceStatus = (invoiceNumber: string, currentStatus: string, newStatus: string) => {
    // Prevenir cambios si ya está en el mismo estado
    if (currentStatus === newStatus) {
      console.log("Estado ya es el mismo, no se hace cambio");
      return;
    }
    
    const action = newStatus === "Cancelado" ? "cancelar" : "reactivar";
    const message = `¿Está seguro de ${action} esta factura? Esta acción actualizará el estado de la factura y todas sus entradas.`;
    
    if (window.confirm(message)) {
      console.log("Ejecutando mutación de cambio de estado:", { invoiceNumber, currentStatus, newStatus });
      toggleInvoiceStatus.mutate({ invoiceNumber, currentStatus });
    }
  };

  const filteredInvoices = invoiceHeaders?.filter(invoice => {
    // Multi-search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      const invoiceNumber = (invoice.invoice_number || '').toLowerCase();
      const supplierName = (invoice.supplier?.name || '').toLowerCase();
      
      const matchesSearch = 
        invoiceNumber.includes(searchLower) ||
        supplierName.includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filter by status if any filter is active
    if (appliedFilters.length > 0) {
      if (!appliedFilters.includes(invoice.status as StatusFilter)) return false;
    }

    // Filter by date range based on selected date type
    if (dateFilterType === 'mes') {
      // Filter by month
      if (appliedSelectedMonth) {
        const [year, month] = appliedSelectedMonth.split('-');
        const monthStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const monthEnd = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const invoiceDate = new Date(invoice.date);
        if (invoiceDate < monthStart || invoiceDate > monthEnd) return false;
      }
    } else if (dateFilterType === 'fecha') {
      if (appliedStartDate && invoice.date < appliedStartDate) return false;
      if (appliedEndDate && invoice.date > appliedEndDate) return false;
    } else {
      // Filter by invoice due date
      if (appliedStartDate && (!invoice.due_date || invoice.due_date < appliedStartDate)) return false;
      if (appliedEndDate && (!invoice.due_date || invoice.due_date > appliedEndDate)) return false;
    }

    return true;
  }) || [];

  const exportToExcel = () => {
    const exportData = filteredInvoices.map(invoice => ({
      'Nro. Factura': invoice.invoice_number || '-',
      'Fecha': format(new Date(invoice.date), 'dd/MM/yyyy'),
      'Proveedor': invoice.supplier?.name || '-',
      'Tipo de Pago': invoice.payment_type || '-',
      'Estado': getStatusDisplay(invoice.status),
      'Fecha Vencimiento': invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-',
      'Total': invoice.total_amount || 0,
      'IGV': invoice.igv || 0,
      'Total a Pagar': invoice.total_a_pagar || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, `facturas_farmacia_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas de Farmacia</h1>
          <p className="text-muted-foreground">
            Gestiona y consulta las facturas de entradas
          </p>
        </div>
        <Button onClick={exportToExcel} disabled={filteredInvoices.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra las facturas por estado, fecha y búsqueda múltiple
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multi-search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Búsqueda múltiple</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de factura, proveedor, código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tempActiveFilters.includes('Pendiente') ? 'default' : 'outline'}
              onClick={() => toggleFilter('Pendiente')}
              className="h-9"
            >
              Pendientes
            </Button>
            <Button
              variant={tempActiveFilters.includes('Pagado') ? 'default' : 'outline'}
              onClick={() => toggleFilter('Pagado')}
              className="h-9"
            >
              Pagadas
            </Button>
            <Button
              variant={tempActiveFilters.includes('Parcial') ? 'default' : 'outline'}
              onClick={() => toggleFilter('Parcial')}
              className="h-9"
            >
              Parciales
            </Button>
            <Button
              variant={tempActiveFilters.includes('Cancelado') ? 'default' : 'outline'}
              onClick={() => toggleFilter('Cancelado')}
              className="h-9"
            >
              Canceladas
            </Button>
            <Button
              variant={tempActiveFilters.includes('Sin Factura') ? 'default' : 'outline'}
              onClick={() => toggleFilter('Sin Factura')}
              className="h-9"
            >
              Sin Factura
            </Button>
          </div>

          {/* Date Filter Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de filtro de fecha</label>
            <div className="flex gap-2">
              <Button
                variant={dateFilterType === 'mes' ? 'default' : 'outline'}
                onClick={() => setDateFilterType('mes')}
                className="h-9"
              >
                Por Mes
              </Button>
              <Button
                variant={dateFilterType === 'fecha' ? 'default' : 'outline'}
                onClick={() => setDateFilterType('fecha')}
                className="h-9"
              >
                Por Fecha
              </Button>
              <Button
                variant={dateFilterType === 'vencimiento' ? 'default' : 'outline'}
                onClick={() => setDateFilterType('vencimiento')}
                className="h-9"
              >
                Fecha de Vencimiento
              </Button>
            </div>
          </div>

          {/* Month Selector (only shown when dateFilterType === 'mes') */}
          {dateFilterType === 'mes' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Mes</label>
              <Input
                type="month"
                value={tempSelectedMonth}
                onChange={(e) => setTempSelectedMonth(e.target.value)}
              />
            </div>
          )}

          {/* Date Range Filters (only shown when dateFilterType !== 'mes') */}
          {dateFilterType !== 'mes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {dateFilterType === 'fecha' ? 'Fecha Inicio' : 'Vencimiento Inicio'}
                </label>
                <Input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {dateFilterType === 'fecha' ? 'Fecha Fin' : 'Vencimiento Fin'}
                </label>
                <Input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={applyFilters}
              className="h-9"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
            {(tempActiveFilters.length > 0 || tempStartDate || tempEndDate || tempSelectedMonth !== getCurrentMonth() || appliedFilters.length > 0 || appliedStartDate || appliedEndDate || appliedSelectedMonth !== getCurrentMonth() || searchTerm) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-9"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Facturas</CardTitle>
          <CardDescription>
            {filteredInvoices.length} facturas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo de Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">IGV</TableHead>
                  <TableHead className="text-right">Total a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Cargando facturas...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron facturas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{invoice.supplier?.name || '-'}</TableCell>
                      <TableCell>{invoice.payment_type || '-'}</TableCell>
                      <TableCell>
                        {(invoice.status === 'Pendiente' || invoice.status === 'Cancelado') ? (
                          <Select
                            value={invoice.status}
                            onValueChange={(newStatus) => handleToggleInvoiceStatus(invoice.invoice_number, invoice.status, newStatus)}
                            disabled={toggleInvoiceStatus.isPending}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendiente" className="text-yellow-600 font-semibold">
                                Pendiente
                              </SelectItem>
                              <SelectItem value="Cancelado" className="text-red-600 font-semibold">
                                Cancelado
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={getStatusColor(invoice.status)}>
                            {getStatusDisplay(invoice.status)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        S/. {(invoice.total_amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        S/. {(invoice.igv || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        S/. {(invoice.total_a_pagar || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, UserCheck, Calendar, FileText, Pill, Glasses, 
  AlertTriangle, Activity, ArrowRight, Package, DollarSign,
  Plus, Clock, TrendingUp, Receipt, Stethoscope, ClipboardList
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { Link, useNavigate } from "react-router-dom";

export function DashboardContent() {
  const navigate = useNavigate();
  const { 
    core, 
    pharmacy, 
    optics, 
    dailyMovements, 
    appointmentsByStatus,
    loading 
  } = useDashboardStats();

  const formatCurrency = (value: number) => 
    `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    { 
      label: "Nueva Cita", 
      icon: Calendar, 
      path: "/appointments",
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Agendar consulta"
    },
    { 
      label: "Nuevo Paciente", 
      icon: Users, 
      path: "/patients",
      color: "bg-green-500 hover:bg-green-600",
      description: "Registrar paciente"
    },
    { 
      label: "Historia Clínica", 
      icon: FileText, 
      path: "/medical-records",
      color: "bg-purple-500 hover:bg-purple-600",
      description: "Crear historia"
    },
    { 
      label: "Receta Médica", 
      icon: ClipboardList, 
      path: "/prescriptions",
      color: "bg-orange-500 hover:bg-orange-600",
      description: "Generar receta"
    },
  ];

  const systemModules = [
    { label: "Farmacia", icon: Pill, path: "/pharmacy", color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50" },
    { label: "Óptica", icon: Glasses, path: "/optics", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50" },
    { label: "Comprobantes", icon: Receipt, path: "/comprobantes", color: "text-amber-600", bgColor: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50" },
    { label: "Reportes", icon: TrendingUp, path: "/reports", color: "text-indigo-600", bgColor: "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50" },
    { label: "Cola de Atención", icon: Clock, path: "/attendance-queue", color: "text-cyan-600", bgColor: "bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50" },
    { label: "Configuración", icon: Activity, path: "/medical-center-config", color: "text-gray-600", bgColor: "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/30 dark:hover:bg-gray-800/50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard CESMED</h1>
          <p className="text-muted-foreground">Centro de Especialidades Médicas Latinoamericano</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleDateString("es-PE", { weekday: 'long', day: 'numeric', month: 'long' })}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Acceso Rápido
          </CardTitle>
          <CardDescription>Acciones frecuentes del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`h-auto py-4 flex flex-col items-center justify-center gap-2 text-white ${action.color} transition-all hover:scale-[1.02] active:scale-[0.98]`}
              >
                <action.icon className="h-6 w-6" />
                <span className="font-medium">{action.label}</span>
                <span className="text-xs opacity-80">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 border-l-primary group"
          onClick={() => navigate("/patients")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{core.totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Pacientes registrados
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 border-l-green-500 group"
          onClick={() => navigate("/specialists")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Especialistas Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{core.activeSpecialists}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Especialistas disponibles
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 border-l-blue-500 group"
          onClick={() => navigate("/appointments")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{core.todayAppointments}</div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600 font-medium">{core.completedAppointments} completadas</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-orange-500 font-medium">{core.todayAppointments - core.completedAppointments - core.cancelledAppointments} pendientes</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 border-l-orange-500 group"
          onClick={() => navigate("/prescriptions")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recetas Activas</CardTitle>
            <FileText className="h-4 w-4 text-orange-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{core.pendingPrescriptions}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Recetas pendientes
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Movements Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Actividad Últimos 7 Días
            </CardTitle>
            <CardDescription>Citas, recetas e historias médicas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyMovements}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Legend />
                <Bar dataKey="appointments" fill="hsl(217, 91%, 60%)" name="Citas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prescriptions" fill="hsl(142, 71%, 45%)" name="Recetas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="medicalRecords" fill="hsl(262, 83%, 58%)" name="Historias" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Status */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Estado de Citas Hoy
            </CardTitle>
            <CardDescription>Distribución por estado</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={appointmentsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-30" />
                <p>No hay citas programadas para hoy</p>
                <Button variant="link" onClick={() => navigate("/appointments")} className="mt-2">
                  Agendar cita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacy Stats */}
        <Card className="hover:shadow-lg transition-shadow overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500/10 to-green-500/5 border-b">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Pill className="h-5 w-5" />
              Farmacia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Link 
                to="/pharmacy/medications" 
                className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all hover:scale-[1.02] group"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Total Productos
                </div>
                <div className="text-2xl font-bold group-hover:text-primary transition-colors">{pharmacy.totalMedications}</div>
              </Link>
              
              <Link 
                to="/pharmacy/alerts" 
                className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Stock Bajo
                </div>
                <div className="text-2xl font-bold text-red-500">{pharmacy.lowStockMedications}</div>
              </Link>

              <Link 
                to="/pharmacy/alerts" 
                className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Por Vencer
                </div>
                <div className="text-2xl font-bold text-orange-500">{pharmacy.expiringMedications}</div>
              </Link>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valor Inventario
                </div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(pharmacy.totalInventoryValue)}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Entradas mes:</span>
                <span className="ml-2 font-semibold text-green-600">{formatCurrency(pharmacy.monthlyEntries)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Salidas mes:</span>
                <span className="ml-2 font-semibold text-blue-600">{formatCurrency(pharmacy.monthlyOutputs)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optics Stats */}
        <Card className="hover:shadow-lg transition-shadow overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Glasses className="h-5 w-5" />
              Óptica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Link 
                to="/optics/products" 
                className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-all hover:scale-[1.02] group"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Total Productos
                </div>
                <div className="text-2xl font-bold group-hover:text-primary transition-colors">{optics.totalProducts}</div>
              </Link>
              
              <Link 
                to="/optics/alerts" 
                className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Stock Bajo
                </div>
                <div className="text-2xl font-bold text-red-500">{optics.lowStockProducts}</div>
              </Link>

              <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valor Inventario
                </div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(optics.totalInventoryValue)}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Entradas mes:</span>
                <span className="ml-2 font-semibold text-green-600">{formatCurrency(optics.monthlyEntries)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Salidas mes:</span>
                <span className="ml-2 font-semibold text-blue-600">{formatCurrency(optics.monthlyOutputs)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Modules */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Módulos del Sistema
          </CardTitle>
          <CardDescription>Acceso directo a todos los módulos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {systemModules.map((module) => (
              <Button
                key={module.path}
                variant="ghost"
                onClick={() => navigate(module.path)}
                className={`h-20 flex flex-col items-center justify-center gap-2 ${module.bgColor} border transition-all hover:scale-[1.02]`}
              >
                <module.icon className={`h-6 w-6 ${module.color}`} />
                <span className="text-sm font-medium">{module.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
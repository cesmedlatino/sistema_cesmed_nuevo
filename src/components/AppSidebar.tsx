import React, { useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import {
  Home,
  Calendar,
  CalendarDays,
  FileText,
  Pill,
  Users,
  UserCheck,
  Activity,
  TrendingDown,
  Shield,
  Building,
  Settings,
  Clock,
  ChevronUp,
  LogOut,
  Puzzle,
  Glasses,
  Package,
  PenTool,
  CreditCard,
  ClipboardList,
  Receipt,
  CheckCircle2,
  Layers,
  BarChart3,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { userData, hasAccess, getRoleDisplayName, loading, refreshPermissions } = useUserPermissions();
  const { toast } = useToast();
  const [currentSystem, setCurrentSystem] = useState("Sistema Integral CESMED");
  const { open } = useSidebar();

  // Escuchar cambios en la configuración de menú
  React.useEffect(() => {
    const handleMenuConfigUpdate = () => {
      refreshPermissions();
    };

    window.addEventListener("menuConfigUpdated", handleMenuConfigUpdate);
    return () => {
      window.removeEventListener("menuConfigUpdated", handleMenuConfigUpdate);
    };
  }, [refreshPermissions]);

  const menuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      section: "dashboard",
    },
    {
      title: "Pacientes",
      url: "/patients",
      icon: Users,
      section: "patients",
    },
    {
      title: "Historias Clínicas",
      url: "/medical-records",
      icon: FileText,
      section: "medical-records",
    },
    {
      title: "Citas Médicas",
      url: "/appointments",
      icon: Calendar,
      section: "appointments",
    },
    {
      title: "Calendarización",
      url: "/calendarizacion",
      icon: CalendarDays,
      section: "calendarizacion",
    },
    {
      title: "Programaciones",
      url: "/programaciones",
      icon: Calendar,
      section: "programaciones",
    },
    {
      title: "Turnos de Atención",
      url: "/attendance-queue",
      icon: ClipboardList,
      section: "attendance-queue",
    },
    {
      title: "Registro de Atenciones",
      url: "/registro-atenciones",
      icon: CheckCircle2,
      section: "registro-atenciones",
    },
    {
      title: "Recetas",
      url: "/prescriptions",
      icon: Pill,
      section: "prescriptions",
    },
    {
      title: "Pagos",
      url: "/payments",
      icon: CreditCard,
      section: "payments",
    },
    {
      title: "Comprobantes",
      url: "/comprobantes",
      icon: Receipt,
      section: "comprobantes",
    },
    {
      title: "Egresos",
      url: "/expenses",
      icon: TrendingDown,
      section: "expenses",
    },
    {
      title: "Reportes",
      url: "/reports",
      icon: BarChart3,
      section: "reports",
    },
    {
      title: "Diseñador de Comprobantes",
      url: "/comprobante-designer",
      icon: PenTool,
      section: "comprobante-designer",
    },
    {
      title: "Especialistas",
      url: "/specialists",
      icon: UserCheck,
      section: "specialists",
    },
    {
      title: "Especialidades",
      url: "/medical-specialties",
      icon: Activity,
      section: "medical-specialties",
    },
    {
      title: "Personal",
      url: "/staff",
      icon: Users,
      section: "staff",
    },
    {
      title: "Usuarios",
      url: "/users",
      icon: Shield,
      section: "users",
    },
    {
      title: "Diseñador de Historias",
      url: "/medical-record-designer",
      icon: PenTool,
      section: "medical-record-designer",
    },
    {
      title: "Consultorios",
      url: "/consulting-rooms",
      icon: Building,
      section: "consulting-rooms",
    },
    {
      title: "Horarios",
      url: "/horarios",
      icon: Clock,
      section: "horarios",
    },
    {
      title: "Turnos",
      url: "/shifts",
      icon: Clock,
      section: "shifts",
    },
    {
      title: "Horario de Atención",
      url: "/opening-hours",
      icon: Calendar,
      section: "opening-hours",
    },
    {
      title: "Configuración",
      url: "/medical-center-config",
      icon: Settings,
      section: "medical-center-config",
    },
  ];

  // Filtrar elementos del menú según permisos
  const filteredMenuItems = menuItems.filter((item) => hasAccess(item.section));

  const handleSignOut = async () => {
    try {
      toast({
        title: "Cerrando Sesión",
        description: "Cerrando sesión...",
      });

      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Show success message regardless since signOut handles errors internally
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión correctamente.",
        variant: "default",
      });
    }
  };

  const handleSystemChange = (system: string) => {
    setCurrentSystem(system);
    toast({
      title: "Cambio de Sistema",
      description: `Cambiando a ${system}...`,
    });

    if (system === "Sistema de Farmacia") {
      window.location.href = "/pharmacy";
    } else if (system === "Sistema de Óptica") {
      window.location.href = "/optics";
    } else if (system === "Sistema de Suministros") {
      window.location.href = "/supplies";
    } else if (system === "Sistema de Kardex") {
      window.location.href = "/kardex";
    } else {
      window.location.href = "/";
    }
  };

  // Obtener las iniciales del usuario
  const getUserInitials = () => {
    if (userData?.personal) {
      const { nombres, apellidos } = userData.personal;
      return (nombres[0] + apellidos[0]).toUpperCase();
    }
    if (user?.email) {
      const email = user.email;
      const parts = email.split("@")[0].split(".");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const getUserName = () => {
    if (userData?.personal) {
      const { nombres, apellidos } = userData.personal;
      return `${nombres} ${apellidos}`;
    }
    return getUserInitials();
  };

  const getUserRole = () => {
    if (userData?.rol) {
      return getRoleDisplayName(userData.rol);
    }
    return "Usuario";
  };

  if (loading) {
    return (
      <Sidebar className="bg-gray-50 border-r" {...props}>
        <SidebarContent className="flex items-center justify-center">
          <div className="text-center">Cargando...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="bg-gray-50 border-r" {...props}>
      {open && (
        <SidebarHeader className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-center px-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-wider">
                <span className="text-purple-700">CES</span>
                <span className="text-green-600">MED</span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight px-2">
              {currentSystem === "Sistema de Farmacia"
                ? "Sistema de Control de Productos y Medicamentos"
                : currentSystem === "Sistema de Óptica"
                  ? "Sistema de Control Óptico"
                  : currentSystem === "Sistema de Suministros"
                    ? "Sistema de Control de Suministros"
                    : "Sistema Integral de Administración de Especialidades Médicas"}
            </p>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <nav className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center ${open ? "px-3" : "px-2 justify-center"} py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === item.url
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                title={!open ? item.title : undefined}
              >
                <Icon className={`h-5 w-5 ${open ? "mr-3" : ""}`} />
                {open && item.title}
              </Link>
            );
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter className="pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`w-full ${open ? "justify-between p-3" : "justify-center p-2"} h-auto`}
            >
              {open ? (
                <>
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                      <span className="text-sm font-medium truncate w-full">
                        {getUserName()} • {getUserRole()}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">{user?.email}</span>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getUserInitials()}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 mb-2" align="end" side="top">
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema Integral CESMED")}
              className="flex items-center space-x-3 p-3"
            >
              <Puzzle className="h-5 w-5" />
              <span>Sistema Integral CESMED</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Farmacia")}
              className="flex items-center space-x-3 p-3"
            >
              <Pill className="h-5 w-5" />
              <span>Sistema de Farmacia</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Óptica")}
              className="flex items-center space-x-3 p-3"
            >
              <Glasses className="h-5 w-5" />
              <span>Sistema de Óptica</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Suministros")}
              className="flex items-center space-x-3 p-3"
            >
              <Package className="h-5 w-5" />
              <span>Sistema de Suministros</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Kardex")}
              className="flex items-center space-x-3 p-3"
            >
              <Layers className="h-5 w-5 text-amber-600" />
              <span>Sistema de Kardex</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center space-x-3 p-3 text-red-600 focus:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

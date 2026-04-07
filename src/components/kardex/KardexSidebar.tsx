import React from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Pill,
  Glasses,
  Package,
  Settings,
  BarChart3,
  ChevronUp,
  LogOut,
  Puzzle,
  ClipboardList,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function KardexSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { open } = useSidebar();

  const kardexMenuItems = [
    {
      title: "Dashboard",
      url: "/kardex",
      icon: LayoutDashboard,
    },
    {
      title: "Kardex Consolidado",
      url: "/kardex/consolidado",
      icon: Layers,
    },
    {
      title: "Kardex Botica",
      url: "/kardex/botica",
      icon: Pill,
    },
    {
      title: "Kardex Óptica",
      url: "/kardex/optica",
      icon: Glasses,
    },
    {
      title: "Kardex Suministros",
      url: "/kardex/suministros",
      icon: Package,
    },
    {
      title: "Kardex Individual",
      url: "/kardex/individual",
      icon: FileSpreadsheet,
    },
    {
      title: "Reportes",
      url: "/kardex/reportes",
      icon: BarChart3,
    },
    {
      title: "Configuración",
      url: "/kardex/configuracion",
      icon: Settings,
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Sesión Cerrada",
        description: "Has cerrado sesión correctamente.",
        variant: "default",
      });
    }
  };

  const handleSystemChange = (system: string, url: string) => {
    toast({
      title: "Cambio de Sistema",
      description: `Cambiando a ${system}...`,
    });
    window.location.href = url;
  };

  const getUserInitials = () => {
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

  return (
    <Sidebar className="bg-amber-50 border-r border-amber-200" {...props}>
      {open && (
        <SidebarHeader className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-center px-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider break-words text-center">
                <span className="text-amber-700 text-lg sm:text-xl lg:text-2xl">KARDEX</span>
                <span className="text-blue-600 text-lg sm:text-xl lg:text-2xl">CESMED</span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight px-2">
              Sistema de Control de Existencias e Inventario
            </p>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <nav className="space-y-1">
          {kardexMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center ${open ? "px-3" : "px-2 justify-center"} py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === item.url
                    ? "bg-amber-100 text-amber-700"
                    : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
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
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                      <span className="text-sm font-medium truncate w-full">{getUserInitials()} • Kardex</span>
                      <span className="text-xs text-muted-foreground truncate w-full">{user?.email}</span>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getUserInitials()}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 mb-2" align="end" side="top">
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema Integral CESMED", "/")}
              className="flex items-center space-x-3 p-3"
            >
              <Puzzle className="h-5 w-5" />
              <span>Sistema Integral CESMED</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Farmacia", "/pharmacy")}
              className="flex items-center space-x-3 p-3"
            >
              <Pill className="h-5 w-5 text-green-600" />
              <span>Sistema de Farmacia</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Óptica", "/optics")}
              className="flex items-center space-x-3 p-3"
            >
              <Glasses className="h-5 w-5 text-purple-600" />
              <span>Sistema de Óptica</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleSystemChange("Sistema de Suministros", "/supplies")}
              className="flex items-center space-x-3 p-3"
            >
              <Package className="h-5 w-5 text-emerald-600" />
              <span>Sistema de Suministros</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center space-x-3 p-3 bg-amber-50">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <span className="text-amber-700 font-medium">Sistema de Kardex (Actual)</span>
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

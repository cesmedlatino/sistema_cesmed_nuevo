
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Glasses,
  Package,
  Settings,
  BarChart3,
  Truck,
  AlertTriangle,
  Home,
  ChevronUp,
  LogOut,
  Puzzle,
  Pill,
  Tag,
  PackageOpen,
  PackageMinus,
  Boxes,
  ClipboardList,
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

export function OpticsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const { open } = useSidebar();

  const opticsMenuItems = [
    {
      title: "Dashboard",
      url: "/optics",
      icon: Home,
    },
    {
      title: "Catálogo Óptica",
      url: "/optics/products",
      icon: Glasses,
    },
    {
      title: "Catálogo General",
      url: "/optics/catalogo-general",
      icon: ClipboardList,
    },
    {
      title: "Inventario",
      url: "/optics/inventory",
      icon: Package,
    },
    {
      title: "Entradas",
      url: "/optics/entries",
      icon: PackageOpen,
    },
    {
      title: "Salidas",
      url: "/optics/outputs",
      icon: PackageMinus,
    },
    {
      title: "Proveedores",
      url: "/optics/suppliers",
      icon: Truck,
    },
    {
      title: "Diseñador Etiquetas",
      url: "/optics/label-designer",
      icon: Tag,
    },
    {
      title: "Alertas",
      url: "/optics/alerts",
      icon: AlertTriangle,
    },
    {
      title: "Reportes",
      url: "/optics/reports",
      icon: BarChart3,
    },
    {
      title: "Configuración",
      url: "/optics/settings",
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
      console.error('Error al cerrar sesión:', error);
      // Even on error, clear the session locally
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
      const parts = email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  return (
    <Sidebar className="bg-blue-50 border-r border-blue-200" {...props}>
      {open && (
        <SidebarHeader className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-center px-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wider break-words text-center">
                <span className="text-blue-700">OPTIC</span>
                <span className="text-purple-600">MED</span>
              </h1>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-tight px-2">
              Sistema de Control de Monturas y Lunas Ópticas
            </p>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <nav className="space-y-1">
          {opticsMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center ${open ? 'px-3' : 'px-2 justify-center'} py-2 text-sm font-medium rounded-md transition-colors ${
                  location.pathname === item.url
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
                title={!open ? item.title : undefined}
              >
                <Icon className={`h-5 w-5 ${open ? 'mr-3' : ''}`} />
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
              className={`w-full ${open ? 'justify-between p-3' : 'justify-center p-2'} h-auto`}
            >
              {open ? (
                <>
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                      <span className="text-sm font-medium truncate w-full">
                        {getUserInitials()} • Óptico
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {user?.email}
                      </span>
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
          <DropdownMenuContent 
            className="w-64 mb-2" 
            align="end" 
            side="top"
          >
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
              <Pill className="h-5 w-5" />
              <span>Sistema de Farmacia</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center space-x-3 p-3 bg-blue-50"
            >
              <Glasses className="h-5 w-5 text-blue-600" />
              <span className="text-blue-700 font-medium">Sistema de Óptica (Actual)</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleSystemChange("Sistema de Suministros", "/supplies")}
              className="flex items-center space-x-3 p-3"
            >
              <Boxes className="h-5 w-5" />
              <span>Sistema de Suministros</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleSystemChange("Sistema de Kardex", "/kardex")}
              className="flex items-center space-x-3 p-3"
            >
              <ClipboardList className="h-5 w-5 text-amber-600" />
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

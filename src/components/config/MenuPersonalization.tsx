import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Save,
  User,
  Settings as SettingsIcon,
  Puzzle,
  Pill,
  Glasses,
  Package as PackageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMenuPersonalization } from "@/hooks/useMenuPersonalization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Usuario {
  id: string;
  auth_user_id: string;
  email: string;
  rol: string;
  activo: boolean;
  menu_config?: any;
  personal: {
    nombres: string;
    apellidos: string;
  };
}

interface MenuSection {
  id: string;
  title: string;
  section: string;
}

type SystemType = "cesmed" | "pharmacy" | "optics" | "supplies";

const SYSTEMS = [
  { id: "cesmed" as SystemType, name: "Sistema Integral CESMED", icon: Puzzle },
  { id: "pharmacy" as SystemType, name: "Sistema de Farmacia", icon: Pill },
  { id: "optics" as SystemType, name: "Sistema de Óptica", icon: Glasses },
  { id: "supplies" as SystemType, name: "Sistema de Suministros", icon: PackageIcon },
];

const CESMED_SECTIONS: MenuSection[] = [
  { id: "dashboard", title: "Dashboard", section: "dashboard" },
  { id: "patients", title: "Pacientes", section: "patients" },
  { id: "medical-records", title: "Historias Clínicas", section: "medical-records" },
  { id: "appointments", title: "Citas Médicas", section: "appointments" },
  { id: "calendarizacion", title: "Calendarización", section: "calendarizacion" },
  { id: "programaciones", title: "Programaciones", section: "programaciones" },
  { id: "attendance-queue", title: "Turnos de Atención", section: "attendance-queue" },
  { id: "registro-atenciones", title: "Registro de Atenciones", section: "registro-atenciones" },
  { id: "prescriptions", title: "Recetas", section: "prescriptions" },
  { id: "payments", title: "Pagos", section: "payments" },
  { id: "comprobantes", title: "Comprobantes", section: "comprobantes" },
  { id: "expenses", title: "Egresos", section: "expenses" },
  { id: "reports", title: "Reportes", section: "reports" },
  { id: "comprobante-designer", title: "Diseñador de Comprobantes", section: "comprobante-designer" },
  { id: "specialists", title: "Especialistas", section: "specialists" },
  { id: "medical-specialties", title: "Especialidades", section: "medical-specialties" },
  { id: "staff", title: "Personal", section: "staff" },
  { id: "users", title: "Usuarios", section: "users" },
  { id: "medical-record-designer", title: "Diseñador de Historias", section: "medical-record-designer" },
  { id: "consulting-rooms", title: "Consultorios", section: "consulting-rooms" },
  { id: "horarios", title: "Horarios", section: "horarios" },
  { id: "shifts", title: "Turnos", section: "shifts" },
  { id: "opening-hours", title: "Horario de Atención", section: "opening-hours" },
  { id: "medical-center-config", title: "Configuración", section: "medical-center-config" },
];

const PHARMACY_SECTIONS: MenuSection[] = [
  { id: "pharmacy-dashboard", title: "Dashboard", section: "pharmacy-dashboard" },
  { id: "pharmacy-medications", title: "Productos", section: "pharmacy-medications" },
  { id: "pharmacy-inventory", title: "Inventario", section: "pharmacy-inventory" },
  { id: "pharmacy-suppliers", title: "Proveedores", section: "pharmacy-suppliers" },
  { id: "pharmacy-invoices", title: "Facturas", section: "pharmacy-invoices" },
  { id: "pharmacy-alerts", title: "Alertas", section: "pharmacy-alerts" },
  { id: "pharmacy-reports", title: "Reportes", section: "pharmacy-reports" },
  { id: "pharmacy-settings", title: "Configuración", section: "pharmacy-settings" },
];

const OPTICS_SECTIONS: MenuSection[] = [
  { id: "optics-dashboard", title: "Dashboard", section: "optics-dashboard" },
  { id: "optics-frames", title: "Monturas", section: "optics-frames" },
  { id: "optics-lenses", title: "Lunas", section: "optics-lenses" },
  { id: "optics-inventory", title: "Inventario", section: "optics-inventory" },
  { id: "optics-suppliers", title: "Proveedores", section: "optics-suppliers" },
  { id: "optics-movements", title: "Movimientos", section: "optics-movements" },
  { id: "optics-alerts", title: "Alertas", section: "optics-alerts" },
  { id: "optics-reports", title: "Reportes", section: "optics-reports" },
  { id: "optics-settings", title: "Configuración", section: "optics-settings" },
];

const SUPPLIES_SECTIONS: MenuSection[] = [
  { id: "supplies-dashboard", title: "Dashboard", section: "supplies-dashboard" },
  { id: "supplies-products", title: "Productos", section: "supplies-products" },
  { id: "supplies-inventory", title: "Inventario", section: "supplies-inventory" },
  { id: "supplies-suppliers", title: "Proveedores", section: "supplies-suppliers" },
  { id: "supplies-orders", title: "Pedidos", section: "supplies-orders" },
  { id: "supplies-movements", title: "Movimientos", section: "supplies-movements" },
  { id: "supplies-reports", title: "Reportes", section: "supplies-reports" },
  { id: "supplies-settings", title: "Configuración", section: "supplies-settings" },
];

const SECTIONS_BY_SYSTEM: Record<SystemType, MenuSection[]> = {
  cesmed: CESMED_SECTIONS,
  pharmacy: PHARMACY_SECTIONS,
  optics: OPTICS_SECTIONS,
  supplies: SUPPLIES_SECTIONS,
};

export function MenuPersonalization() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<SystemType>("cesmed");
  const [selectedSections, setSelectedSections] = useState<Record<SystemType, string[]>>({
    cesmed: [],
    pharmacy: [],
    optics: [],
    supplies: [],
  });
  const { toast } = useToast();
  const { notifyMenuConfigUpdate } = useMenuPersonalization();

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const { data: usuariosData, error } = await supabase
        .from("usuario")
        .select(
          `
          id,
          email,
          rol,
          activo,
          menu_config,
          auth_user_id,
          personal:personal_id (
            nombres,
            apellidos
          )
        `,
        )
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsuarios(usuariosData || []);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la lista de usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (usuario: Usuario) => {
    setSelectedUser(usuario);

    // Cargar configuración actual del usuario
    const currentConfig = usuario.menu_config;
    if (currentConfig && currentConfig.systems) {
      // Nueva estructura con sistemas
      setSelectedSections(currentConfig.systems);
    } else if (currentConfig && currentConfig.sections) {
      // Migrar configuración antigua a nueva estructura
      setSelectedSections({
        cesmed: currentConfig.sections,
        pharmacy: [],
        optics: [],
        supplies: [],
      });
    } else {
      // Si no tiene configuración personalizada, usar configuración por defecto basada en rol
      const defaultSections = getDefaultSectionsByRole(usuario.rol);
      setSelectedSections(defaultSections);
    }
  };

  const getDefaultSectionsByRole = (rol: string): Record<SystemType, string[]> => {
    switch (rol) {
      case "administrador":
        return {
          cesmed: CESMED_SECTIONS.map((s) => s.section),
          pharmacy: PHARMACY_SECTIONS.map((s) => s.section),
          optics: OPTICS_SECTIONS.map((s) => s.section),
          supplies: SUPPLIES_SECTIONS.map((s) => s.section),
        };
      case "especialista":
        return {
          cesmed: ["dashboard", "patients", "medical-records", "appointments", "programaciones", "prescriptions"],
          pharmacy: [],
          optics: [],
          supplies: [],
        };
      case "asistente":
        return {
          cesmed: [
            "dashboard",
            "patients",
            "appointments",
            "programaciones",
            "attendance-queue",
            "payments",
            "comprobantes",
          ],
          pharmacy: ["pharmacy-dashboard", "pharmacy-medications", "pharmacy-inventory"],
          optics: ["optics-dashboard", "optics-frames", "optics-lenses", "optics-inventory"],
          supplies: ["supplies-dashboard", "supplies-products", "supplies-inventory"],
        };
      case "recepcionista":
        return {
          cesmed: [
            "dashboard",
            "patients",
            "appointments",
            "programaciones",
            "attendance-queue",
            "payments",
            "comprobantes",
          ],
          pharmacy: [],
          optics: [],
          supplies: [],
        };
      default:
        return {
          cesmed: ["dashboard"],
          pharmacy: [],
          optics: [],
          supplies: [],
        };
    }
  };

  const handleSectionToggle = (sectionId: string, checked: boolean) => {
    setSelectedSections((prev) => ({
      ...prev,
      [selectedSystem]: checked
        ? [...prev[selectedSystem], sectionId]
        : prev[selectedSystem].filter((id) => id !== sectionId),
    }));
  };

  const handleSaveConfiguration = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const menuConfig = {
        systems: selectedSections,
        all_access: false,
      };

      console.log("💾 Guardando configuración para usuario:", {
        userId: selectedUser.id,
        authUserId: selectedUser.auth_user_id,
        email: selectedUser.email,
        systems: selectedSections,
      });

      const { data, error } = await supabase.rpc("update_user_menu_config", {
        user_auth_id: selectedUser.auth_user_id,
        new_menu_config: menuConfig,
      });

      if (error) {
        console.error("❌ Error en RPC:", error);
        throw error;
      }

      console.log("✅ Respuesta de RPC:", data);

      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || "Error desconocido");
      }

      // Verificar que se guardó consultando la base de datos
      const { data: updatedUser, error: fetchError } = await supabase
        .from("usuario")
        .select("menu_config")
        .eq("id", selectedUser.id)
        .single();

      if (!fetchError) {
        console.log("✅ Configuración verificada en BD:", updatedUser.menu_config);
      }

      toast({
        title: "Configuración Guardada",
        description: `La configuración de menú para ${selectedUser.personal.nombres} ${selectedUser.personal.apellidos} se ha actualizado correctamente.`,
      });

      // Actualizar la lista de usuarios
      await fetchUsuarios();

      // Notificar que la configuración de menú se ha actualizado
      await notifyMenuConfigUpdate();
    } catch (error: any) {
      console.error("❌ Error completo:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.personal.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.personal.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case "administrador":
        return "bg-red-100 text-red-800";
      case "especialista":
        return "bg-blue-100 text-blue-800";
      case "asistente":
        return "bg-green-100 text-green-800";
      case "recepcionista":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card className="border-teal-200">
        <CardContent className="p-6">
          <div className="text-center">Cargando usuarios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50">
          <CardTitle className="text-teal-800 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Personalización de Menú por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Usuarios */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Usuario</h3>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-teal-200 focus:border-teal-500"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    onClick={() => handleUserSelect(usuario)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?.id === usuario.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {usuario.personal.nombres} {usuario.personal.apellidos}
                        </p>
                        <p className="text-sm text-gray-600">{usuario.email}</p>
                      </div>
                      <Badge className={getRoleBadgeColor(usuario.rol)}>{usuario.rol}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuración de Secciones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuración de Menús
                  {selectedUser && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      para {selectedUser.personal.nombres} {selectedUser.personal.apellidos}
                    </span>
                  )}
                </h3>
              </div>

              {selectedUser ? (
                <>
                  <Tabs
                    value={selectedSystem}
                    onValueChange={(value) => setSelectedSystem(value as SystemType)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                      {SYSTEMS.map((system) => {
                        const Icon = system.icon;
                        return (
                          <TabsTrigger key={system.id} value={system.id} className="flex items-center gap-1">
                            <Icon className="h-4 w-4" />
                            <span className="hidden md:inline">{system.name.split(" ")[2]}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {SYSTEMS.map((system) => (
                      <TabsContent key={system.id} value={system.id}>
                        <div className="space-y-3 max-h-96 overflow-y-auto p-4 border border-gray-200 rounded-lg">
                          {SECTIONS_BY_SYSTEM[system.id].map((section) => (
                            <div key={section.id} className="flex items-center space-x-3">
                              <Checkbox
                                id={`${system.id}-${section.id}`}
                                checked={selectedSections[system.id].includes(section.section)}
                                onCheckedChange={(checked) => handleSectionToggle(section.section, checked as boolean)}
                              />
                              <label
                                htmlFor={`${system.id}-${section.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {section.title}
                              </label>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <Button
                    onClick={handleSaveConfiguration}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar Configuración de Todos los Sistemas"}
                  </Button>
                </>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Selecciona un usuario para configurar sus menús</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

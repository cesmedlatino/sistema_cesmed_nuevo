import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Users, UserCheck, Calendar, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthWrapper } from "@/components/auth/AuthWrapper";

// Import modules
import { Patients } from "@/components/modules/Patients";
import { Specialists } from "@/components/modules/Specialists";
import { Appointments } from "@/components/modules/Appointments";
import { Prescriptions } from "@/components/modules/Prescriptions";
import { MedicalRecords } from "@/components/modules/MedicalRecords";
import { ConsultingRooms } from "@/components/modules/ConsultingRooms";
import { MedicalSpecialties } from "@/components/modules/MedicalSpecialties";
import { OpeningHours } from "@/components/modules/OpeningHours";
import { MedicalCenterConfig } from "@/components/modules/MedicalCenterConfig";
import { Shifts } from "@/components/modules/Shifts";
import { Staff } from "@/components/modules/Staff";
import { UsersManagement } from "@/components/modules/Users";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

const Index = () => {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión.",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Menu },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "specialists", label: "Especialistas", icon: UserCheck },
    { id: "staff", label: "Personal", icon: Users },
    { id: "users", label: "Usuarios", icon: UserCheck },
    { id: "appointments", label: "Citas Médicas", icon: Calendar },
    { id: "medical-records", label: "Historias Médicas", icon: FileText },
    { id: "prescriptions", label: "Recetas", icon: FileText },
    { id: "consulting-rooms", label: "Consultorios", icon: Menu },
    { id: "specialties", label: "Especialidades", icon: Menu },
    { id: "shifts", label: "Turnos", icon: Calendar },
    { id: "opening-hours", label: "Horarios", icon: Calendar },
    { id: "clinic-config", label: "Configuración", icon: Menu },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case "patients":
        return <Patients />;
      case "specialists":
        return <Specialists />;
      case "staff":
        return <Staff />;
      case "users":
        return <UsersManagement />;
      case "appointments":
        return <Appointments />;
      case "medical-records":
        return <MedicalRecords />;
      case "prescriptions":
        return <Prescriptions />;
      case "consulting-rooms":
        return <ConsultingRooms />;
      case "specialties":
        return <MedicalSpecialties />;
      case "shifts":
        return <Shifts />;
      case "opening-hours":
        return <OpeningHours />;
      case "clinic-config":
        return <MedicalCenterConfig />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex items-center justify-between h-16 px-6 border-b bg-primary">
            <h2 className="text-lg font-semibold text-primary-foreground">CESMED</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-primary-foreground hover:text-primary-foreground/80"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-6 px-3">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeModule === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="absolute bottom-0 w-full p-4 border-t">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          {/* Top bar */}
          <div className="bg-card shadow-sm border-b h-16 flex items-center justify-between px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Sistema CESMED</span>
            </div>
          </div>

          {/* Page content */}
          <main className="p-6">
            {renderContent()}
          </main>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </AuthWrapper>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Building2, Save, Settings, CreditCard, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { MenuPersonalization } from "@/components/config/MenuPersonalization";
import { PaymentsConfig } from "@/components/config/PaymentsConfig";
import { TemplateCorrelativesConfig } from "@/components/config/TemplateCorrelativesConfig";
import { defaultClinicData, ClinicData } from "@/hooks/useClinicData";

export function MedicalCenterConfig() {
  const { toast } = useToast();
  const { userData } = useUserPermissions();
  
  const isAdmin = userData?.rol === 'administrador';
  const [formData, setFormData] = useState<ClinicData>(defaultClinicData);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    const savedData = localStorage.getItem('clinicData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData({ ...defaultClinicData, ...parsed });
      } catch (error) {
        console.error('Error parsing clinic data:', error);
        setFormData(defaultClinicData);
      }
    }
    setIsLoading(false);
  }, []);

  const handleInputChange = (field: keyof ClinicData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guardar en localStorage para uso global
    localStorage.setItem('clinicData', JSON.stringify(formData));
    
    toast({
      title: "Configuración Guardada",
      description: "La configuración del centro médico se ha actualizado correctamente.",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>

      <Tabs defaultValue="clinic" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="clinic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centro Médico
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="correlatives" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Correlativos
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Menú
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clinic">
          <Card className="border-teal-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50">
              <CardTitle className="text-teal-800">Información del Centro</CardTitle>
            </CardHeader>
            <CardContent className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="logo" className="text-teal-700 font-medium">Logo (Recomendado: 100x100px)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {formData.logo && (
                        <img 
                          src={formData.logo} 
                          alt="Logo" 
                          className="w-20 h-20 object-cover rounded-lg border-2 border-teal-200"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('logo')?.click()}
                          className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Subir Logo
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-teal-700 font-medium">Nombre del Centro *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ruc" className="text-teal-700 font-medium">RUC *</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc}
                      onChange={(e) => handleInputChange('ruc', e.target.value)}
                      required
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address" className="text-teal-700 font-medium">Dirección *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      required
                      rows={3}
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-teal-700 font-medium">Sitio Web</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-teal-700 font-medium">Correo Electrónico *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-teal-700 font-medium">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                      className="border-teal-200 focus:border-teal-500"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Configuración
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsConfig />
        </TabsContent>

        <TabsContent value="correlatives">
          <TemplateCorrelativesConfig />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="menu">
            <MenuPersonalization />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

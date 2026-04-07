
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

export function ClinicSetup() {
  const [clinicExists, setClinicExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('CESMED LATINOAMERICANO');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkClinicExists();
  }, []);

  const checkClinicExists = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      setClinicExists(data && data.length > 0);
    } catch (error: any) {
      console.error('Error checking clinic:', error);
    } finally {
      setLoading(false);
    }
  };

  const createClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clinics')
        .insert([{
          name,
          address,
          phone,
          email
        }]);

      if (error) throw error;

      toast({
        title: "Clínica creada",
        description: "La clínica se ha configurado exitosamente",
      });
      
      setClinicExists(true);
    } catch (error: any) {
      console.error('Error creating clinic:', error);
      toast({
        title: "Error al crear clínica",
        description: error.message || "No se pudo crear la clínica",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (clinicExists) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle>Configuración inicial</CardTitle>
          <p className="text-gray-600">Configura los datos básicos de tu clínica</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={createClinic} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la clínica</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección de la clínica"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@clinica.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Crear clínica"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Stethoscope } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();

  // Estados para recuperar contraseña
  const [recoveryEmail, setRecoveryEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting login with:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful');
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente.",
      });
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas. Verifica tu email y contraseña.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      toast({
        title: "Correo enviado",
        description: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
      });
      
      // Limpiar formulario y volver al login
      setRecoveryEmail("");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error al enviar correo",
        description: error.message || "No se pudo enviar el correo de recuperación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setRecoveryEmail("");
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5c1c8c 0%, #7cc444 100%)" }}>
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-gradient-to-r from-purple-600 to-green-500 p-3 rounded-full w-16 h-16 flex items-center justify-center">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Recuperar Contraseña
            </CardTitle>
            <p className="text-gray-600">Te enviaremos un enlace de recuperación a tu correo</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recoveryEmail" className="text-gray-700 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  className="border-gray-300 focus:border-purple-500"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-purple-600 hover:text-purple-800 text-sm underline"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5c1c8c 0%, #7cc444 100%)" }}>
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-r from-purple-600 to-green-500 p-3 rounded-full w-16 h-16 flex items-center justify-center">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Sistema CESMED
          </CardTitle>
          <p className="text-gray-600">Ingresa tus credenciales para acceder</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
                className="border-gray-300 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-gray-300 focus:border-purple-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
            
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-purple-600 hover:text-purple-800 text-sm underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

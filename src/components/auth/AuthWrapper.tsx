
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "./LoginForm";
import { ClinicSetup } from "../clinic/ClinicSetup";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { session, loading, user } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show login form if no session or user
  if (!session || !user) {
    console.log('No session/user found, showing login form');
    return <LoginForm />;
  }

  // Show protected content
  console.log('Session found, showing protected content');
  return (
    <>
      <ClinicSetup />
      {children}
    </>
  );
}

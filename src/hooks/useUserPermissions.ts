
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserData {
  rol: string;
  email: string;
  personal: {
    nombres: string;
    apellidos: string;
  };
}

interface UserPermissions {
  all_access?: boolean;
  sections?: string[]; // Estructura antigua (para compatibilidad)
  systems?: {
    cesmed?: string[];
    pharmacy?: string[];
    optics?: string[];
    supplies?: string[];
  };
}

export function useUserPermissions() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        // Obtener datos del usuario desde la tabla usuario
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuario')
          .select(`
            rol,
            email,
            personal:personal_id (
              nombres,
              apellidos
            )
          `)
          .eq('auth_user_id', user.id)
          .single();

        if (usuarioError) {
          console.error('Error fetching user data:', usuarioError);
          setLoading(false);
          return;
        }

        setUserData(usuarioData);

        // Obtener permisos del usuario usando la nueva función de configuración de menú
        const { data: menuConfigData, error: menuConfigError } = await supabase
          .rpc('get_user_menu_config', { user_auth_id: user.id });

        if (menuConfigError) {
          console.error('Error fetching menu config:', menuConfigError);
          // Fallback a permisos por defecto del rol
          const { data: permissionsData, error: permissionsError } = await supabase
            .rpc('get_user_permissions', { user_id: user.id });
          
          if (!permissionsError) {
            const userPermissions = permissionsData as UserPermissions;
            setPermissions(userPermissions || {});
          }
        } else {
          // Usar configuración de menú personalizada
          const menuConfig = menuConfigData as UserPermissions;
          setPermissions(menuConfig || {});
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const hasAccess = (section: string, system: 'cesmed' | 'pharmacy' | 'optics' | 'supplies' = 'cesmed') => {
    if (permissions.all_access) return true;
    
    // El diseñador de historias clínicas solo está disponible para administradores
    if (section === 'medical-record-designer') {
      return userData?.rol === 'administrador';
    }
    
    // Nueva estructura con sistemas
    if (permissions.systems) {
      return permissions.systems[system]?.includes(section) || false;
    }
    
    // Fallback a estructura antigua para compatibilidad
    return permissions.sections?.includes(section) || false;
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'administrador': 'Administrador',
      'especialista': 'Especialista',
      'asistente': 'Asistente',
      'recepcionista': 'Recepcionista'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const refreshPermissions = async () => {
    if (!user) return;
    
    try {
      const { data: menuConfigData, error: menuConfigError } = await supabase
        .rpc('get_user_menu_config', { user_auth_id: user.id });

      if (!menuConfigError) {
        const menuConfig = menuConfigData as UserPermissions;
        setPermissions(menuConfig || {});
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  };

  return {
    userData,
    permissions,
    loading,
    hasAccess,
    getRoleDisplayName,
    refreshPermissions
  };
}

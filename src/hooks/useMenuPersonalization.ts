import { useCallback } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export function useMenuPersonalization() {
  const { refreshPermissions } = useUserPermissions();

  const notifyMenuConfigUpdate = useCallback(async () => {
    // Refrescar permisos del usuario actual
    await refreshPermissions();
    
    // Enviar evento personalizado para notificar a otros componentes
    window.dispatchEvent(new CustomEvent('menuConfigUpdated'));
  }, [refreshPermissions]);

  return {
    notifyMenuConfigUpdate
  };
}
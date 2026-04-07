
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PharmacyAlert {
  medication_id: string;
  commercial_name: string;
  alert_type: string;
  current_stock: number;
  min_stock_level: number;
  expiration_date: string;
  days_to_expiry: number;
}

interface PharmacyConfig {
  lowStockPercentage: number;
  expiryAlertValue: number;
  expiryAlertUnit: 'days' | 'months' | 'years';
}

const DEFAULT_CONFIG: PharmacyConfig = {
  lowStockPercentage: 50,
  expiryAlertValue: 1,
  expiryAlertUnit: 'months',
};

const getConfig = (): PharmacyConfig => {
  const stored = localStorage.getItem('pharmacy-config');
  if (!stored) return DEFAULT_CONFIG;
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_CONFIG;
  }
};

const getDaysFromConfig = (value: number, unit: string): number => {
  switch (unit) {
    case 'days':
      return value;
    case 'months':
      return value * 30;
    case 'years':
      return value * 365;
    default:
      return value;
  }
};

export const usePharmacyAlerts = () => {
  return useQuery({
    queryKey: ["pharmacy-alerts"],
    queryFn: async () => {
      const config = getConfig();
      
      // Obtener todos los medicamentos activos
      const { data: medications, error } = await supabase
        .from("pharmacy_medications")
        .select("*")
        .eq("status", "Activo");

      if (error) throw error;
      if (!medications) return [];

      const alerts: PharmacyAlert[] = [];
      const today = new Date();

      medications.forEach((med) => {
        // Alerta de stock bajo
        const threshold = (config.lowStockPercentage / 100) * (med.min_stock_level || 0);
        if (med.stock_actual < threshold) {
          alerts.push({
            medication_id: med.id,
            commercial_name: med.descripcion,
            alert_type: 'low_stock',
            current_stock: med.stock_actual,
            min_stock_level: med.min_stock_level || 0,
            expiration_date: med.fecha_vencimiento || '',
            days_to_expiry: 0,
          });
        }

        // Alerta de próximo a vencer
        if (med.fecha_vencimiento) {
          const expiryDate = new Date(med.fecha_vencimiento);
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const configDays = getDaysFromConfig(config.expiryAlertValue, config.expiryAlertUnit);

          if (diffDays > 0 && diffDays <= configDays) {
            alerts.push({
              medication_id: med.id,
              commercial_name: med.descripcion,
              alert_type: 'near_expiry',
              current_stock: med.stock_actual,
              min_stock_level: med.min_stock_level || 0,
              expiration_date: med.fecha_vencimiento,
              days_to_expiry: diffDays,
            });
          }
        }
      });

      return alerts;
    },
  });
};

export const usePharmacyStats = () => {
  return useQuery({
    queryKey: ["pharmacy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pharmacy_stats");
      if (error) throw error;
      return data[0];
    },
  });
};

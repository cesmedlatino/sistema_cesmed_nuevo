import { useState, useEffect } from "react";

interface ClinicData {
  name: string;
  address: string;
  ruc: string;
  website: string;
  email: string;
  phone: string;
  logo?: string;
}

const defaultClinicData: ClinicData = {
  name: "CESMED LATINOAMERICANO",
  address: "Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa",
  ruc: "20607644315",
  website: "www.cesmedlatinoamericano.com",
  email: "info@cesmedlatinoamericano.com",
  phone: "054-407301 | Cel: 959029377",
};

export function useClinicData() {
  const [clinicData, setClinicData] = useState<ClinicData>(defaultClinicData);

  useEffect(() => {
    const savedData = localStorage.getItem('clinicData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setClinicData({ ...defaultClinicData, ...parsed });
      } catch (error) {
        console.error('Error parsing clinic data:', error);
        setClinicData(defaultClinicData);
      }
    }
  }, []);

  return clinicData;
}

export { defaultClinicData };
export type { ClinicData };

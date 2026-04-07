import { useEffect, useState } from 'react';

export function useFieldMapping(section: any) {
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    // Método de corrección
    'metodo_correccion_od': '',
    'metodo_correccion_oi': '',
    
    // Lensometría/Lentes
    'lensometria_od': '',
    'lensometria_oi': '',
    
    // Aberrómetro OSIRIS
    'aberrometro_osiris_od': '',
    'aberrometro_osiris_oi': '',
    
    // Refracción Manifiesta
    'ref_manifiesta_od': '',
    'ref_manifiesta_oi': '',
    
    // DIP - CDVA
    'dip_cdva_od': '',
    'dip_cdva_oi': '',
    
    // Refracción con Ciclopejia
    'ref_ciclopejia_od': '',
    'ref_ciclopejia_oi': '',
    
    // Queratometría
    'queratometria_od': '',
    'queratometria_oi': '',
    
    // Flat K
    'flat_k_od': '',
    'flat_k_oi': '',
    
    // Steep K
    'steep_k_od': '',
    'steep_k_oi': '',
    
    // Diámetro Pupilar (escotópica)
    'diametro_pupilar_od': '',
    'diametro_pupilar_oi': '',
    
    // Ángulo kappa
    'angulo_kappa_od': '',
    'angulo_kappa_oi': '',
    
    // CCT (µm)
    'cct_od': '',
    'cct_oi': '',
    
    // Z 4.0
    'z40_od': '',
    'z40_oi': '',
    
    // W–W
    'ww_od': '',
    'ww_oi': '',
    
    // Anillo de Vacío
    'anillo_vacio_od': '',
    'anillo_vacio_oi': '',
    
    // Refracción Final
    'ref_final_od': '',
    'ref_final_oi': ''
  });

  useEffect(() => {
    if (section?.fields) {
      const newFieldMapping = { ...fieldMapping };
      
      section.fields.forEach((field: any) => {
        const fieldName = field.name.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
        
        // Mapear método de corrección
        if (fieldName.includes('metodo') && fieldName.includes('correccion')) {
          if (fieldName.includes('od')) {
            newFieldMapping['metodo_correccion_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['metodo_correccion_oi'] = field.id;
          }
        }
        
        // Mapear lensometría/lentes
        if (fieldName.includes('lensometria') || fieldName.includes('lentes')) {
          if (fieldName.includes('od')) {
            newFieldMapping['lensometria_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['lensometria_oi'] = field.id;
          }
        }
        
        // Mapear aberrómetro OSIRIS
        if (fieldName.includes('aberrometro') || fieldName.includes('osiris')) {
          if (fieldName.includes('od')) {
            newFieldMapping['aberrometro_osiris_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['aberrometro_osiris_oi'] = field.id;
          }
        }
        
        // Mapear refracción manifiesta
        if (fieldName.includes('refraccion') && fieldName.includes('manifiesta')) {
          if (fieldName.includes('od')) {
            newFieldMapping['ref_manifiesta_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['ref_manifiesta_oi'] = field.id;
          }
        }
        
        // Mapear DIP - CDVA
        if (fieldName.includes('dip') && fieldName.includes('cdva')) {
          if (fieldName.includes('od')) {
            newFieldMapping['dip_cdva_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['dip_cdva_oi'] = field.id;
          }
        }
        
        // Mapear refracción con ciclopejia
        if (fieldName.includes('refraccion') && fieldName.includes('ciclopejia')) {
          if (fieldName.includes('od')) {
            newFieldMapping['ref_ciclopejia_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['ref_ciclopejia_oi'] = field.id;
          }
        }
        
        // Mapear queratometría
        if (fieldName.includes('queratometria') || fieldName.includes('keratometria')) {
          if (fieldName.includes('od')) {
            newFieldMapping['queratometria_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['queratometria_oi'] = field.id;
          }
        }
        
        // Mapear Flat K
        if (fieldName.includes('flat') && fieldName.includes('k')) {
          if (fieldName.includes('od')) {
            newFieldMapping['flat_k_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['flat_k_oi'] = field.id;
          }
        }
        
        // Mapear Steep K
        if (fieldName.includes('steep') && fieldName.includes('k')) {
          if (fieldName.includes('od')) {
            newFieldMapping['steep_k_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['steep_k_oi'] = field.id;
          }
        }
        
        // Mapear diámetro pupilar
        if (fieldName.includes('diametro') && fieldName.includes('pupilar')) {
          if (fieldName.includes('od')) {
            newFieldMapping['diametro_pupilar_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['diametro_pupilar_oi'] = field.id;
          }
        }
        
        // Mapear ángulo kappa
        if (fieldName.includes('angulo') && fieldName.includes('kappa')) {
          if (fieldName.includes('od')) {
            newFieldMapping['angulo_kappa_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['angulo_kappa_oi'] = field.id;
          }
        }
        
        // Mapear CCT
        if (fieldName.includes('cct')) {
          if (fieldName.includes('od')) {
            newFieldMapping['cct_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['cct_oi'] = field.id;
          }
        }
        
        // Mapear Z 4.0
        if (fieldName.includes('z') && fieldName.includes('4')) {
          if (fieldName.includes('od')) {
            newFieldMapping['z40_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['z40_oi'] = field.id;
          }
        }
        
        // Mapear W–W
        if (fieldName.includes('w') && fieldName.includes('w')) {
          if (fieldName.includes('od')) {
            newFieldMapping['ww_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['ww_oi'] = field.id;
          }
        }
        
        // Mapear anillo de vacío
        if (fieldName.includes('anillo') && fieldName.includes('vacio')) {
          if (fieldName.includes('od')) {
            newFieldMapping['anillo_vacio_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['anillo_vacio_oi'] = field.id;
          }
        }
        
        // Mapear refracción final
        if (fieldName.includes('refraccion') && fieldName.includes('final')) {
          if (fieldName.includes('od')) {
            newFieldMapping['ref_final_od'] = field.id;
          } else if (fieldName.includes('oi')) {
            newFieldMapping['ref_final_oi'] = field.id;
          }
        }
      });
      
      setFieldMapping(newFieldMapping);
    }
  }, [section]);

  return fieldMapping;
}
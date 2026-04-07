export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          checked_in_at: string | null
          clinic_id: string | null
          consulting_room_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          estado_cuenta: string | null
          id: string
          notes: string | null
          patient_id: string | null
          payment_confirmed: boolean | null
          payment_id: string | null
          queue_position: number | null
          reason: string | null
          specialist_id: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          checked_in_at?: string | null
          clinic_id?: string | null
          consulting_room_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          estado_cuenta?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_confirmed?: boolean | null
          payment_id?: string | null
          queue_position?: number | null
          reason?: string | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          checked_in_at?: string | null
          clinic_id?: string | null
          consulting_room_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          estado_cuenta?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_confirmed?: boolean | null
          payment_id?: string | null
          queue_position?: number | null
          reason?: string | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_consulting_room_id_fkey"
            columns: ["consulting_room_id"]
            isOneToOne: false
            referencedRelation: "consulting_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      attention_records: {
        Row: {
          attention_date: string
          created_at: string
          created_by: string | null
          id: string
          medical_record_id: string
          notes: string | null
          patient_id: string
          prescription_id: string | null
          specialist_id: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attention_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id: string
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attention_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id?: string
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attention_records_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_records_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attention_records_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_general: {
        Row: {
          catalogo: string
          clasificacion: string | null
          codigo: string
          created_at: string
          created_by: string | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string
          observacion: string | null
          precio_venta: number | null
          serie: string | null
          status: string
          stock_actual: number
          ubicacion: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          catalogo?: string
          clasificacion?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          observacion?: string | null
          precio_venta?: number | null
          serie?: string | null
          status?: string
          stock_actual?: number
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          catalogo?: string
          clasificacion?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          observacion?: string | null
          precio_venta?: number | null
          serie?: string | null
          status?: string
          stock_actual?: number
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comprobante_config: {
        Row: {
          address_line1: string
          address_line2: string
          address_line3: string
          company_legal_name: string
          company_name_line1: string
          company_name_line2: string
          correlative_current: number
          correlative_prefix: string
          correlative_zeros: number
          created_at: string
          created_by: string | null
          currency_symbol: string
          default_printer: string
          document_title: string
          font_family: string
          font_size: number
          footer_line1: string
          footer_line2: string
          footer_line3: string
          id: string
          igv_rate: number
          line_height: string
          margin_bottom: number
          margin_left: number
          margin_right: number
          margin_top: number
          paper_height: number
          paper_width: number
          phone: string
          ruc: string
          show_igv: boolean
          updated_at: string
          updated_by: string | null
          whatsapp: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string
          address_line3?: string
          company_legal_name?: string
          company_name_line1?: string
          company_name_line2?: string
          correlative_current?: number
          correlative_prefix?: string
          correlative_zeros?: number
          created_at?: string
          created_by?: string | null
          currency_symbol?: string
          default_printer?: string
          document_title?: string
          font_family?: string
          font_size?: number
          footer_line1?: string
          footer_line2?: string
          footer_line3?: string
          id?: string
          igv_rate?: number
          line_height?: string
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          margin_top?: number
          paper_height?: number
          paper_width?: number
          phone?: string
          ruc?: string
          show_igv?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string
          address_line3?: string
          company_legal_name?: string
          company_name_line1?: string
          company_name_line2?: string
          correlative_current?: number
          correlative_prefix?: string
          correlative_zeros?: number
          created_at?: string
          created_by?: string | null
          currency_symbol?: string
          default_printer?: string
          document_title?: string
          font_family?: string
          font_size?: number
          footer_line1?: string
          footer_line2?: string
          footer_line3?: string
          id?: string
          igv_rate?: number
          line_height?: string
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          margin_top?: number
          paper_height?: number
          paper_width?: number
          phone?: string
          ruc?: string
          show_igv?: boolean
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      concepto: {
        Row: {
          activo: boolean | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          especialidad_id: string | null
          id: string
          monto: number
          nombre: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          id?: string
          monto: number
          nombre: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          especialidad_id?: string | null
          id?: string
          monto?: number
          nombre?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepto_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "medical_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      consolidado_salidas: {
        Row: {
          created_at: string
          created_by: string | null
          estado: string
          estado_documento: string
          fecha_emision: string
          forma_pago: string
          id: string
          igv: number
          importe_total: number
          nro_comprobante: string
          observaciones: string | null
          patient_id: string | null
          subtotal: number
          tipo_documento: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: string
          estado_documento?: string
          fecha_emision?: string
          forma_pago?: string
          id?: string
          igv?: number
          importe_total?: number
          nro_comprobante: string
          observaciones?: string | null
          patient_id?: string | null
          subtotal?: number
          tipo_documento?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: string
          estado_documento?: string
          fecha_emision?: string
          forma_pago?: string
          id?: string
          igv?: number
          importe_total?: number
          nro_comprobante?: string
          observaciones?: string | null
          patient_id?: string | null
          subtotal?: number
          tipo_documento?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consolidado_salidas_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consulting_rooms: {
        Row: {
          capacity: number | null
          clinic_id: string | null
          created_at: string
          created_by: string | null
          equipment: string[] | null
          floor: string | null
          id: string
          name: string
          status: string | null
          updated_by: string | null
        }
        Insert: {
          capacity?: number | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment?: string[] | null
          floor?: string | null
          id?: string
          name: string
          status?: string | null
          updated_by?: string | null
        }
        Update: {
          capacity?: number | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          equipment?: string[] | null
          floor?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consulting_rooms_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_de_pago: {
        Row: {
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_razon_social: string | null
          cliente_ruc: string | null
          cliente_telefono: string | null
          condicion_pago: string | null
          correlativo: string | null
          created_at: string
          created_by: string | null
          estado: string | null
          estado_documento: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          forma_pago: string | null
          id: string
          igv: number | null
          importe_total: number
          numero_documento: string
          observaciones: string | null
          patient_id: string
          serie: string | null
          subtotal: number | null
          tipo_documento: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_razon_social?: string | null
          cliente_ruc?: string | null
          cliente_telefono?: string | null
          condicion_pago?: string | null
          correlativo?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          estado_documento?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          forma_pago?: string | null
          id?: string
          igv?: number | null
          importe_total: number
          numero_documento: string
          observaciones?: string | null
          patient_id: string
          serie?: string | null
          subtotal?: number | null
          tipo_documento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_razon_social?: string | null
          cliente_ruc?: string | null
          cliente_telefono?: string | null
          condicion_pago?: string | null
          correlativo?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string | null
          estado_documento?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          forma_pago?: string | null
          id?: string
          igv?: number | null
          importe_total?: number
          numero_documento?: string
          observaciones?: string | null
          patient_id?: string
          serie?: string | null
          subtotal?: number | null
          tipo_documento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_de_pago_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      egreso_categorias: {
        Row: {
          activo: boolean | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      egreso_conceptos: {
        Row: {
          activo: boolean | null
          categoria_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egreso_conceptos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "egreso_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      egresos: {
        Row: {
          categoria_id: string | null
          comprobante_referencia: string | null
          concepto_id: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          fecha: string
          hora: string
          id: string
          modalidad_id: string | null
          monto: number
          turno: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          categoria_id?: string | null
          comprobante_referencia?: string | null
          concepto_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string
          hora?: string
          id?: string
          modalidad_id?: string | null
          monto: number
          turno: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          categoria_id?: string | null
          comprobante_referencia?: string | null
          concepto_id?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          fecha?: string
          hora?: string
          id?: string
          modalidad_id?: string | null
          monto?: number
          turno?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egresos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "egreso_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egresos_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "egreso_conceptos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egresos_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidad"
            referencedColumns: ["id"]
          },
        ]
      }
      enfermedades: {
        Row: {
          cie10_clase: string
          cie10_enfermedad: string
          clase: string
          created_at: string
          id: string
          nombre_enfermedad: string
          updated_at: string
          vista_cie10: string
        }
        Insert: {
          cie10_clase: string
          cie10_enfermedad: string
          clase: string
          created_at?: string
          id?: string
          nombre_enfermedad: string
          updated_at?: string
          vista_cie10: string
        }
        Update: {
          cie10_clase?: string
          cie10_enfermedad?: string
          clase?: string
          created_at?: string
          id?: string
          nombre_enfermedad?: string
          updated_at?: string
          vista_cie10?: string
        }
        Relationships: []
      }
      horario_turno_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          custom_end_time: string | null
          custom_start_time: string | null
          day_of_week: number
          horario_id: string
          id: string
          is_active: boolean | null
          turno_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          day_of_week: number
          horario_id: string
          id?: string
          is_active?: boolean | null
          turno_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          day_of_week?: number
          horario_id?: string
          id?: string
          is_active?: boolean | null
          turno_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horario_turno_assignments_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horario_turno_assignments_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          dias_laborables: number[]
          estado: string
          id: string
          nombre: string
          specialist_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_laborables: number[]
          estado?: string
          id?: string
          nombre: string
          specialist_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_laborables?: number[]
          estado?: string
          id?: string
          nombre?: string
          specialist_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horarios_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_headers: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          due_date: string | null
          id: string
          igv: number | null
          invoice_number: string
          payment_type: string | null
          status: string
          supplier_id: string | null
          total_a_pagar: number | null
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          due_date?: string | null
          id?: string
          igv?: number | null
          invoice_number: string
          payment_type?: string | null
          status?: string
          supplier_id?: string | null
          total_a_pagar?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          due_date?: string | null
          id?: string
          igv?: number | null
          invoice_number?: string
          payment_type?: string | null
          status?: string
          supplier_id?: string | null
          total_a_pagar?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_headers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_templates: {
        Row: {
          body_config: Json | null
          correlative_current: number | null
          correlative_prefix: string | null
          correlative_zeros: number | null
          created_at: string
          created_by: string | null
          design_config: Json | null
          footer_config: Json | null
          footer_signature_url: string | null
          footer_text: string | null
          header_config: Json | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          specialty_id: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_config?: Json | null
          correlative_current?: number | null
          correlative_prefix?: string | null
          correlative_zeros?: number | null
          created_at?: string
          created_by?: string | null
          design_config?: Json | null
          footer_config?: Json | null
          footer_signature_url?: string | null
          footer_text?: string | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          specialty_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_config?: Json | null
          correlative_current?: number | null
          correlative_prefix?: string | null
          correlative_zeros?: number | null
          created_at?: string
          created_by?: string | null
          design_config?: Json | null
          footer_config?: Json | null
          footer_signature_url?: string | null
          footer_text?: string | null
          header_config?: Json | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          specialty_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_templates_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "medical_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          atencion_registrada: boolean | null
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          especialidad: string | null
          fecha_atencion_registrada: string | null
          follow_up_instructions: string | null
          form_data: Json | null
          hms: string | null
          id: string
          imaging_results: string | null
          lab_results: string | null
          next_appointment_date: string | null
          patient_id: string | null
          physical_examination: string | null
          present_illness: string | null
          specialist_id: string | null
          status: string | null
          template_id: string | null
          treatment_plan: string | null
          updated_at: string
          updated_by: string | null
          visit_date: string
          vital_signs: Json | null
        }
        Insert: {
          appointment_id?: string | null
          atencion_registrada?: boolean | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          especialidad?: string | null
          fecha_atencion_registrada?: string | null
          follow_up_instructions?: string | null
          form_data?: Json | null
          hms?: string | null
          id?: string
          imaging_results?: string | null
          lab_results?: string | null
          next_appointment_date?: string | null
          patient_id?: string | null
          physical_examination?: string | null
          present_illness?: string | null
          specialist_id?: string | null
          status?: string | null
          template_id?: string | null
          treatment_plan?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_date: string
          vital_signs?: Json | null
        }
        Update: {
          appointment_id?: string | null
          atencion_registrada?: boolean | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          especialidad?: string | null
          fecha_atencion_registrada?: string | null
          follow_up_instructions?: string | null
          form_data?: Json | null
          hms?: string | null
          id?: string
          imaging_results?: string | null
          lab_results?: string | null
          next_appointment_date?: string | null
          patient_id?: string | null
          physical_examination?: string | null
          present_illness?: string | null
          specialist_id?: string | null
          status?: string | null
          template_id?: string | null
          treatment_plan?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_date?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "medical_record_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_specialties: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      modalidad: {
        Row: {
          activo: boolean | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          icono: string | null
          id: string
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      opening_hours: {
        Row: {
          clinic_id: string | null
          closing_time: string | null
          created_at: string
          day_of_week: number | null
          id: string
          is_open: boolean | null
          opening_time: string | null
        }
        Insert: {
          clinic_id?: string | null
          closing_time?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_open?: boolean | null
          opening_time?: string | null
        }
        Update: {
          clinic_id?: string | null
          closing_time?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          is_open?: boolean | null
          opening_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opening_hours_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      optics_entries: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          entry_type: string | null
          id: string
          importe: number | null
          invoice_due_date: string | null
          invoice_number: string | null
          lote: string | null
          observations: string | null
          payment_status: string | null
          payment_type: string | null
          product_code: string | null
          product_id: string | null
          purchase_cost_per_unit: number | null
          quantity_received: number
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string | null
          id?: string
          importe?: number | null
          invoice_due_date?: string | null
          invoice_number?: string | null
          lote?: string | null
          observations?: string | null
          payment_status?: string | null
          payment_type?: string | null
          product_code?: string | null
          product_id?: string | null
          purchase_cost_per_unit?: number | null
          quantity_received?: number
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string | null
          id?: string
          importe?: number | null
          invoice_due_date?: string | null
          invoice_number?: string | null
          lote?: string | null
          observations?: string | null
          payment_status?: string | null
          payment_type?: string | null
          product_code?: string | null
          product_id?: string | null
          purchase_cost_per_unit?: number | null
          quantity_received?: number
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optics_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "optics_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optics_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      optics_inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_reason: string
          movement_type: string
          new_stock: number
          observations: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_document: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_reason: string
          movement_type: string
          new_stock: number
          observations?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_document?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_reason?: string
          movement_type?: string
          new_stock?: number
          observations?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_document?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "optics_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "optics_products"
            referencedColumns: ["id"]
          },
        ]
      }
      optics_label_templates: {
        Row: {
          catalog_target: string
          created_at: string
          created_by: string
          elements: Json
          id: string
          is_default: boolean
          is_public: boolean
          name: string
          paper_height_mm: number
          paper_size_id: string
          paper_width_mm: number
          updated_at: string
          updated_by: string | null
          zoom_used: number | null
        }
        Insert: {
          catalog_target?: string
          created_at?: string
          created_by?: string
          elements?: Json
          id?: string
          is_default?: boolean
          is_public?: boolean
          name: string
          paper_height_mm: number
          paper_size_id?: string
          paper_width_mm: number
          updated_at?: string
          updated_by?: string | null
          zoom_used?: number | null
        }
        Update: {
          catalog_target?: string
          created_at?: string
          created_by?: string
          elements?: Json
          id?: string
          is_default?: boolean
          is_public?: boolean
          name?: string
          paper_height_mm?: number
          paper_size_id?: string
          paper_width_mm?: number
          updated_at?: string
          updated_by?: string | null
          zoom_used?: number | null
        }
        Relationships: []
      }
      optics_outputs: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          motivo_ajuste: string | null
          nro_comprobante: string | null
          patient_id: string | null
          product_code: string | null
          product_id: string | null
          quantity: number
          sale_cost_per_unit: number | null
          tipo_salida: string | null
          total: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          motivo_ajuste?: string | null
          nro_comprobante?: string | null
          patient_id?: string | null
          product_code?: string | null
          product_id?: string | null
          quantity?: number
          sale_cost_per_unit?: number | null
          tipo_salida?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          motivo_ajuste?: string | null
          nro_comprobante?: string | null
          patient_id?: string | null
          product_code?: string | null
          product_id?: string | null
          quantity?: number
          sale_cost_per_unit?: number | null
          tipo_salida?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optics_outputs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optics_outputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "optics_products"
            referencedColumns: ["id"]
          },
        ]
      }
      optics_product_types: {
        Row: {
          created_at: string
          id: string
          label: string
          status: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          status?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          status?: string
          value?: string
        }
        Relationships: []
      }
      optics_products: {
        Row: {
          codigo: string
          color: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          fecha_ingreso: string | null
          genero: string | null
          id: string
          imagen_url: string | null
          indice_refraccion: string | null
          marca: string | null
          material: string | null
          modelo: string | null
          nombre: string
          precio_compra: number | null
          precio_venta: number | null
          proveedor_id: string | null
          status: string | null
          stock_actual: number
          stock_minimo: number | null
          tamanio: string | null
          tipo: string
          tipo_lente: string | null
          tratamiento: string | null
          ubicacion: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_ingreso?: string | null
          genero?: string | null
          id?: string
          imagen_url?: string | null
          indice_refraccion?: string | null
          marca?: string | null
          material?: string | null
          modelo?: string | null
          nombre: string
          precio_compra?: number | null
          precio_venta?: number | null
          proveedor_id?: string | null
          status?: string | null
          stock_actual?: number
          stock_minimo?: number | null
          tamanio?: string | null
          tipo: string
          tipo_lente?: string | null
          tratamiento?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_ingreso?: string | null
          genero?: string | null
          id?: string
          imagen_url?: string | null
          indice_refraccion?: string | null
          marca?: string | null
          material?: string | null
          modelo?: string | null
          nombre?: string
          precio_compra?: number | null
          precio_venta?: number | null
          proveedor_id?: string | null
          status?: string | null
          stock_actual?: number
          stock_minimo?: number | null
          tamanio?: string | null
          tipo?: string
          tipo_lente?: string | null
          tratamiento?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optics_products_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          archivo_confirmacion: string | null
          concepto_id: string
          confirmado: boolean | null
          created_at: string
          created_by: string | null
          cuenta_id: string | null
          documento_pago_id: string | null
          estado_pago: string | null
          fecha_pago: string
          id: string
          modalidad_id: string | null
          monto_adelanto: number | null
          monto_pagado: number
          observaciones: string | null
          pago_id: string | null
          patient_id: string
          saldo: number | null
          specialist_id: string | null
          tiene_adjunto: boolean | null
          tipo_confirmacion: string | null
          turno: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archivo_confirmacion?: string | null
          concepto_id: string
          confirmado?: boolean | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          documento_pago_id?: string | null
          estado_pago?: string | null
          fecha_pago?: string
          id?: string
          modalidad_id?: string | null
          monto_adelanto?: number | null
          monto_pagado: number
          observaciones?: string | null
          pago_id?: string | null
          patient_id: string
          saldo?: number | null
          specialist_id?: string | null
          tiene_adjunto?: boolean | null
          tipo_confirmacion?: string | null
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archivo_confirmacion?: string | null
          concepto_id?: string
          confirmado?: boolean | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          documento_pago_id?: string | null
          estado_pago?: string | null
          fecha_pago?: string
          id?: string
          modalidad_id?: string | null
          monto_adelanto?: number | null
          monto_pagado?: number
          observaciones?: string | null
          pago_id?: string | null
          patient_id?: string
          saldo?: number | null
          specialist_id?: string | null
          tiene_adjunto?: boolean | null
          tipo_confirmacion?: string | null
          turno?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "concepto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_documento_pago_id_fkey"
            columns: ["documento_pago_id"]
            isOneToOne: false
            referencedRelation: "documento_de_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birth_date: string | null
          blood_type: string | null
          chronic_conditions: string[] | null
          clinic_id: string | null
          created_at: string
          created_by: string | null
          days: number | null
          dni: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          hms: string | null
          id: string
          last_name: string
          months: number | null
          patient_code: string
          phone: string | null
          updated_at: string
          updated_by: string | null
          years: number | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          days?: number | null
          dni: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          hms?: string | null
          id?: string
          last_name: string
          months?: number | null
          patient_code: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          years?: number | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          days?: number | null
          dni?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          hms?: string | null
          id?: string
          last_name?: string
          months?: number | null
          patient_code?: string
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
          years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_formula_magistral: {
        Row: {
          cantidad: number
          codigo_producto: string | null
          created_at: string | null
          created_by: string | null
          formula: string
          id: string
          id_paciente: string | null
          monto_pedido: number | null
          nro_formula: string
          numero_contacto: string | null
          observaciones: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cantidad?: number
          codigo_producto?: string | null
          created_at?: string | null
          created_by?: string | null
          formula: string
          id?: string
          id_paciente?: string | null
          monto_pedido?: number | null
          nro_formula: string
          numero_contacto?: string | null
          observaciones?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cantidad?: number
          codigo_producto?: string | null
          created_at?: string | null
          created_by?: string | null
          formula?: string
          id?: string
          id_paciente?: string | null
          monto_pedido?: number | null
          nro_formula?: string
          numero_contacto?: string | null
          observaciones?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_formula_magistral_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          apellidos: string
          cargo: string
          created_at: string
          documento_identidad: string
          estado: string
          fecha_ingreso: string
          fecha_nacimiento: string | null
          id: string
          nombres: string
          sexo: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          cargo: string
          created_at?: string
          documento_identidad: string
          estado?: string
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          nombres: string
          sexo?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          cargo?: string
          created_at?: string
          documento_identidad?: string
          estado?: string
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          id?: string
          nombres?: string
          sexo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_entries: {
        Row: {
          batch: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          entry_type: string
          expiry_date: string | null
          id: string
          importe: number | null
          invoice_due_date: string | null
          invoice_number: string | null
          is_accepted: boolean | null
          laboratory: string | null
          medication_id: string | null
          nsoc_rs: string | null
          num_boxes: number | null
          number_of_boxes: number | null
          observations: string | null
          payment_status: string | null
          payment_type: string | null
          pharmaceutical_form: string | null
          presentation: string | null
          product_code: string | null
          purchase_cost_per_unit: number | null
          quantity_received: number | null
          quantity_requested: number | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string
          expiry_date?: string | null
          id?: string
          importe?: number | null
          invoice_due_date?: string | null
          invoice_number?: string | null
          is_accepted?: boolean | null
          laboratory?: string | null
          medication_id?: string | null
          nsoc_rs?: string | null
          num_boxes?: number | null
          number_of_boxes?: number | null
          observations?: string | null
          payment_status?: string | null
          payment_type?: string | null
          pharmaceutical_form?: string | null
          presentation?: string | null
          product_code?: string | null
          purchase_cost_per_unit?: number | null
          quantity_received?: number | null
          quantity_requested?: number | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          entry_type?: string
          expiry_date?: string | null
          id?: string
          importe?: number | null
          invoice_due_date?: string | null
          invoice_number?: string | null
          is_accepted?: boolean | null
          laboratory?: string | null
          medication_id?: string | null
          nsoc_rs?: string | null
          num_boxes?: number | null
          number_of_boxes?: number | null
          observations?: string | null
          payment_status?: string | null
          payment_type?: string | null
          pharmaceutical_form?: string | null
          presentation?: string | null
          product_code?: string | null
          purchase_cost_per_unit?: number | null
          quantity_received?: number | null
          quantity_requested?: number | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_entries_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          medication_id: string
          movement_reason: string
          movement_type: string
          new_stock: number
          observations: string | null
          previous_stock: number
          quantity: number
          reference_document: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id: string
          movement_reason: string
          movement_type: string
          new_stock: number
          observations?: string | null
          previous_stock: number
          quantity: number
          reference_document?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id?: string
          movement_reason?: string
          movement_type?: string
          new_stock?: number
          observations?: string | null
          previous_stock?: number
          quantity?: number
          reference_document?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_movements_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_medications: {
        Row: {
          barcode: string | null
          category: string | null
          codigo: string | null
          comentarios: string | null
          concentration: string | null
          created_at: string
          created_by: string | null
          days_before_expiry_alert: number | null
          descripcion: string
          entrada: number | null
          fecha_vencimiento: string | null
          forma_farmaceutica: string | null
          formula_magistral: boolean | null
          id: string
          igv_unitario: number | null
          importe_ganancia: number | null
          importe_unitario: number | null
          laboratorio: string | null
          lote: string | null
          min_stock_level: number | null
          porcentaje_ganancia: number | null
          precio_venta: number | null
          presentation: string
          purchase_price: number | null
          salida: number | null
          status: string | null
          stock_actual: number
          stock_inicial: number | null
          supplier_id: string | null
          ubicacion: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          codigo?: string | null
          comentarios?: string | null
          concentration?: string | null
          created_at?: string
          created_by?: string | null
          days_before_expiry_alert?: number | null
          descripcion: string
          entrada?: number | null
          fecha_vencimiento?: string | null
          forma_farmaceutica?: string | null
          formula_magistral?: boolean | null
          id?: string
          igv_unitario?: number | null
          importe_ganancia?: number | null
          importe_unitario?: number | null
          laboratorio?: string | null
          lote?: string | null
          min_stock_level?: number | null
          porcentaje_ganancia?: number | null
          precio_venta?: number | null
          presentation: string
          purchase_price?: number | null
          salida?: number | null
          status?: string | null
          stock_actual?: number
          stock_inicial?: number | null
          supplier_id?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          codigo?: string | null
          comentarios?: string | null
          concentration?: string | null
          created_at?: string
          created_by?: string | null
          days_before_expiry_alert?: number | null
          descripcion?: string
          entrada?: number | null
          fecha_vencimiento?: string | null
          forma_farmaceutica?: string | null
          formula_magistral?: boolean | null
          id?: string
          igv_unitario?: number | null
          importe_ganancia?: number | null
          importe_unitario?: number | null
          laboratorio?: string | null
          lote?: string | null
          min_stock_level?: number | null
          porcentaje_ganancia?: number | null
          precio_venta?: number | null
          presentation?: string
          purchase_price?: number | null
          salida?: number | null
          status?: string | null
          stock_actual?: number
          stock_inicial?: number | null
          supplier_id?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_medications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_outputs: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          medication_id: string | null
          medications: Json | null
          motivo_ajuste: string | null
          nro_comprobante: string | null
          patient_id: string | null
          product_code: string | null
          quantity: number
          sale_cost_per_unit: number | null
          supplier_id: string | null
          tipo_salida: string | null
          total: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          medication_id?: string | null
          medications?: Json | null
          motivo_ajuste?: string | null
          nro_comprobante?: string | null
          patient_id?: string | null
          product_code?: string | null
          quantity: number
          sale_cost_per_unit?: number | null
          supplier_id?: string | null
          tipo_salida?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          medication_id?: string | null
          medications?: Json | null
          motivo_ajuste?: string | null
          nro_comprobante?: string | null
          patient_id?: string | null
          product_code?: string | null
          quantity?: number
          sale_cost_per_unit?: number | null
          supplier_id?: string | null
          tipo_salida?: string | null
          total?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_outputs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_outputs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_outputs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          observations: string | null
          phone: string | null
          razon_social: string | null
          ruc: string | null
          specialty: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          observations?: string | null
          phone?: string | null
          razon_social?: string | null
          ruc?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          observations?: string | null
          phone?: string | null
          razon_social?: string | null
          ruc?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_days: number | null
          id: string
          instructions: string | null
          issue_date: string
          medical_record_id: string | null
          medications: Json
          patient_id: string | null
          prescription_number: string
          refills_allowed: number | null
          specialist_id: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          id?: string
          instructions?: string | null
          issue_date?: string
          medical_record_id?: string | null
          medications?: Json
          patient_id?: string | null
          prescription_number: string
          refills_allowed?: number | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          id?: string
          instructions?: string | null
          issue_date?: string
          medical_record_id?: string | null
          medications?: Json
          patient_id?: string | null
          prescription_number?: string
          refills_allowed?: number | null
          specialist_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      specialist_shifts: {
        Row: {
          consulting_room_id: string | null
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_active: boolean | null
          specialist_id: string | null
          start_time: string
        }
        Insert: {
          consulting_room_id?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_active?: boolean | null
          specialist_id?: string | null
          start_time: string
        }
        Update: {
          consulting_room_id?: string | null
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          specialist_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_shifts_consulting_room_id_fkey"
            columns: ["consulting_room_id"]
            isOneToOne: false
            referencedRelation: "consulting_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_shifts_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      specialists: {
        Row: {
          clinic_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          dni: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string
          phone: string | null
          photo_url: string | null
          professional_title: string
          specialist_code: string
          specialty_id: string | null
          status: string | null
          study_summary: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          clinic_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          dni: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          license_number: string
          phone?: string | null
          photo_url?: string | null
          professional_title: string
          specialist_code: string
          specialty_id?: string | null
          status?: string | null
          study_summary?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          clinic_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          dni?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string
          phone?: string | null
          photo_url?: string | null
          professional_title?: string
          specialist_code?: string
          specialty_id?: string | null
          status?: string | null
          study_summary?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialists_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialists_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "medical_specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          dni: string
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          phone: string | null
          photo_url: string | null
          position: string
          staff_code: string
          status: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dni: string
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          phone?: string | null
          photo_url?: string | null
          position: string
          staff_code: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dni?: string
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          position?: string
          staff_code?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies_attention_consumption: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          id: string
          medical_record_id: string | null
          medication_id: string
          observations: string | null
          quantity: number
          tipo_atencion: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id?: string | null
          medication_id: string
          observations?: string | null
          quantity?: number
          tipo_atencion?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id?: string | null
          medication_id?: string
          observations?: string | null
          quantity?: number
          tipo_atencion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_attention_consumption_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_attention_consumption_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_attention_consumption_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplies_consulting_room_output_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          medication_id: string
          output_id: string
          product_code: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          medication_id: string
          output_id: string
          product_code?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          medication_id?: string
          output_id?: string
          product_code?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplies_consulting_room_output_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_consulting_room_output_items_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "supplies_consulting_room_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies_consulting_room_outputs: {
        Row: {
          consulting_room_id: string
          created_at: string
          created_by: string | null
          date: string
          delivery_date: string | null
          id: string
          observations: string | null
          output_number: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consulting_room_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          delivery_date?: string | null
          id?: string
          observations?: string | null
          output_number: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consulting_room_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          delivery_date?: string | null
          id?: string
          observations?: string | null
          output_number?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_consulting_room_outputs_consulting_room_id_fkey"
            columns: ["consulting_room_id"]
            isOneToOne: false
            referencedRelation: "consulting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies_consulting_room_stock: {
        Row: {
          consulting_room_id: string
          created_at: string
          created_by: string | null
          id: string
          medication_id: string
          quantity: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consulting_room_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id: string
          quantity?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consulting_room_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          medication_id?: string
          quantity?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_consulting_room_stock_consulting_room_id_fkey"
            columns: ["consulting_room_id"]
            isOneToOne: false
            referencedRelation: "consulting_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplies_consulting_room_stock_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          dias_laborables: number[] | null
          end_time: string | null
          id: string
          is_custom: boolean | null
          name: string
          shift_type_id: string | null
          start_time: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_laborables?: number[] | null
          end_time?: string | null
          id?: string
          is_custom?: boolean | null
          name: string
          shift_type_id?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          dias_laborables?: number[] | null
          end_time?: string | null
          id?: string
          is_custom?: boolean | null
          name?: string
          shift_type_id?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          activo: boolean
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          menu_config: Json | null
          personal_id: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          menu_config?: Json | null
          personal_id: string
          rol?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          menu_config?: Json | null
          personal_id?: string
          rol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: true
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_own_record: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_specialist_availability: {
        Args: {
          p_appointment_date: string
          p_appointment_id?: string
          p_consulting_room_id?: string
          p_end_time: string
          p_specialist_id: string
          p_start_time: string
        }
        Returns: {
          available_slots: Json
          conflict_reason: string
          is_available: boolean
        }[]
      }
      crear_admin_inicial: { Args: never; Returns: Json }
      crear_usuario_completo: {
        Args: {
          p_apellidos: string
          p_cargo: string
          p_colegiatura?: string
          p_documento_identidad: string
          p_email: string
          p_es_especialista?: boolean
          p_especialidad?: string
          p_fecha_nacimiento: string
          p_nombres: string
          p_password: string
          p_rol?: string
          p_sexo: string
          p_titulo?: string
        }
        Returns: Json
      }
      crear_usuario_sistema: {
        Args: {
          p_email: string
          p_password: string
          p_personal_id: string
          p_rol?: string
        }
        Returns: Json
      }
      generate_cuenta_id: { Args: { patient_uuid: string }; Returns: string }
      generate_document_number: { Args: never; Returns: string }
      generate_hms_for_template: {
        Args: { p_template_id: string }
        Returns: string
      }
      generate_medication_code: { Args: never; Returns: string }
      generate_medication_code_auto: { Args: never; Returns: string }
      generate_next_comprobante_number: { Args: never; Returns: string }
      generate_nro_formula: { Args: never; Returns: string }
      generate_optics_product_code: { Args: never; Returns: string }
      generate_pago_id: { Args: never; Returns: string }
      generate_patient_code: { Args: never; Returns: string }
      generate_patient_code_v2: {
        Args: {
          p_correlativo: number
          p_first_name: string
          p_last_name: string
        }
        Returns: string
      }
      generate_prescription_number: { Args: never; Returns: string }
      generate_specialist_code: { Args: never; Returns: string }
      generate_staff_code: { Args: never; Returns: string }
      get_active_specialist_schedule: {
        Args: { p_specialist_id: string }
        Returns: {
          day_of_week: number
          end_time: string
          horario_name: string
          shift_name: string
          start_time: string
        }[]
      }
      get_appointment_availability: {
        Args: {
          p_consulting_room_id?: string
          p_date: string
          p_specialist_id: string
        }
        Returns: {
          consulting_room_id: string
          is_available: boolean
          time_slot: string
        }[]
      }
      get_calendar_appointments: {
        Args: {
          p_end_date: string
          p_specialist_id?: string
          p_start_date: string
        }
        Returns: {
          duration_minutes: number
          end_time: string
          id: string
          patient_name: string
          reason: string
          specialist_color: string
          specialist_name: string
          start_time: string
          status: string
          title: string
        }[]
      }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_specialists: number
          pending_prescriptions: number
          today_appointments: number
          total_patients: number
        }[]
      }
      get_patient_medical_records: {
        Args: { patient_uuid: string }
        Returns: {
          chief_complaint: string
          created_at: string
          diagnosis: string
          id: string
          specialist_name: string
          status: string
          visit_date: string
        }[]
      }
      get_pharmacy_alerts: {
        Args: never
        Returns: {
          alert_type: string
          commercial_name: string
          current_stock: number
          days_to_expiry: number
          expiration_date: string
          medication_id: string
          min_stock_level: number
        }[]
      }
      get_pharmacy_stats: {
        Args: never
        Returns: {
          low_stock_count: number
          near_expiry_count: number
          total_inventory_value: number
          total_medications: number
        }[]
      }
      get_specialist_schedules_from_assignments: {
        Args: { p_specialist_id: string }
        Returns: {
          day_of_week: number
          end_time: string
          shift_name: string
          start_time: string
        }[]
      }
      get_today_appointments_stats: {
        Args: never
        Returns: {
          completed_today: number
          pending_today: number
          scheduled_today: number
          specialist_color: string
          specialist_id: string
          specialist_name: string
          total_today: number
        }[]
      }
      get_user_menu_config: { Args: { user_auth_id: string }; Returns: Json }
      get_user_permissions: { Args: { user_id: string }; Returns: Json }
      int_to_roman: { Args: { num: number }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_by_role: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      recalculate_medication_stock: {
        Args: { p_medication_id: string }
        Returns: undefined
      }
      recalculate_optics_stock: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      reset_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: Json
      }
      search_patients: {
        Args: { search_term: string }
        Returns: {
          birth_date: string
          dni: string
          email: string
          first_name: string
          gender: string
          hms: string
          id: string
          last_name: string
          patient_code: string
          phone: string
        }[]
      }
      sync_auth_users_to_usuario: { Args: never; Returns: undefined }
      update_all_patient_codes: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      update_user_menu_config: {
        Args: { new_menu_config: Json; user_auth_id: string }
        Returns: Json
      }
      user_has_section_access: {
        Args: { section_name: string; user_id: string }
        Returns: boolean
      }
      validate_specialist_schedule_against_turnos: {
        Args: {
          p_day_of_week: number
          p_end_time: string
          p_start_time: string
          p_turno_id: string
        }
        Returns: boolean
      }
      validate_turno_against_clinic_hours: {
        Args: { p_clinic_id?: string; p_end_time: string; p_start_time: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

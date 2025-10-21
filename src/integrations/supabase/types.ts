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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string
          nombres: string
          apellidos: string
          area: Database["public"]["Enums"]["rol_usuario"]
          creado_en: string
        }
        Insert: {
          id: string
          nombres: string
          apellidos: string
          area: Database["public"]["Enums"]["rol_usuario"]
          creado_en?: string
        }
        Update: {
          id?: string
          nombres?: string
          apellidos?: string
          area?: Database["public"]["Enums"]["rol_usuario"]
          creado_en?: string
        }
        Relationships: []
      }
      control_excepciones: {
        Row: {
          id: number
          descripcion: string
          fecha: string
          categoria: Database["public"]["Enums"]["categoria_falla"]
          responsable_id: string | null
          fecha_limite: string | null
          estado: Database["public"]["Enums"]["estado_excepcion"]
          causa_raiz: string | null
          creado_por: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: number
          descripcion: string
          fecha: string
          categoria: Database["public"]["Enums"]["categoria_falla"]
          responsable_id?: string | null
          fecha_limite?: string | null
          estado?: Database["public"]["Enums"]["estado_excepcion"]
          causa_raiz?: string | null
          creado_por: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: number
          descripcion?: string
          fecha?: string
          categoria?: Database["public"]["Enums"]["categoria_falla"]
          responsable_id?: string | null
          fecha_limite?: string | null
          estado?: Database["public"]["Enums"]["estado_excepcion"]
          causa_raiz?: string | null
          creado_por?: string
          creado_en?: string
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_excepciones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_excepciones_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      citas_contingencia: {
        Row: {
          id: number
          dni: string
          nombre_completo: string
          servicio: string
          medico_asignado: string
          fecha_hora: string
          estado: Database["public"]["Enums"]["estado_cita"]
          creado_por: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: number
          dni: string
          nombre_completo: string
          servicio: string
          medico_asignado: string
          fecha_hora: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          creado_por: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: number
          dni?: string
          nombre_completo?: string
          servicio?: string
          medico_asignado?: string
          fecha_hora?: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          creado_por?: string
          creado_en?: string
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "citas_contingencia_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ti_responsables: {
        Row: {
          id: number
          categoria: Database["public"]["Enums"]["categoria_falla"]
          responsable_id: string
          sla_dias: number
          actualizado_en: string
        }
        Insert: {
          id?: number
          categoria: Database["public"]["Enums"]["categoria_falla"]
          responsable_id: string
          sla_dias: number
          actualizado_en?: string
        }
        Update: {
          id?: number
          categoria?: Database["public"]["Enums"]["categoria_falla"]
          responsable_id?: string
          sla_dias?: number
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "ti_responsables_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      excepcion_acciones: {
        Row: {
          id: number
          excepcion_id: number
          autor_id: string
          detalle: string
          nuevo_estado: Database["public"]["Enums"]["estado_excepcion"] | null
          creado_en: string
        }
        Insert: {
          id?: number
          excepcion_id: number
          autor_id: string
          detalle: string
          nuevo_estado?: Database["public"]["Enums"]["estado_excepcion"] | null
          creado_en?: string
        }
        Update: {
          id?: number
          excepcion_id?: number
          autor_id?: string
          detalle?: string
          nuevo_estado?: Database["public"]["Enums"]["estado_excepcion"] | null
          creado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "excepcion_acciones_excepcion_id_fkey"
            columns: ["excepcion_id"]
            isOneToOne: false
            referencedRelation: "control_excepciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excepcion_acciones_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_excepciones_abiertas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_falla"]
          total: number
        }
        Relationships: []
      }
      v_tiempo_prom_resolucion: {
        Row: {
          promedio_cierre: string | null
        }
        Relationships: []
      }
      v_top5_fallas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_falla"]
          frecuencia: number
        }
        Relationships: []
      }
      v_excepciones_vencidas: {
        Row: {
          id: number
          descripcion: string
          categoria: Database["public"]["Enums"]["categoria_falla"]
          responsable_id: string | null
          fecha_limite: string | null
          estado: Database["public"]["Enums"]["estado_excepcion"]
        }
        Relationships: []
      }
    }
    Functions: {
      mi_area: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["rol_usuario"] | null
      }
    }
    Enums: {
      rol_usuario: "ADMIN" | "TI" | "CONTROL_INTERNO" | "ADMISION" | "CLINICO"
      estado_excepcion: "ABIERTO" | "EN_PROGRESO" | "CERRADO"
      categoria_falla: "FALLA_BACKUP" | "ACCESO_INAPROPIADO" | "INCIDENTE_SEGURIDAD" | "DISPONIBILIDAD" | "OTRO"
      estado_cita: "PROGRAMADA" | "ATENDIDA" | "CANCELADA"
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
    Enums: {
      rol_usuario: ["ADMIN", "TI", "CONTROL_INTERNO", "ADMISION", "CLINICO"],
      estado_excepcion: ["ABIERTO", "EN_PROGRESO", "CERRADO"],
      categoria_falla: ["FALLA_BACKUP", "ACCESO_INAPROPIADO", "INCIDENTE_SEGURIDAD", "DISPONIBILIDAD", "OTRO"],
      estado_cita: ["PROGRAMADA", "ATENDIDA", "CANCELADA"],
    },
  },
} as const
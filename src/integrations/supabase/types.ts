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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amdec: {
        Row: {
          cause: string
          created_at: string
          created_by: string | null
          detection: string
          effet: string
          element: string
          fonction: string
          id: string
          mode_defaillance: string
          numero: number
          sous_ensemble: string
          updated_at: string
        }
        Insert: {
          cause: string
          created_at?: string
          created_by?: string | null
          detection: string
          effet: string
          element: string
          fonction: string
          id?: string
          mode_defaillance: string
          numero?: number
          sous_ensemble: string
          updated_at?: string
        }
        Update: {
          cause?: string
          created_at?: string
          created_by?: string | null
          detection?: string
          effet?: string
          element?: string
          fonction?: string
          id?: string
          mode_defaillance?: string
          numero?: number
          sous_ensemble?: string
          updated_at?: string
        }
        Relationships: []
      }
      capa: {
        Row: {
          actions_confinement: string | null
          actions_correctives: string | null
          actions_preventives: string | null
          cause_racine: string | null
          created_at: string
          created_by: string | null
          date_cible_corrective: string | null
          date_cible_preventive: string | null
          description_probleme: string
          id: string
          kpi_apres: number | null
          kpi_avant: number | null
          nc_id: string | null
          reference: string
          rep1: string | null
          rep2: string | null
          rep3: string | null
          rep4: string | null
          rep5: string | null
          responsable_corrective: string | null
          responsable_preventive: string | null
          statut: string
          updated_at: string
          why1: string | null
          why2: string | null
          why3: string | null
          why4: string | null
          why5: string | null
        }
        Insert: {
          actions_confinement?: string | null
          actions_correctives?: string | null
          actions_preventives?: string | null
          cause_racine?: string | null
          created_at?: string
          created_by?: string | null
          date_cible_corrective?: string | null
          date_cible_preventive?: string | null
          description_probleme: string
          id?: string
          kpi_apres?: number | null
          kpi_avant?: number | null
          nc_id?: string | null
          reference?: string
          rep1?: string | null
          rep2?: string | null
          rep3?: string | null
          rep4?: string | null
          rep5?: string | null
          responsable_corrective?: string | null
          responsable_preventive?: string | null
          statut?: string
          updated_at?: string
          why1?: string | null
          why2?: string | null
          why3?: string | null
          why4?: string | null
          why5?: string | null
        }
        Update: {
          actions_confinement?: string | null
          actions_correctives?: string | null
          actions_preventives?: string | null
          cause_racine?: string | null
          created_at?: string
          created_by?: string | null
          date_cible_corrective?: string | null
          date_cible_preventive?: string | null
          description_probleme?: string
          id?: string
          kpi_apres?: number | null
          kpi_avant?: number | null
          nc_id?: string | null
          reference?: string
          rep1?: string | null
          rep2?: string | null
          rep3?: string | null
          rep4?: string | null
          rep5?: string | null
          responsable_corrective?: string | null
          responsable_preventive?: string | null
          statut?: string
          updated_at?: string
          why1?: string | null
          why2?: string | null
          why3?: string | null
          why4?: string | null
          why5?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capa_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformites"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_historique: {
        Row: {
          cible: number
          created_at: string
          id: string
          mois: string
          note: string | null
          taux_efficacite: number
        }
        Insert: {
          cible?: number
          created_at?: string
          id?: string
          mois: string
          note?: string | null
          taux_efficacite: number
        }
        Update: {
          cible?: number
          created_at?: string
          id?: string
          mois?: string
          note?: string | null
          taux_efficacite?: number
        }
        Relationships: []
      }
      non_conformites: {
        Row: {
          created_at: string
          created_by: string | null
          date_incident: string
          description: string
          id: string
          reaction_immediate: string | null
          reference: string
          statut: string
          type_nc: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_incident: string
          description: string
          id?: string
          reaction_immediate?: string | null
          reference?: string
          statut?: string
          type_nc: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_incident?: string
          description?: string
          id?: string
          reaction_immediate?: string | null
          reference?: string
          statut?: string
          type_nc?: string
          updated_at?: string
        }
        Relationships: []
      }
      users_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_capa_ref: { Args: never; Returns: string }
      gen_nc_ref: { Args: never; Returns: string }
      get_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "responsable_qualite" | "pilote" | "auditeur"
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
      app_role: ["admin", "responsable_qualite", "pilote", "auditeur"],
    },
  },
} as const

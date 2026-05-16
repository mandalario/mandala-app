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
      admin_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "class_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          conversation_user: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_user: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_user?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      class_slots: {
        Row: {
          capacity: number
          created_at: string
          date: string
          end_time: string
          id: string
          is_open: boolean
          location: string | null
          min_level: Database["public"]["Enums"]["surf_level"] | null
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_open?: boolean
          location?: string | null
          min_level?: Database["public"]["Enums"]["surf_level"] | null
          notes?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_open?: boolean
          location?: string | null
          min_level?: Database["public"]["Enums"]["surf_level"] | null
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          author: string | null
          created_at: string
          id: string
          is_active: boolean
          scheduled_date: string | null
          text: string
          text_en: string | null
          text_es: string | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          scheduled_date?: string | null
          text: string
          text_en?: string | null
          text_es?: string | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          scheduled_date?: string | null
          text?: string
          text_en?: string | null
          text_es?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      forecast_providers: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          kind: string
          label: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          label: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      home_banners: {
        Row: {
          background_image_url: string | null
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          partner_id: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          partner_id?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          partner_id?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_banners_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          created_at: string
          credits: number
          id: string
          mp_payment_id: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_status_detail: string | null
          package_id: string | null
          proof_path: string | null
          provider: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          created_at?: string
          credits: number
          id?: string
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_status_detail?: string | null
          package_id?: string | null
          proof_path?: string | null
          provider?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          created_at?: string
          credits?: number
          id?: string
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_status_detail?: string | null
          package_id?: string | null
          proof_path?: string | null
          provider?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          body: string | null
          body_en: string | null
          body_es: string | null
          category: Database["public"]["Enums"]["post_category"]
          created_at: string
          id: string
          is_published: boolean
          thumbnail_url: string | null
          title: string
          title_en: string | null
          title_es: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          body_en?: string | null
          body_es?: string | null
          category?: Database["public"]["Enums"]["post_category"]
          created_at?: string
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title: string
          title_en?: string | null
          title_es?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          body_en?: string | null
          body_es?: string | null
          category?: Database["public"]["Enums"]["post_category"]
          created_at?: string
          id?: string
          is_published?: boolean
          thumbnail_url?: string | null
          title?: string
          title_en?: string | null
          title_es?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      privacy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          privacy_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          privacy_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          privacy_id?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_policy: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          board_size: string | null
          can_swim: boolean | null
          created_at: string
          credits: number
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience_notes: string | null
          full_name: string | null
          has_own_board: boolean | null
          height_cm: number | null
          id: string
          medical_conditions: string | null
          phone: string | null
          profile_completed: boolean
          push_token: string | null
          stance: Database["public"]["Enums"]["surf_stance"] | null
          surf_level: Database["public"]["Enums"]["surf_level"] | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          board_size?: string | null
          can_swim?: boolean | null
          created_at?: string
          credits?: number
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_notes?: string | null
          full_name?: string | null
          has_own_board?: boolean | null
          height_cm?: number | null
          id: string
          medical_conditions?: string | null
          phone?: string | null
          profile_completed?: boolean
          push_token?: string | null
          stance?: Database["public"]["Enums"]["surf_stance"] | null
          surf_level?: Database["public"]["Enums"]["surf_level"] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          board_size?: string | null
          can_swim?: boolean | null
          created_at?: string
          credits?: number
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_notes?: string | null
          full_name?: string | null
          has_own_board?: boolean | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string | null
          phone?: string | null
          profile_completed?: boolean
          push_token?: string | null
          stance?: Database["public"]["Enums"]["surf_stance"] | null
          surf_level?: Database["public"]["Enums"]["surf_level"] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      surf_conditions: {
        Row: {
          condition: Database["public"]["Enums"]["sea_condition"]
          created_at: string
          created_by: string | null
          date: string
          id: string
          min_level: Database["public"]["Enums"]["surf_level"] | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          condition: Database["public"]["Enums"]["sea_condition"]
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          min_level?: Database["public"]["Enums"]["surf_level"] | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["sea_condition"]
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          min_level?: Database["public"]["Enums"]["surf_level"] | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          terms_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          terms_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          terms_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "terms_of_service"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_of_service: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          id: string
          push_token: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          push_token: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          push_token?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string | null
          http_status: number | null
          id: string
          message: string | null
          mp_payment_id: string | null
          result_status: string | null
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          mp_payment_id?: string | null
          result_status?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string | null
          http_status?: number | null
          id?: string
          message?: string | null
          mp_payment_id?: string | null
          result_status?: string | null
          source?: string
        }
        Relationships: []
      }
      weekly_schedule_templates: {
        Row: {
          capacity: number
          created_at: string
          duration_min: number
          end_time: string
          id: string
          is_active: boolean
          location: string | null
          notes: string | null
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          duration_min?: number
          end_time: string
          id?: string
          is_active?: boolean
          location?: string | null
          notes?: string | null
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          capacity?: number
          created_at?: string
          duration_min?: number
          end_time?: string
          id?: string
          is_active?: boolean
          location?: string | null
          notes?: string | null
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_slots_from_period: {
        Args: {
          _capacity: number
          _date: string
          _duration_min: number
          _end: string
          _location: string
          _notes: string
          _start: string
        }
        Returns: number
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
      app_role: "admin" | "student"
      approval_status: "pending" | "approved" | "rejected"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      payment_status: "pending" | "approved" | "rejected"
      post_category: "warm_up" | "pre_surfing"
      sea_condition: "good" | "medium" | "bad" | "flat"
      surf_level: "iniciante" | "intermediario" | "avancado"
      surf_stance: "regular" | "goofy" | "desconhecido"
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
      app_role: ["admin", "student"],
      approval_status: ["pending", "approved", "rejected"],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      payment_status: ["pending", "approved", "rejected"],
      post_category: ["warm_up", "pre_surfing"],
      sea_condition: ["good", "medium", "bad", "flat"],
      surf_level: ["iniciante", "intermediario", "avancado"],
      surf_stance: ["regular", "goofy", "desconhecido"],
    },
  },
} as const

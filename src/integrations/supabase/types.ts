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
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          program_interest: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          program_interest?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          program_interest?: string | null
          status?: string
        }
        Relationships: []
      }
      hackathon_registrations: {
        Row: {
          created_at: string
          experience_level: string | null
          hackathon_id: string
          id: string
          looking_for_team: boolean
          participant_email: string
          participant_name: string
          participant_phone: string | null
          skills: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          experience_level?: string | null
          hackathon_id: string
          id?: string
          looking_for_team?: boolean
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          skills?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          experience_level?: string | null
          hackathon_id?: string
          id?: string
          looking_for_team?: boolean
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          skills?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_registrations_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_submissions: {
        Row: {
          demo_url: string | null
          description: string
          hackathon_id: string
          id: string
          project_name: string
          repo_url: string | null
          submitted_at: string
          team_id: string
          technologies: string | null
          video_url: string | null
        }
        Insert: {
          demo_url?: string | null
          description: string
          hackathon_id: string
          id?: string
          project_name: string
          repo_url?: string | null
          submitted_at?: string
          team_id: string
          technologies?: string | null
          video_url?: string | null
        }
        Update: {
          demo_url?: string | null
          description?: string
          hackathon_id?: string
          id?: string
          project_name?: string
          repo_url?: string | null
          submitted_at?: string
          team_id?: string
          technologies?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_submissions_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_teams: {
        Row: {
          created_at: string
          created_by_email: string
          description: string | null
          hackathon_id: string
          id: string
          looking_for_members: boolean
          max_members: number
          team_name: string
        }
        Insert: {
          created_at?: string
          created_by_email: string
          description?: string | null
          hackathon_id: string
          id?: string
          looking_for_members?: boolean
          max_members?: number
          team_name: string
        }
        Update: {
          created_at?: string
          created_by_email?: string
          description?: string | null
          hackathon_id?: string
          id?: string
          looking_for_members?: boolean
          max_members?: number
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          created_at: string
          current_participants: number
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          max_participants: number
          max_team_size: number
          min_team_size: number
          prizes: string | null
          registration_deadline: string
          rules: string | null
          start_date: string
          status: Database["public"]["Enums"]["hackathon_status"]
          theme: string | null
          title: string
        }
        Insert: {
          created_at?: string
          current_participants?: number
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          max_participants?: number
          max_team_size?: number
          min_team_size?: number
          prizes?: string | null
          registration_deadline: string
          rules?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["hackathon_status"]
          theme?: string | null
          title: string
        }
        Update: {
          created_at?: string
          current_participants?: number
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          max_team_size?: number
          min_team_size?: number
          prizes?: string | null
          registration_deadline?: string
          rules?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["hackathon_status"]
          theme?: string | null
          title?: string
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          program_interest: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          program_interest?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          program_interest?: string | null
          source?: string | null
        }
        Relationships: []
      }
      program_sessions: {
        Row: {
          age_group: string
          created_at: string
          current_participants: number
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          location: string
          max_participants: number
          price: number
          program_type: Database["public"]["Enums"]["program_type"]
          start_date: string
          title: string
        }
        Insert: {
          age_group: string
          created_at?: string
          current_participants?: number
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          location: string
          max_participants?: number
          price?: number
          program_type: Database["public"]["Enums"]["program_type"]
          start_date: string
          title: string
        }
        Update: {
          age_group?: string
          created_at?: string
          current_participants?: number
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          location?: string
          max_participants?: number
          price?: number
          program_type?: Database["public"]["Enums"]["program_type"]
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          emergency_contact_name: string
          emergency_contact_phone: string
          id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          participant_age: number
          participant_email: string
          participant_name: string
          participant_phone: string | null
          payment_status: string
          session_id: string
          special_requirements: string | null
        }
        Insert: {
          created_at?: string
          emergency_contact_name: string
          emergency_contact_phone: string
          id?: string
          parent_email: string
          parent_name: string
          parent_phone: string
          participant_age: number
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          payment_status?: string
          session_id: string
          special_requirements?: string | null
        }
        Update: {
          created_at?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          participant_age?: number
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          payment_status?: string
          session_id?: string
          special_requirements?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_registrations: {
        Row: {
          created_at: string
          id: string
          participant_age: number | null
          participant_email: string
          participant_name: string
          participant_phone: string | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_age?: number | null
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_age?: number | null
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          age_group: string
          created_at: string
          current_participants: number
          date: string
          description: string
          duration_hours: number
          id: string
          image_url: string | null
          is_active: boolean
          location: string
          max_participants: number
          price: number
          title: string
        }
        Insert: {
          age_group: string
          created_at?: string
          current_participants?: number
          date: string
          description: string
          duration_hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          location: string
          max_participants?: number
          price?: number
          title: string
        }
        Update: {
          age_group?: string
          created_at?: string
          current_participants?: number
          date?: string
          description?: string
          duration_hours?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string
          max_participants?: number
          price?: number
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      hackathon_status: "upcoming" | "live" | "ended"
      program_type: "workshop" | "tech_camp" | "tech_fair"
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
      hackathon_status: ["upcoming", "live", "ended"],
      program_type: ["workshop", "tech_camp", "tech_fair"],
    },
  },
} as const

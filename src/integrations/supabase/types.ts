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
      ai_projects: {
        Row: {
          author_email: string
          author_name: string
          code: string
          created_at: string
          demo_url: string | null
          description: string | null
          hackathon_id: string | null
          id: string
          is_published: boolean
          points_earned: number
          project_name: string
          template_id: string | null
        }
        Insert: {
          author_email: string
          author_name: string
          code?: string
          created_at?: string
          demo_url?: string | null
          description?: string | null
          hackathon_id?: string | null
          id?: string
          is_published?: boolean
          points_earned?: number
          project_name: string
          template_id?: string | null
        }
        Update: {
          author_email?: string
          author_name?: string
          code?: string
          created_at?: string
          demo_url?: string | null
          description?: string | null
          hackathon_id?: string | null
          id?: string
          is_published?: boolean
          points_earned?: number
          project_name?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_projects_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          content_url: string | null
          hackathon_id: string
          id: string
          notes: string | null
          participant_email: string
          submitted_at: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          challenge_id: string
          content_url?: string | null
          hackathon_id: string
          id?: string
          notes?: string | null
          participant_email: string
          submitted_at?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          content_url?: string | null
          hackathon_id?: string
          id?: string
          notes?: string | null
          participant_email?: string
          submitted_at?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "hackathon_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      community_channels: {
        Row: {
          channel_type: string
          created_at: string
          description: string | null
          hackathon_id: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          description?: string | null
          hackathon_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          description?: string | null
          hackathon_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_channels_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          sender_email: string
          sender_name: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          sender_email: string
          sender_name: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
        ]
      }
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
      daily_challenges: {
        Row: {
          auto_max_points: number
          closes_at: string | null
          created_at: string
          day_number: number
          description: string | null
          hackathon_id: string
          id: string
          judge_max_points: number
          opens_at: string | null
          status: string
          title: string
        }
        Insert: {
          auto_max_points?: number
          closes_at?: string | null
          created_at?: string
          day_number: number
          description?: string | null
          hackathon_id: string
          id?: string
          judge_max_points?: number
          opens_at?: string | null
          status?: string
          title: string
        }
        Update: {
          auto_max_points?: number
          closes_at?: string | null
          created_at?: string
          day_number?: number
          description?: string | null
          hackathon_id?: string
          id?: string
          judge_max_points?: number
          opens_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
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
      point_events: {
        Row: {
          created_at: string | null
          event_type: string
          hackathon_id: string | null
          id: string
          metadata: Json | null
          participant_email: string
          points: number
        }
        Insert: {
          created_at?: string | null
          event_type: string
          hackathon_id?: string | null
          id?: string
          metadata?: Json | null
          participant_email: string
          points: number
        }
        Update: {
          created_at?: string | null
          event_type?: string
          hackathon_id?: string | null
          id?: string
          metadata?: Json | null
          participant_email?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_events_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          waitlist_signup_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          waitlist_signup_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          waitlist_signup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_waitlist_signup_id_fkey"
            columns: ["waitlist_signup_id"]
            isOneToOne: false
            referencedRelation: "waitlist_signups"
            referencedColumns: ["id"]
          },
        ]
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
      reward_boxes: {
        Row: {
          awarded_at: string
          box_type: string
          challenge_id: string | null
          contents_label: string | null
          fulfilled_at: string | null
          hackathon_id: string
          id: string
          opened_at: string | null
          participant_email: string
          status: string
        }
        Insert: {
          awarded_at?: string
          box_type: string
          challenge_id?: string | null
          contents_label?: string | null
          fulfilled_at?: string | null
          hackathon_id: string
          id?: string
          opened_at?: string | null
          participant_email: string
          status?: string
        }
        Update: {
          awarded_at?: string
          box_type?: string
          challenge_id?: string | null
          contents_label?: string | null
          fulfilled_at?: string | null
          hackathon_id?: string
          id?: string
          opened_at?: string | null
          participant_email?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_boxes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_boxes_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_scores: {
        Row: {
          auto_breakdown: Json | null
          auto_score: number | null
          created_at: string
          id: string
          judge_breakdown: Json | null
          judge_score: number | null
          scored_at: string | null
          status: string
          submission_id: string
          total_sp: number | null
        }
        Insert: {
          auto_breakdown?: Json | null
          auto_score?: number | null
          created_at?: string
          id?: string
          judge_breakdown?: Json | null
          judge_score?: number | null
          scored_at?: string | null
          status?: string
          submission_id: string
          total_sp?: number | null
        }
        Update: {
          auto_breakdown?: Json | null
          auto_score?: number | null
          created_at?: string
          id?: string
          judge_breakdown?: Json | null
          judge_score?: number | null
          scored_at?: string | null
          status?: string
          submission_id?: string
          total_sp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_room_participants: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          participant_email: string
          participant_name: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          participant_email: string
          participant_name: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          participant_email?: string
          participant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_room_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          position: number
          referral_code: string
          referred_by: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          position?: number
          referral_code: string
          referred_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          position?: number
          referral_code?: string
          referred_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
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

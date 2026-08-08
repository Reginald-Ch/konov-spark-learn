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
      admin_credentials: {
        Row: {
          passphrase_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          passphrase_hash: string
          role: string
          updated_at?: string
        }
        Update: {
          passphrase_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_gateway_slots: {
        Row: {
          expires_at: string | null
          locked_at: string | null
          slot_id: number
        }
        Insert: {
          expires_at?: string | null
          locked_at?: string | null
          slot_id: number
        }
        Update: {
          expires_at?: string | null
          locked_at?: string | null
          slot_id?: number
        }
        Relationships: []
      }
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
          project_id: string | null
          submitted_at: string
          submitted_code_snapshot: string | null
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
          project_id?: string | null
          submitted_at?: string
          submitted_code_snapshot?: string | null
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
          project_id?: string | null
          submitted_at?: string
          submitted_code_snapshot?: string | null
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
            foreignKeyName: "challenge_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
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
      community_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          participant_email: string
          participant_name: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          participant_email: string
          participant_name: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          participant_email?: string
          participant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_staff: {
        Row: {
          added_at: string
          badge_emoji: string
          display_name: string
          participant_email: string
          role_label: string
          staff_pin_hash: string | null
        }
        Insert: {
          added_at?: string
          badge_emoji?: string
          display_name: string
          participant_email: string
          role_label?: string
          staff_pin_hash?: string | null
        }
        Update: {
          added_at?: string
          badge_emoji?: string
          display_name?: string
          participant_email?: string
          role_label?: string
          staff_pin_hash?: string | null
        }
        Relationships: []
      }
      community_quests: {
        Row: {
          action_channel_name: string | null
          action_url: string | null
          badge_emoji: string
          badge_label: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          order_index: number
          quest_type: string
          title: string
        }
        Insert: {
          action_channel_name?: string | null
          action_url?: string | null
          badge_emoji: string
          badge_label: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          order_index?: number
          quest_type: string
          title: string
        }
        Update: {
          action_channel_name?: string | null
          action_url?: string | null
          badge_emoji?: string
          badge_label?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          order_index?: number
          quest_type?: string
          title?: string
        }
        Relationships: []
      }
      community_quest_completions: {
        Row: {
          completed_at: string
          id: string
          participant_email: string
          participant_name: string
          quest_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          participant_email: string
          participant_name: string
          quest_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          participant_email?: string
          participant_name?: string
          quest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "community_quests"
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
          benchmark_tests: Json
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
          benchmark_tests?: Json
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
          benchmark_tests?: Json
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
          settings: Json
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
          settings?: Json
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
          settings?: Json
          start_date?: string
          status?: Database["public"]["Enums"]["hackathon_status"]
          theme?: string | null
          title?: string
        }
        Relationships: []
      }
      lesson_content: {
        Row: {
          content: Json
          lesson_id: string
        }
        Insert: {
          content: Json
          lesson_id: string
        }
        Update: {
          content?: Json
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          attempts: number
          best_score: number
          completed_at: string | null
          id: string
          lesson_id: string
          participant_email: string
          passed: boolean
          unlocked_at: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          completed_at?: string | null
          id?: string
          lesson_id: string
          participant_email: string
          passed?: boolean
          unlocked_at?: string
        }
        Update: {
          attempts?: number
          best_score?: number
          completed_at?: string | null
          id?: string
          lesson_id?: string
          participant_email?: string
          passed?: boolean
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_questions: {
        Row: {
          correct_index: number
          explanation: string | null
          id: string
          lesson_id: string
          options: Json
          order_index: number
          question: string
        }
        Insert: {
          correct_index: number
          explanation?: string | null
          id?: string
          lesson_id: string
          options: Json
          order_index: number
          question: string
        }
        Update: {
          correct_index?: number
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          order_index?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          coin_cost: number
          created_at: string
          id: string
          is_published: boolean
          module_number: number
          order_index: number
          slug: string
          summary: string | null
          title: string
        }
        Insert: {
          coin_cost?: number
          created_at?: string
          id?: string
          is_published?: boolean
          module_number: number
          order_index: number
          slug: string
          summary?: string | null
          title: string
        }
        Update: {
          coin_cost?: number
          created_at?: string
          id?: string
          is_published?: boolean
          module_number?: number
          order_index?: number
          slug?: string
          summary?: string | null
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
          participant_email: string | null
          topics: string[]
          waitlist_signup_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          participant_email?: string | null
          topics?: string[]
          waitlist_signup_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          participant_email?: string | null
          topics?: string[]
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
      acquire_ai_slot: { Args: { p_ttl_seconds?: number }; Returns: number }
      get_lesson_content: {
        Args: { p_lesson_id: string; p_participant_email: string }
        Returns: Json
      }
      get_my_lesson_progress: {
        Args: { p_participant_email: string }
        Returns: {
          attempts: number
          best_score: number
          completed_at: string | null
          id: string
          lesson_id: string
          participant_email: string
          passed: boolean
          unlocked_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_reward_boxes: {
        Args: { p_hackathon_id: string; p_participant_email: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "reward_boxes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_quiz_questions: {
        Args: { p_lesson_id: string; p_participant_email: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          question: string
        }[]
      }
      open_reward_box: {
        Args: { p_box_id: string; p_participant_email: string }
        Returns: undefined
      }
      release_ai_slot: { Args: { p_slot_id: number }; Returns: undefined }
      set_admin_credential: {
        Args: { p_passphrase: string; p_role: string }
        Returns: undefined
      }
      submit_lesson_quiz: {
        Args: {
          p_answers: number[]
          p_hackathon_id: string
          p_lesson_id: string
          p_participant_email: string
        }
        Returns: {
          bonus_coins_awarded: number
          correct_flags: boolean[]
          explanations: string[]
          passed: boolean
          score: number
          total: number
        }[]
      }
      verify_admin_credential: {
        Args: { p_passphrase: string; p_role: string }
        Returns: boolean
      }
      claim_community_quest: {
        Args: { p_participant_email: string; p_participant_name: string; p_quest_id: string }
        Returns: { ok: boolean; message: string; badge_emoji: string | null; badge_label: string | null }[]
      }
      send_staff_message: {
        Args: { p_participant_email: string; p_pin: string; p_channel_id: string; p_content: string }
        Returns: { ok: boolean; message: string }[]
      }
      upsert_community_staff: {
        Args: { p_participant_email: string; p_display_name: string; p_role_label: string; p_badge_emoji: string; p_pin: string }
        Returns: undefined
      }
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

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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          episode_id: string
          id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          episode_id: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          episode_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_visits: {
        Row: {
          episode_id: string
          visited_at: string
        }
        Insert: {
          episode_id: string
          visited_at?: string
        }
        Update: {
          episode_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_visits_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: true
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          audio_url: string | null
          books: Json
          created_at: string
          date_label: string
          duration: string
          ep_number: number
          id: string
          imported_at: string | null
          misc: Json
          podcast_id: string
          questions: Json
          recipes: Json
          sort_order: number
          source_url: string | null
          summary: string
          title: string
          transcript: string
          transcript_error: string | null
          transcript_status: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          books?: Json
          created_at?: string
          date_label: string
          duration: string
          ep_number: number
          id: string
          imported_at?: string | null
          misc?: Json
          podcast_id: string
          questions?: Json
          recipes?: Json
          sort_order?: number
          source_url?: string | null
          summary?: string
          title: string
          transcript?: string
          transcript_error?: string | null
          transcript_status?: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          books?: Json
          created_at?: string
          date_label?: string
          duration?: string
          ep_number?: number
          id?: string
          imported_at?: string | null
          misc?: Json
          podcast_id?: string
          questions?: Json
          recipes?: Json
          sort_order?: number
          source_url?: string | null
          summary?: string
          title?: string
          transcript?: string
          transcript_error?: string | null
          transcript_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      favourite_podcasts: {
        Row: {
          created_at: string
          podcast_id: string
        }
        Insert: {
          created_at?: string
          podcast_id: string
        }
        Update: {
          created_at?: string
          podcast_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourite_podcasts_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: true
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          apple_url: string | null
          category: string
          cover_key: string
          cover_url: string | null
          created_at: string
          episode_count: number
          host: string
          id: string
          rss_url: string | null
          sort_order: number
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          apple_url?: string | null
          category: string
          cover_key: string
          cover_url?: string | null
          created_at?: string
          episode_count?: number
          host: string
          id: string
          rss_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          apple_url?: string | null
          category?: string
          cover_key?: string
          cover_url?: string | null
          created_at?: string
          episode_count?: number
          host?: string
          id?: string
          rss_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      saved_insights: {
        Row: {
          answer: string
          created_at: string
          episode_id: string
          id: string
          message_id: string | null
          question: string
          tag: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          episode_id: string
          id?: string
          message_id?: string | null
          question: string
          tag?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          episode_id?: string
          id?: string
          message_id?: string | null
          question?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_insights_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_insights_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tags: {
        Row: {
          created_at: string
          tag: string
        }
        Insert: {
          created_at?: string
          tag: string
        }
        Update: {
          created_at?: string
          tag?: string
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

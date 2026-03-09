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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      books: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          subject: string | null
          thumbnail_url: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          subject?: string | null
          thumbnail_url?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          subject?: string | null
          thumbnail_url?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_reply: string | null
          created_at: string | null
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
          user_id: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
          user_id?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_active: string | null
          messages: Json | null
          model: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          messages?: Json | null
          model?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          messages?: Json | null
          model?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          answers: Json | null
          created_at: string | null
          difficulty: number | null
          id: string
          model_used: string | null
          percentage: number
          questions: Json | null
          score: number
          subject: string
          title: string | null
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          model_used?: string | null
          percentage: number
          questions?: Json | null
          score: number
          subject: string
          title?: string | null
          total: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          model_used?: string | null
          percentage?: number
          questions?: Json | null
          score?: number
          subject?: string
          title?: string | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          file_name: string | null
          file_url: string | null
          forum_type: string | null
          id: string
          image_url: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          forum_type?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          forum_type?: string | null
          id?: string
          image_url?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content_md: string | null
          created_at: string | null
          created_by: string | null
          grade: string | null
          id: string
          subject: string
          thumbnail: string | null
          title_ar: string
        }
        Insert: {
          content_md?: string | null
          created_at?: string | null
          created_by?: string | null
          grade?: string | null
          id?: string
          subject: string
          thumbnail?: string | null
          title_ar: string
        }
        Update: {
          content_md?: string | null
          created_at?: string | null
          created_by?: string | null
          grade?: string | null
          id?: string
          subject?: string
          thumbnail?: string | null
          title_ar?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          receiver_id: string
          sender_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          azhar_class: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          division: string | null
          gender: string | null
          id: string
          is_banned: boolean | null
          is_forum_banned: boolean | null
          phone: string | null
          phone_parent: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          azhar_class?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          division?: string | null
          gender?: string | null
          id: string
          is_banned?: boolean | null
          is_forum_banned?: boolean | null
          phone?: string | null
          phone_parent?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          azhar_class?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          division?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean | null
          is_forum_banned?: boolean | null
          phone?: string | null
          phone_parent?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          choices: Json | null
          created_at: string | null
          difficulty: number | null
          id: string
          lesson_id: string | null
          q_text: string
          tags: string[] | null
        }
        Insert: {
          answer?: string | null
          choices?: Json | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          lesson_id?: string | null
          q_text: string
          tags?: string[] | null
        }
        Update: {
          answer?: string | null
          choices?: Json | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          lesson_id?: string | null
          q_text?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
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
      app_role: ["admin", "student", "teacher"],
    },
  },
} as const

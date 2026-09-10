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
      ai_analysis: {
        Row: {
          complaint_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          model: string | null
          raw: Json | null
          suggested_category: string | null
          suggested_department: string | null
          suggested_priority:
            | Database["public"]["Enums"]["complaint_priority"]
            | null
          summary: string | null
        }
        Insert: {
          complaint_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          raw?: Json | null
          suggested_category?: string | null
          suggested_department?: string | null
          suggested_priority?:
            | Database["public"]["Enums"]["complaint_priority"]
            | null
          summary?: string | null
        }
        Update: {
          complaint_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model?: string | null
          raw?: Json | null
          suggested_category?: string | null
          suggested_department?: string | null
          suggested_priority?:
            | Database["public"]["Enums"]["complaint_priority"]
            | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: true
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      budget_expenses: {
        Row: {
          amount: number
          budget_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          incurred_on: string
          recorded_by: string | null
          work_order_id: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incurred_on?: string
          recorded_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incurred_on?: string
          recorded_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_expenses_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          department_id: string | null
          fiscal_year: number
          id: string
          notes: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          fiscal_year: number
          id?: string
          notes?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          fiscal_year?: number
          id?: string
          notes?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_attachments: {
        Row: {
          complaint_id: string
          created_at: string
          file_name: string
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploader_id: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploader_id: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_attachments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_categories: {
        Row: {
          created_at: string
          default_priority: Database["public"]["Enums"]["complaint_priority"]
          department_id: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["complaint_priority"]
          department_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["complaint_priority"]
          department_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_comments: {
        Row: {
          author_id: string
          body: string
          complaint_id: string
          created_at: string
          id: string
          is_internal: boolean
        }
        Insert: {
          author_id: string
          body: string
          complaint_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          complaint_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "complaint_comments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_status_history: {
        Row: {
          changed_by: string | null
          complaint_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["complaint_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["complaint_status"]
        }
        Insert: {
          changed_by?: string | null
          complaint_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["complaint_status"]
        }
        Update: {
          changed_by?: string | null
          complaint_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["complaint_status"]
        }
        Relationships: [
          {
            foreignKeyName: "complaint_status_history_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          address: string | null
          assigned_to: string | null
          category_id: string | null
          city: string | null
          created_at: string
          department_id: string | null
          description: string
          feedback: string | null
          id: string
          is_deleted: boolean
          latitude: number | null
          longitude: number | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          rating: number | null
          reference_code: string
          reporter_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          description: string
          feedback?: string | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          rating?: number | null
          reference_code?: string
          reporter_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          category_id?: string | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          description?: string
          feedback?: string | null
          id?: string
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          rating?: number | null
          reference_code?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "complaint_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          active: boolean
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          rating: number | null
          specialization: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
          specialization?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
          specialization?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      os_scheduling_runs: {
        Row: {
          algorithm: string
          avg_response_time: number | null
          avg_turnaround_time: number
          avg_waiting_time: number
          cpu_utilization: number | null
          created_at: string
          id: string
          process_count: number
          run_by: string | null
          timeline: Json | null
          total_time: number
        }
        Insert: {
          algorithm: string
          avg_response_time?: number | null
          avg_turnaround_time: number
          avg_waiting_time: number
          cpu_utilization?: number | null
          created_at?: string
          id?: string
          process_count: number
          run_by?: string | null
          timeline?: Json | null
          total_time: number
        }
        Update: {
          algorithm?: string
          avg_response_time?: number | null
          avg_turnaround_time?: number
          avg_waiting_time?: number
          cpu_utilization?: number | null
          created_at?: string
          id?: string
          process_count?: number
          run_by?: string | null
          timeline?: Json | null
          total_time?: number
        }
        Relationships: []
      }
      os_scheduling_tasks: {
        Row: {
          arrival_time: number
          burst_time: number
          category: string | null
          complaint_id: string | null
          created_at: string
          created_by: string | null
          id: string
          priority: number
          process_id: string
          status: string
          task_name: string
          updated_at: string
        }
        Insert: {
          arrival_time?: number
          burst_time: number
          category?: string | null
          complaint_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: number
          process_id: string
          status?: string
          task_name: string
          updated_at?: string
        }
        Update: {
          arrival_time?: number
          burst_time?: number
          category?: string | null
          complaint_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: number
          process_id?: string
          status?: string
          task_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_scheduling_tasks_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
      work_order_updates: {
        Row: {
          created_at: string
          hours_worked: number | null
          id: string
          note: string
          photo_url: string | null
          posted_by: string | null
          status_from: Database["public"]["Enums"]["work_order_status"] | null
          status_to: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          note: string
          photo_url?: string | null
          posted_by?: string | null
          status_from?: Database["public"]["Enums"]["work_order_status"] | null
          status_to?: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          note?: string
          photo_url?: string | null
          posted_by?: string | null
          status_from?: Database["public"]["Enums"]["work_order_status"] | null
          status_to?: Database["public"]["Enums"]["work_order_status"] | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_updates_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          complaint_id: string | null
          completed_at: string | null
          contractor_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          priority: Database["public"]["Enums"]["complaint_priority"]
          reference_code: string
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          complaint_id?: string | null
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reference_code?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          complaint_id?: string | null
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["complaint_priority"]
          reference_code?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      rate_complaint: {
        Args: { _complaint_id: string; _feedback?: string; _rating: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "department_head"
        | "municipal_officer"
        | "engineer"
        | "contractor"
        | "citizen"
      complaint_priority: "low" | "medium" | "high" | "critical"
      complaint_status:
        | "submitted"
        | "acknowledged"
        | "assigned"
        | "in_progress"
        | "resolved"
        | "rejected"
        | "closed"
      work_order_status:
        | "draft"
        | "scheduled"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "super_admin",
        "admin",
        "department_head",
        "municipal_officer",
        "engineer",
        "contractor",
        "citizen",
      ],
      complaint_priority: ["low", "medium", "high", "critical"],
      complaint_status: [
        "submitted",
        "acknowledged",
        "assigned",
        "in_progress",
        "resolved",
        "rejected",
        "closed",
      ],
      work_order_status: [
        "draft",
        "scheduled",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

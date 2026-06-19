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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          payload: Json | null
          shop_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          payload?: Json | null
          shop_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          payload?: Json | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_dispatches: {
        Row: {
          attempts: number
          created_at: string | null
          date: string
          error: string | null
          id: string
          last_attempt_at: string | null
          sent_at: string | null
          shop_id: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          date: string
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          sent_at?: string | null
          shop_id?: string | null
          status: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          date?: string
          error?: string | null
          id?: string
          last_attempt_at?: string | null
          sent_at?: string | null
          shop_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefing_dispatches_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credit_id: string | null
          id: string
          note: string | null
          recorded_by: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_id?: string | null
          id?: string
          note?: string | null
          recorded_by?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_id?: string | null
          id?: string
          note?: string | null
          recorded_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "customer_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          amount_owed: number
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          is_settled: boolean
          last_payment_at: string | null
          shop_id: string | null
        }
        Insert: {
          amount_owed?: number
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_settled?: boolean
          last_payment_at?: string | null
          shop_id?: string | null
        }
        Update: {
          amount_owed?: number
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_settled?: boolean
          last_payment_at?: string | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          name: string
          sell_price: number
          shop_id: string | null
          stock_qty: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name: string
          sell_price: number
          shop_id?: string | null
          stock_qty?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          shop_id?: string | null
          stock_qty?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          actual_cash: number | null
          cashier_id: string | null
          completed_at: string | null
          completed_by: string | null
          date: string
          discrepancy: number | null
          expected_cash: number
          id: string
          shop_id: string | null
        }
        Insert: {
          actual_cash?: number | null
          cashier_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          date: string
          discrepancy?: number | null
          expected_cash: number
          id?: string
          shop_id?: string | null
        }
        Update: {
          actual_cash?: number | null
          cashier_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          date?: string
          discrepancy?: number | null
          expected_cash?: number
          id?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string | null
          sell_price: number
        }
        Insert: {
          cost_price?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id?: string | null
          sell_price: number
        }
        Update: {
          cost_price?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string | null
          sell_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          note: string | null
          payment_method: string
          shop_id: string | null
          sold_at: string
          total: number
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          note?: string | null
          payment_method: string
          shop_id?: string | null
          sold_at?: string
          total: number
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          note?: string | null
          payment_method?: string
          shop_id?: string | null
          sold_at?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          briefing_enabled: boolean
          briefing_time: string
          created_at: string | null
          currency: string
          id: string
          name: string
          owner_id: string | null
          recon_tolerance: number
          timezone: string
          whatsapp_number: string
        }
        Insert: {
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          currency?: string
          id?: string
          name: string
          owner_id?: string | null
          recon_tolerance?: number
          timezone?: string
          whatsapp_number: string
        }
        Update: {
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          currency?: string
          id?: string
          name?: string
          owner_id?: string | null
          recon_tolerance?: number
          timezone?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          pin_hash: string
          role: string
          shop_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          pin_hash: string
          role: string
          shop_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          pin_hash?: string
          role?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          p_actor_id: string
          p_new_qty: number
          p_product_id: string
          p_reason: string
        }
        Returns: undefined
      }
      briefing_data: {
        Args: { p_date: string; p_shop_id: string }
        Returns: {
          cash_status: string
          credit_count: number
          credit_total: number
          estimated_profit: number
          low_stock: Json
          low_stock_more: number
          sale_count: number
          total_revenue: number
        }[]
      }
      complete_reconciliation: {
        Args: {
          p_actor_id: string
          p_actual_cash: number
          p_cashier_id: string
          p_date: string
        }
        Returns: undefined
      }
      create_product: {
        Args: {
          p_actor_id: string
          p_category: string
          p_cost_price: number
          p_low_stock_threshold: number
          p_name: string
          p_sell_price: number
          p_stock_qty: number
        }
        Returns: string
      }
      create_sale: {
        Args: {
          p_actor_id: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_note: string
          p_payment_method: string
        }
        Returns: string
      }
      create_shop_with_owner: {
        Args: {
          p_name: string
          p_owner_name: string
          p_pin_hash: string
          p_whatsapp: string
        }
        Returns: string
      }
      create_staff: {
        Args: {
          p_name: string
          p_phone: string
          p_pin_hash: string
          p_role: string
        }
        Returns: string
      }
      current_user_owns_shop: {
        Args: { target_shop: string }
        Returns: boolean
      }
      dashboard_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          cash_status: string
          credit_count: number
          credit_total: number
          estimated_profit: number
          low_stock: Json
          low_stock_more: number
          sale_count: number
          total_revenue: number
        }[]
      }
      reconciliation_overview: {
        Args: { p_date: string }
        Returns: {
          cash_total: number
          cashier_id: string
          cashier_name: string
          completed_by_name: string
          credit_total: number
          pos_total: number
          recon_actual: number
          recon_completed_at: string
          recon_discrepancy: number
          recon_expected: number
          sales_count: number
          transfer_total: number
        }[]
      }
      record_payment: {
        Args: { p_actor_id: string; p_amount: number; p_credit_id: string }
        Returns: undefined
      }
      reset_staff_pin: {
        Args: { p_pin_hash: string; p_staff_id: string }
        Returns: undefined
      }
      set_product_active: {
        Args: { p_active: boolean; p_actor_id: string; p_product_id: string }
        Returns: undefined
      }
      set_staff_active: {
        Args: { p_active: boolean; p_staff_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_sale: {
        Args: { p_actor_id: string; p_reason: string; p_sale_id: string }
        Returns: undefined
      }
      update_product: {
        Args: {
          p_actor_id: string
          p_apply_cost: boolean
          p_category: string
          p_cost_price: number
          p_low_stock_threshold: number
          p_name: string
          p_product_id: string
          p_sell_price: number
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

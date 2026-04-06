export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          business_name: string | null
          phone: string | null
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          business_name?: string | null
          phone?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          business_name?: string | null
          phone?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          id: string
          user_id: string
          business_name: string
          owner_name: string
          business_registration_number: string | null
          email: string | null
          phone: string | null
          default_currency: string
          payment_terms: string | null
          bank_account: string | null
          reminder_message: string | null
          seal_image_url: string | null
          seal_enabled: boolean
          public_inquiry_form_enabled: boolean
          public_inquiry_form_token: string | null
          public_inquiry_intro: string | null
          public_inquiry_consent_intro: string | null
          public_inquiry_consent_retention: string | null
          public_inquiry_completion_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          owner_name: string
          business_registration_number?: string | null
          email?: string | null
          phone?: string | null
          default_currency?: string
          payment_terms?: string | null
          bank_account?: string | null
          reminder_message?: string | null
          seal_image_url?: string | null
          seal_enabled?: boolean
          public_inquiry_form_enabled?: boolean
          public_inquiry_form_token?: string | null
          public_inquiry_intro?: string | null
          public_inquiry_consent_intro?: string | null
          public_inquiry_consent_retention?: string | null
          public_inquiry_completion_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          owner_name?: string
          business_registration_number?: string | null
          email?: string | null
          phone?: string | null
          default_currency?: string
          payment_terms?: string | null
          bank_account?: string | null
          reminder_message?: string | null
          seal_image_url?: string | null
          seal_enabled?: boolean
          public_inquiry_form_enabled?: boolean
          public_inquiry_form_token?: string | null
          public_inquiry_intro?: string | null
          public_inquiry_consent_intro?: string | null
          public_inquiry_consent_retention?: string | null
          public_inquiry_completion_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_public_pages: {
        Row: {
          id: string
          user_id: string
          slug: string
          is_published: boolean
          template: string
          business_name: string
          headline: string
          intro_one_line: string
          about: string
          services: Json
          contact_phone: string
          contact_email: string
          location: string
          business_hours: string
          social_links: Json
          hero_image_url: string | null
          seo_title: string
          seo_description: string
          faq: Json
          trust_points: Json
          cta_text: string
          inquiry_cta_enabled: boolean
          ai_generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slug: string
          is_published?: boolean
          template?: string
          business_name?: string
          headline?: string
          intro_one_line?: string
          about?: string
          services?: Json
          contact_phone?: string
          contact_email?: string
          location?: string
          business_hours?: string
          social_links?: Json
          hero_image_url?: string | null
          seo_title?: string
          seo_description?: string
          faq?: Json
          trust_points?: Json
          cta_text?: string
          inquiry_cta_enabled?: boolean
          ai_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slug?: string
          is_published?: boolean
          template?: string
          business_name?: string
          headline?: string
          intro_one_line?: string
          about?: string
          services?: Json
          contact_phone?: string
          contact_email?: string
          location?: string
          business_hours?: string
          social_links?: Json
          hero_image_url?: string | null
          seo_title?: string
          seo_description?: string
          faq?: Json
          trust_points?: Json
          cta_text?: string
          inquiry_cta_enabled?: boolean
          ai_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          company_name: string | null
          phone: string | null
          email: string | null
          notes: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          company_name?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          company_name?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          title: string
          channel: string
          service_category: string
          details: string | null
          requested_date: string | null
          budget_min: number | null
          budget_max: number | null
          stage: Database["public"]["Enums"]["inquiry_stage"]
          follow_up_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          title: string
          channel?: string
          service_category: string
          details?: string | null
          requested_date?: string | null
          budget_min?: number | null
          budget_max?: number | null
          stage?: Database["public"]["Enums"]["inquiry_stage"]
          follow_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          title?: string
          channel?: string
          service_category?: string
          details?: string | null
          requested_date?: string | null
          budget_min?: number | null
          budget_max?: number | null
          stage?: Database["public"]["Enums"]["inquiry_stage"]
          follow_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          inquiry_in_app: boolean
          inquiry_browser: boolean
          inquiry_email: boolean
          quote_events_in_app: boolean
          quote_events_browser: boolean
          quote_events_email: boolean
          invoice_events_in_app: boolean
          invoice_events_browser: boolean
          invoice_events_email: boolean
          reminder_events_in_app: boolean
          reminder_events_browser: boolean
          reminder_events_email: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          inquiry_in_app?: boolean
          inquiry_browser?: boolean
          inquiry_email?: boolean
          quote_events_in_app?: boolean
          quote_events_browser?: boolean
          quote_events_email?: boolean
          invoice_events_in_app?: boolean
          invoice_events_browser?: boolean
          invoice_events_email?: boolean
          reminder_events_in_app?: boolean
          reminder_events_browser?: boolean
          reminder_events_email?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          inquiry_in_app?: boolean
          inquiry_browser?: boolean
          inquiry_email?: boolean
          quote_events_in_app?: boolean
          quote_events_browser?: boolean
          quote_events_email?: boolean
          invoice_events_in_app?: boolean
          invoice_events_browser?: boolean
          invoice_events_email?: boolean
          reminder_events_in_app?: boolean
          reminder_events_browser?: boolean
          reminder_events_email?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          link_path: string | null
          related_entity_type: string | null
          related_entity_id: string | null
          is_read: boolean
          dedupe_key: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string
          link_path?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          dedupe_key: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          link_path?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          dedupe_key?: string
          created_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          inquiry_id: string | null
          quote_number: string
          title: string
          summary: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax: number
          total: number
          sent_at: string | null
          valid_until: string | null
          public_share_token: string | null
          share_open_count: number
          share_last_opened_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          inquiry_id?: string | null
          quote_number: string
          title: string
          summary?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          total?: number
          sent_at?: string | null
          valid_until?: string | null
          public_share_token?: string | null
          share_open_count?: number
          share_last_opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          inquiry_id?: string | null
          quote_number?: string
          title?: string
          summary?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          total?: number
          sent_at?: string | null
          valid_until?: string | null
          public_share_token?: string | null
          share_open_count?: number
          share_last_opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          sort_order: number
          name: string
          description: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          sort_order?: number
          name: string
          description?: string | null
          quantity?: number
          unit_price?: number
          line_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          sort_order?: number
          name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          line_total?: number
          created_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          customer_id: string
          quote_id: string | null
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          amount: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          due_date: string | null
          paid_at: string | null
          requested_at: string | null
          notes: string | null
          public_share_token: string | null
          share_open_count: number
          share_last_opened_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id: string
          quote_id?: string | null
          invoice_number: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          due_date?: string | null
          paid_at?: string | null
          requested_at?: string | null
          notes?: string | null
          public_share_token?: string | null
          share_open_count?: number
          share_last_opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string
          quote_id?: string | null
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          amount?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          due_date?: string | null
          paid_at?: string | null
          requested_at?: string | null
          notes?: string | null
          public_share_token?: string | null
          share_open_count?: number
          share_last_opened_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          invoice_id: string
          channel: Database["public"]["Enums"]["reminder_channel"]
          message: string
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_id: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          message: string
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_id?: string
          channel?: Database["public"]["Enums"]["reminder_channel"]
          message?: string
          sent_at?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          inquiry_id: string | null
          quote_id: string | null
          invoice_id: string | null
          action: string
          description: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          inquiry_id?: string | null
          quote_id?: string | null
          invoice_id?: string | null
          action: string
          description: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          inquiry_id?: string | null
          quote_id?: string | null
          invoice_id?: string | null
          action?: string
          description?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          user_id: string
          type: string
          name: string
          content: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          name: string
          content: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          name?: string
          content?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_quote_share_payload: {
        Args: { p_token: string }
        Returns: Json
      }
      get_invoice_share_payload: {
        Args: { p_token: string }
        Returns: Json
      }
      bump_quote_share_open: {
        Args: { p_token: string }
        Returns: undefined
      }
      bump_invoice_share_open: {
        Args: { p_token: string }
        Returns: undefined
      }
      get_public_inquiry_form_payload: {
        Args: { p_token: string }
        Returns: Json
      }
      get_public_business_landing: {
        Args: { p_slug: string }
        Returns: Json
      }
      submit_public_inquiry: {
        Args: {
          p_token: string
          p_name: string
          p_phone: string
          p_email: string
          p_title: string
          p_details: string
          p_service_category: string
          p_hoped_date: string | null
          p_budget_min: number | null
          p_budget_max: number | null
          p_extra_notes: string
          p_consent: boolean
          p_honeypot: string
          p_source?: string | null
          p_source_slug?: string | null
        }
        Returns: Json
      }
      apply_public_inquiry_ai_draft: {
        Args: {
          p_token: string
          p_inquiry_id: string
          p_title: string
          p_service_category: string
          p_details: string
        }
        Returns: boolean
      }
    }
    Enums: {
      inquiry_stage: "new" | "qualified" | "quoted" | "won" | "lost"
      quote_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      invoice_type: "deposit" | "balance" | "final"
      payment_status:
        | "pending"
        | "deposit_paid"
        | "partially_paid"
        | "paid"
        | "overdue"
      reminder_channel: "sms" | "kakao" | "email" | "manual"
    }
    CompositeTypes: Record<string, never>
  }
}

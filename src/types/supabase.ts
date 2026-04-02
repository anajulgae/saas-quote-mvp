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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          business_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          business_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      business_settings: {
        Row: {
          id: string
          user_id: string
          business_name: string
          owner_name: string
          email: string | null
          phone: string | null
          default_currency: string
          payment_terms: string | null
          bank_account: string | null
          reminder_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          owner_name: string
          email?: string | null
          phone?: string | null
          default_currency?: string
          payment_terms?: string | null
          bank_account?: string | null
          reminder_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          owner_name?: string
          email?: string | null
          phone?: string | null
          default_currency?: string
          payment_terms?: string | null
          bank_account?: string | null
          reminder_message?: string | null
          created_at?: string
          updated_at?: string
        }
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
          created_at?: string
          updated_at?: string
        }
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
          created_at?: string
          updated_at?: string
        }
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
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
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

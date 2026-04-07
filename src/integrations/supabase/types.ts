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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accommodations: {
        Row: {
          amenities: string[] | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          location: string
          name: string
          notes: string | null
          rating: number | null
          status: string | null
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          amenities?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          location: string
          name: string
          notes?: string | null
          rating?: number | null
          status?: string | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          amenities?: string[] | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          location?: string
          name?: string
          notes?: string | null
          rating?: number | null
          status?: string | null
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      accounts_payable: {
        Row: {
          amount_due: number
          amount_paid: number | null
          amount_remaining: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          supplier_name: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          amount_remaining?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          supplier_name: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          amount_remaining?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          supplier_name?: string
        }
        Relationships: []
      }
      accounts_receivable: {
        Row: {
          amount_due: number
          amount_paid: number | null
          amount_remaining: number | null
          booking_id: string | null
          created_at: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_id: string | null
          last_reminder_at: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          amount_remaining?: number | null
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          amount_remaining?: number | null
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits_policies: {
        Row: {
          category: string | null
          conditions: string | null
          description: string | null
          effective_from: string | null
          eligible_level: string | null
          id: string
          name: string
          value_per_month: number | null
          value_per_year: number | null
        }
        Insert: {
          category?: string | null
          conditions?: string | null
          description?: string | null
          effective_from?: string | null
          eligible_level?: string | null
          id?: string
          name: string
          value_per_month?: number | null
          value_per_year?: number | null
        }
        Update: {
          category?: string | null
          conditions?: string | null
          description?: string | null
          effective_from?: string | null
          eligible_level?: string | null
          id?: string
          name?: string
          value_per_month?: number | null
          value_per_year?: number | null
        }
        Relationships: []
      }
      booking_itineraries: {
        Row: {
          activities: Json | null
          actual_date: string | null
          booking_id: string
          created_at: string | null
          day_number: number
          destination: string
          id: string
        }
        Insert: {
          activities?: Json | null
          actual_date?: string | null
          booking_id: string
          created_at?: string | null
          day_number: number
          destination?: string
          id?: string
        }
        Update: {
          activities?: Json | null
          actual_date?: string | null
          booking_id?: string
          created_at?: string | null
          day_number?: number
          destination?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_itineraries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_special_notes: {
        Row: {
          booking_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          note_type: string
          priority: string | null
          related_guest: string | null
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type: string
          priority?: string | null
          related_guest?: string | null
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string
          priority?: string | null
          related_guest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_special_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_special_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancellation_fee: number | null
          cancelled_reason: string | null
          code: string
          created_at: string | null
          customer_id: string | null
          department_id: string | null
          deposit_amount: number | null
          deposit_due_at: string | null
          id: string
          pax_details: Json | null
          pax_total: number | null
          quote_id: string | null
          remaining_amount: number | null
          remaining_due_at: string | null
          sale_id: string | null
          status: string | null
          total_value: number | null
        }
        Insert: {
          cancellation_fee?: number | null
          cancelled_reason?: string | null
          code: string
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          id?: string
          pax_details?: Json | null
          pax_total?: number | null
          quote_id?: string | null
          remaining_amount?: number | null
          remaining_due_at?: string | null
          sale_id?: string | null
          status?: string | null
          total_value?: number | null
        }
        Update: {
          cancellation_fee?: number | null
          cancelled_reason?: string | null
          code?: string
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          id?: string
          pax_details?: Json | null
          pax_total?: number | null
          quote_id?: string | null
          remaining_amount?: number | null
          remaining_due_at?: string | null
          sale_id?: string | null
          status?: string | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_estimate_items: {
        Row: {
          category: string
          description: string | null
          estimate_id: string
          id: string
          payment_deadline: string | null
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit_price: number | null
          vendor_id: string | null
        }
        Insert: {
          category: string
          description?: string | null
          estimate_id: string
          id?: string
          payment_deadline?: string | null
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          estimate_id?: string
          id?: string
          payment_deadline?: string | null
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit_price?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "budget_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimate_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_estimates: {
        Row: {
          advance_amount: number | null
          advance_recipient: string | null
          booking_id: string
          code: string | null
          created_at: string | null
          created_by: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          total_estimated: number | null
          updated_at: string | null
        }
        Insert: {
          advance_amount?: number | null
          advance_recipient?: string | null
          booking_id: string
          code?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_estimated?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_amount?: number | null
          advance_recipient?: string | null
          booking_id?: string
          code?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_estimated?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_estimates_advance_recipient_fkey"
            columns: ["advance_recipient"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_plans: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number | null
          category: string
          created_by: string | null
          department_id: string | null
          id: string
          month: number
          notes: string | null
          variance: number | null
          variance_pct: number | null
          year: number
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          month: number
          notes?: string | null
          variance?: number | null
          variance_pct?: number | null
          year: number
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number | null
          category?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          month?: number
          notes?: string | null
          variance?: number | null
          variance_pct?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_plans_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_settlements: {
        Row: {
          accountant_approved_at: string | null
          accountant_id: string | null
          accountant_note: string | null
          additional_amount: number | null
          advance_amount: number | null
          booking_id: string
          ceo_approved_at: string | null
          ceo_id: string | null
          ceo_note: string | null
          code: string | null
          created_at: string | null
          created_by: string
          estimate_id: string
          id: string
          refund_amount: number | null
          status: string | null
          total_actual: number | null
          total_estimated: number | null
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          accountant_approved_at?: string | null
          accountant_id?: string | null
          accountant_note?: string | null
          additional_amount?: number | null
          advance_amount?: number | null
          booking_id: string
          ceo_approved_at?: string | null
          ceo_id?: string | null
          ceo_note?: string | null
          code?: string | null
          created_at?: string | null
          created_by: string
          estimate_id: string
          id?: string
          refund_amount?: number | null
          status?: string | null
          total_actual?: number | null
          total_estimated?: number | null
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          accountant_approved_at?: string | null
          accountant_id?: string | null
          accountant_note?: string | null
          additional_amount?: number | null
          advance_amount?: number | null
          booking_id?: string
          ceo_approved_at?: string | null
          ceo_id?: string | null
          ceo_note?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string
          estimate_id?: string
          id?: string
          refund_amount?: number | null
          status?: string | null
          total_actual?: number | null
          total_estimated?: number | null
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_settlements_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_ceo_id_fkey"
            columns: ["ceo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "budget_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_travel: {
        Row: {
          accommodation_cost: number | null
          advance_amount: number | null
          approved_by: string | null
          created_at: string | null
          days_count: number | null
          destination: string
          employee_id: string
          end_date: string
          id: string
          perdiem_rate: number | null
          purpose: string | null
          receipts_url: string | null
          settlement_status: string | null
          start_date: string
          total_amount: number | null
          total_perdiem: number | null
          transport_cost: number | null
        }
        Insert: {
          accommodation_cost?: number | null
          advance_amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          days_count?: number | null
          destination: string
          employee_id: string
          end_date: string
          id?: string
          perdiem_rate?: number | null
          purpose?: string | null
          receipts_url?: string | null
          settlement_status?: string | null
          start_date: string
          total_amount?: number | null
          total_perdiem?: number | null
          transport_cost?: number | null
        }
        Update: {
          accommodation_cost?: number | null
          advance_amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          days_count?: number | null
          destination?: string
          employee_id?: string
          end_date?: string
          id?: string
          perdiem_rate?: number | null
          purpose?: string | null
          receipts_url?: string | null
          settlement_status?: string | null
          start_date?: string
          total_amount?: number | null
          total_perdiem?: number | null
          transport_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_travel_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_travel_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      career_paths: {
        Row: {
          approved_by: string | null
          department_id: string | null
          description: string | null
          from_level: string
          from_position: string | null
          id: string
          required_kpi_score: number | null
          required_months: number | null
          required_skills: Json | null
          salary_increase_pct: number | null
          to_level: string
          to_position: string | null
        }
        Insert: {
          approved_by?: string | null
          department_id?: string | null
          description?: string | null
          from_level: string
          from_position?: string | null
          id?: string
          required_kpi_score?: number | null
          required_months?: number | null
          required_skills?: Json | null
          salary_increase_pct?: number | null
          to_level: string
          to_position?: string | null
        }
        Update: {
          approved_by?: string | null
          department_id?: string | null
          description?: string | null
          from_level?: string
          from_position?: string | null
          id?: string
          required_kpi_score?: number | null
          required_months?: number | null
          required_skills?: Json | null
          salary_increase_pct?: number | null
          to_level?: string
          to_position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_paths_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_paths_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_monthly: {
        Row: {
          closing_balance: number | null
          id: string
          inflow_deposits: number | null
          inflow_other: number | null
          inflow_remaining: number | null
          month: number
          net_cashflow: number | null
          notes: string | null
          opening_balance: number | null
          outflow_commission: number | null
          outflow_office: number | null
          outflow_other: number | null
          outflow_salary: number | null
          outflow_suppliers: number | null
          outflow_tax: number | null
          total_inflow: number | null
          total_outflow: number | null
          year: number
        }
        Insert: {
          closing_balance?: number | null
          id?: string
          inflow_deposits?: number | null
          inflow_other?: number | null
          inflow_remaining?: number | null
          month: number
          net_cashflow?: number | null
          notes?: string | null
          opening_balance?: number | null
          outflow_commission?: number | null
          outflow_office?: number | null
          outflow_other?: number | null
          outflow_salary?: number | null
          outflow_suppliers?: number | null
          outflow_tax?: number | null
          total_inflow?: number | null
          total_outflow?: number | null
          year: number
        }
        Update: {
          closing_balance?: number | null
          id?: string
          inflow_deposits?: number | null
          inflow_other?: number | null
          inflow_remaining?: number | null
          month?: number
          net_cashflow?: number | null
          notes?: string | null
          opening_balance?: number | null
          outflow_commission?: number | null
          outflow_office?: number | null
          outflow_other?: number | null
          outflow_salary?: number | null
          outflow_suppliers?: number | null
          outflow_tax?: number | null
          total_inflow?: number | null
          total_outflow?: number | null
          year?: number
        }
        Relationships: []
      }
      commission_records: {
        Row: {
          approved_by: string | null
          bonus_amount: number | null
          booking_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          employee_id: string
          id: string
          month: number
          paid_at: string | null
          partner_commission: number | null
          profit_base: number | null
          revenue_base: number | null
          status: string | null
          year: number
        }
        Insert: {
          approved_by?: string | null
          bonus_amount?: number | null
          booking_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          month: number
          paid_at?: string | null
          partner_commission?: number | null
          profit_base?: number | null
          revenue_base?: number | null
          status?: string | null
          year: number
        }
        Update: {
          approved_by?: string | null
          bonus_amount?: number | null
          booking_id?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          month?: number
          paid_at?: string | null
          partner_commission?: number | null
          profit_base?: number | null
          revenue_base?: number | null
          status?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          base_percent: number | null
          bonus_overachieve_pct: number | null
          calculation_type: string | null
          created_by: string | null
          department_id: string | null
          effective_from: string | null
          id: string
          partner_commission_pct: number | null
          rule_name: string
          tiers: Json | null
        }
        Insert: {
          base_percent?: number | null
          bonus_overachieve_pct?: number | null
          calculation_type?: string | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string | null
          id?: string
          partner_commission_pct?: number | null
          rule_name: string
          tiers?: Json | null
        }
        Update: {
          base_percent?: number | null
          bonus_overachieve_pct?: number | null
          calculation_type?: string | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string | null
          id?: string
          partner_commission_pct?: number | null
          rule_name?: string
          tiers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          approved_by: string | null
          booking_id: string | null
          cancellation_terms: string | null
          code: string
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deposit_amount: number | null
          deposit_due_at: string | null
          file_url: string | null
          full_payment_due_at: string | null
          id: string
          payment_terms: Json | null
          signed_at: string | null
          signed_by_customer: string | null
          status: string | null
          total_value: number | null
        }
        Insert: {
          approved_by?: string | null
          booking_id?: string | null
          cancellation_terms?: string | null
          code: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          file_url?: string | null
          full_payment_due_at?: string | null
          id?: string
          payment_terms?: Json | null
          signed_at?: string | null
          signed_by_customer?: string | null
          status?: string | null
          total_value?: number | null
        }
        Update: {
          approved_by?: string | null
          booking_id?: string | null
          cancellation_terms?: string | null
          code?: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          file_url?: string | null
          full_payment_due_at?: string | null
          id?: string
          payment_terms?: Json | null
          signed_at?: string | null
          signed_by_customer?: string | null
          status?: string | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_file_url_fkey"
            columns: ["file_url"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_records: {
        Row: {
          amount: number | null
          cost_type: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          month: number
          reference_id: string | null
          year: number
        }
        Insert: {
          amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          month: number
          reference_id?: string | null
          year: number
        }
        Update: {
          amount?: number | null
          cost_type?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          month?: number
          reference_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segment_rules: {
        Row: {
          auto_upgrade: boolean | null
          benefits_description: string | null
          created_by: string | null
          id: string
          min_bookings: number | null
          min_months_active: number | null
          min_revenue: number | null
          segment_name: string
        }
        Insert: {
          auto_upgrade?: boolean | null
          benefits_description?: string | null
          created_by?: string | null
          id?: string
          min_bookings?: number | null
          min_months_active?: number | null
          min_revenue?: number | null
          segment_name: string
        }
        Update: {
          auto_upgrade?: boolean | null
          benefits_description?: string | null
          created_by?: string | null
          id?: string
          min_bookings?: number | null
          min_months_active?: number | null
          min_revenue?: number | null
          segment_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          tag: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          assigned_sale_id: string | null
          blacklist_reason: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_size: number | null
          contact_birthday: string | null
          contact_person: string | null
          contact_person_phone: string | null
          contact_position: string | null
          contact_status: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          employee_count: number | null
          first_booking_date: string | null
          founded_date: string | null
          full_name: string
          gender: string | null
          id: string
          id_number: string | null
          is_blacklisted: boolean | null
          issue_faced: string | null
          last_booking_date: string | null
          notes: string | null
          phone: string | null
          result: string | null
          segment: string | null
          segment_updated_at: string | null
          source: string | null
          source_id: string | null
          tax_code: string | null
          tier: string | null
          total_bookings: number | null
          total_paid: number | null
          total_revenue: number | null
          tour_interest: string | null
          type: string
          zalo_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_sale_id?: string | null
          blacklist_reason?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_size?: number | null
          contact_birthday?: string | null
          contact_person?: string | null
          contact_person_phone?: string | null
          contact_position?: string | null
          contact_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_count?: number | null
          first_booking_date?: string | null
          founded_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          is_blacklisted?: boolean | null
          issue_faced?: string | null
          last_booking_date?: string | null
          notes?: string | null
          phone?: string | null
          result?: string | null
          segment?: string | null
          segment_updated_at?: string | null
          source?: string | null
          source_id?: string | null
          tax_code?: string | null
          tier?: string | null
          total_bookings?: number | null
          total_paid?: number | null
          total_revenue?: number | null
          tour_interest?: string | null
          type: string
          zalo_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_sale_id?: string | null
          blacklist_reason?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_size?: number | null
          contact_birthday?: string | null
          contact_person?: string | null
          contact_person_phone?: string | null
          contact_position?: string | null
          contact_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_count?: number | null
          first_booking_date?: string | null
          founded_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          is_blacklisted?: boolean | null
          issue_faced?: string | null
          last_booking_date?: string | null
          notes?: string | null
          phone?: string | null
          result?: string | null
          segment?: string | null
          segment_updated_at?: string | null
          source?: string | null
          source_id?: string | null
          tax_code?: string | null
          tier?: string | null
          total_bookings?: number | null
          total_paid?: number | null
          total_revenue?: number | null
          tour_interest?: string | null
          type?: string
          zalo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_sale_id_fkey"
            columns: ["assigned_sale_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string
          customer_id: string
          department_id: string | null
          id: string
          previous_owner: string | null
          reason: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to: string
          customer_id: string
          department_id?: string | null
          id?: string
          previous_owner?: string | null
          reason?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string
          customer_id?: string
          department_id?: string | null
          id?: string
          previous_owner?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_assignments_previous_owner_fkey"
            columns: ["previous_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_sops: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_required: boolean | null
          level: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          level?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_required?: boolean | null
          level?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_sops_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          budget_monthly: number | null
          code: string
          created_at: string | null
          headcount: number | null
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          budget_monthly?: number | null
          code: string
          created_at?: string | null
          headcount?: number | null
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          budget_monthly?: number | null
          code?: string
          created_at?: string | null
          headcount?: number | null
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dept_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_public: boolean | null
          name: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_public?: boolean | null
          name: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          name?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_kpis: {
        Row: {
          achievement_pct: number | null
          actual_value: number | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          employee_id: string
          evaluated_at: string | null
          evaluated_by: string | null
          id: string
          kpi_name: string
          note: string | null
          period_type: string
          period_value: number
          period_year: number
          target_value: number
          unit: string | null
        }
        Insert: {
          achievement_pct?: number | null
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          employee_id: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_name: string
          note?: string | null
          period_type: string
          period_value: number
          period_year: number
          target_value?: number
          unit?: string | null
        }
        Update: {
          achievement_pct?: number | null
          actual_value?: number | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          employee_id?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          id?: string
          kpi_name?: string
          note?: string | null
          period_type?: string
          period_value?: number
          period_year?: number
          target_value?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_kpis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          employee_id: string
          granted: boolean | null
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          permission_key: string
        }
        Insert: {
          employee_id: string
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission_key: string
        }
        Update: {
          employee_id?: string
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          approved_by: string | null
          base_salary: number
          effective_from: string
          effective_to: string | null
          employee_id: string
          housing_allowance: number | null
          id: string
          meal_allowance: number | null
          notes: string | null
          other_allowance: number | null
          phone_allowance: number | null
          salary_structure_id: string | null
          transport_allowance: number | null
        }
        Insert: {
          approved_by?: string | null
          base_salary: number
          effective_from: string
          effective_to?: string | null
          employee_id: string
          housing_allowance?: number | null
          id?: string
          meal_allowance?: number | null
          notes?: string | null
          other_allowance?: number | null
          phone_allowance?: number | null
          salary_structure_id?: string | null
          transport_allowance?: number | null
        }
        Update: {
          approved_by?: string | null
          base_salary?: number
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          housing_allowance?: number | null
          id?: string
          meal_allowance?: number | null
          notes?: string | null
          other_allowance?: number | null
          phone_allowance?: number | null
          salary_structure_id?: string | null
          transport_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_salary_structure_id_fkey"
            columns: ["salary_structure_id"]
            isOneToOne: false
            referencedRelation: "salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          contract_expiry: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          department_id: string | null
          dependants_count: number | null
          email: string | null
          emergency_contact: string | null
          employee_code: string
          employment_type: string | null
          full_name: string
          gender: string | null
          hire_date: string | null
          id: string
          id_card: string | null
          level: string | null
          phone: string | null
          position: string | null
          probation_end_date: string | null
          profile_id: string | null
          resignation_date: string | null
          resignation_reason: string | null
          status: string | null
          tax_code: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contract_expiry?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          dependants_count?: number | null
          email?: string | null
          emergency_contact?: string | null
          employee_code: string
          employment_type?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          id_card?: string | null
          level?: string | null
          phone?: string | null
          position?: string | null
          probation_end_date?: string | null
          profile_id?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          status?: string | null
          tax_code?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          contract_expiry?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          dependants_count?: number | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string
          employment_type?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          id_card?: string | null
          level?: string | null
          phone?: string | null
          position?: string | null
          probation_end_date?: string | null
          profile_id?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          status?: string | null
          tax_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_records: {
        Row: {
          bhtn_employee_pct: number | null
          bhtn_employer_pct: number | null
          bhtn_number: string | null
          bhxh_employee_pct: number | null
          bhxh_employer_pct: number | null
          bhxh_enrolled_at: string | null
          bhxh_number: string | null
          bhyt_employee_pct: number | null
          bhyt_employer_pct: number | null
          bhyt_number: string | null
          created_at: string | null
          employee_id: string
          id: string
          monthly_contribution_employee: number | null
          monthly_contribution_employer: number | null
          status: string | null
        }
        Insert: {
          bhtn_employee_pct?: number | null
          bhtn_employer_pct?: number | null
          bhtn_number?: string | null
          bhxh_employee_pct?: number | null
          bhxh_employer_pct?: number | null
          bhxh_enrolled_at?: string | null
          bhxh_number?: string | null
          bhyt_employee_pct?: number | null
          bhyt_employer_pct?: number | null
          bhyt_number?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          monthly_contribution_employee?: number | null
          monthly_contribution_employer?: number | null
          status?: string | null
        }
        Update: {
          bhtn_employee_pct?: number | null
          bhtn_employer_pct?: number | null
          bhtn_number?: string | null
          bhxh_employee_pct?: number | null
          bhxh_employer_pct?: number | null
          bhxh_enrolled_at?: string | null
          bhxh_number?: string | null
          bhyt_employee_pct?: number | null
          bhyt_employer_pct?: number | null
          bhyt_number?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          monthly_contribution_employee?: number | null
          monthly_contribution_employer?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          file_url: string | null
          id: string
          invoice_number: string
          invoice_type: string | null
          issue_date: string | null
          payment_id: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          vat_amount: number | null
          vat_percent: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string | null
          issue_date?: string | null
          payment_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          file_url?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string | null
          issue_date?: string | null
          payment_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          channel_type: string | null
          cost_per_lead: number | null
          created_at: string | null
          id: string
          name: string
          total_leads: number | null
          tracking_code: string | null
        }
        Insert: {
          channel_type?: string | null
          cost_per_lead?: number | null
          created_at?: string | null
          id?: string
          name: string
          total_leads?: number | null
          tracking_code?: string | null
        }
        Update: {
          channel_type?: string | null
          cost_per_lead?: number | null
          created_at?: string | null
          id?: string
          name?: string
          total_leads?: number | null
          tracking_code?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_staff_name: string | null
          assigned_staff_phone: string | null
          assigned_to: string | null
          budget: number | null
          call_notes: string | null
          channel: string | null
          company_address: string | null
          company_name: string | null
          contact_status: string | null
          created_at: string | null
          customer_id: string | null
          department_id: string | null
          destination: string | null
          email: string | null
          expected_value: number | null
          follow_up_date: string | null
          full_name: string
          id: string
          interest_type: string | null
          issue_faced: string | null
          last_contact_at: string | null
          lost_reason: string | null
          next_followup_at: string | null
          pax_count: number | null
          phone: string | null
          probability_pct: number | null
          result: string | null
          source_id: string | null
          status: string | null
          temperature: string | null
          tour_interest: string | null
        }
        Insert: {
          assigned_staff_name?: string | null
          assigned_staff_phone?: string | null
          assigned_to?: string | null
          budget?: number | null
          call_notes?: string | null
          channel?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          destination?: string | null
          email?: string | null
          expected_value?: number | null
          follow_up_date?: string | null
          full_name: string
          id?: string
          interest_type?: string | null
          issue_faced?: string | null
          last_contact_at?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          pax_count?: number | null
          phone?: string | null
          probability_pct?: number | null
          result?: string | null
          source_id?: string | null
          status?: string | null
          temperature?: string | null
          tour_interest?: string | null
        }
        Update: {
          assigned_staff_name?: string | null
          assigned_staff_phone?: string | null
          assigned_to?: string | null
          budget?: number | null
          call_notes?: string | null
          channel?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_status?: string | null
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          destination?: string | null
          email?: string | null
          expected_value?: number | null
          follow_up_date?: string | null
          full_name?: string
          id?: string
          interest_type?: string | null
          issue_faced?: string | null
          last_contact_at?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          pax_count?: number | null
          phone?: string | null
          probability_pct?: number | null
          result?: string | null
          source_id?: string | null
          status?: string | null
          temperature?: string | null
          tour_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          applicable_after_months: number | null
          days_per_year: number | null
          id: string
          leave_type: string
          max_carryover: number | null
          notice_days_required: number | null
          paid: boolean | null
          requires_approval: boolean | null
        }
        Insert: {
          applicable_after_months?: number | null
          days_per_year?: number | null
          id?: string
          leave_type: string
          max_carryover?: number | null
          notice_days_required?: number | null
          paid?: boolean | null
          requires_approval?: boolean | null
        }
        Update: {
          applicable_after_months?: number | null
          days_per_year?: number | null
          id?: string
          leave_type?: string
          max_carryover?: number | null
          notice_days_required?: number | null
          paid?: boolean | null
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          total_days: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          total_days: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          total_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          recorded_by: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      office_expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          department_id: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          recorded_by: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_expenses_receipt_url_fkey"
            columns: ["receipt_url"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      other_expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          recorded_by: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "other_expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_records: {
        Row: {
          approved_by: string | null
          created_at: string | null
          date: string
          employee_id: string
          hours: number
          id: string
          notes: string | null
          ot_pay: number | null
          ot_type: string | null
          rate_multiplier: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          hours: number
          id?: string
          notes?: string | null
          ot_pay?: number | null
          ot_type?: string | null
          rate_multiplier?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          hours?: number
          id?: string
          notes?: string | null
          ot_pay?: number | null
          ot_type?: string | null
          rate_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "overtime_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_ref_code: string | null
          booking_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          payment_type: string | null
          received_by: string | null
          screenshot_url: string | null
        }
        Insert: {
          amount: number
          bank_ref_code?: string | null
          booking_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_type?: string | null
          received_by?: string | null
          screenshot_url?: string | null
        }
        Update: {
          amount?: number
          bank_ref_code?: string | null
          booking_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_type?: string | null
          received_by?: string | null
          screenshot_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          approved_by: string | null
          base_salary: number | null
          bhtn_employee: number | null
          bhtn_employer: number | null
          bhxh_employee: number | null
          bhxh_employer: number | null
          bhyt_employee: number | null
          bhyt_employer: number | null
          bonus: number | null
          commission: number | null
          deductions: number | null
          employee_id: string
          gross_salary: number | null
          id: string
          month: number
          net_salary: number | null
          notes: string | null
          ot_pay: number | null
          paid_at: string | null
          pit_amount: number | null
          status: string | null
          total_allowance: number | null
          total_employer_cost: number | null
          year: number
        }
        Insert: {
          approved_by?: string | null
          base_salary?: number | null
          bhtn_employee?: number | null
          bhtn_employer?: number | null
          bhxh_employee?: number | null
          bhxh_employer?: number | null
          bhyt_employee?: number | null
          bhyt_employer?: number | null
          bonus?: number | null
          commission?: number | null
          deductions?: number | null
          employee_id: string
          gross_salary?: number | null
          id?: string
          month: number
          net_salary?: number | null
          notes?: string | null
          ot_pay?: number | null
          paid_at?: string | null
          pit_amount?: number | null
          status?: string | null
          total_allowance?: number | null
          total_employer_cost?: number | null
          year: number
        }
        Update: {
          approved_by?: string | null
          base_salary?: number | null
          bhtn_employee?: number | null
          bhtn_employer?: number | null
          bhxh_employee?: number | null
          bhxh_employer?: number | null
          bhyt_employee?: number | null
          bhyt_employer?: number | null
          bonus?: number | null
          commission?: number | null
          deductions?: number | null
          employee_id?: string
          gross_salary?: number | null
          id?: string
          month?: number
          net_salary?: number | null
          notes?: string | null
          ot_pay?: number | null
          paid_at?: string | null
          pit_amount?: number | null
          status?: string | null
          total_allowance?: number | null
          total_employer_cost?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          email: string
          employee_id: string | null
          first_login_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          must_change_password: boolean | null
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          employee_id?: string | null
          first_login_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          employee_id?: string | null
          first_login_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_loss_monthly: {
        Row: {
          commission_cost: number | null
          ebitda: number | null
          generated_at: string | null
          gross_margin_pct: number | null
          gross_profit: number | null
          gross_revenue: number | null
          id: string
          marketing_cost: number | null
          mom_growth_pct: number | null
          month: number
          net_margin_pct: number | null
          net_profit: number | null
          office_cost: number | null
          other_cost: number | null
          salary_cost: number | null
          tax_amount: number | null
          total_opex: number | null
          tour_direct_cost: number | null
          year: number
          yoy_growth_pct: number | null
        }
        Insert: {
          commission_cost?: number | null
          ebitda?: number | null
          generated_at?: string | null
          gross_margin_pct?: number | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          marketing_cost?: number | null
          mom_growth_pct?: number | null
          month: number
          net_margin_pct?: number | null
          net_profit?: number | null
          office_cost?: number | null
          other_cost?: number | null
          salary_cost?: number | null
          tax_amount?: number | null
          total_opex?: number | null
          tour_direct_cost?: number | null
          year: number
          yoy_growth_pct?: number | null
        }
        Update: {
          commission_cost?: number | null
          ebitda?: number | null
          generated_at?: string | null
          gross_margin_pct?: number | null
          gross_profit?: number | null
          gross_revenue?: number | null
          id?: string
          marketing_cost?: number | null
          mom_growth_pct?: number | null
          month?: number
          net_margin_pct?: number | null
          net_profit?: number | null
          office_cost?: number | null
          other_cost?: number | null
          salary_cost?: number | null
          tax_amount?: number | null
          total_opex?: number | null
          tour_direct_cost?: number | null
          year?: number
          yoy_growth_pct?: number | null
        }
        Relationships: []
      }
      quotations: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          status: string | null
          total_amount: number | null
          tour_package_id: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string | null
          total_amount?: number | null
          tour_package_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          status?: string | null
          total_amount?: number | null
          tour_package_id?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tour_package_id_fkey"
            columns: ["tour_package_id"]
            isOneToOne: false
            referencedRelation: "tour_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          base_price: number | null
          code: string
          created_at: string | null
          created_by: string | null
          custom_tour_name: string | null
          customer_id: string | null
          departure_date_expected: string | null
          discount_pct: number | null
          extra_price: number | null
          extra_services: Json | null
          id: string
          lead_id: string | null
          pax_adult: number | null
          pax_child: number | null
          pax_infant: number | null
          rejection_reason: string | null
          response_at: string | null
          sent_at: string | null
          status: string | null
          total_price: number | null
          valid_until: string | null
        }
        Insert: {
          base_price?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          custom_tour_name?: string | null
          customer_id?: string | null
          departure_date_expected?: string | null
          discount_pct?: number | null
          extra_price?: number | null
          extra_services?: Json | null
          id?: string
          lead_id?: string | null
          pax_adult?: number | null
          pax_child?: number | null
          pax_infant?: number | null
          rejection_reason?: string | null
          response_at?: string | null
          sent_at?: string | null
          status?: string | null
          total_price?: number | null
          valid_until?: string | null
        }
        Update: {
          base_price?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          custom_tour_name?: string | null
          customer_id?: string | null
          departure_date_expected?: string | null
          discount_pct?: number | null
          extra_price?: number | null
          extra_services?: Json | null
          id?: string
          lead_id?: string | null
          pax_adult?: number | null
          pax_child?: number | null
          pax_infant?: number | null
          rejection_reason?: string | null
          response_at?: string | null
          sent_at?: string | null
          status?: string | null
          total_price?: number | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_records: {
        Row: {
          avg_deal_size: number | null
          booking_count: number | null
          created_at: string | null
          department_id: string | null
          gross_revenue: number | null
          id: string
          month: number
          net_revenue: number | null
          refunds: number | null
          source_type: string | null
          tour_count: number | null
          year: number
        }
        Insert: {
          avg_deal_size?: number | null
          booking_count?: number | null
          created_at?: string | null
          department_id?: string | null
          gross_revenue?: number | null
          id?: string
          month: number
          net_revenue?: number | null
          refunds?: number | null
          source_type?: string | null
          tour_count?: number | null
          year: number
        }
        Update: {
          avg_deal_size?: number | null
          booking_count?: number | null
          created_at?: string | null
          department_id?: string | null
          gross_revenue?: number | null
          id?: string
          month?: number
          net_revenue?: number | null
          refunds?: number | null
          source_type?: string | null
          tour_count?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_records_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_structures: {
        Row: {
          allowances: Json | null
          base_salary_max: number | null
          base_salary_min: number | null
          created_by: string | null
          department_id: string | null
          effective_from: string | null
          id: string
          level: string
          position: string
          probation_salary_pct: number | null
          review_cycle_months: number | null
        }
        Insert: {
          allowances?: Json | null
          base_salary_max?: number | null
          base_salary_min?: number | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string | null
          id?: string
          level: string
          position: string
          probation_salary_pct?: number | null
          review_cycle_months?: number | null
        }
        Update: {
          allowances?: Json | null
          base_salary_max?: number | null
          base_salary_min?: number | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string | null
          id?: string
          level?: string
          position?: string
          probation_salary_pct?: number | null
          review_cycle_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_structures_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_targets: {
        Row: {
          achievement_pct: number | null
          actual_bookings: number | null
          actual_new_customers: number | null
          actual_revenue: number | null
          department_id: string | null
          id: string
          last_updated_at: string | null
          month: number
          sale_id: string
          status: string | null
          target_bookings: number | null
          target_new_customers: number | null
          target_revenue: number | null
          year: number
        }
        Insert: {
          achievement_pct?: number | null
          actual_bookings?: number | null
          actual_new_customers?: number | null
          actual_revenue?: number | null
          department_id?: string | null
          id?: string
          last_updated_at?: string | null
          month: number
          sale_id: string
          status?: string | null
          target_bookings?: number | null
          target_new_customers?: number | null
          target_revenue?: number | null
          year: number
        }
        Update: {
          achievement_pct?: number | null
          actual_bookings?: number | null
          actual_new_customers?: number | null
          actual_revenue?: number | null
          department_id?: string | null
          id?: string
          last_updated_at?: string | null
          month?: number
          sale_id?: string
          status?: string | null
          target_bookings?: number | null
          target_new_customers?: number | null
          target_revenue?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_targets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_targets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          actual_amount: number | null
          category: string
          description: string | null
          estimated_amount: number | null
          id: string
          receipt_url: string | null
          settlement_id: string
          sort_order: number | null
          variance: number | null
        }
        Insert: {
          actual_amount?: number | null
          category: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          receipt_url?: string | null
          settlement_id: string
          sort_order?: number | null
          variance?: number | null
        }
        Update: {
          actual_amount?: number | null
          category?: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          receipt_url?: string | null
          settlement_id?: string
          sort_order?: number | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "budget_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          employee_id: string
          id: string
          sop_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          employee_id: string
          id?: string
          sop_id: string
        }
        Update: {
          acknowledged_at?: string | null
          employee_id?: string
          id?: string
          sop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_acknowledgements_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "department_sops"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_records: {
        Row: {
          cit_amount: number | null
          created_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          period_type: string | null
          status: string | null
          submission_deadline: string | null
          submitted_at: string | null
          vat_input: number | null
          vat_output: number | null
          vat_payable: number | null
        }
        Insert: {
          cit_amount?: number | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          period_type?: string | null
          status?: string | null
          submission_deadline?: string | null
          submitted_at?: string | null
          vat_input?: number | null
          vat_output?: number | null
          vat_payable?: number | null
        }
        Update: {
          cit_amount?: number | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          period_type?: string | null
          status?: string | null
          submission_deadline?: string | null
          submitted_at?: string | null
          vat_input?: number | null
          vat_output?: number | null
          vat_payable?: number | null
        }
        Relationships: []
      }
      tour_itineraries: {
        Row: {
          accommodation_id: string | null
          activities: Json | null
          created_at: string | null
          day_number: number
          description: string | null
          id: string
          meals_included: string[] | null
          title: string
          tour_package_id: string
          transportation: string | null
          updated_at: string | null
        }
        Insert: {
          accommodation_id?: string | null
          activities?: Json | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          id?: string
          meals_included?: string[] | null
          title: string
          tour_package_id: string
          transportation?: string | null
          updated_at?: string | null
        }
        Update: {
          accommodation_id?: string | null
          activities?: Json | null
          created_at?: string | null
          day_number?: number
          description?: string | null
          id?: string
          meals_included?: string[] | null
          title?: string
          tour_package_id?: string
          transportation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_itineraries_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_itineraries_tour_package_id_fkey"
            columns: ["tour_package_id"]
            isOneToOne: false
            referencedRelation: "tour_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_packages: {
        Row: {
          base_price: number | null
          code: string
          created_at: string | null
          currency: string | null
          description: string | null
          destination: string[] | null
          duration_days: number
          duration_nights: number | null
          exclusions: string[] | null
          id: string
          inclusions: string[] | null
          max_pax: number | null
          min_pax: number | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          code: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination?: string[] | null
          duration_days?: number
          duration_nights?: number | null
          exclusions?: string[] | null
          id?: string
          inclusions?: string[] | null
          max_pax?: number | null
          min_pax?: number | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          code?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          destination?: string[] | null
          duration_days?: number
          duration_nights?: number | null
          exclusions?: string[] | null
          id?: string
          inclusions?: string[] | null
          max_pax?: number | null
          min_pax?: number | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tour_services: {
        Row: {
          booking_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          expected_cost: number | null
          id: string
          notes: string | null
          service_type: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expected_cost?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expected_cost?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          approval_status: string | null
          approved_by: string | null
          booking_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string | null
          reference_code: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_by: string | null
          tour_service_id: string | null
          transaction_date: string
          type: string
          vendor_id: string | null
        }
        Insert: {
          amount?: number
          approval_status?: string | null
          approved_by?: string | null
          booking_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_code?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          tour_service_id?: string | null
          transaction_date?: string
          type: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_by?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          reference_code?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          tour_service_id?: string | null
          transaction_date?: string
          type?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tour_service_id_fkey"
            columns: ["tour_service_id"]
            isOneToOne: false
            referencedRelation: "tour_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          dashboard_layout: Json | null
          language: string | null
          notifications_email: boolean | null
          notifications_zalo: boolean | null
          theme: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          dashboard_layout?: Json | null
          language?: string | null
          notifications_email?: boolean | null
          notifications_zalo?: boolean | null
          theme?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          dashboard_layout?: Json | null
          language?: string | null
          notifications_email?: boolean | null
          notifications_zalo?: boolean | null
          theme?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          beneficiary: string | null
          category: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          beneficiary?: string | null
          category?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          beneficiary?: string | null
          category?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_default_permissions_for_role: {
        Args: { p_role: string }
        Returns: string[]
      }
      get_my_department_id: { Args: never; Returns: string }
      get_my_employee_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_profile_is_active: { Args: { _user_id: string }; Returns: boolean }
      get_profile_role: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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

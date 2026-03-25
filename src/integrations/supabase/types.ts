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
          booking_id: string | null
          code: string
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          file_url: string | null
          id: string
          payment_terms: Json | null
          signed_at: string | null
          signed_by_customer: string | null
          status: string | null
          total_value: number | null
        }
        Insert: {
          booking_id?: string | null
          code: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          file_url?: string | null
          id?: string
          payment_terms?: Json | null
          signed_at?: string | null
          signed_by_customer?: string | null
          status?: string | null
          total_value?: number | null
        }
        Update: {
          booking_id?: string | null
          code?: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          file_url?: string | null
          id?: string
          payment_terms?: Json | null
          signed_at?: string | null
          signed_by_customer?: string | null
          status?: string | null
          total_value?: number | null
        }
        Relationships: [
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
          company_name: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          email: string | null
          full_name: string
          id: string
          is_blacklisted: boolean | null
          last_booking_date: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          segment_updated_at: string | null
          source_id: string | null
          tax_code: string | null
          total_bookings: number | null
          total_revenue: number | null
          type: string
          zalo_id: string | null
        }
        Insert: {
          address?: string | null
          assigned_sale_id?: string | null
          blacklist_reason?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_blacklisted?: boolean | null
          last_booking_date?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          segment_updated_at?: string | null
          source_id?: string | null
          tax_code?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          type: string
          zalo_id?: string | null
        }
        Update: {
          address?: string | null
          assigned_sale_id?: string | null
          blacklist_reason?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_blacklisted?: boolean | null
          last_booking_date?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          segment_updated_at?: string | null
          source_id?: string | null
          tax_code?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
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
          assigned_to: string | null
          channel: string | null
          company_name: string | null
          created_at: string | null
          customer_id: string | null
          department_id: string | null
          email: string | null
          expected_value: number | null
          full_name: string
          id: string
          interest_type: string | null
          last_contact_at: string | null
          lost_reason: string | null
          next_followup_at: string | null
          phone: string | null
          probability_pct: number | null
          source_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          email?: string | null
          expected_value?: number | null
          full_name: string
          id?: string
          interest_type?: string | null
          last_contact_at?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          phone?: string | null
          probability_pct?: number | null
          source_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_id?: string | null
          department_id?: string | null
          email?: string | null
          expected_value?: number | null
          full_name?: string
          id?: string
          interest_type?: string | null
          last_contact_at?: string | null
          lost_reason?: string | null
          next_followup_at?: string | null
          phone?: string | null
          probability_pct?: number | null
          source_id?: string | null
          status?: string | null
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
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
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

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
            foreignKeyName: "accounts_receivable_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
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
      action_labels: {
        Row: {
          created_at: string
          key: string
          label_vi: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          key: string
          label_vi: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          key?: string
          label_vi?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_force_delete_log: {
        Row: {
          action: string | null
          admin_id: string | null
          created_at: string
          deleted_data: Json
          id: string
          reason: string
          record_id: string
          table_name: string
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          deleted_data: Json
          id?: string
          reason: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          deleted_data?: Json
          id?: string
          reason?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_force_delete_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_force_delete_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advances: {
        Row: {
          amount_approved: number | null
          amount_disbursed: number | null
          amount_refunded: number | null
          amount_requested: number
          amount_settled: number | null
          approved_at: string | null
          approved_by: string | null
          booking_id: string | null
          code: string | null
          created_at: string | null
          created_by: string
          disbursed_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          purpose: string | null
          recipient_id: string | null
          recipient_name: string
          request_date: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["advance_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_disbursed?: number | null
          amount_refunded?: number | null
          amount_requested: number
          amount_settled?: number | null
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          recipient_id?: string | null
          recipient_name: string
          request_date?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["advance_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_disbursed?: number | null
          amount_refunded?: number | null
          amount_requested?: number
          amount_settled?: number | null
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          purpose?: string | null
          recipient_id?: string | null
          recipient_name?: string
          request_date?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["advance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "advances_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          change_summary: string | null
          changed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_full_name: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          change_summary?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_full_name?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          change_summary?: string | null
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_full_name?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_tour_commission_config: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          rate_pct: number | null
          scope_type: string
          scope_value: string
          service_fee: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          rate_pct?: number | null
          scope_type: string
          scope_value: string
          service_fee?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          rate_pct?: number | null
          scope_type?: string
          scope_value?: string
          service_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      b2b_tour_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          tour_code: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          tour_code: string
          user_id?: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          tour_code?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      b2b_tours: {
        Row: {
          available_seats: string | null
          available_seats_v2: number | null
          commission_adl: number | null
          commission_chd: number | null
          commission_inf: number | null
          created_at: string
          created_by: string | null
          departure_date: string | null
          departure_date_v2: string | null
          destination: string | null
          flight_dep_code: string | null
          flight_dep_time: string | null
          flight_ret_code: string | null
          flight_ret_time: string | null
          highlights: string | null
          highlights_v2: Json | null
          hold_seats: string | null
          hold_seats_v2: number | null
          id: string
          is_active: boolean | null
          itinerary_url: string | null
          notes: string | null
          price_adl: number | null
          price_chd: number | null
          price_inf: number | null
          return_date: string | null
          return_date_v2: string | null
          seat_status: Database["public"]["Enums"]["b2b_seat_status"] | null
          target_market: string | null
          thang: string | null
          total_bookings: number
          total_revenue: number
          tour_code: string
          updated_at: string
          updated_by: string | null
          visa_deadline: string | null
          visa_deadline_v2: string | null
        }
        Insert: {
          available_seats?: string | null
          available_seats_v2?: number | null
          commission_adl?: number | null
          commission_chd?: number | null
          commission_inf?: number | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          departure_date_v2?: string | null
          destination?: string | null
          flight_dep_code?: string | null
          flight_dep_time?: string | null
          flight_ret_code?: string | null
          flight_ret_time?: string | null
          highlights?: string | null
          highlights_v2?: Json | null
          hold_seats?: string | null
          hold_seats_v2?: number | null
          id?: string
          is_active?: boolean | null
          itinerary_url?: string | null
          notes?: string | null
          price_adl?: number | null
          price_chd?: number | null
          price_inf?: number | null
          return_date?: string | null
          return_date_v2?: string | null
          seat_status?: Database["public"]["Enums"]["b2b_seat_status"] | null
          target_market?: string | null
          thang?: string | null
          total_bookings?: number
          total_revenue?: number
          tour_code: string
          updated_at?: string
          updated_by?: string | null
          visa_deadline?: string | null
          visa_deadline_v2?: string | null
        }
        Update: {
          available_seats?: string | null
          available_seats_v2?: number | null
          commission_adl?: number | null
          commission_chd?: number | null
          commission_inf?: number | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          departure_date_v2?: string | null
          destination?: string | null
          flight_dep_code?: string | null
          flight_dep_time?: string | null
          flight_ret_code?: string | null
          flight_ret_time?: string | null
          highlights?: string | null
          highlights_v2?: Json | null
          hold_seats?: string | null
          hold_seats_v2?: number | null
          id?: string
          is_active?: boolean | null
          itinerary_url?: string | null
          notes?: string | null
          price_adl?: number | null
          price_chd?: number | null
          price_inf?: number | null
          return_date?: string | null
          return_date_v2?: string | null
          seat_status?: Database["public"]["Enums"]["b2b_seat_status"] | null
          target_market?: string | null
          thang?: string | null
          total_bookings?: number
          total_revenue?: number
          tour_code?: string
          updated_at?: string
          updated_by?: string | null
          visa_deadline?: string | null
          visa_deadline_v2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2b_tours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_tours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "booking_itineraries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      booking_keys: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          key_ct: string
          notes: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          key_ct: string
          notes?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          key_ct?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_keys_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_keys_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
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
            foreignKeyName: "booking_special_notes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_special_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_special_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          b2b_tour_code: string | null
          b2b_tour_id: string | null
          booking_type: string
          cancellation_fee: number | null
          cancelled_reason: string | null
          code: string
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          department_id: string | null
          departure_date: string | null
          deposit_amount: number | null
          deposit_due_at: string | null
          id: string
          manager_id: string | null
          pax_details: Json | null
          pax_total: number | null
          quote_id: string | null
          remaining_amount: number | null
          remaining_due_at: string | null
          return_date: string | null
          sale_id: string | null
          status: string | null
          total_value: number | null
          tour_guide_id: string | null
          tour_guide_note: string | null
          tour_name_manual: string | null
          tour_package_id: string | null
        }
        Insert: {
          b2b_tour_code?: string | null
          b2b_tour_id?: string | null
          booking_type?: string
          cancellation_fee?: number | null
          cancelled_reason?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          department_id?: string | null
          departure_date?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          id?: string
          manager_id?: string | null
          pax_details?: Json | null
          pax_total?: number | null
          quote_id?: string | null
          remaining_amount?: number | null
          remaining_due_at?: string | null
          return_date?: string | null
          sale_id?: string | null
          status?: string | null
          total_value?: number | null
          tour_guide_id?: string | null
          tour_guide_note?: string | null
          tour_name_manual?: string | null
          tour_package_id?: string | null
        }
        Update: {
          b2b_tour_code?: string | null
          b2b_tour_id?: string | null
          booking_type?: string
          cancellation_fee?: number | null
          cancelled_reason?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          department_id?: string | null
          departure_date?: string | null
          deposit_amount?: number | null
          deposit_due_at?: string | null
          id?: string
          manager_id?: string | null
          pax_details?: Json | null
          pax_total?: number | null
          quote_id?: string | null
          remaining_amount?: number | null
          remaining_due_at?: string | null
          return_date?: string | null
          sale_id?: string | null
          status?: string | null
          total_value?: number | null
          tour_guide_id?: string | null
          tour_guide_note?: string | null
          tour_name_manual?: string | null
          tour_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_b2b_tour_id_fkey"
            columns: ["b2b_tour_id"]
            isOneToOne: false
            referencedRelation: "b2b_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "bookings_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "tour_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_guide_id_fkey"
            columns: ["tour_guide_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "bookings_tour_guide_id_fkey"
            columns: ["tour_guide_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_guide_id_fkey"
            columns: ["tour_guide_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_package_id_fkey"
            columns: ["tour_package_id"]
            isOneToOne: false
            referencedRelation: "tour_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          priority: string
          recipient_ids: string[]
          sent_by: string
          sent_count: number
          target_filter: Json | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          priority?: string
          recipient_ids?: string[]
          sent_by: string
          sent_count?: number
          target_filter?: Json | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          priority?: string
          recipient_ids?: string[]
          sent_by?: string
          sent_count?: number
          target_filter?: Json | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      budget_estimate_items: {
        Row: {
          category: string
          description: string | null
          estimate_id: string
          id: string
          payment_deadline: string | null
          quantity: number | null
          receipt_urls: string[]
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
          receipt_urls?: string[]
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
          receipt_urls?: string[]
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
          advance_purpose: string | null
          advance_recipient: string | null
          booking_id: string | null
          code: string | null
          created_at: string | null
          created_by: string
          estimate_type: string
          id: string
          kt_assigned_id: string | null
          last_reminder_at: string | null
          purpose: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          total_estimated: number | null
          updated_at: string | null
        }
        Insert: {
          advance_amount?: number | null
          advance_purpose?: string | null
          advance_recipient?: string | null
          booking_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by: string
          estimate_type?: string
          id?: string
          kt_assigned_id?: string | null
          last_reminder_at?: string | null
          purpose?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          total_estimated?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_amount?: number | null
          advance_purpose?: string | null
          advance_recipient?: string | null
          booking_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string
          estimate_type?: string
          id?: string
          kt_assigned_id?: string | null
          last_reminder_at?: string | null
          purpose?: string | null
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
            foreignKeyName: "budget_estimates_advance_recipient_fkey"
            columns: ["advance_recipient"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "budget_estimates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "budget_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_kt_assigned_id_fkey"
            columns: ["kt_assigned_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_kt_assigned_id_fkey"
            columns: ["kt_assigned_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_estimates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "budget_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          booking_id: string | null
          ceo_approved_at: string | null
          ceo_id: string | null
          ceo_note: string | null
          code: string | null
          created_at: string | null
          created_by: string
          estimate_id: string
          expense_date: string | null
          id: string
          kt_assigned_id: string | null
          last_reminder_at: string | null
          purpose: string | null
          refund_amount: number | null
          refund_status: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          settlement_type: string
          status: string | null
          topup_amount: number | null
          topup_status: string | null
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
          booking_id?: string | null
          ceo_approved_at?: string | null
          ceo_id?: string | null
          ceo_note?: string | null
          code?: string | null
          created_at?: string | null
          created_by: string
          estimate_id: string
          expense_date?: string | null
          id?: string
          kt_assigned_id?: string | null
          last_reminder_at?: string | null
          purpose?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_type?: string
          status?: string | null
          topup_amount?: number | null
          topup_status?: string | null
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
          booking_id?: string | null
          ceo_approved_at?: string | null
          ceo_id?: string | null
          ceo_note?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string
          estimate_id?: string
          expense_date?: string | null
          id?: string
          kt_assigned_id?: string | null
          last_reminder_at?: string | null
          purpose?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_type?: string
          status?: string | null
          topup_amount?: number | null
          topup_status?: string | null
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
            foreignKeyName: "budget_settlements_accountant_id_fkey"
            columns: ["accountant_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "budget_settlements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "budget_settlements_ceo_id_fkey"
            columns: ["ceo_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_ceo_id_fkey"
            columns: ["ceo_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "budget_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "budget_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_kt_assigned_id_fkey"
            columns: ["kt_assigned_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settlements_kt_assigned_id_fkey"
            columns: ["kt_assigned_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "business_travel_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_travel_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "business_travel_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_travel_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          actual_cost: number | null
          actual_value: number | null
          brief_type: string
          budget: number | null
          campaign_type: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          target_platforms: string[]
          target_unit: string | null
          target_value: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_value?: number | null
          brief_type?: string
          budget?: number | null
          campaign_type: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_platforms?: string[]
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_value?: number | null
          brief_type?: string
          budget?: number | null
          campaign_type?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          target_platforms?: string[]
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          assigned_hr: string | null
          created_at: string | null
          created_by: string | null
          cv_url: string | null
          department_id: string
          email: string | null
          full_name: string
          id: string
          interview_date: string | null
          interview_result: string | null
          job_posting_id: string | null
          note: string | null
          offer_salary: number | null
          phone: string | null
          position_applied: string | null
          rejection_reason: string | null
          salary_expectation: number | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_hr?: string | null
          created_at?: string | null
          created_by?: string | null
          cv_url?: string | null
          department_id: string
          email?: string | null
          full_name: string
          id?: string
          interview_date?: string | null
          interview_result?: string | null
          job_posting_id?: string | null
          note?: string | null
          offer_salary?: number | null
          phone?: string | null
          position_applied?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_hr?: string | null
          created_at?: string | null
          created_by?: string | null
          cv_url?: string | null
          department_id?: string
          email?: string | null
          full_name?: string
          id?: string
          interview_date?: string | null
          interview_result?: string | null
          job_posting_id?: string | null
          note?: string | null
          offer_salary?: number | null
          phone?: string | null
          position_applied?: string | null
          rejection_reason?: string | null
          salary_expectation?: number | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_assigned_hr_fkey"
            columns: ["assigned_hr"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_assigned_hr_fkey"
            columns: ["assigned_hr"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
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
            foreignKeyName: "career_paths_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
      cc_cau_hinh: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cc_ngay: {
        Row: {
          da_xac_nhan: boolean
          employee_id: string
          gio_ra_muon_nhat: string | null
          gio_vao_som_nhat: string | null
          id: string
          ngay: string
          phut_di_muon: number
          phut_ve_som: number
          so_phien: number
          tong_phut_lam: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          da_xac_nhan?: boolean
          employee_id: string
          gio_ra_muon_nhat?: string | null
          gio_vao_som_nhat?: string | null
          id?: string
          ngay: string
          phut_di_muon?: number
          phut_ve_som?: number
          so_phien?: number
          tong_phut_lam?: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          da_xac_nhan?: boolean
          employee_id?: string
          gio_ra_muon_nhat?: string | null
          gio_vao_som_nhat?: string | null
          id?: string
          ngay?: string
          phut_di_muon?: number
          phut_ve_som?: number
          so_phien?: number
          tong_phut_lam?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_ngay_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "cc_ngay_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_ngay_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_nhan_vien_map: {
        Row: {
          active: boolean
          created_at: string
          employee_id: string
          id: string
          invite_link: string | null
          invited_at: string | null
          invited_by: string | null
          jibble_email: string | null
          jibble_person_id: string
          jibble_status: string | null
          jibble_tt_full_name: string | null
          jibble_tt_person_id: string | null
          jibble_tt_status: string | null
          joined_at: string | null
          last_error: string | null
          latest_jibble_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          employee_id: string
          id?: string
          invite_link?: string | null
          invited_at?: string | null
          invited_by?: string | null
          jibble_email?: string | null
          jibble_person_id: string
          jibble_status?: string | null
          jibble_tt_full_name?: string | null
          jibble_tt_person_id?: string | null
          jibble_tt_status?: string | null
          joined_at?: string | null
          last_error?: string | null
          latest_jibble_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          invite_link?: string | null
          invited_at?: string | null
          invited_by?: string | null
          jibble_email?: string | null
          jibble_person_id?: string
          jibble_status?: string | null
          jibble_tt_full_name?: string | null
          jibble_tt_person_id?: string | null
          jibble_tt_status?: string | null
          joined_at?: string | null
          last_error?: string | null
          latest_jibble_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_nhan_vien_map_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "cc_nhan_vien_map_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_nhan_vien_map_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_nhan_vien_map_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_nhan_vien_map_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_su_kien: {
        Row: {
          active: boolean
          activity_id: string | null
          address: string | null
          belongs_to_date: string
          client_type: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          employee_id: string
          id: string
          is_automatic: boolean | null
          is_locked: boolean
          is_manual: boolean
          is_offline: boolean | null
          is_outside_geofence: boolean | null
          is_unusual: boolean
          jibble_created_at: string | null
          jibble_entry_id: string
          jibble_status: string | null
          jibble_updated_at: string | null
          loai: string
          location_id: string | null
          next_entry_id: string | null
          note: string | null
          prev_entry_id: string | null
          synced_at: string
          thoi_diem: string
        }
        Insert: {
          active?: boolean
          activity_id?: string | null
          address?: string | null
          belongs_to_date: string
          client_type?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          employee_id: string
          id?: string
          is_automatic?: boolean | null
          is_locked?: boolean
          is_manual?: boolean
          is_offline?: boolean | null
          is_outside_geofence?: boolean | null
          is_unusual?: boolean
          jibble_created_at?: string | null
          jibble_entry_id: string
          jibble_status?: string | null
          jibble_updated_at?: string | null
          loai: string
          location_id?: string | null
          next_entry_id?: string | null
          note?: string | null
          prev_entry_id?: string | null
          synced_at?: string
          thoi_diem: string
        }
        Update: {
          active?: boolean
          activity_id?: string | null
          address?: string | null
          belongs_to_date?: string
          client_type?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          employee_id?: string
          id?: string
          is_automatic?: boolean | null
          is_locked?: boolean
          is_manual?: boolean
          is_offline?: boolean | null
          is_outside_geofence?: boolean | null
          is_unusual?: boolean
          jibble_created_at?: string | null
          jibble_entry_id?: string
          jibble_status?: string | null
          jibble_updated_at?: string | null
          loai?: string
          location_id?: string | null
          next_entry_id?: string | null
          note?: string | null
          prev_entry_id?: string | null
          synced_at?: string
          thoi_diem?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_su_kien_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "cc_su_kien_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_su_kien_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_su_kien_lichsu: {
        Row: {
          gia_tri_cu: Json
          gia_tri_moi: Json
          id: string
          jibble_entry_id: string
          su_kien_id: string
          thoi_diem: string
        }
        Insert: {
          gia_tri_cu: Json
          gia_tri_moi: Json
          id?: string
          jibble_entry_id: string
          su_kien_id: string
          thoi_diem?: string
        }
        Update: {
          gia_tri_cu?: Json
          gia_tri_moi?: Json
          id?: string
          jibble_entry_id?: string
          su_kien_id?: string
          thoi_diem?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_su_kien_lichsu_su_kien_id_fkey"
            columns: ["su_kien_id"]
            isOneToOne: false
            referencedRelation: "cc_su_kien"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_sync_log: {
        Row: {
          bat_dau: string
          id: string
          ket_thuc: string | null
          loai_sync: string
          loi: string | null
          so_phien_cap_nhat: number
          so_phien_moi: number
          so_vi_pham_phat_sinh: number
          trang_thai: string
        }
        Insert: {
          bat_dau?: string
          id?: string
          ket_thuc?: string | null
          loai_sync: string
          loi?: string | null
          so_phien_cap_nhat?: number
          so_phien_moi?: number
          so_vi_pham_phat_sinh?: number
          trang_thai?: string
        }
        Update: {
          bat_dau?: string
          id?: string
          ket_thuc?: string | null
          loai_sync?: string
          loi?: string | null
          so_phien_cap_nhat?: number
          so_phien_moi?: number
          so_vi_pham_phat_sinh?: number
          trang_thai?: string
        }
        Relationships: []
      }
      cc_thang_da_chot: {
        Row: {
          chot_boi: string | null
          chot_luc: string | null
          da_chot: boolean
          ghi_chu: string | null
          id: string
          ky_thang: string
        }
        Insert: {
          chot_boi?: string | null
          chot_luc?: string | null
          da_chot?: boolean
          ghi_chu?: string | null
          id?: string
          ky_thang: string
        }
        Update: {
          chot_boi?: string | null
          chot_luc?: string | null
          da_chot?: boolean
          ghi_chu?: string | null
          id?: string
          ky_thang?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_thang_da_chot_chot_boi_fkey"
            columns: ["chot_boi"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_thang_da_chot_chot_boi_fkey"
            columns: ["chot_boi"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cc_vi_pham_tu_dong: {
        Row: {
          cc_ngay_id: string
          chi_tiet: Json
          created_at: string
          employee_id: string
          id: string
          loai: string
          ne_nep_vi_pham_id: string | null
          trang_thai_xet: string
        }
        Insert: {
          cc_ngay_id: string
          chi_tiet?: Json
          created_at?: string
          employee_id: string
          id?: string
          loai: string
          ne_nep_vi_pham_id?: string | null
          trang_thai_xet?: string
        }
        Update: {
          cc_ngay_id?: string
          chi_tiet?: Json
          created_at?: string
          employee_id?: string
          id?: string
          loai?: string
          ne_nep_vi_pham_id?: string | null
          trang_thai_xet?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_vi_pham_tu_dong_cc_ngay_id_fkey"
            columns: ["cc_ngay_id"]
            isOneToOne: false
            referencedRelation: "cc_ngay"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_vi_pham_tu_dong_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "cc_vi_pham_tu_dong_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_vi_pham_tu_dong_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_vi_pham_tu_dong_ne_nep_vi_pham_id_fkey"
            columns: ["ne_nep_vi_pham_id"]
            isOneToOne: false
            referencedRelation: "ne_nep_vi_pham"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "commission_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "commission_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "commission_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "commission_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
            foreignKeyName: "commission_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
      contract_versions: {
        Row: {
          change_note: string | null
          contract_id: string
          created_at: string
          created_by: string
          effective_from: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_current: boolean
          superseded_at: string | null
          version_label: string | null
          version_number: number
        }
        Insert: {
          change_note?: string | null
          contract_id: string
          created_at?: string
          created_by: string
          effective_from?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean
          superseded_at?: string | null
          version_label?: string | null
          version_number?: number
        }
        Update: {
          change_note?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string
          effective_from?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_current?: boolean
          superseded_at?: string | null
          version_label?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
            foreignKeyName: "contracts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "customer_segment_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "customer_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "customers_assigned_sale_id_fkey"
            columns: ["assigned_sale_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
      daily_reminder_settings: {
        Row: {
          department_id: string | null
          excluded_user_ids: string[]
          id: string
          is_enabled: boolean
          send_days: number[]
          send_time: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          department_id?: string | null
          excluded_user_ids?: string[]
          id?: string
          is_enabled?: boolean
          send_days?: number[]
          send_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          department_id?: string | null
          excluded_user_ids?: string[]
          id?: string
          is_enabled?: boolean
          send_days?: number[]
          send_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reminder_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      data_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string
          customer_id: string | null
          data_type: string | null
          department_id: string | null
          id: string
          previous_owner: string | null
          reason: string | null
          ref_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to: string
          customer_id?: string | null
          data_type?: string | null
          department_id?: string | null
          id?: string
          previous_owner?: string | null
          reason?: string | null
          ref_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string
          customer_id?: string | null
          data_type?: string | null
          department_id?: string | null
          id?: string
          previous_owner?: string | null
          reason?: string | null
          ref_id?: string | null
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
            foreignKeyName: "data_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "data_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "data_assignments_previous_owner_fkey"
            columns: ["previous_owner"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_permission_overrides: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          reason: string
          resource: string
          role: string
          scope: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          reason: string
          resource: string
          role: string
          scope: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          reason?: string
          resource?: string
          role?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_permission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_permission_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_permission_overrides_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
            foreignKeyName: "department_sops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "fk_dept_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: number
          message_id: string
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: number
          message_id: string
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: number
          message_id?: string
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
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
            foreignKeyName: "employee_kpis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_kpis_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          assigned_via: string
          employee_id: string
          granted: boolean | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_override: boolean
          notes: string | null
          permission_key: string
        }
        Insert: {
          assigned_via?: string
          employee_id: string
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_override?: boolean
          notes?: string | null
          permission_key: string
        }
        Update: {
          assigned_via?: string
          employee_id?: string
          granted?: boolean | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_override?: boolean
          notes?: string | null
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "employee_salaries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
          avatar_url: string | null
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
          last_review_date: string | null
          level: string | null
          next_review_date: string | null
          phone: string | null
          position: string | null
          position_code: string | null
          probation_end_date: string | null
          profile_id: string | null
          resignation_date: string | null
          resignation_reason: string | null
          status: string | null
          tax_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
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
          last_review_date?: string | null
          level?: string | null
          next_review_date?: string | null
          phone?: string | null
          position?: string | null
          position_code?: string | null
          probation_end_date?: string | null
          profile_id?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          status?: string | null
          tax_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
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
          last_review_date?: string | null
          level?: string | null
          next_review_date?: string | null
          phone?: string | null
          position?: string | null
          position_code?: string | null
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
            foreignKeyName: "employees_position_code_fkey"
            columns: ["position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      health_check_log: {
        Row: {
          check_key: string
          details: Json
          id: string
          is_new: boolean
          run_at: string
          severity: string
          violation_count: number
        }
        Insert: {
          check_key: string
          details?: Json
          id?: string
          is_new?: boolean
          run_at?: string
          severity?: string
          violation_count?: number
        }
        Update: {
          check_key?: string
          details?: Json
          id?: string
          is_new?: boolean
          run_at?: string
          severity?: string
          violation_count?: number
        }
        Relationships: []
      }
      health_check_state: {
        Row: {
          check_key: string
          last_count: number
          last_hash: string | null
          updated_at: string
        }
        Insert: {
          check_key: string
          last_count?: number
          last_hash?: string | null
          updated_at?: string
        }
        Update: {
          check_key?: string
          last_count?: number
          last_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      import_mapping_memory: {
        Row: {
          category: string
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          last_used_at: string | null
          mapping_type: string
          match_key: string
          source: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          mapping_type: string
          match_key: string
          source?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          mapping_type?: string
          match_key?: string
          source?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
      }
      import_review_queue: {
        Row: {
          created_at: string | null
          file_name: string | null
          guessed_category: string | null
          guessed_quantity: number | null
          guessed_unit_price: number | null
          guessed_vendor_id: string | null
          guessed_vendor_name: string | null
          id: string
          raw_data: Json | null
          reason: string
          review_action: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          row_index: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          guessed_category?: string | null
          guessed_quantity?: number | null
          guessed_unit_price?: number | null
          guessed_vendor_id?: string | null
          guessed_vendor_name?: string | null
          id?: string
          raw_data?: Json | null
          reason: string
          review_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_index?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          guessed_category?: string | null
          guessed_quantity?: number | null
          guessed_unit_price?: number | null
          guessed_vendor_id?: string | null
          guessed_vendor_name?: string | null
          id?: string
          raw_data?: Json | null
          reason?: string
          review_action?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          row_index?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_review_queue_guessed_vendor_id_fkey"
            columns: ["guessed_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "insurance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      intern_reviews: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          note: string | null
          result: string
          review_date: string
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          result: string
          review_date?: string
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          result?: string
          review_date?: string
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "intern_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intern_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          mention_user_ids: string[]
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string
          entity_id: string
          entity_type: string
          id?: string
          mention_user_ids?: string[]
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          mention_user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
      job_postings: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          created_at: string
          created_by: string | null
          deadline: string | null
          department_id: string
          description: string | null
          id: string
          platform_links: Json
          platforms: string[]
          position_name: string
          published_at: string | null
          quantity: number
          requirements: string | null
          salary_range: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department_id: string
          description?: string | null
          id?: string
          platform_links?: Json
          platforms?: string[]
          position_name: string
          published_at?: string | null
          quantity?: number
          requirements?: string | null
          salary_range?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          department_id?: string
          description?: string | null
          id?: string
          platform_links?: Json
          platforms?: string[]
          position_name?: string
          published_at?: string | null
          quantity?: number
          requirements?: string | null
          salary_range?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_policies: {
        Row: {
          base_fixed_ratio: number | null
          base_kpi_ratio: number | null
          bonus_tiers: Json | null
          calculation_type: string
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          kpi_penalty_rate: number | null
          role: string
          target_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          base_fixed_ratio?: number | null
          base_kpi_ratio?: number | null
          bonus_tiers?: Json | null
          calculation_type: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          kpi_penalty_rate?: number | null
          role: string
          target_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          base_fixed_ratio?: number | null
          base_kpi_ratio?: number | null
          bonus_tiers?: Json | null
          calculation_type?: string
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          kpi_penalty_rate?: number | null
          role?: string
          target_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_policies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_care_history: {
        Row: {
          contact_method: string
          contacted_at: string
          contacted_by: string
          created_at: string | null
          id: string
          lead_id: string
          next_action: string | null
          next_contact_date: string | null
          note: string | null
          result: string
        }
        Insert: {
          contact_method?: string
          contacted_at?: string
          contacted_by?: string
          created_at?: string | null
          id?: string
          lead_id: string
          next_action?: string | null
          next_contact_date?: string | null
          note?: string | null
          result?: string
        }
        Update: {
          contact_method?: string
          contacted_at?: string
          contacted_by?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          next_action?: string | null
          next_contact_date?: string | null
          note?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_care_history_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_care_history_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_care_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          company_size: number | null
          contact_count: number | null
          contact_person: string | null
          contact_position: string | null
          contact_status: string | null
          converted_customer_id: string | null
          created_at: string | null
          created_by: string | null
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
          planned_travel_date: string | null
          probability_pct: number | null
          reminder_date: string | null
          result: string | null
          source_id: string | null
          status: string | null
          tax_code: string | null
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
          company_size?: number | null
          contact_count?: number | null
          contact_person?: string | null
          contact_position?: string | null
          contact_status?: string | null
          converted_customer_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          planned_travel_date?: string | null
          probability_pct?: number | null
          reminder_date?: string | null
          result?: string | null
          source_id?: string | null
          status?: string | null
          tax_code?: string | null
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
          company_size?: number | null
          contact_count?: number | null
          contact_person?: string | null
          contact_position?: string | null
          contact_status?: string | null
          converted_customer_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          planned_travel_date?: string | null
          probability_pct?: number | null
          reminder_date?: string | null
          result?: string | null
          source_id?: string | null
          status?: string | null
          tax_code?: string | null
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
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          employment_type: string | null
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
          employment_type?: string | null
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
          employment_type?: string | null
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
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          half_day_type: string | null
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
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          half_day_type?: string | null
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
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          half_day_type?: string | null
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
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
      milestones: {
        Row: {
          campaign_id: string
          completion_pct: number | null
          created_at: string | null
          deliverables: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          order_index: number | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          completion_pct?: number | null
          created_at?: string | null
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          order_index?: number | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          completion_pct?: number | null
          created_at?: string | null
          deliverables?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order_index?: number | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_platforms: {
        Row: {
          code: string
          color: string | null
          created_at: string
          icon: string | null
          is_active: boolean
          label_vi: string
          sort_order: number
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          icon?: string | null
          is_active?: boolean
          label_vi: string
          sort_order?: number
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          is_active?: boolean
          label_vi?: string
          sort_order?: number
        }
        Relationships: []
      }
      mkt_task_attachments: {
        Row: {
          file_size_kb: number | null
          id: string
          kind: string
          label: string | null
          mime_type: string | null
          preview_image_url: string | null
          task_id: string
          uploaded_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          file_size_kb?: number | null
          id?: string
          kind: string
          label?: string | null
          mime_type?: string | null
          preview_image_url?: string | null
          task_id: string
          uploaded_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          file_size_kb?: number | null
          id?: string
          kind?: string
          label?: string | null
          mime_type?: string | null
          preview_image_url?: string | null
          task_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mkt_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_task_checklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_done: boolean
          position: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_done?: boolean
          position?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_done?: boolean
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_task_checklist_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_task_checklist_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_task_checklist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mkt_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assignee_id: string | null
          brief_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          planned_end: string | null
          planned_start: string | null
          platform_codes: string[]
          position: number
          priority: string
          product_url: string | null
          reviewer_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          brief_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          platform_codes?: string[]
          position?: number
          priority?: string
          product_url?: string | null
          reviewer_id?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assignee_id?: string | null
          brief_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          planned_end?: string | null
          planned_start?: string | null
          platform_codes?: string[]
          position?: number
          priority?: string
          product_url?: string | null
          reviewer_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mkt_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ncc_debts: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          key_ct: string
          last_paid_at: string | null
          note: string | null
          paid_amount: number | null
          remaining: number | null
          service_type: string
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          key_ct: string
          last_paid_at?: string | null
          note?: string | null
          paid_amount?: number | null
          remaining?: number | null
          service_type: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          key_ct?: string
          last_paid_at?: string | null
          note?: string | null
          paid_amount?: number | null
          remaining?: number | null
          service_type?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ncc_debts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncc_debts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "ncc_debts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ne_nep_khoan: {
        Row: {
          id: string
          muc: string
          so_tien_goc: number
          so_tien_nhan: number
          ten_khoan: string
          thang_id: string
        }
        Insert: {
          id?: string
          muc?: string
          so_tien_goc: number
          so_tien_nhan?: number
          ten_khoan: string
          thang_id: string
        }
        Update: {
          id?: string
          muc?: string
          so_tien_goc?: number
          so_tien_nhan?: number
          ten_khoan?: string
          thang_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ne_nep_khoan_thang_id_fkey"
            columns: ["thang_id"]
            isOneToOne: false
            referencedRelation: "ne_nep_thang"
            referencedColumns: ["id"]
          },
        ]
      }
      ne_nep_thang: {
        Row: {
          co_loi_nghiem_trong: boolean
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_id: string
          ghi_chu: string | null
          id: string
          ky_thang: string
          la_thang_dau: boolean
          so_lan_vi_pham: number
          tong_nhan: number
          trang_thai: string
          updated_at: string
        }
        Insert: {
          co_loi_nghiem_trong?: boolean
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id: string
          ghi_chu?: string | null
          id?: string
          ky_thang: string
          la_thang_dau?: boolean
          so_lan_vi_pham?: number
          tong_nhan?: number
          trang_thai?: string
          updated_at?: string
        }
        Update: {
          co_loi_nghiem_trong?: boolean
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string
          ghi_chu?: string | null
          id?: string
          ky_thang?: string
          la_thang_dau?: boolean
          so_lan_vi_pham?: number
          tong_nhan?: number
          trang_thai?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ne_nep_thang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_thang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_thang_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ne_nep_thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ne_nep_vi_pham: {
        Row: {
          cap_xu_ly: number
          created_at: string
          id: string
          mo_ta: string | null
          nguoi_ghi_id: string | null
          nhom: string
          thang_id: string
        }
        Insert: {
          cap_xu_ly?: number
          created_at?: string
          id?: string
          mo_ta?: string | null
          nguoi_ghi_id?: string | null
          nhom: string
          thang_id: string
        }
        Update: {
          cap_xu_ly?: number
          created_at?: string
          id?: string
          mo_ta?: string | null
          nguoi_ghi_id?: string | null
          nhom?: string
          thang_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ne_nep_vi_pham_nguoi_ghi_id_fkey"
            columns: ["nguoi_ghi_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_vi_pham_nguoi_ghi_id_fkey"
            columns: ["nguoi_ghi_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_vi_pham_thang_id_fkey"
            columns: ["thang_id"]
            isOneToOne: false
            referencedRelation: "ne_nep_thang"
            referencedColumns: ["id"]
          },
        ]
      }
      ne_nep_xet_2thang: {
        Row: {
          created_at: string
          employee_id: string
          ghi_chu: string | null
          id: string
          nguoi_chot_id: string | null
          quyet_dinh: string | null
          tong_nhan_t1: number | null
          tong_nhan_t2: number | null
          tung_bi_dung: boolean | null
          vi_pham_t2: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          ghi_chu?: string | null
          id?: string
          nguoi_chot_id?: string | null
          quyet_dinh?: string | null
          tong_nhan_t1?: number | null
          tong_nhan_t2?: number | null
          tung_bi_dung?: boolean | null
          vi_pham_t2?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          ghi_chu?: string | null
          id?: string
          nguoi_chot_id?: string | null
          quyet_dinh?: string | null
          tong_nhan_t1?: number | null
          tong_nhan_t2?: number | null
          tung_bi_dung?: boolean | null
          vi_pham_t2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ne_nep_xet_2thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ne_nep_xet_2thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_xet_2thang_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_xet_2thang_nguoi_chot_id_fkey"
            columns: ["nguoi_chot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ne_nep_xet_2thang_nguoi_chot_id_fkey"
            columns: ["nguoi_chot_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          notification_id: string | null
          provider: string | null
          provider_response: Json | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider?: string | null
          provider_response?: Json | null
          status: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider?: string | null
          provider_response?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dept_settings: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_enabled: boolean
          notes: string | null
          override_min_total: number | null
          override_priority: string | null
          override_trigger_cron: string | null
          rule_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_enabled?: boolean
          notes?: string | null
          override_min_total?: number | null
          override_priority?: string | null
          override_trigger_cron?: string | null
          rule_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_enabled?: boolean
          notes?: string | null
          override_min_total?: number | null
          override_priority?: string | null
          override_trigger_cron?: string | null
          rule_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_dept_settings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dept_settings_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["rule_code"]
          },
          {
            foreignKeyName: "notification_dept_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dept_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          action_url_template: string | null
          counters: Json
          created_at: string
          created_by: string | null
          default_priority: string
          description_vi: string | null
          id: string
          is_active: boolean
          is_system: boolean
          min_total_to_send: number
          name_vi: string
          notification_type: string
          rule_code: string
          scope_type: string
          scope_value: string
          title_template: string
          trigger_cron: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_url_template?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          default_priority?: string
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          min_total_to_send?: number
          name_vi: string
          notification_type: string
          rule_code: string
          scope_type: string
          scope_value: string
          title_template: string
          trigger_cron: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_url_template?: string | null
          counters?: Json
          created_at?: string
          created_by?: string | null
          default_priority?: string
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          min_total_to_send?: number
          name_vi?: string
          notification_type?: string
          rule_code?: string
          scope_type?: string
          scope_value?: string
          title_template?: string
          trigger_cron?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_type_config: {
        Row: {
          action_required: boolean
          action_url_template: string | null
          category: string
          created_at: string
          default_priority: string
          description: string | null
          is_active: boolean
          label_vi: string
          requires_push: boolean
          target_roles: string[] | null
          type_code: string
        }
        Insert: {
          action_required?: boolean
          action_url_template?: string | null
          category: string
          created_at?: string
          default_priority: string
          description?: string | null
          is_active?: boolean
          label_vi: string
          requires_push?: boolean
          target_roles?: string[] | null
          type_code: string
        }
        Update: {
          action_required?: boolean
          action_url_template?: string | null
          category?: string
          created_at?: string
          default_priority?: string
          description?: string | null
          is_active?: boolean
          label_vi?: string
          requires_push?: boolean
          target_roles?: string[] | null
          type_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_completed_at: string | null
          action_completed_by: string | null
          action_due_at: string | null
          action_required: boolean
          action_status: string | null
          action_url: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          escalated_at: string | null
          escalation_level: number | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          is_read: boolean | null
          message: string | null
          priority: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_completed_at?: string | null
          action_completed_by?: string | null
          action_due_at?: string | null
          action_required?: boolean
          action_status?: string | null
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_completed_at?: string | null
          action_completed_by?: string | null
          action_due_at?: string | null
          action_required?: boolean
          action_status?: string | null
          action_url?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          escalated_at?: string | null
          escalation_level?: number | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          is_read?: boolean | null
          message?: string | null
          priority?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
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
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "office_expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "office_expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          item_name: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_name: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "onboarding_checklist_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_balances: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          updated_at: string | null
          updated_by: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          updated_at?: string | null
          updated_by?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          updated_at?: string | null
          updated_by?: string | null
          year?: number
        }
        Relationships: []
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
            foreignKeyName: "overtime_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
          payment_date: string
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
          payment_date?: string
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
          payment_date?: string
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
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
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
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          actual_performance: number | null
          actual_working_days: number | null
          allowance_amount: number | null
          approved_by: string | null
          base_fixed: number | null
          base_kpi: number | null
          base_salary: number | null
          bhtn_employee: number | null
          bhtn_employer: number | null
          bhxh_employee: number | null
          bhxh_employer: number | null
          bhyt_employee: number | null
          bhyt_employer: number | null
          bonus: number | null
          bonus_amount: number | null
          ceo_approved_at: string | null
          ceo_approved_by: string | null
          commission: number | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          gross_salary: number | null
          hr_reviewed_at: string | null
          hr_reviewed_by: string | null
          id: string
          kpi_achievement_pct: number | null
          kpi_earned: number | null
          kt_confirmed_at: string | null
          kt_confirmed_by: string | null
          month: number
          net_salary: number | null
          notes: string | null
          ot_pay: number | null
          overtime_amount: number | null
          paid_at: string | null
          pit_amount: number | null
          standard_working_days: number | null
          status: string | null
          target_kpi: number | null
          total_allowance: number | null
          total_employer_cost: number | null
          unpaid_leave_days: number | null
          unpaid_leave_deduction: number | null
          year: number
        }
        Insert: {
          actual_performance?: number | null
          actual_working_days?: number | null
          allowance_amount?: number | null
          approved_by?: string | null
          base_fixed?: number | null
          base_kpi?: number | null
          base_salary?: number | null
          bhtn_employee?: number | null
          bhtn_employer?: number | null
          bhxh_employee?: number | null
          bhxh_employer?: number | null
          bhyt_employee?: number | null
          bhyt_employer?: number | null
          bonus?: number | null
          bonus_amount?: number | null
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          commission?: number | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          gross_salary?: number | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          id?: string
          kpi_achievement_pct?: number | null
          kpi_earned?: number | null
          kt_confirmed_at?: string | null
          kt_confirmed_by?: string | null
          month: number
          net_salary?: number | null
          notes?: string | null
          ot_pay?: number | null
          overtime_amount?: number | null
          paid_at?: string | null
          pit_amount?: number | null
          standard_working_days?: number | null
          status?: string | null
          target_kpi?: number | null
          total_allowance?: number | null
          total_employer_cost?: number | null
          unpaid_leave_days?: number | null
          unpaid_leave_deduction?: number | null
          year: number
        }
        Update: {
          actual_performance?: number | null
          actual_working_days?: number | null
          allowance_amount?: number | null
          approved_by?: string | null
          base_fixed?: number | null
          base_kpi?: number | null
          base_salary?: number | null
          bhtn_employee?: number | null
          bhtn_employer?: number | null
          bhxh_employee?: number | null
          bhxh_employer?: number | null
          bhyt_employee?: number | null
          bhyt_employer?: number | null
          bonus?: number | null
          bonus_amount?: number | null
          ceo_approved_at?: string | null
          ceo_approved_by?: string | null
          commission?: number | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          gross_salary?: number | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          id?: string
          kpi_achievement_pct?: number | null
          kpi_earned?: number | null
          kt_confirmed_at?: string | null
          kt_confirmed_by?: string | null
          month?: number
          net_salary?: number | null
          notes?: string | null
          ot_pay?: number | null
          overtime_amount?: number | null
          paid_at?: string | null
          pit_amount?: number | null
          standard_working_days?: number | null
          status?: string | null
          target_kpi?: number | null
          total_allowance?: number | null
          total_employer_cost?: number | null
          unpaid_leave_days?: number | null
          unpaid_leave_deduction?: number | null
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
            foreignKeyName: "payroll_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_ceo_approved_by_fkey"
            columns: ["ceo_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_ceo_approved_by_fkey"
            columns: ["ceo_approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_hr_reviewed_by_fkey"
            columns: ["hr_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_hr_reviewed_by_fkey"
            columns: ["hr_reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_kt_confirmed_by_fkey"
            columns: ["kt_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_kt_confirmed_by_fkey"
            columns: ["kt_confirmed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions_audit: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_scope: string | null
          old_scope: string | null
          operation: string
          reason: string | null
          resource: string
          role: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_scope?: string | null
          old_scope?: string | null
          operation: string
          reason?: string | null
          resource: string
          role: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_scope?: string | null
          old_scope?: string | null
          operation?: string
          reason?: string | null
          resource?: string
          role?: string
        }
        Relationships: []
      }
      permissions_health_log: {
        Row: {
          checked_at: string
          dead_count: number
          dead_keys: string[]
          drift_count: number
          drift_keys: string[]
          id: string
          status: string
        }
        Insert: {
          checked_at?: string
          dead_count?: number
          dead_keys?: string[]
          drift_count?: number
          drift_keys?: string[]
          id?: string
          status: string
        }
        Update: {
          checked_at?: string
          dead_count?: number
          dead_keys?: string[]
          drift_count?: number
          drift_keys?: string[]
          id?: string
          status?: string
        }
        Relationships: []
      }
      position_role_mapping: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position_code: string
          position_label_vi: string
          suggested_system_role: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position_code: string
          position_label_vi: string
          suggested_system_role: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position_code?: string
          position_label_vi?: string
          suggested_system_role?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          code: string
          created_at: string
          label_vi: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          label_vi: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          label_vi?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_reason: string | null
          department_id: string | null
          email: string
          employee_id: string | null
          employment_status: string
          first_login_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          must_change_password: boolean | null
          phone: string | null
          push_prompt_seen_at: string | null
          push_snooze_until: string | null
          role: string | null
          terminated_at: string | null
          terminated_reason: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          department_id?: string | null
          email: string
          employee_id?: string | null
          employment_status?: string
          first_login_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          push_prompt_seen_at?: string | null
          push_snooze_until?: string | null
          role?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          department_id?: string | null
          email?: string
          employee_id?: string | null
          employment_status?: string
          first_login_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          push_prompt_seen_at?: string | null
          push_snooze_until?: string | null
          role?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
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
      push_send_log: {
        Row: {
          created_at: string
          error: string | null
          errors: Json | null
          http_status: number | null
          id: string
          notes: string | null
          notification_id: string | null
          notification_type: string | null
          onesignal_id: string | null
          recipients_count: number | null
          request_id: number | null
          response_at: string | null
          retry_after: string | null
          retry_count: number
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          errors?: Json | null
          http_status?: number | null
          id?: string
          notes?: string | null
          notification_id?: string | null
          notification_type?: string | null
          onesignal_id?: string | null
          recipients_count?: number | null
          request_id?: number | null
          response_at?: string | null
          retry_after?: string | null
          retry_count?: number
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          errors?: Json | null
          http_status?: number | null
          id?: string
          notes?: string | null
          notification_id?: string | null
          notification_type?: string | null
          onesignal_id?: string | null
          recipients_count?: number | null
          request_id?: number | null
          response_at?: string | null
          retry_after?: string | null
          retry_count?: number
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quotation_request_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string
          description: string | null
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          request_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          request_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string
          description?: string | null
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quotation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_requests_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_request_items: {
        Row: {
          created_at: string
          id: string
          note: string | null
          quantity: number | null
          request_id: string
          service_group: string
          service_type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          quantity?: number | null
          request_id: string
          service_group: string
          service_type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          quantity?: number | null
          request_id?: string
          service_group?: string
          service_type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quotation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_requests_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_request_options: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          margin_percent: number | null
          note: string | null
          option_name: string
          request_id: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          margin_percent?: number | null
          note?: string | null
          option_name: string
          request_id: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          margin_percent?: number | null
          note?: string | null
          option_name?: string
          request_id?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_request_options_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quotation_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_request_options_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_requests_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_request_options_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          note: string | null
          option_id: string
          supplier_name: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          option_id: string
          supplier_name?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          option_id?: string
          supplier_name?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_request_options_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "quotation_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_request_options_items_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "quotation_request_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_requests: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          code: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          deadline: string | null
          departure_date: string | null
          destination: string | null
          duration_days: number | null
          duration_nights: number | null
          end_date: string | null
          event_type: string | null
          id: string
          lead_id: string | null
          pax_count: number | null
          requested_by: string
          special_requests: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          code: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          deadline?: string | null
          departure_date?: string | null
          destination?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          lead_id?: string | null
          pax_count?: number | null
          requested_by: string
          special_requests?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          deadline?: string | null
          departure_date?: string | null
          destination?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          lead_id?: string | null
          pax_count?: number | null
          requested_by?: string
          special_requests?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          destination: string | null
          id: string
          lead_id: string | null
          notes: string | null
          pax_count: number | null
          quotation_type: string | null
          status: string | null
          total_amount: number | null
          tour_package_id: string | null
          tour_program_link: string | null
          travel_date_from: string | null
          travel_date_to: string | null
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
          destination?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          pax_count?: number | null
          quotation_type?: string | null
          status?: string | null
          total_amount?: number | null
          tour_package_id?: string | null
          tour_program_link?: string | null
          travel_date_from?: string | null
          travel_date_to?: string | null
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
          destination?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          pax_count?: number | null
          quotation_type?: string | null
          status?: string | null
          total_amount?: number | null
          tour_package_id?: string | null
          tour_program_link?: string | null
          travel_date_from?: string | null
          travel_date_to?: string | null
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
      raw_contacts: {
        Row: {
          assigned_to: string | null
          call_count: number | null
          company_name: string | null
          company_size: string | null
          contact_type: string | null
          converted_lead_id: string | null
          created_at: string | null
          created_by: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          last_called_at: string | null
          note: string | null
          phone: string
          planned_event_date: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          call_count?: number | null
          company_name?: string | null
          company_size?: string | null
          contact_type?: string | null
          converted_lead_id?: string | null
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_called_at?: string | null
          note?: string | null
          phone: string
          planned_event_date?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          call_count?: number | null
          company_name?: string | null
          company_size?: string | null
          contact_type?: string | null
          converted_lead_id?: string | null
          created_at?: string | null
          created_by?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_called_at?: string | null
          note?: string | null
          phone?: string
          planned_event_date?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_contacts_converted_lead_id_fkey"
            columns: ["converted_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_contacts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          department_id: string | null
          description: string
          expense_table: string
          id: string
          is_active: boolean | null
          last_generated_month: string | null
          notes: string | null
          recurrence: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          department_id?: string | null
          description: string
          expense_table?: string
          id?: string
          is_active?: boolean | null
          last_generated_month?: string | null
          notes?: string | null
          recurrence?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          department_id?: string | null
          description?: string
          expense_table?: string
          id?: string
          is_active?: boolean | null
          last_generated_month?: string | null
          notes?: string | null
          recurrence?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_labels: {
        Row: {
          created_at: string
          key: string
          label_vi: string
          module_group: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          key: string
          label_vi: string
          module_group?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          key?: string
          label_vi?: string
          module_group?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      role_labels: {
        Row: {
          cap_bac: number
          created_at: string
          department_hint: string | null
          is_seed_only: boolean
          label_full: string
          label_medium: string
          label_short: string
          role_key: string
          updated_at: string
        }
        Insert: {
          cap_bac: number
          created_at?: string
          department_hint?: string | null
          is_seed_only?: boolean
          label_full: string
          label_medium: string
          label_short: string
          role_key: string
          updated_at?: string
        }
        Update: {
          cap_bac?: number
          created_at?: string
          department_hint?: string | null
          is_seed_only?: boolean
          label_full?: string
          label_medium?: string
          label_short?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          id: string
          resource: string
          role: string
          scope: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          id?: string
          resource: string
          role: string
          scope?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          id?: string
          resource?: string
          role?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "salary_structures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
          {
            foreignKeyName: "sale_targets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_tab_visibility: {
        Row: {
          created_at: string | null
          id: string
          is_admin_only: boolean
          sort_order: number
          tab_key: string
          tab_label_vi: string
          updated_at: string | null
          visible_to_roles: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin_only?: boolean
          sort_order?: number
          tab_key: string
          tab_label_vi: string
          updated_at?: string | null
          visible_to_roles?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin_only?: boolean
          sort_order?: number
          tab_key?: string
          tab_label_vi?: string
          updated_at?: string | null
          visible_to_roles?: string[]
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          actual_amount: number | null
          category: string
          description: string | null
          estimated_amount: number | null
          id: string
          receipt_url: string | null
          receipt_urls: string[]
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
          receipt_urls?: string[]
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
          receipt_urls?: string[]
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
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "sop_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      task_logs: {
        Row: {
          action: string
          comment: string | null
          created_at: string | null
          hours_logged: number | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string | null
          hours_logged?: number | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string | null
          hours_logged?: number | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          campaign_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          estimated_hours: number | null
          id: string
          milestone_id: string | null
          priority: string | null
          reporter_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          campaign_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          priority?: string | null
          reporter_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          campaign_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          estimated_hours?: number | null
          id?: string
          milestone_id?: string | null
          priority?: string | null
          reporter_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
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
      tour_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          document_name: string | null
          document_type: string
          file_mime_type: string | null
          file_url: string
          id: string
          is_current_version: boolean
          linked_entity_id: string | null
          linked_entity_type: string | null
          source: string | null
          status: string
          tour_file_id: string
          uploaded_at: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          document_name?: string | null
          document_type: string
          file_mime_type?: string | null
          file_url: string
          id?: string
          is_current_version?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          source?: string | null
          status?: string
          tour_file_id: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          document_name?: string | null
          document_type?: string
          file_mime_type?: string | null
          file_url?: string
          id?: string
          is_current_version?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          source?: string | null
          status?: string
          tour_file_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_tour_file_id_fkey"
            columns: ["tour_file_id"]
            isOneToOne: false
            referencedRelation: "tour_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_file_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage: string | null
          id: string
          reason: string | null
          to_stage: string
          tour_file_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: string | null
          id?: string
          reason?: string | null
          to_stage: string
          tour_file_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage?: string | null
          id?: string
          reason?: string | null
          to_stage?: string
          tour_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_file_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_file_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_file_status_history_tour_file_id_fkey"
            columns: ["tour_file_id"]
            isOneToOne: false
            referencedRelation: "tour_files"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_files: {
        Row: {
          accountant_owner_id: string | null
          booking_id: string | null
          booking_type: string
          created_at: string
          created_by: string | null
          current_stage: string
          customer_id: string | null
          department_id: string | null
          departure_date: string | null
          destination: string | null
          duration_days: number | null
          duration_nights: number | null
          group_size_confirmed: number | null
          group_size_estimated: number | null
          id: string
          lead_id: string | null
          manager_owner_id: string | null
          next_action_due_at: string | null
          notes: string | null
          operation_owner_id: string | null
          return_date: string | null
          risk_level: string
          route: string | null
          sale_owner_id: string | null
          status: string
          tour_file_code: string
          tour_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accountant_owner_id?: string | null
          booking_id?: string | null
          booking_type: string
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer_id?: string | null
          department_id?: string | null
          departure_date?: string | null
          destination?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          group_size_confirmed?: number | null
          group_size_estimated?: number | null
          id?: string
          lead_id?: string | null
          manager_owner_id?: string | null
          next_action_due_at?: string | null
          notes?: string | null
          operation_owner_id?: string | null
          return_date?: string | null
          risk_level?: string
          route?: string | null
          sale_owner_id?: string | null
          status?: string
          tour_file_code: string
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accountant_owner_id?: string | null
          booking_id?: string | null
          booking_type?: string
          created_at?: string
          created_by?: string | null
          current_stage?: string
          customer_id?: string | null
          department_id?: string | null
          departure_date?: string | null
          destination?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          group_size_confirmed?: number | null
          group_size_estimated?: number | null
          id?: string
          lead_id?: string | null
          manager_owner_id?: string | null
          next_action_due_at?: string | null
          notes?: string | null
          operation_owner_id?: string | null
          return_date?: string | null
          risk_level?: string
          route?: string | null
          sale_owner_id?: string | null
          status?: string
          tour_file_code?: string
          tour_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_files_accountant_owner_id_fkey"
            columns: ["accountant_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_accountant_owner_id_fkey"
            columns: ["accountant_owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "tour_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_manager_owner_id_fkey"
            columns: ["manager_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_manager_owner_id_fkey"
            columns: ["manager_owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_operation_owner_id_fkey"
            columns: ["operation_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_operation_owner_id_fkey"
            columns: ["operation_owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_sale_owner_id_fkey"
            columns: ["sale_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_sale_owner_id_fkey"
            columns: ["sale_owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_files_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_guests: {
        Row: {
          booking_id: string
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          id_number: string | null
          id_type: string | null
          is_leader: boolean | null
          phone: string | null
          room_assignment: string | null
          special_request: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_leader?: boolean | null
          phone?: string | null
          room_assignment?: string | null
          special_request?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          is_leader?: boolean | null
          phone?: string | null
          room_assignment?: string | null
          special_request?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      tour_guides: {
        Row: {
          bank_account: string | null
          cccd: string | null
          created_at: string
          daily_allowance: number | null
          full_name: string
          id: string
          is_active: boolean
          license_no: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          cccd?: string | null
          created_at?: string
          daily_allowance?: number | null
          full_name: string
          id?: string
          is_active?: boolean
          license_no?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          cccd?: string | null
          created_at?: string
          daily_allowance?: number | null
          full_name?: string
          id?: string
          is_active?: boolean
          license_no?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
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
      tour_managers: {
        Row: {
          code: string
          created_at: string | null
          department_id: string | null
          display_name: string
          id: string
          is_active: boolean | null
          profile_id: string | null
          role_label: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          department_id?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          profile_id?: string | null
          role_label?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          department_id?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          profile_id?: string | null
          role_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_managers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_managers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "tour_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
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
      tour_tasks: {
        Row: {
          assigned_by: string | null
          checked_at: string | null
          checked_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          department: string | null
          description: string | null
          due_at: string | null
          escalated_at: string | null
          evidence_required: boolean
          evidence_type: string | null
          evidence_url: string | null
          id: string
          owner_id: string
          priority: string
          read_at: string | null
          reject_reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          started_at: string | null
          status: string
          task_code: string | null
          title: string
          tour_file_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          due_at?: string | null
          escalated_at?: string | null
          evidence_required?: boolean
          evidence_type?: string | null
          evidence_url?: string | null
          id?: string
          owner_id: string
          priority?: string
          read_at?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          started_at?: string | null
          status?: string
          task_code?: string | null
          title: string
          tour_file_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          due_at?: string | null
          escalated_at?: string | null
          evidence_required?: boolean
          evidence_type?: string | null
          evidence_url?: string | null
          id?: string
          owner_id?: string
          priority?: string
          read_at?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          started_at?: string | null
          status?: string
          task_code?: string | null
          title?: string
          tour_file_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_tasks_tour_file_id_fkey"
            columns: ["tour_file_id"]
            isOneToOne: false
            referencedRelation: "tour_files"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sections: {
        Row: {
          audience_roles: string[]
          content_html: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience_roles: string[]
          content_html: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience_roles?: string[]
          content_html?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          accountant_reviewed_at: string | null
          accountant_reviewed_by: string | null
          amount: number
          approval_status: string | null
          approved_by: string | null
          booking_id: string | null
          category: string
          created_at: string | null
          description: string | null
          evidence_url: string | null
          expense_category_id: string | null
          hr_reviewed_at: string | null
          hr_reviewed_by: string | null
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
          accountant_reviewed_at?: string | null
          accountant_reviewed_by?: string | null
          amount?: number
          approval_status?: string | null
          approved_by?: string | null
          booking_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          evidence_url?: string | null
          expense_category_id?: string | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
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
          accountant_reviewed_at?: string | null
          accountant_reviewed_by?: string | null
          amount?: number
          approval_status?: string | null
          approved_by?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          evidence_url?: string | null
          expense_category_id?: string | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
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
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "transactions_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
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
            foreignKeyName: "transactions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
            foreignKeyName: "transactions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
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
      user_google_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          google_email: string | null
          id_token: string | null
          refresh_token: string
          scope: string
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          id_token?: string | null
          refresh_token: string
          scope: string
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          id_token?: string | null
          refresh_token?: string
          scope?: string
          token_type?: string
          updated_at?: string
          user_id?: string
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
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_rates: {
        Row: {
          created_at: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          rate: number
          tour_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate: number
          tour_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate?: number
          tour_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      work_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string | null
          id: string
          is_working: boolean
          note: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time?: string | null
          id?: string
          is_working?: boolean
          note?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string | null
          id?: string
          is_working?: boolean
          note?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "branch_dashboard_payroll"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_active_employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      branch_dashboard_kpi: {
        Row: {
          bookings_confirmed: number | null
          bookings_lost: number | null
          department_id: string | null
          total_customers: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_dashboard_payroll: {
        Row: {
          department_id: string | null
          employee_id: string | null
          full_name: string | null
          gross_salary: number | null
          month: number | null
          net_salary: number | null
          status: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_dashboard_revenue: {
        Row: {
          booking_count: number | null
          department_id: string | null
          month: string | null
          revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_employees: {
        Row: {
          address: string | null
          avatar_url: string | null
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
          employee_code: string | null
          employment_type: string | null
          full_name: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          id_card: string | null
          last_review_date: string | null
          next_review_date: string | null
          phone: string | null
          position: string | null
          position_code: string | null
          probation_end_date: string | null
          profile_id: string | null
          resignation_date: string | null
          resignation_reason: string | null
          status: string | null
          tax_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
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
          employee_code?: string | null
          employment_type?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          id_card?: string | null
          last_review_date?: string | null
          next_review_date?: string | null
          phone?: string | null
          position?: string | null
          position_code?: string | null
          probation_end_date?: string | null
          profile_id?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          status?: string | null
          tax_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
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
          employee_code?: string | null
          employment_type?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          id_card?: string | null
          last_review_date?: string | null
          next_review_date?: string | null
          phone?: string | null
          position?: string | null
          position_code?: string | null
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
            foreignKeyName: "employees_position_code_fkey"
            columns: ["position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_active_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_reason: string | null
          department_id: string | null
          email: string | null
          employee_id: string | null
          employment_status: string | null
          first_login_at: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_login: string | null
          must_change_password: boolean | null
          phone: string | null
          push_prompt_seen_at: string | null
          push_snooze_until: string | null
          role: string | null
          terminated_at: string | null
          terminated_reason: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          employment_status?: string | null
          first_login_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          push_prompt_seen_at?: string | null
          push_snooze_until?: string | null
          role?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_reason?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          employment_status?: string | null
          first_login_at?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_login?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          push_prompt_seen_at?: string | null
          push_snooze_until?: string | null
          role?: string | null
          terminated_at?: string | null
          terminated_reason?: string | null
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
      v_admin_delete_coverage: {
        Row: {
          approx_row_count: number | null
          cascade_children: string[] | null
          has_admin_policy: boolean | null
          tablename: unknown
        }
        Relationships: []
      }
      v_finance_by_year: {
        Row: {
          booking_code: string | null
          booking_id: string | null
          booking_type: string | null
          cp_chua_vat: number | null
          cp_gom_vat: number | null
          dt_chua_vat: number | null
          dt_gom_vat: number | null
          ln_gop: number | null
          year: number | null
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
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_tour_finance_correct"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      v_finance_dashboard: {
        Row: {
          advances_chua_settle: number | null
          ap_chinh_thuc: number | null
          chenh_lech_ap_no_ngam: number | null
          chua_thu_ar: number | null
          cp_van_hanh: number | null
          da_chi_tour: number | null
          da_thu_ar: number | null
          hh_doi_tac: number | null
          ln_dong_tien: number | null
          ln_gop_du_kien: number | null
          ln_rong: number | null
          no_ncc_theo_key: number | null
          so_du_dau_ky: number | null
          ton_quy_sau_thue: number | null
          ton_quy_truoc_thue: number | null
          tong_cp_gom_vat: number | null
          tong_dt_gom_vat: number | null
          tong_no_ngam: number | null
          vat_dau_ra: number | null
          vat_dau_vao: number | null
          vat_phai_nop: number | null
        }
        Relationships: []
      }
      v_push_health: {
        Row: {
          created_at: string | null
          id: string | null
          pre_request_error: string | null
          request_id: number | null
          response_body: string | null
          response_error: string | null
          status_code: number | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_push_stats_7d: {
        Row: {
          failed_count: number | null
          last_success_at: string | null
          no_sub_count: number | null
          success_count: number | null
          success_pct: number | null
          total: number | null
          type: string | null
        }
        Relationships: []
      }
      v_quotation_requests_summary: {
        Row: {
          assigned_to: string | null
          code: string | null
          completed_at: string | null
          completed_options: number | null
          created_at: string | null
          deadline: string | null
          departure_date: string | null
          destination: string | null
          end_date: string | null
          event_type: string | null
          hours_remaining: number | null
          id: string | null
          is_overdue: boolean | null
          item_count: number | null
          pax_count: number | null
          requested_by: string | null
          standard_price: number | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          code?: string | null
          completed_at?: string | null
          completed_options?: never
          created_at?: string | null
          deadline?: string | null
          departure_date?: string | null
          destination?: string | null
          end_date?: string | null
          event_type?: string | null
          hours_remaining?: never
          id?: string | null
          is_overdue?: never
          item_count?: never
          pax_count?: number | null
          requested_by?: string | null
          standard_price?: never
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          code?: string | null
          completed_at?: string | null
          completed_options?: never
          created_at?: string | null
          deadline?: string | null
          departure_date?: string | null
          destination?: string | null
          end_date?: string | null
          event_type?: string | null
          hours_remaining?: never
          id?: string | null
          is_overdue?: never
          item_count?: never
          pax_count?: number | null
          requested_by?: string | null
          standard_price?: never
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: []
      }
      v_sensitive_delete_coverage: {
        Row: {
          has_alert_trigger: boolean | null
          table_name: unknown
        }
        Relationships: []
      }
      v_tour_finance_correct: {
        Row: {
          booking_code: string | null
          booking_id: string | null
          booking_status: string | null
          booking_type: string | null
          con_phai_thu: number | null
          cp_chua_vat: number | null
          cp_gom_vat: number | null
          da_chi_gom_vat: number | null
          da_thu_gom_vat: number | null
          departure_date: string | null
          dt_chua_vat_da_thu: number | null
          dt_chua_vat_phai_thu: number | null
          hh_doi_tac: number | null
          ln_dong_tien: number | null
          ln_gop_ke_toan: number | null
          manager_name: string | null
          tong_dt_gom_vat_phai_thu: number | null
          trang_thai_chi: string | null
          trang_thai_ln: string | null
          trang_thai_thu: string | null
          vat_dau_ra: number | null
          vat_dau_vao: number | null
          vat_phai_nop: number | null
          vat_rate: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_anonymize_employee: {
        Args: { p_employee_id: string; p_reason: string }
        Returns: Json
      }
      admin_check_employee_dependencies: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      admin_force_delete_booking: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: Json
      }
      admin_force_delete_customer: {
        Args: { p_customer_id: string; p_reason: string }
        Returns: Json
      }
      admin_force_delete_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      admin_handle_booking: {
        Args: { p_action: string; p_booking_id: string; p_reason: string }
        Returns: Json
      }
      admin_hard_delete_employee: {
        Args: { p_employee_id: string; p_reason: string }
        Returns: Json
      }
      apply_role_permissions_changes: {
        Args: { _changes: Json }
        Returns: Json
      }
      b2b_get_tour_detail: {
        Args: { _tour_id: string }
        Returns: {
          available_seats: string
          departure_date: string
          destination: string
          flight_dep_code: string
          flight_dep_time: string
          flight_ret_code: string
          flight_ret_time: string
          highlights: string
          hold_seats: string
          id: string
          itinerary_url: string
          net_commission_adl: number
          net_commission_chd: number
          net_commission_inf: number
          notes: string
          price_adl: number
          price_chd: number
          price_inf: number
          return_date: string
          target_market: string
          thang: string
          total_bookings: number
          total_revenue: number
          tour_code: string
          visa_deadline: string
        }[]
      }
      b2b_get_tours_list: {
        Args: never
        Returns: {
          available_seats: string
          available_seats_v2: number
          created_at: string
          created_by: string
          creator_name: string
          departure_date: string
          departure_date_v2: string
          destination: string
          flight_dep_code: string
          flight_dep_time: string
          flight_ret_code: string
          flight_ret_time: string
          highlights: string
          highlights_v2: Json
          hold_seats: string
          hold_seats_v2: number
          id: string
          itinerary_url: string
          net_commission_adl: number
          net_commission_chd: number
          net_commission_inf: number
          notes: string
          price_adl: number
          price_chd: number
          price_inf: number
          return_date: string
          return_date_v2: string
          seat_status: Database["public"]["Enums"]["b2b_seat_status"]
          target_market: string
          thang: string
          total_bookings: number
          total_revenue: number
          tour_code: string
          updated_at: string
          visa_deadline: string
          visa_deadline_v2: string
        }[]
      }
      b2b_resolve_service_fee: { Args: { _tour_id: string }; Returns: number }
      can_access_tour_file: {
        Args: { _tour_file_id: string }
        Returns: boolean
      }
      can_create_tour_file: { Args: never; Returns: boolean }
      can_write_job_attachment: {
        Args: { _job_id: string; _uid: string }
        Returns: boolean
      }
      cc_chot_thang: { Args: { p_ky_thang: string }; Returns: undefined }
      cc_day_vi_pham_sang_ne_nep: {
        Args: { p_vi_pham_id: string }
        Returns: string
      }
      cc_tinh_lai_ngay: {
        Args: { p_employee: string; p_ngay: string }
        Returns: undefined
      }
      check_push_degraded: { Args: never; Returns: Json }
      count_employees_by_role: {
        Args: { _role: string }
        Returns: {
          total: number
          with_override: number
        }[]
      }
      derive_position_from_role: { Args: { p_role: string }; Returns: string }
      doc_audience_groups_for_role: {
        Args: { p_role: string }
        Returns: string[]
      }
      ensure_admin_bypass_policy: {
        Args: { p_table: string }
        Returns: undefined
      }
      ensure_sensitive_delete_trigger: {
        Args: { p_table: string }
        Returns: undefined
      }
      fn_b2b_tour_recalc_stats: {
        Args: { _tour_id: string }
        Returns: undefined
      }
      generate_action_url: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      generate_monthly_cashflow: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      generate_monthly_profit: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      generate_monthly_revenue: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      generate_unique_booking_code: { Args: { base: string }; Returns: string }
      get_default_permissions_for_role: {
        Args: { p_role: string }
        Returns: string[]
      }
      get_effective_scope: {
        Args: { p_action: string; p_resource: string; p_user_id: string }
        Returns: string
      }
      get_my_department_id: { Args: never; Returns: string }
      get_my_employee_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_profile_is_active: { Args: { _user_id: string }; Returns: boolean }
      get_profile_role: { Args: { _user_id: string }; Returns: string }
      get_recruitment_assignees: {
        Args: never
        Returns: {
          full_name: string
          id: string
          role: string
          role_label: string
        }[]
      }
      get_role_permission_keys: {
        Args: { p_role: string }
        Returns: {
          permission_key: string
        }[]
      }
      get_role_scope_map: {
        Args: { p_role: string }
        Returns: {
          resource: string
          scope: string
        }[]
      }
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_active_employee: { Args: { _uid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_booking_closed: { Args: { _booking_id: string }; Returns: boolean }
      is_department_manager: { Args: { _uid: string }; Returns: boolean }
      is_dept_head: { Args: { _uid?: string }; Returns: boolean }
      is_dept_manager: { Args: { _uid: string }; Returns: boolean }
      is_gdkd: { Args: never; Returns: boolean }
      is_gdkd_branch: { Args: { _uid: string }; Returns: boolean }
      is_in_mkt_department: { Args: never; Returns: boolean }
      is_in_mkt_role: { Args: { _user_id?: string }; Returns: boolean }
      is_in_same_branch: {
        Args: { _branch: string; _uid: string }
        Returns: boolean
      }
      is_in_same_dept: {
        Args: { _target_dept_id: string; _uid: string }
        Returns: boolean
      }
      is_leave_approver_for_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
      is_sale: { Args: never; Returns: boolean }
      is_valid_app_role: { Args: { _role: string }; Returns: boolean }
      lookup_mapping_memory: {
        Args: { p_mapping_type: string; p_match_key: string }
        Returns: {
          category: string
          confidence: number
          use_count: number
        }[]
      }
      mark_employee_resigned: {
        Args: {
          p_employee_id: string
          p_reason: string
          p_resignation_date: string
        }
        Returns: Json
      }
      mark_intern_review_done: {
        Args: { p_employee_id: string; p_note?: string; p_result: string }
        Returns: Json
      }
      mark_tour_tasks_overdue: { Args: never; Returns: Json }
      mkt_task_update_status: {
        Args: { p_status: string; p_task_id: string }
        Returns: undefined
      }
      my_department_id: { Args: never; Returns: string }
      ne_nep_goi_y_xet: {
        Args: {
          p_tong_t2: number
          p_tung_bi_dung: boolean
          p_vi_pham_t2: number
        }
        Returns: string
      }
      ne_nep_tinh_tien: { Args: { p_thang_id: string }; Returns: number }
      rebuild_cc_ngay_for_range: {
        Args: { p_force?: boolean; p_from: string; p_to: string }
        Returns: {
          r_employee_id: string
          r_ngay: string
          r_tong_phut_lam: number
          r_trang_thai: string
        }[]
      }
      retry_failed_pushes: { Args: never; Returns: Json }
      rpc_cancel_leave_request: {
        Args: { p_id: string; p_reason?: string }
        Returns: Json
      }
      rpc_check_push_status: { Args: { p_request_id: number }; Returns: Json }
      rpc_dashboard_business: {
        Args: { p_dept_id?: string; p_scope: string; p_user_id: string }
        Returns: Json
      }
      rpc_dashboard_ceo: { Args: { p_dept_id?: string }; Returns: Json }
      rpc_dashboard_personal: { Args: { p_user_id: string }; Returns: Json }
      rpc_mkt_dashboard_kpis: {
        Args: {
          p_assignee_ids?: string[]
          p_brief_ids?: string[]
          p_date_from: string
          p_date_to: string
          p_platforms?: string[]
        }
        Returns: Json
      }
      rpc_mkt_done_by_assignee_month: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: {
          assignee_id: string
          count: number
          full_name: string
          month: string
        }[]
      }
      rpc_mkt_planned_vs_actual: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: {
          actual_count: number
          planned_count: number
          task_type: string
        }[]
      }
      rpc_mkt_platform_distribution: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: {
          count: number
          pct: number
          platform_code: string
        }[]
      }
      rpc_notification_audit_list: {
        Args: {
          p_action_status?: string
          p_department?: string
          p_range_days?: number
          p_read_status?: string
          p_search?: string
          p_type?: string
          p_types?: string[]
          p_user_id?: string
        }
        Returns: {
          action_completed_at: string
          action_due_at: string
          action_required: boolean
          action_status: string
          action_url: string
          created_at: string
          department: string
          email: string
          entity_id: string
          entity_type: string
          full_name: string
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string
          related_entity_id: string
          related_entity_type: string
          role: string
          title: string
          type: string
          user_id: string
        }[]
      }
      rpc_notification_complete_action: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      rpc_notification_critical_overdue: {
        Args: never
        Returns: {
          created_at: string
          hours_overdue: number
          id: string
          priority: string
          recipient_name: string
          title: string
          type: string
          user_id: string
        }[]
      }
      rpc_notification_overview: { Args: never; Returns: Json }
      rpc_notification_set_action_status: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      rpc_notification_stats_by_user: {
        Args: never
        Returns: {
          department: string
          email: string
          full_name: string
          last_read_at: string
          overdue_actions: number
          pending_actions: number
          read_count: number
          role: string
          total_notifications: number
          unread_count: number
          unread_high_critical: number
          user_id: string
        }[]
      }
      rpc_notification_stats_by_user_type: {
        Args: {
          p_action_status?: string
          p_days?: number
          p_read_status?: string
          p_user_id: string
        }
        Returns: {
          last_read_at: string
          notification_type: string
          oldest_unread_at: string
          overdue_actions: number
          pending_actions: number
          read_count: number
          total_notifications: number
          unread_count: number
          unread_high_critical: number
        }[]
      }
      rpc_notification_unread_by_user: {
        Args: never
        Returns: {
          department: string
          full_name: string
          oldest_unread_at: string
          unread_high_critical: number
          unread_total: number
          user_id: string
        }[]
      }
      rpc_send_test_push: { Args: never; Returns: Json }
      rpc_tour_dashboard_stats: { Args: never; Returns: Json }
      rpc_tour_task_transition: {
        Args: {
          _evidence_url?: string
          _new_status: string
          _reject_reason?: string
          _task_id: string
        }
        Returns: Json
      }
      run_action_escalation: { Args: never; Returns: Json }
      run_db_health_checks: { Args: never; Returns: Json }
      run_notification_rule: { Args: { _rule_code: string }; Returns: Json }
      send_kpi_achievement_notification: {
        Args: {
          p_commission_pct: number
          p_employee_name: string
          p_user_id: string
        }
        Returns: string
      }
      sync_role_permissions_to_employees: {
        Args: { _role: string }
        Returns: Json
      }
      unmark_employee_resigned: {
        Args: { p_employee_id: string; p_new_status?: string }
        Returns: Json
      }
    }
    Enums: {
      advance_status:
        | "PENDING"
        | "DISBURSED"
        | "PARTIAL_SETTLED"
        | "SETTLED"
        | "OVERDUE"
      b2b_seat_status: "available" | "limited" | "sold_out" | "closed"
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
      advance_status: [
        "PENDING",
        "DISBURSED",
        "PARTIAL_SETTLED",
        "SETTLED",
        "OVERDUE",
      ],
      b2b_seat_status: ["available", "limited", "sold_out", "closed"],
    },
  },
} as const

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          code: string
          country_iso: string | null
          description: string
          is_active: boolean
          name: string
          required: boolean
          sort_order: number
        }
        Insert: {
          code: string
          country_iso?: string | null
          description?: string
          is_active?: boolean
          name: string
          required?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          country_iso?: string | null
          description?: string
          is_active?: boolean
          name?: string
          required?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          doc_type: string
          driver_id: string
          file_path: string
          id: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          doc_type: string
          driver_id: string
          file_path: string
          id?: string
          mime_type: string
          uploaded_at?: string
        }
        Update: {
          doc_type?: string
          driver_id?: string
          file_path?: string
          id?: string
          mime_type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_doc_type_fkey"
            columns: ["doc_type"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          location: unknown
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          location: unknown
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          location?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          id_number?: string | null
          is_online?: boolean
          last_seen?: string | null
          licence_number?: string | null
          market_code?: string | null
          photo_path?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          is_online?: boolean
          last_seen?: string | null
          licence_number?: string | null
          market_code?: string | null
          photo_path?: string | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "drivers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          base_fare: number
          is_active: boolean
          market_code: string
          minimum_fare: number
          per_distance: number
          per_minute: number
          ride_type: string
          updated_at: string
        }
        Insert: {
          base_fare: number
          is_active?: boolean
          market_code: string
          minimum_fare: number
          per_distance: number
          per_minute: number
          ride_type: string
          updated_at?: string
        }
        Update: {
          base_fare?: number
          is_active?: boolean
          market_code?: string
          minimum_fare?: number
          per_distance?: number
          per_minute?: number
          ride_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "market_prices_ride_type_fkey"
            columns: ["ride_type"]
            isOneToOne: false
            referencedRelation: "pricing"
            referencedColumns: ["ride_type"]
          },
        ]
      }
      markets: {
        Row: {
          code: string
          commission_percent: number
          country_iso: string
          created_at: string
          currency: string
          currency_decimals: number
          distance_unit: string
          emergency_numbers: Json
          is_active: boolean
          name: string
          payment_methods: Database["public"]["Enums"]["payment_method"][]
          phone_country_code: string
          prices_are_placeholder: boolean
          sort_order: number
          support_phone: string
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          commission_percent?: number
          country_iso: string
          created_at?: string
          currency: string
          currency_decimals?: number
          distance_unit?: string
          emergency_numbers?: Json
          is_active?: boolean
          name: string
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone_country_code: string
          prices_are_placeholder?: boolean
          sort_order?: number
          support_phone?: string
          timezone: string
          updated_at?: string
        }
        Update: {
          code?: string
          commission_percent?: number
          country_iso?: string
          created_at?: string
          currency?: string
          currency_decimals?: number
          distance_unit?: string
          emergency_numbers?: Json
          is_active?: boolean
          name?: string
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone_country_code?: string
          prices_are_placeholder?: boolean
          sort_order?: number
          support_phone?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      mpesa_callbacks: {
        Row: {
          checkout_request_id: string | null
          id: number
          payload: Json
          received_at: string
        }
        Insert: {
          checkout_request_id?: string | null
          id?: never
          payload: Json
          received_at?: string
        }
        Update: {
          checkout_request_id?: string | null
          id?: never
          payload?: Json
          received_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          confirmed_by?: string | null
          created_at?: string
          currency: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          result_code?: string | null
          result_desc?: string | null
          ride_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          result_code?: string | null
          result_desc?: string | null
          ride_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing: {
        Row: {
          description: string
          display_name: string
          is_active: boolean
          ride_type: string
          seats: number
          sort_order: number
          tier: number
          updated_at: string
        }
        Insert: {
          description?: string
          display_name: string
          is_active?: boolean
          ride_type: string
          seats?: number
          sort_order?: number
          tier?: number
          updated_at?: string
        }
        Update: {
          description?: string
          display_name?: string
          is_active?: boolean
          ride_type?: string
          seats?: number
          sort_order?: number
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          delete_requested_at: string | null
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_chosen: boolean
        }
        Insert: {
          created_at?: string
          delete_requested_at?: string | null
          full_name?: string
          id: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_chosen?: boolean
        }
        Update: {
          created_at?: string
          delete_requested_at?: string | null
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_chosen?: boolean
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          currency: string
          distance_m: number
          dropoff: unknown
          dropoff_address: string
          duration_s: number
          expires_at: string
          id: string
          market_code: string
          options: Json
          passenger_id: string
          pickup: unknown
          pickup_address: string
          pickup_note: string | null
          polyline: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          currency: string
          distance_m: number
          dropoff: unknown
          dropoff_address: string
          duration_s: number
          expires_at: string
          id?: string
          market_code: string
          options: Json
          passenger_id: string
          pickup: unknown
          pickup_address: string
          pickup_note?: string | null
          polyline?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          distance_m?: number
          dropoff?: unknown
          dropoff_address?: string
          duration_s?: number
          expires_at?: string
          id?: string
          market_code?: string
          options?: Json
          passenger_id?: string
          pickup?: unknown
          pickup_address?: string
          pickup_note?: string | null
          polyline?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          ride_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id: string
          rater_id: string
          ride_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          ride_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          from_status: Database["public"]["Enums"]["ride_status"] | null
          id: number
          note: string | null
          ride_id: string
          to_status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["ride_status"] | null
          id?: never
          note?: string | null
          ride_id: string
          to_status: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["ride_status"] | null
          id?: never
          note?: string | null
          ride_id?: string
          to_status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_offers: {
        Row: {
          driver_id: string
          expires_at: string
          offered_at: string
          responded_at: string | null
          response: Database["public"]["Enums"]["offer_response"]
          ride_id: string
        }
        Insert: {
          driver_id: string
          expires_at: string
          offered_at?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["offer_response"]
          ride_id: string
        }
        Update: {
          driver_id?: string
          expires_at?: string
          offered_at?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["offer_response"]
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_offers_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["user_role"] | null
          commission_percent?: number | null
          completed_at?: string | null
          currency: string
          distance_m: number
          driver_earnings?: number | null
          driver_id?: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id?: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note?: string | null
          platform_commission?: number | null
          polyline?: string | null
          quote_id?: string | null
          requested_at?: string
          ride_type: string
          search_expires_at: string
          share_token?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["user_role"] | null
          commission_percent?: number | null
          completed_at?: string | null
          currency?: string
          distance_m?: number
          driver_earnings?: number | null
          driver_id?: string | null
          dropoff?: unknown
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          duration_s?: number
          fare?: number
          id?: string
          market_code?: string
          passenger_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pickup?: unknown
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          pickup_note?: string | null
          platform_commission?: number | null
          polyline?: string | null
          quote_id?: string | null
          requested_at?: string
          ride_type?: string
          search_expires_at?: string
          share_token?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "rides_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_ride_type_fkey"
            columns: ["ride_type"]
            isOneToOne: false
            referencedRelation: "pricing"
            referencedColumns: ["ride_type"]
          },
        ]
      }
      service_area: {
        Row: {
          area: unknown
          created_at: string
          id: string
          is_active: boolean
          market_code: string
          name: string
        }
        Insert: {
          area: unknown
          created_at?: string
          id?: string
          is_active?: boolean
          market_code: string
          name: string
        }
        Update: {
          area?: unknown
          created_at?: string
          id?: string
          is_active?: boolean
          market_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_area_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_reports: {
        Row: {
          admin_note: string | null
          category: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          ride_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          ride_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          ride_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_reports_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          colour: string
          created_at: string
          driver_id: string
          id: string
          make: string
          model: string
          plate: string
          ride_type: string
          updated_at: string
          year: number
        }
        Insert: {
          colour: string
          created_at?: string
          driver_id: string
          id?: string
          make: string
          model: string
          plate: string
          ride_type?: string
          updated_at?: string
          year: number
        }
        Update: {
          colour?: string
          created_at?: string
          driver_id?: string
          id?: string
          make?: string
          model?: string
          plate?: string
          ride_type?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_ride_type_fkey"
            columns: ["ride_type"]
            isOneToOne: false
            referencedRelation: "pricing"
            referencedColumns: ["ride_type"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_ride: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_drivers: {
        Args: { p_status?: Database["public"]["Enums"]["driver_status"] }
        Returns: {
          created_at: string
          full_name: string
          id: string
          is_online: boolean
          market_code: string
          phone: string
          plate: string
          reviewed_at: string
          ride_type: string
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string
        }[]
      }
      admin_overview: { Args: { p_market_code?: string }; Returns: Json }
      admin_resolve_report: {
        Args: { p_note?: string; p_report_id: string }
        Returns: {
          admin_note: string | null
          category: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          ride_id: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "support_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_driver: {
        Args: {
          p_approve: boolean
          p_driver_id: string
          p_reason?: string
          p_ride_type?: string
        }
        Returns: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_driver_market: {
        Args: { p_driver_id: string; p_market_code: string }
        Returns: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_driver_suspended: {
        Args: { p_driver_id: string; p_reason?: string; p_suspended: boolean }
        Returns: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          delete_requested_at: string | null
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_chosen: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_suspended: {
        Args: { p_reason?: string; p_suspended: boolean; p_user_id: string }
        Returns: {
          created_at: string
          delete_requested_at: string | null
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_chosen: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_active_user: {
        Args: never
        Returns: {
          created_at: string
          delete_requested_at: string | null
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_chosen: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      average_rating: { Args: { p_user_id: string }; Returns: number }
      calculate_fare: {
        Args: {
          p_distance_m: number
          p_duration_s: number
          p_market_code: string
          p_ride_type: string
        }
        Returns: number
      }
      cancel_ride: {
        Args: { p_reason?: string; p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_payment_method: {
        Args: {
          p_method: Database["public"]["Enums"]["payment_method"]
          p_ride_id: string
        }
        Returns: {
          amount: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      choose_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: {
          created_at: string
          delete_requested_at: string | null
          full_name: string
          id: string
          is_suspended: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_chosen: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_trip: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_cash_payment: {
        Args: { p_ride_id: string }
        Returns: {
          amount: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_quote: {
        Args: {
          p_distance_m: number
          p_dropoff_address: string
          p_dropoff_lat: number
          p_dropoff_lng: number
          p_duration_s: number
          p_passenger_id: string
          p_pickup_address: string
          p_pickup_lat: number
          p_pickup_lng: number
          p_pickup_note: string
          p_polyline: string
        }
        Returns: {
          created_at: string
          currency: string
          distance_m: number
          dropoff: unknown
          dropoff_address: string
          duration_s: number
          expires_at: string
          id: string
          market_code: string
          options: Json
          passenger_id: string
          pickup: unknown
          pickup_address: string
          pickup_note: string | null
          polyline: string | null
          used_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      decline_ride: { Args: { p_ride_id: string }; Returns: undefined }
      dispatch_ride: { Args: { p_ride_id: string }; Returns: number }
      driver_arrived: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      driver_can_edit_application: { Args: never; Returns: boolean }
      driver_step: {
        Args: {
          p_from: Database["public"]["Enums"]["ride_status"]
          p_ride_id: string
          p_to: Database["public"]["Enums"]["ride_status"]
        }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_searching_rides: { Args: never; Returns: number }
      get_driver_earnings: { Args: never; Returns: Json }
      get_ride_details: { Args: { p_ride_id: string }; Returns: Json }
      get_shared_trip: { Args: { p_token: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      log_ride_event: {
        Args: {
          p_actor_role: string
          p_from: Database["public"]["Enums"]["ride_status"]
          p_note?: string
          p_ride_id: string
          p_to: Database["public"]["Enums"]["ride_status"]
        }
        Returns: undefined
      }
      make_point: { Args: { p_lat: number; p_lng: number }; Returns: unknown }
      market_at_point: {
        Args: { p_lat: number; p_lng: number }
        Returns: string
      }
      market_for_phone: { Args: { p_phone: string }; Returns: string }
      point_in_service_area: {
        Args: { p_lat: number; p_lng: number }
        Returns: boolean
      }
      rate_ride: {
        Args: { p_comment?: string; p_ride_id: string; p_stars: number }
        Returns: {
          comment: string | null
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          ride_id: string
          stars: number
        }
        SetofOptions: {
          from: "*"
          to: "ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_account_deletion: { Args: never; Returns: undefined }
      request_ride: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_quote_id: string
          p_ride_type: string
        }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      required_document_types_for: {
        Args: { p_driver_id: string }
        Returns: {
          code: string
          country_iso: string | null
          description: string
          is_active: boolean
          name: string
          required: boolean
          sort_order: number
        }[]
        SetofOptions: {
          from: "*"
          to: "document_types"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ride_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["ride_status"]
          p_to: Database["public"]["Enums"]["ride_status"]
        }
        Returns: boolean
      }
      ride_type_tier: { Args: { p_ride_type: string }; Returns: number }
      set_driver_online: {
        Args: { p_online: boolean }
        Returns: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      setting_int: { Args: { p_key: string }; Returns: number }
      setting_text: { Args: { p_key: string }; Returns: string }
      start_trip: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          completed_at: string | null
          currency: string
          distance_m: number
          driver_earnings: number | null
          driver_id: string | null
          dropoff: unknown
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          duration_s: number
          fare: number
          id: string
          market_code: string
          passenger_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pickup: unknown
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_note: string | null
          platform_commission: number | null
          polyline: string | null
          quote_id: string | null
          requested_at: string
          ride_type: string
          search_expires_at: string
          share_token: string
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_driver_application: {
        Args: never
        Returns: {
          created_at: string
          email: string | null
          id: string
          id_number: string | null
          is_online: boolean
          last_seen: string | null
          licence_number: string | null
          market_code: string | null
          photo_path: string | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_status"]
          submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_driver_location: {
        Args: { p_heading?: number; p_lat: number; p_lng: number }
        Returns: number
      }
    }
    Enums: {
      driver_status: "pending" | "approved" | "rejected" | "suspended"
      offer_response: "pending" | "accepted" | "declined" | "expired"
      payment_method: "cash" | "mpesa"
      payment_status: "pending" | "paid" | "failed"
      ride_status:
        | "searching"
        | "accepted"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_driver_found"
      user_role: "passenger" | "driver" | "admin"
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
      driver_status: ["pending", "approved", "rejected", "suspended"],
      offer_response: ["pending", "accepted", "declined", "expired"],
      payment_method: ["cash", "mpesa"],
      payment_status: ["pending", "paid", "failed"],
      ride_status: [
        "searching",
        "accepted",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "no_driver_found",
      ],
      user_role: ["passenger", "driver", "admin"],
    },
  },
} as const

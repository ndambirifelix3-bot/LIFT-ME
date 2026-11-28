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
      admin_email_outbox: {
        Row: {
          created_at: string
          error: string | null
          id: number
          kind: string
          payload: Json
          recipients: string[] | null
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: never
          kind: string
          payload?: Json
          recipients?: string[] | null
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: never
          kind?: string
          payload?: Json
          recipients?: string[] | null
          sent_at?: string | null
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
      driver_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          currency: string
          driver_id: string
          id: number
          kind: string
          note: string | null
          reference: string | null
          ride_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          currency: string
          driver_id: string
          id?: never
          kind: string
          note?: string | null
          reference?: string | null
          ride_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          driver_id?: string
          id?: never
          kind?: string
          note?: string | null
          reference?: string | null
          ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_ledger_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
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
      driver_mpesa_payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          currency: string
          driver_id: string
          id: string
          merchant_request_id: string | null
          mpesa_checked_at: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          phone: string
          result_code: string | null
          result_desc: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          currency?: string
          driver_id: string
          id?: string
          merchant_request_id?: string | null
          mpesa_checked_at?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          phone: string
          result_code?: string | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          currency?: string
          driver_id?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_checked_at?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          phone?: string
          result_code?: string | null
          result_desc?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_mpesa_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string | null
          first_approved_at: string | null
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
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_approved_at?: string | null
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
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          first_approved_at?: string | null
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
          wallet_balance?: number
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
          commission_percent: number | null
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
          commission_percent?: number | null
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
          commission_percent?: number | null
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
          cancellation_fee: number
          cancellation_free_seconds: number
          center_lat: number | null
          center_lng: number | null
          code: string
          commission_percent: number
          country_iso: string
          created_at: string
          currency: string
          currency_decimals: number
          distance_unit: string
          driver_debt_limit: number | null
          driver_payment_instructions: string
          emergency_numbers: Json
          is_active: boolean
          max_trip_distance_m: number | null
          name: string
          new_driver_free_days: number
          new_driver_free_trips: number
          no_show_wait_seconds: number
          payment_methods: Database["public"]["Enums"]["payment_method"][]
          phone_country_code: string
          prices_are_placeholder: boolean
          sort_order: number
          support_phone: string
          timezone: string
          traffic_factor: number
          updated_at: string
        }
        Insert: {
          cancellation_fee?: number
          cancellation_free_seconds?: number
          center_lat?: number | null
          center_lng?: number | null
          code: string
          commission_percent?: number
          country_iso: string
          created_at?: string
          currency: string
          currency_decimals?: number
          distance_unit?: string
          driver_debt_limit?: number | null
          driver_payment_instructions?: string
          emergency_numbers?: Json
          is_active?: boolean
          max_trip_distance_m?: number | null
          name: string
          new_driver_free_days?: number
          new_driver_free_trips?: number
          no_show_wait_seconds?: number
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone_country_code: string
          prices_are_placeholder?: boolean
          sort_order?: number
          support_phone?: string
          timezone: string
          traffic_factor?: number
          updated_at?: string
        }
        Update: {
          cancellation_fee?: number
          cancellation_free_seconds?: number
          center_lat?: number | null
          center_lng?: number | null
          code?: string
          commission_percent?: number
          country_iso?: string
          created_at?: string
          currency?: string
          currency_decimals?: number
          distance_unit?: string
          driver_debt_limit?: number | null
          driver_payment_instructions?: string
          emergency_numbers?: Json
          is_active?: boolean
          max_trip_distance_m?: number | null
          name?: string
          new_driver_free_days?: number
          new_driver_free_trips?: number
          no_show_wait_seconds?: number
          payment_methods?: Database["public"]["Enums"]["payment_method"][]
          phone_country_code?: string
          prices_are_placeholder?: boolean
          sort_order?: number
          support_phone?: string
          timezone?: string
          traffic_factor?: number
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
          card_brand: string | null
          card_last4: string | null
          charge_attempts: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at: string | null
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          card_brand?: string | null
          card_last4?: string | null
          charge_attempts?: number
          confirmed_by?: string | null
          created_at?: string
          currency: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          result_code?: string | null
          result_desc?: string | null
          ride_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          charge_attempts?: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at?: string | null
          mpesa_checkout_request_id?: string | null
          mpesa_merchant_request_id?: string | null
          mpesa_phone?: string | null
          mpesa_receipt?: string | null
          paid_at?: string | null
          result_code?: string | null
          result_desc?: string | null
          ride_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
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
          can_take: string[]
          countries: string[] | null
          description: string
          display_name: string
          is_active: boolean
          is_electric: boolean
          ride_type: string
          seats: number
          sort_order: number
          tier: number
          updated_at: string
          vehicle_kind: string
        }
        Insert: {
          can_take?: string[]
          countries?: string[] | null
          description?: string
          display_name: string
          is_active?: boolean
          is_electric?: boolean
          ride_type: string
          seats?: number
          sort_order?: number
          tier?: number
          updated_at?: string
          vehicle_kind?: string
        }
        Update: {
          can_take?: string[]
          countries?: string[] | null
          description?: string
          display_name?: string
          is_active?: boolean
          is_electric?: boolean
          ride_type?: string
          seats?: number
          sort_order?: number
          tier?: number
          updated_at?: string
          vehicle_kind?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          delete_requested_at: string | null
          email: string | null
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
          email?: string | null
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
          email?: string | null
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_chosen?: boolean
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          first_ride_only: boolean
          is_active: boolean
          market_code: string
          max_discount: number | null
          max_uses: number | null
          percent_off: number
          starts_at: string
          uses_per_passenger: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          first_ride_only?: boolean
          is_active?: boolean
          market_code: string
          max_discount?: number | null
          max_uses?: number | null
          percent_off: number
          starts_at?: string
          uses_per_passenger?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          first_ride_only?: boolean
          is_active?: boolean
          market_code?: string
          max_discount?: number | null
          max_uses?: number | null
          percent_off?: number
          starts_at?: string
          uses_per_passenger?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_market_code_fkey"
            columns: ["market_code"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["code"]
          },
        ]
      }
      push_config: {
        Row: {
          function_url: string | null
          id: boolean
          trigger_secret: string
          updated_at: string
          vapid_private_key: string | null
          vapid_public_key: string | null
        }
        Insert: {
          function_url?: string | null
          id?: boolean
          trigger_secret?: string
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Update: {
          function_url?: string | null
          id?: boolean
          trigger_secret?: string
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          body: string
          created_at: string
          devices: number | null
          error: string | null
          id: number
          sent_at: string | null
          tag: string | null
          title: string
          url: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          devices?: number | null
          error?: string | null
          id?: never
          sent_at?: string | null
          tag?: string | null
          title: string
          url?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          devices?: number | null
          error?: string | null
          id?: never
          sent_at?: string | null
          tag?: string | null
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["user_role"] | null
          commission_percent?: number | null
          commission_waived?: boolean
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
          promo_code?: string | null
          promo_discount?: number
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
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: Database["public"]["Enums"]["user_role"] | null
          commission_percent?: number | null
          commission_waived?: boolean
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
          promo_code?: string | null
          promo_discount?: number
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
            foreignKeyName: "rides_promo_code_fkey"
            columns: ["promo_code"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["code"]
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
      stripe_customers: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          customer_id: string
          payment_method_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          customer_id: string
          payment_method_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          customer_id?: string
          payment_method_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
      account_exists: {
        Args: { p_email?: string; p_phone?: string }
        Returns: boolean
      }
      admin_driver_balances: {
        Args: { p_market_code: string }
        Returns: {
          balance: number
          currency: string
          currency_decimals: number
          driver_id: string
          full_name: string
          is_online: boolean
          last_entry_at: string
          over_limit: boolean
          phone: string
        }[]
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
      admin_notify: {
        Args: { p_kind: string; p_payload: Json }
        Returns: undefined
      }
      admin_overview: { Args: { p_market_code?: string }; Returns: Json }
      admin_record_driver_money: {
        Args: {
          p_amount: number
          p_driver_id: string
          p_kind: string
          p_note?: string
          p_reference?: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          currency: string
          driver_id: string
          id: number
          kind: string
          note: string | null
          reference: string | null
          ride_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "driver_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          first_approved_at: string | null
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
          wallet_balance: number
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_send_test_email: { Args: never; Returns: undefined }
      admin_set_driver_market: {
        Args: { p_driver_id: string; p_market_code: string }
        Returns: {
          created_at: string
          email: string | null
          first_approved_at: string | null
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
          wallet_balance: number
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
          first_approved_at: string | null
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
          wallet_balance: number
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
          email: string | null
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
          email: string | null
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
      admin_waive_cancellation_fee: {
        Args: { p_reason: string; p_ride_id: string }
        Returns: undefined
      }
      assert_active_user: {
        Args: never
        Returns: {
          created_at: string
          delete_requested_at: string | null
          email: string | null
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
      auto_offline_quiet_drivers: { Args: never; Returns: number }
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
          card_brand: string | null
          card_last4: string | null
          charge_attempts: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at: string | null
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      charge_cancellation_fee: { Args: { p_ride_id: string }; Returns: number }
      choose_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: {
          created_at: string
          delete_requested_at: string | null
          email: string | null
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
          card_brand: string | null
          card_last4: string | null
          charge_attempts: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at: string | null
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
      driver_debt_limit: { Args: { p_driver_id: string }; Returns: number }
      driver_launch_offer: {
        Args: { p_driver_id: string; p_market_code: string }
        Returns: Json
      }
      driver_mpesa_to_recheck: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          currency: string
          driver_id: string
          id: string
          merchant_request_id: string | null
          mpesa_checked_at: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          phone: string
          result_code: string | null
          result_desc: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "driver_mpesa_payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      driver_over_debt_limit: {
        Args: { p_driver_id: string }
        Returns: boolean
      }
      driver_report_no_show: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
      format_money: {
        Args: { p_amount: number; p_currency: string; p_decimals: number }
        Returns: string
      }
      get_driver_earnings: { Args: never; Returns: Json }
      get_my_wallet: { Args: never; Returns: Json }
      get_ride_details: { Args: { p_ride_id: string }; Returns: Json }
      get_shared_trip: { Args: { p_token: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      ledger_cash_commission: {
        Args: { p_ride_id: string }
        Returns: undefined
      }
      ledger_trip_earnings: { Args: { p_ride_id: string }; Returns: undefined }
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
      market_centers: {
        Args: never
        Returns: {
          code: string
          country_iso: string
          lat: number
          lng: number
        }[]
      }
      market_for_phone: { Args: { p_phone: string }; Returns: string }
      mpesa_payments_to_recheck: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          card_brand: string | null
          card_last4: string | null
          charge_attempts: number
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checked_at: string | null
          mpesa_checkout_request_id: string | null
          mpesa_merchant_request_id: string | null
          mpesa_phone: string | null
          mpesa_receipt: string | null
          paid_at: string | null
          result_code: string | null
          result_desc: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mpesa_recheck_dispatch: { Args: never; Returns: undefined }
      point_in_service_area: {
        Args: { p_lat: number; p_lng: number }
        Returns: boolean
      }
      preview_promo: {
        Args: { p_code: string; p_quote_id: string }
        Returns: Json
      }
      promo_discount_for: {
        Args: {
          p_code: string
          p_fare: number
          p_market_code: string
          p_passenger_id: string
        }
        Returns: number
      }
      push_notify: {
        Args: {
          p_body: string
          p_tag?: string
          p_title: string
          p_url?: string
          p_user_id: string
        }
        Returns: undefined
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
      remove_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: undefined }
      request_ride: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_promo_code?: string
          p_quote_id: string
          p_ride_type: string
        }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
      ride_commission_percent: {
        Args: { p_ride: Database["public"]["Tables"]["rides"]["Row"] }
        Returns: number
      }
      ride_money: {
        Args: { r: Database["public"]["Tables"]["rides"]["Row"] }
        Returns: string
      }
      ride_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["ride_status"]
          p_to: Database["public"]["Enums"]["ride_status"]
        }
        Returns: boolean
      }
      ride_type_tier: { Args: { p_ride_type: string }; Returns: number }
      save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      set_driver_online: {
        Args: { p_online: boolean }
        Returns: {
          created_at: string
          email: string | null
          first_approved_at: string | null
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
          wallet_balance: number
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_my_contact_phone: {
        Args: { p_phone: string }
        Returns: {
          created_at: string
          delete_requested_at: string | null
          email: string | null
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
      setting_int: { Args: { p_key: string }; Returns: number }
      setting_text: { Args: { p_key: string }; Returns: string }
      start_trip: {
        Args: { p_ride_id: string }
        Returns: {
          accepted_at: string | null
          arrived_at: string | null
          cancel_reason: string | null
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: Database["public"]["Enums"]["user_role"] | null
          commission_percent: number | null
          commission_waived: boolean
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
          promo_code: string | null
          promo_discount: number
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
          first_approved_at: string | null
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
          wallet_balance: number
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpaid_cancellation_fee_ride: {
        Args: { p_passenger_id: string }
        Returns: string
      }
      update_driver_location: {
        Args: { p_heading?: number; p_lat: number; p_lng: number }
        Returns: number
      }
      vehicle_can_take: {
        Args: { p_ride_type: string; p_vehicle_type: string }
        Returns: boolean
      }
    }
    Enums: {
      driver_status: "pending" | "approved" | "rejected" | "suspended"
      offer_response: "pending" | "accepted" | "declined" | "expired"
      payment_method: "cash" | "mpesa" | "card"
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
      payment_method: ["cash", "mpesa", "card"],
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

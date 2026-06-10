// migrations-hash: 0581b948c332dfc4
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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string | null
          admin_name: string | null
          created_at: string | null
          detail: string | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          detail?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_name?: string | null
          created_at?: string | null
          detail?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          active: boolean
          auth_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
        }
        Insert: {
          active?: boolean
          auth_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Update: {
          active?: boolean
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["admin_role"]
        }
        Relationships: []
      }
      app_users: {
        Row: {
          auth_id: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          razon_social: string | null
          rfc: string | null
          status: string
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          razon_social?: string | null
          rfc?: string | null
          status?: string
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          razon_social?: string | null
          rfc?: string | null
          status?: string
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string
          phone: string | null
          razon_social: string
          rfc: string | null
          status: string
          trips_count: number
          type: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          phone?: string | null
          razon_social: string
          rfc?: string | null
          status?: string
          trips_count?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          phone?: string | null
          razon_social?: string
          rfc?: string | null
          status?: string
          trips_count?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content_validated_at: string | null
          created_at: string
          expires_at: string | null
          file_size: number | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          notes: string | null
          owner_id: string
          owner_name: string | null
          owner_type: string
          reviewed_by: string | null
          scan_status: string
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string | null
          type: string
          updated_at: string
          uploaded_at: string | null
          url: string | null
        }
        Insert: {
          content_validated_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          owner_id: string
          owner_name?: string | null
          owner_type: string
          reviewed_by?: string | null
          scan_status?: string
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          type: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Update: {
          content_validated_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_size?: number | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          owner_id?: string
          owner_name?: string | null
          owner_type?: string
          reviewed_by?: string | null
          scan_status?: string
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string | null
          type?: string
          updated_at?: string
          uploaded_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          auth_id: string | null
          bank_account: string | null
          certified: boolean
          created_at: string
          earnings: number
          email: string
          id: string
          internal_notes: string | null
          name: string
          phone: string | null
          photo_url: string | null
          rating: number | null
          state: string | null
          status: Database["public"]["Enums"]["driver_status"]
          trips_completed: number
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          bank_account?: string | null
          certified?: boolean
          created_at?: string
          earnings?: number
          email: string
          id?: string
          internal_notes?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          trips_completed?: number
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          bank_account?: string | null
          certified?: boolean
          created_at?: string
          earnings?: number
          email?: string
          id?: string
          internal_notes?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          rating?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          trips_completed?: number
          updated_at?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          created_at: string
          fuel_level: number | null
          id: string
          km_reading: number | null
          notes: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          trip_id: string
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          fuel_level?: number | null
          id?: string
          km_reading?: number | null
          notes?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          trip_id: string
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          fuel_level?: number | null
          id?: string
          km_reading?: number | null
          notes?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          trip_id?: string
          type?: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_photos: {
        Row: {
          created_at: string
          evidence_id: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          evidence_id: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          evidence_id?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_photos_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_notes: {
        Row: {
          author: string
          content: string
          created_at: string | null
          id: string
          incident_id: string
        }
        Insert: {
          author: string
          content: string
          created_at?: string | null
          id?: string
          incident_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string | null
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          resolution: string | null
          status: Database["public"]["Enums"]["incident_status"]
          trip_id: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          trip_id: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          trip_id?: string
          type?: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
          user_type: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
          user_type: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          approved_by: string | null
          concept: string | null
          created_at: string
          id: string
          method: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trip_id: string
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id: string
          type: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          concept?: string | null
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trip_id?: string
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tariffs: {
        Row: {
          active: boolean
          base_fare: number
          created_at: string
          driver_base: number
          driver_per_km: number
          foranea_surcharge: number
          id: string
          min_fare: number
          name: string
          per_km: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fare?: number
          created_at?: string
          driver_base?: number
          driver_per_km?: number
          foranea_surcharge?: number
          id?: string
          min_fare?: number
          name: string
          per_km?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fare?: number
          created_at?: string
          driver_base?: number
          driver_per_km?: number
          foranea_surcharge?: number
          id?: string
          min_fare?: number
          name?: string
          per_km?: number
          updated_at?: string
        }
        Relationships: []
      }
      trip_evidence: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_storage_path: string
          photo_url: string
          trip_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_storage_path: string
          photo_url: string
          trip_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_storage_path?: string
          photo_url?: string
          trip_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_evidence_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_timeline: {
        Row: {
          active: boolean
          created_at: string
          done: boolean
          id: string
          label: string
          step: number
          trip_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          done?: boolean
          id?: string
          label: string
          step: number
          trip_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          done?: boolean
          id?: string
          label?: string
          step?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_timeline_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          asap: boolean
          client_price_mxn: number | null
          created_at: string
          dest_contact_name: string | null
          dest_contact_phone: string | null
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          destination_reference: string | null
          distance_km: number | null
          driver_id: string | null
          driver_pay_mxn: number | null
          id: string
          internal_notes: string | null
          origin_address: string
          origin_contact_name: string | null
          origin_contact_phone: string | null
          origin_lat: number | null
          origin_lng: number | null
          origin_reference: string | null
          scheduled_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          special_instructions: string | null
          status: Database["public"]["Enums"]["trip_status"]
          tariff_id: string | null
          updated_at: string
          user_id: string
          vehicle_brand: string | null
          vehicle_color: string | null
          vehicle_condition: string | null
          vehicle_id: string | null
          vehicle_model: string | null
          vehicle_plates: string | null
          vehicle_transmission: string | null
          vehicle_type: string | null
          vehicle_vin: string | null
          vehicle_year: number | null
        }
        Insert: {
          asap?: boolean
          client_price_mxn?: number | null
          created_at?: string
          dest_contact_name?: string | null
          dest_contact_phone?: string | null
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_reference?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_pay_mxn?: number | null
          id: string
          internal_notes?: string | null
          origin_address: string
          origin_contact_name?: string | null
          origin_contact_phone?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_reference?: string | null
          scheduled_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          tariff_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_condition?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plates?: string | null
          vehicle_transmission?: string | null
          vehicle_type?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Update: {
          asap?: boolean
          client_price_mxn?: number | null
          created_at?: string
          dest_contact_name?: string | null
          dest_contact_phone?: string | null
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_reference?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_pay_mxn?: number | null
          id?: string
          internal_notes?: string | null
          origin_address?: string
          origin_contact_name?: string | null
          origin_contact_phone?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          origin_reference?: string | null
          scheduled_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          tariff_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_condition?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plates?: string | null
          vehicle_transmission?: string | null
          vehicle_type?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          alias: string | null
          brand: string
          color: string | null
          condition: string | null
          created_at: string
          id: string
          model: string
          owner_id: string
          plates: string | null
          transmission: Database["public"]["Enums"]["transmission"] | null
          type: Database["public"]["Enums"]["vehicle_type"] | null
          vin: string | null
          year: number | null
        }
        Insert: {
          alias?: string | null
          brand: string
          color?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          model: string
          owner_id: string
          plates?: string | null
          transmission?: Database["public"]["Enums"]["transmission"] | null
          type?: Database["public"]["Enums"]["vehicle_type"] | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          alias?: string | null
          brand?: string
          color?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          model?: string
          owner_id?: string
          plates?: string | null
          transmission?: Database["public"]["Enums"]["transmission"] | null
          type?: Database["public"]["Enums"]["vehicle_type"] | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_trip_driver: {
        Args: { p_driver_id: string; p_trip_id: string }
        Returns: Json
      }
      check_unassigned_trips: {
        Args: { p_minutes?: number }
        Returns: {
          created_at: string
          minutes_waiting: number
          trip_id: string
        }[]
      }
      current_admin_id: { Args: never; Returns: string }
      current_admin_role: { Args: never; Returns: string }
      current_app_user_id: { Args: never; Returns: string }
      current_driver_id: { Args: never; Returns: string }
      expire_overdue_documents: { Args: never; Returns: Json }
      generate_trip_id: { Args: never; Returns: string }
      get_admin_companies_summary: { Args: never; Returns: Json }
      get_admin_dashboard_summary: { Args: never; Returns: Json }
      get_admin_document_status_counts: { Args: never; Returns: Json }
      get_admin_documents_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: Database["public"]["Enums"]["doc_status"]
        }
        Returns: {
          id: string
          mime_type: string
          notes: string
          owner_id: string
          owner_name: string
          owner_type: string
          status: string
          storage_path: string
          type: string
          updated_at: string
          uploaded_at: string
          url: string
        }[]
      }
      get_admin_documents_total: {
        Args: {
          p_search?: string
          p_status?: Database["public"]["Enums"]["doc_status"]
        }
        Returns: number
      }
      get_admin_payment_summary: { Args: never; Returns: Json }
      get_admin_payments_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
          p_type?: string
        }
        Returns: {
          amount: number
          concept: string
          created_at: string
          driver_id: string
          driver_name: string
          id: string
          notes: string
          paid_at: string
          status: string
          trip_id: string
          type: string
          user_id: string
          user_name: string
        }[]
      }
      get_admin_payments_total: {
        Args: { p_search?: string; p_status?: string; p_type?: string }
        Returns: number
      }
      get_expiring_driver_documents: {
        Args: { p_days?: number }
        Returns: {
          days_until_expiry: number
          doc_type: string
          document_id: string
          driver_id: string
          expires_at: string
        }[]
      }
      is_active_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_valid_system_config_value: {
        Args: { p_key: string; p_value: string }
        Returns: boolean
      }
      log_admin_activity: {
        Args: {
          p_action: string
          p_detail?: string
          p_entity?: string
          p_entity_id?: string
        }
        Returns: string
      }
      review_document_atomic: {
        Args: {
          p_document_id: string
          p_expected_status?: Database["public"]["Enums"]["doc_status"]
          p_notes?: string
          p_status: Database["public"]["Enums"]["doc_status"]
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_payment_statuses_atomic: {
        Args: {
          p_payment_ids: string[]
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: Json
      }
      update_trip_status_atomic: {
        Args: {
          p_expected_status?: Database["public"]["Enums"]["trip_status"]
          p_status: Database["public"]["Enums"]["trip_status"]
          p_trip_id: string
        }
        Returns: Json
      }
      upsert_system_config_values: { Args: { p_items: Json }; Returns: Json }
    }
    Enums: {
      admin_role:
        | "super_admin"
        | "admin_operativo"
        | "finanzas"
        | "soporte"
        | "validador"
        | "comercial"
      doc_status:
        | "pendiente_carga"
        | "en_revision"
        | "aprobado"
        | "rechazado"
        | "vencido"
        | "requiere_actualizacion"
      driver_status:
        | "pendiente_validacion"
        | "activo"
        | "disponible"
        | "no_disponible"
        | "en_viaje"
        | "suspendido"
        | "bloqueado"
        | "documentacion_vencida"
      evidence_type: "inicial" | "durante" | "final"
      incident_status:
        | "nueva"
        | "en_revision"
        | "requiere_informacion"
        | "en_seguimiento"
        | "resuelta"
        | "cerrada"
        | "escalada"
      incident_type:
        | "dano_reportado"
        | "retraso"
        | "falta_evidencia"
        | "contacto_no_disponible"
        | "problema_documentacion"
        | "problema_pago"
        | "cancelacion"
        | "diferencia_kilometraje"
        | "diferencia_combustible"
        | "problema_conductor"
        | "problema_usuario"
        | "otro"
      payment_status:
        | "pendiente"
        | "en_revision"
        | "aprobado"
        | "rechazado"
        | "pagado"
        | "revocado"
        | "ajustado"
      payment_type: "cobro_usuario" | "pago_conductor" | "gasto"
      service_type:
        | "personal"
        | "empresarial"
        | "agencia"
        | "lote"
        | "flotilla"
        | "entrega_cliente"
        | "recuperacion"
        | "especial"
      transmission: "automatica" | "manual"
      trip_status:
        | "solicitud_recibida"
        | "pendiente_revision"
        | "pendiente_asignacion"
        | "conductor_asignado"
        | "conductor_en_camino"
        | "recoleccion_proceso"
        | "evidencia_inicial_pendiente"
        | "traslado_curso"
        | "entrega_proceso"
        | "evidencia_final_pendiente"
        | "finalizado"
        | "cancelado"
        | "incidente"
      user_type:
        | "personal"
        | "empresarial"
        | "agencia"
        | "lote"
        | "flotilla"
        | "arrendadora"
        | "taller"
        | "aseguradora"
      vehicle_type: "sedan" | "suv" | "pickup" | "van" | "moto" | "otro"
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
      admin_role: [
        "super_admin",
        "admin_operativo",
        "finanzas",
        "soporte",
        "validador",
        "comercial",
      ],
      doc_status: [
        "pendiente_carga",
        "en_revision",
        "aprobado",
        "rechazado",
        "vencido",
        "requiere_actualizacion",
      ],
      driver_status: [
        "pendiente_validacion",
        "activo",
        "disponible",
        "no_disponible",
        "en_viaje",
        "suspendido",
        "bloqueado",
        "documentacion_vencida",
      ],
      evidence_type: ["inicial", "durante", "final"],
      incident_status: [
        "nueva",
        "en_revision",
        "requiere_informacion",
        "en_seguimiento",
        "resuelta",
        "cerrada",
        "escalada",
      ],
      incident_type: [
        "dano_reportado",
        "retraso",
        "falta_evidencia",
        "contacto_no_disponible",
        "problema_documentacion",
        "problema_pago",
        "cancelacion",
        "diferencia_kilometraje",
        "diferencia_combustible",
        "problema_conductor",
        "problema_usuario",
        "otro",
      ],
      payment_status: [
        "pendiente",
        "en_revision",
        "aprobado",
        "rechazado",
        "pagado",
        "revocado",
        "ajustado",
      ],
      payment_type: ["cobro_usuario", "pago_conductor", "gasto"],
      service_type: [
        "personal",
        "empresarial",
        "agencia",
        "lote",
        "flotilla",
        "entrega_cliente",
        "recuperacion",
        "especial",
      ],
      transmission: ["automatica", "manual"],
      trip_status: [
        "solicitud_recibida",
        "pendiente_revision",
        "pendiente_asignacion",
        "conductor_asignado",
        "conductor_en_camino",
        "recoleccion_proceso",
        "evidencia_inicial_pendiente",
        "traslado_curso",
        "entrega_proceso",
        "evidencia_final_pendiente",
        "finalizado",
        "cancelado",
        "incidente",
      ],
      user_type: [
        "personal",
        "empresarial",
        "agencia",
        "lote",
        "flotilla",
        "arrendadora",
        "taller",
        "aseguradora",
      ],
      vehicle_type: ["sedan", "suv", "pickup", "van", "moto", "otro"],
    },
  },
} as const

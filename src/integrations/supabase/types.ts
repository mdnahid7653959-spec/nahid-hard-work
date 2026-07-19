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
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      admin_credentials: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          admin_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string | null
          permissions: Json | null
          role: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string | null
          permissions?: Json | null
          role?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string | null
          permissions?: Json | null
          role?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_valid: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          banner_image: string | null
          campaign_type: string | null
          created_at: string
          description: string | null
          discount_type: string | null
          discount_value: number | null
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          metadata: Json | null
          min_order_amount: number | null
          name: string
          slug: string | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          campaign_type?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          metadata?: Json | null
          min_order_amount?: number | null
          name: string
          slug?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          campaign_type?: string | null
          created_at?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          metadata?: Json | null
          min_order_amount?: number | null
          name?: string
          slug?: string | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_commissions: {
        Row: {
          category_id: string | null
          commission_rate: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_commissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_api_tokens: {
        Row: {
          access_token: string
          access_token_expires_at: string
          created_at: string
          id: string
          last_auth_attempt_at: string | null
          refresh_token: string
          refresh_token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          created_at?: string
          id?: string
          last_auth_attempt_at?: string | null
          refresh_token: string
          refresh_token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          created_at?: string
          id?: string
          last_auth_attempt_at?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_category_mappings: {
        Row: {
          cj_category_name: string
          created_at: string
          custom_margin_type: string | null
          custom_margin_value: number | null
          id: string
          is_enabled: boolean
          local_category_id: string | null
          updated_at: string
        }
        Insert: {
          cj_category_name: string
          created_at?: string
          custom_margin_type?: string | null
          custom_margin_value?: number | null
          id?: string
          is_enabled?: boolean
          local_category_id?: string | null
          updated_at?: string
        }
        Update: {
          cj_category_name?: string
          created_at?: string
          custom_margin_type?: string | null
          custom_margin_value?: number | null
          id?: string
          is_enabled?: boolean
          local_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_category_mappings_local_category_id_fkey"
            columns: ["local_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_settings: {
        Row: {
          created_at: string
          default_margin_type: string
          default_margin_value: number
          id: string
          is_enabled: boolean
          show_in_categories: boolean
          show_in_search: boolean
          show_on_homepage: boolean | null
          updated_at: string
          usd_to_bdt_rate: number
        }
        Insert: {
          created_at?: string
          default_margin_type?: string
          default_margin_value?: number
          id?: string
          is_enabled?: boolean
          show_in_categories?: boolean
          show_in_search?: boolean
          show_on_homepage?: boolean | null
          updated_at?: string
          usd_to_bdt_rate?: number
        }
        Update: {
          created_at?: string
          default_margin_type?: string
          default_margin_value?: number
          id?: string
          is_enabled?: boolean
          show_in_categories?: boolean
          show_in_search?: boolean
          show_on_homepage?: boolean | null
          updated_at?: string
          usd_to_bdt_rate?: number
        }
        Relationships: []
      }
      cms_banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_fit: string | null
          image_position: string | null
          image_url: string | null
          is_active: boolean
          link_url: string | null
          mobile_image_url: string | null
          position: string | null
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_fit?: string | null
          image_position?: string | null
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_fit?: string | null
          image_position?: string | null
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          mobile_image_url?: string | null
          position?: string | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consignments: {
        Row: {
          admin_notes: string | null
          amount_to_collect: number | null
          approved_at: string | null
          consignment_id: string | null
          courier: string | null
          created_at: string
          delivered_at: string | null
          delivery_type: string | null
          id: string
          item_description: string | null
          metadata: Json | null
          order_id: string | null
          received_at: string | null
          recipient_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          rejection_reason: string | null
          seller_id: string | null
          shipped_at: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_to_collect?: number | null
          approved_at?: string | null
          consignment_id?: string | null
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_type?: string | null
          id?: string
          item_description?: string | null
          metadata?: Json | null
          order_id?: string | null
          received_at?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejection_reason?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_to_collect?: number | null
          approved_at?: string | null
          consignment_id?: string | null
          courier?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_type?: string | null
          id?: string
          item_description?: string | null
          metadata?: Json | null
          order_id?: string | null
          received_at?: string | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejection_reason?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string | null
          buyer_unread_count: number | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          product_id: string | null
          product_name: string | null
          seller_id: string | null
          seller_name: string | null
          seller_unread_count: number | null
          status: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_unread_count?: number | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          product_id?: string | null
          product_name?: string | null
          seller_id?: string | null
          seller_name?: string | null
          seller_unread_count?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_unread_count?: number | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          product_id?: string | null
          product_name?: string | null
          seller_id?: string | null
          seller_name?: string | null
          seller_unread_count?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          start_date: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      custom_sections: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          section_type: string | null
          sort_order: number | null
          type: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          section_type?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          section_type?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      free_delivery_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          min_order_amount: number
          name: string
          priority: number | null
          rule_type: string | null
          start_date: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number
          name: string
          priority?: number | null
          rule_type?: string | null
          start_date?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number
          name?: string
          priority?: number | null
          rule_type?: string | null
          start_date?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: []
      }
      inventory_alerts: {
        Row: {
          alert_type: string | null
          created_at: string
          id: string
          is_active: boolean
          product_id: string | null
          threshold: number
          triggered_at: string | null
        }
        Insert: {
          alert_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          threshold?: number
          triggered_at?: string | null
        }
        Update: {
          alert_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string | null
          threshold?: number
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          change_type: string
          created_at: string
          created_by: string | null
          id: string
          new_quantity: number
          notes: string | null
          order_id: string | null
          previous_quantity: number
          product_id: string | null
          quantity_change: number
          variant_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id?: string | null
          quantity_change: number
          variant_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id?: string | null
          quantity_change?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      layout_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          page: string | null
          page_type: string
          sections: Json | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          page?: string | null
          page_type?: string
          sections?: Json | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          page?: string | null
          page_type?: string
          sections?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          lifetime_points: number | null
          name: string | null
          points: number
          reference_id: string | null
          tier: string | null
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          lifetime_points?: number | null
          name?: string | null
          points?: number
          reference_id?: string | null
          tier?: string | null
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          lifetime_points?: number | null
          name?: string | null
          points?: number
          reference_id?: string | null
          tier?: string | null
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_cost: number | null
          points_required: number | null
          reward_type: string | null
          reward_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_cost?: number | null
          points_required?: number | null
          reward_type?: string | null
          reward_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number | null
          points_required?: number | null
          reward_type?: string | null
          reward_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean
          sender_id: string | null
          sender_type: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string | null
          sender_type?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string | null
          sender_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          notification_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          total: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity?: number
          total: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          total?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          courier_name: string | null
          created_at: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string | null
          seller_id: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string | null
          seller_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          courier_name?: string | null
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          seller_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_method: string
          payment_provider: string | null
          provider_reference: string | null
          provider_response: Json | null
          provider_status: string | null
          refund_amount: number | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method: string
          payment_provider?: string | null
          provider_reference?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string | null
          provider_reference?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock_quantity: number | null
          storage: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          storage?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          storage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          brand_id: string | null
          category_id: string | null
          color: string | null
          cost_price: number | null
          country_of_origin: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          discount_price: number | null
          discount_type: string | null
          estimated_delivery: string | null
          flash_sale_end: string | null
          free_shipping: boolean | null
          id: string
          is_best_seller: boolean | null
          is_featured: boolean | null
          is_flash_sale: boolean | null
          is_new_arrival: boolean | null
          max_order_quantity: number | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          min_order_quantity: number | null
          name: string
          product_condition: string | null
          publish_date: string | null
          rating_average: number | null
          rating_count: number | null
          regular_price: number
          rejection_reason: string | null
          return_policy: string | null
          reviews_enabled: boolean | null
          seller_id: string | null
          shipping_cost: number | null
          short_description: string | null
          sku: string | null
          slug: string
          sold_count: number | null
          status: string | null
          stock_quantity: number | null
          tags: string[] | null
          updated_at: string | null
          video_url: string | null
          view_count: number | null
          warranty_info: string | null
          weight: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          discount_price?: number | null
          discount_type?: string | null
          estimated_delivery?: string | null
          flash_sale_end?: string | null
          free_shipping?: boolean | null
          id?: string
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_flash_sale?: boolean | null
          is_new_arrival?: boolean | null
          max_order_quantity?: number | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          min_order_quantity?: number | null
          name: string
          product_condition?: string | null
          publish_date?: string | null
          rating_average?: number | null
          rating_count?: number | null
          regular_price?: number
          rejection_reason?: string | null
          return_policy?: string | null
          reviews_enabled?: boolean | null
          seller_id?: string | null
          shipping_cost?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
          warranty_info?: string | null
          weight?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          cost_price?: number | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          discount_price?: number | null
          discount_type?: string | null
          estimated_delivery?: string | null
          flash_sale_end?: string | null
          free_shipping?: boolean | null
          id?: string
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_flash_sale?: boolean | null
          is_new_arrival?: boolean | null
          max_order_quantity?: number | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          min_order_quantity?: number | null
          name?: string
          product_condition?: string | null
          publish_date?: string | null
          rating_average?: number | null
          rating_count?: number | null
          regular_price?: number
          rejection_reason?: string | null
          return_policy?: string | null
          reviews_enabled?: boolean | null
          seller_id?: string | null
          shipping_cost?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
          warranty_info?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          created_by: string | null
          data: Json | null
          failed_count: number | null
          id: string
          image_url: string | null
          message: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_by: string | null
          sent_count: number | null
          status: string | null
          target_audience: string | null
          target_type: string | null
          target_users: string[] | null
          title: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          message?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          target_type?: string | null
          target_users?: string[] | null
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          data?: Json | null
          failed_count?: number | null
          id?: string
          image_url?: string | null
          message?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_count?: number | null
          status?: string | null
          target_audience?: string | null
          target_type?: string | null
          target_users?: string[] | null
          title?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          is_active: boolean
          platform: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          platform?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          platform?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          product_id: string | null
          user_id: string
          view_count: number | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          user_id: string
          view_count?: number | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          user_id?: string
          view_count?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string | null
          results_count: number | null
          search_term: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query?: string | null
          results_count?: number | null
          search_term?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string | null
          results_count?: number | null
          search_term?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_earnings: {
        Row: {
          amount: number
          commission: number
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          earned_at: string
          gross_amount: number | null
          id: string
          net_amount: number
          order_id: string | null
          seller_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          commission?: number
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          earned_at?: string
          gross_amount?: number | null
          id?: string
          net_amount?: number
          order_id?: string | null
          seller_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          commission?: number
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          earned_at?: string
          gross_amount?: number | null
          id?: string
          net_amount?: number
          order_id?: string | null
          seller_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_earnings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          commission_deducted: number | null
          created_at: string
          id: string
          net_amount: number | null
          payment_details: Json | null
          payment_method: string | null
          payout_method: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          reference: string | null
          seller_id: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          commission_deducted?: number | null
          created_at?: string
          id?: string
          net_amount?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          payout_method?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          reference?: string | null
          seller_id?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_deducted?: number | null
          created_at?: string
          id?: string
          net_amount?: number | null
          payment_details?: Json | null
          payment_method?: string | null
          payout_method?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          reference?: string | null
          seller_id?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bank_account: Json | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          birth_certificate_image: string | null
          birth_certificate_number: string | null
          business_address: string | null
          business_email: string | null
          business_license: string | null
          business_name: string | null
          business_phone: string | null
          business_registration_number: string | null
          business_type: string | null
          commission_rate: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          id_document_type: string | null
          is_verified: boolean | null
          logo_url: string | null
          metadata: Json | null
          mobile_banking_number: string | null
          mobile_banking_provider: string | null
          nid_back_image: string | null
          nid_front_image: string | null
          nid_number: string | null
          rating: number | null
          rating_average: number | null
          rating_count: number | null
          rejection_reason: string | null
          return_address: Json | null
          shop_banner: string | null
          shop_description: string | null
          shop_logo: string | null
          shop_name: string | null
          shop_slug: string | null
          status: string
          tax_id: string | null
          total_orders: number | null
          total_products: number | null
          total_sales: number | null
          trade_license_image: string | null
          trade_license_number: string | null
          updated_at: string
          user_id: string | null
          warehouse_address: Json | null
          warning_count: number
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: Json | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          birth_certificate_image?: string | null
          birth_certificate_number?: string | null
          business_address?: string | null
          business_email?: string | null
          business_license?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          id_document_type?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          mobile_banking_number?: string | null
          mobile_banking_provider?: string | null
          nid_back_image?: string | null
          nid_front_image?: string | null
          nid_number?: string | null
          rating?: number | null
          rating_average?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          return_address?: Json | null
          shop_banner?: string | null
          shop_description?: string | null
          shop_logo?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_sales?: number | null
          trade_license_image?: string | null
          trade_license_number?: string | null
          updated_at?: string
          user_id?: string | null
          warehouse_address?: Json | null
          warning_count?: number
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: Json | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          birth_certificate_image?: string | null
          birth_certificate_number?: string | null
          business_address?: string | null
          business_email?: string | null
          business_license?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          id_document_type?: string | null
          is_verified?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          mobile_banking_number?: string | null
          mobile_banking_provider?: string | null
          nid_back_image?: string | null
          nid_front_image?: string | null
          nid_number?: string | null
          rating?: number | null
          rating_average?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          return_address?: Json | null
          shop_banner?: string | null
          shop_description?: string | null
          shop_logo?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          status?: string
          tax_id?: string | null
          total_orders?: number | null
          total_products?: number | null
          total_sales?: number | null
          trade_license_image?: string | null
          trade_license_number?: string | null
          updated_at?: string
          user_id?: string | null
          warehouse_address?: Json | null
          warning_count?: number
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          base_rate: number | null
          cod_charge: number | null
          cod_percentage: number | null
          courier_name: string | null
          created_at: string
          estimated_days: string | null
          id: string
          is_active: boolean
          max_weight: number | null
          min_order_total: number | null
          min_weight: number | null
          name: string | null
          per_kg_rate: number | null
          price: number
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          base_rate?: number | null
          cod_charge?: number | null
          cod_percentage?: number | null
          courier_name?: string | null
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          max_weight?: number | null
          min_order_total?: number | null
          min_weight?: number | null
          name?: string | null
          per_kg_rate?: number | null
          price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          base_rate?: number | null
          cod_charge?: number | null
          cod_percentage?: number | null
          courier_name?: string | null
          created_at?: string
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          max_weight?: number | null
          min_order_total?: number | null
          min_weight?: number | null
          name?: string | null
          per_kg_rate?: number | null
          price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          areas: string[] | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          regions: string[] | null
          updated_at: string
        }
        Insert: {
          areas?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          regions?: string[] | null
          updated_at?: string
        }
        Update: {
          areas?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          regions?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      theme_config: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      theme_versions: {
        Row: {
          config: Json
          created_at: string
          id: string
          theme_id: string | null
          version: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          theme_id?: string | null
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          theme_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "theme_config"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          code: string
          created_at: string
          discount_type: string | null
          discount_value: number
          expires_at: string | null
          id: string
          is_used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          discount_price: number | null
          flash_sale_end: string | null
          id: string | null
          is_best_seller: boolean | null
          is_featured: boolean | null
          is_flash_sale: boolean | null
          is_new_arrival: boolean | null
          name: string | null
          rating_average: number | null
          rating_count: number | null
          regular_price: number | null
          seller_id: string | null
          short_description: string | null
          slug: string | null
          sold_count: number | null
          status: string | null
          stock_quantity: number | null
          tags: string[] | null
          view_count: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          flash_sale_end?: string | null
          id?: string | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_flash_sale?: boolean | null
          is_new_arrival?: boolean | null
          name?: string | null
          rating_average?: number | null
          rating_count?: number | null
          regular_price?: number | null
          seller_id?: string | null
          short_description?: string | null
          slug?: string | null
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          view_count?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          flash_sale_end?: string | null
          id?: string | null
          is_best_seller?: boolean | null
          is_featured?: boolean | null
          is_flash_sale?: boolean | null
          is_new_arrival?: boolean | null
          name?: string | null
          rating_average?: number | null
          rating_count?: number | null
          regular_price?: number | null
          seller_id?: string | null
          short_description?: string | null
          slug?: string | null
          sold_count?: number | null
          status?: string | null
          stock_quantity?: number | null
          tags?: string[] | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_seller_or_admin: { Args: never; Returns: boolean }
      resolve_product_seller: {
        Args: { _product_seller_id: string }
        Returns: {
          is_featured: boolean
          rating_average: number
          rating_count: number
          seller_id: string
          shop_logo: string
          shop_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "seller" | "customer"
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
      app_role: ["admin", "moderator", "seller", "customer"],
    },
  },
} as const

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
      case_items: {
        Row: {
          attachments_meta: Json | null
          body_html: string | null
          body_preview: string | null
          body_text: string | null
          case_id: string
          cc_emails: string[] | null
          created_at: string
          created_by: string | null
          from_email: string | null
          from_name: string | null
          id: string
          internet_message_id: string | null
          received_at: string | null
          sent_at: string | null
          subject: string | null
          tenant_id: string
          to_emails: string[] | null
          type: string
        }
        Insert: {
          attachments_meta?: Json | null
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          case_id: string
          cc_emails?: string[] | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          internet_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          tenant_id: string
          to_emails?: string[] | null
          type?: string
        }
        Update: {
          attachments_meta?: Json | null
          body_html?: string | null
          body_preview?: string | null
          body_text?: string | null
          case_id?: string
          cc_emails?: string[] | null
          created_at?: string
          created_by?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          internet_message_id?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          tenant_id?: string
          to_emails?: string[] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          asset_id: string | null
          assigned_at: string | null
          assigned_to_user_id: string | null
          case_number: string
          company_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          deleted_at: string | null
          deleted_by: string | null
          due_at: string | null
          id: string
          job_id: string | null
          last_activity_at: string | null
          mailbox_address: string | null
          next_action: Database["public"]["Enums"]["case_next_action"]
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          site_id: string | null
          status: Database["public"]["Enums"]["case_status"]
          tenant_id: string
          title: string
          updated_at: string
          warranty_case_id: string | null
        }
        Insert: {
          asset_id?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          case_number: string
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          last_activity_at?: string | null
          mailbox_address?: string | null
          next_action?: Database["public"]["Enums"]["case_next_action"]
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          tenant_id: string
          title?: string
          updated_at?: string
          warranty_case_id?: string | null
        }
        Update: {
          asset_id?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          case_number?: string
          company_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          due_at?: string | null
          id?: string
          job_id?: string | null
          last_activity_at?: string | null
          mailbox_address?: string | null
          next_action?: Database["public"]["Enums"]["case_next_action"]
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          warranty_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cases_company_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cases_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cases_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_warranty_fk"
            columns: ["tenant_id", "warranty_case_id"]
            isOneToOne: false
            referencedRelation: "warranty_cases"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          checklist_id: string
          id: string
          is_checked: boolean
          label: string
          note: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          checklist_id: string
          id?: string
          is_checked?: boolean
          label: string
          note?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          checklist_id?: string
          id?: string
          is_checked?: boolean
          label?: string
          note?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_fk"
            columns: ["tenant_id", "checklist_id"]
            isOneToOne: false
            referencedRelation: "installation_checklists"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          body: string | null
          case_id: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          due_at: string | null
          id: string
          subject: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          body?: string | null
          case_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          subject?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          body?: string | null
          case_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          subject?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          customer_since: string | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          deleted_at: string | null
          email: string | null
          enova_registered: boolean
          id: string
          industry: string | null
          name: string
          notes: string | null
          org_number: string | null
          phone: string | null
          postal_code: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_since?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          deleted_at?: string | null
          email?: string | null
          enova_registered?: boolean
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          org_number?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          customer_since?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          deleted_at?: string | null
          email?: string | null
          enova_registered?: boolean
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          org_number?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          is_primary_contact: boolean | null
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_primary_contact?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_primary_contact?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          case_id: string | null
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          energy_source: Database["public"]["Enums"]["energy_source"] | null
          estimated_kw: number | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          owner_user_id: string | null
          site_id: string | null
          site_visit_data: Json | null
          site_visit_date: string | null
          site_visit_notes: string | null
          site_visit_template_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          tenant_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          case_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          energy_source?: Database["public"]["Enums"]["energy_source"] | null
          estimated_kw?: number | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_user_id?: string | null
          site_id?: string | null
          site_visit_data?: Json | null
          site_visit_date?: string | null
          site_visit_notes?: string | null
          site_visit_template_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          case_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          energy_source?: Database["public"]["Enums"]["energy_source"] | null
          estimated_kw?: number | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_user_id?: string | null
          site_id?: string | null
          site_visit_data?: Json | null
          site_visit_date?: string | null
          site_visit_notes?: string | null
          site_visit_template_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "crm_deals_site_visit_template_id_fkey"
            columns: ["site_visit_template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sites: {
        Row: {
          access_info: string | null
          address: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string | null
          notes: string | null
          postal_code: string | null
          primary_contact_id: string | null
          site_type: Database["public"]["Enums"]["site_type"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_info?: string | null
          address?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          postal_code?: string | null
          primary_contact_id?: string | null
          site_type?: Database["public"]["Enums"]["site_type"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_info?: string | null
          address?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          postal_code?: string | null
          primary_contact_id?: string | null
          site_type?: Database["public"]["Enums"]["site_type"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sites_company_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "customer_sites_contact_fk"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agreement_id: string | null
          asset_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          job_id: string | null
          mime_type: string | null
          service_visit_id: string | null
          tenant_id: string
          uploaded_by: string | null
          warranty_case_id: string | null
        }
        Insert: {
          agreement_id?: string | null
          asset_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type?: string | null
          service_visit_id?: string | null
          tenant_id: string
          uploaded_by?: string | null
          warranty_case_id?: string | null
        }
        Update: {
          agreement_id?: string | null
          asset_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          job_id?: string | null
          mime_type?: string | null
          service_visit_id?: string | null
          tenant_id?: string
          uploaded_by?: string | null
          warranty_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "documents_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_visit_fk"
            columns: ["tenant_id", "service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "documents_warranty_fk"
            columns: ["tenant_id", "warranty_case_id"]
            isOneToOne: false
            referencedRelation: "warranty_cases"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      event_technicians: {
        Row: {
          created_at: string
          event_id: string
          id: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          technician_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_technicians_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          customer: string | null
          deleted_at: string | null
          description: string | null
          end_time: string
          id: string
          job_id: string | null
          service_visit_id: string | null
          site_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["event_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          job_id?: string | null
          service_visit_id?: string | null
          site_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          customer?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          job_id?: string | null
          service_visit_id?: string | null
          site_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["event_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "events_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_visit_fk"
            columns: ["tenant_id", "service_visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          created_case_id: string | null
          created_company_id: string | null
          created_contact_id: string | null
          created_deal_id: string | null
          id: string
          payload: Json
          source_url: string | null
          submitted_at: string
          template_id: string
          tenant_id: string
          web_form_type: string | null
        }
        Insert: {
          created_at?: string
          created_case_id?: string | null
          created_company_id?: string | null
          created_contact_id?: string | null
          created_deal_id?: string | null
          id?: string
          payload?: Json
          source_url?: string | null
          submitted_at?: string
          template_id: string
          tenant_id: string
          web_form_type?: string | null
        }
        Update: {
          created_at?: string
          created_case_id?: string | null
          created_company_id?: string | null
          created_contact_id?: string | null
          created_deal_id?: string | null
          id?: string
          payload?: Json
          source_url?: string | null
          submitted_at?: string
          template_id?: string
          tenant_id?: string
          web_form_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hvac_assets: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          energy_source: Database["public"]["Enums"]["energy_source"]
          id: string
          indoor_unit_model: string | null
          installed_at: string | null
          manufacturer: string | null
          model: string | null
          nominal_kw: number | null
          notes: string | null
          outdoor_unit_location: string | null
          refrigerant_kg: number | null
          refrigerant_type: string | null
          serial_number: string | null
          site_id: string
          status: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          updated_at: string
          warranty_expires_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          energy_source?: Database["public"]["Enums"]["energy_source"]
          id?: string
          indoor_unit_model?: string | null
          installed_at?: string | null
          manufacturer?: string | null
          model?: string | null
          nominal_kw?: number | null
          notes?: string | null
          outdoor_unit_location?: string | null
          refrigerant_kg?: number | null
          refrigerant_type?: string | null
          serial_number?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          energy_source?: Database["public"]["Enums"]["energy_source"]
          id?: string
          indoor_unit_model?: string | null
          installed_at?: string | null
          manufacturer?: string | null
          model?: string | null
          nominal_kw?: number | null
          notes?: string | null
          outdoor_unit_location?: string | null
          refrigerant_kg?: number | null
          refrigerant_type?: string | null
          serial_number?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id?: string
          updated_at?: string
          warranty_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hvac_assets_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "hvac_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_checklists: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          job_id: string
          notes: string | null
          template_name: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          template_name: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          template_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_checklists_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "installation_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_technicians: {
        Row: {
          created_at: string
          id: string
          job_id: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          technician_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_technicians_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_technicians_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          asset_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          estimated_hours: number | null
          form_data: Json | null
          id: string
          installation_template_id: string | null
          job_number: string
          job_type: Database["public"]["Enums"]["job_type"]
          notes: string | null
          owner_user_id: string | null
          priority: Database["public"]["Enums"]["case_priority"]
          scheduled_end: string | null
          scheduled_start: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          asset_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          form_data?: Json | null
          id?: string
          installation_template_id?: string | null
          job_number: string
          job_type?: Database["public"]["Enums"]["job_type"]
          notes?: string | null
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          asset_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          form_data?: Json | null
          id?: string
          installation_template_id?: string | null
          job_number?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          notes?: string | null
          owner_user_id?: string | null
          priority?: Database["public"]["Enums"]["case_priority"]
          scheduled_end?: string | null
          scheduled_start?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "jobs_company_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "jobs_contact_fk"
            columns: ["tenant_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "jobs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_installation_template_id_fkey"
            columns: ["installation_template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mailboxes: {
        Row: {
          address: string
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          provider: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          provider?: Database["public"]["Enums"]["integration_provider"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          provider?: Database["public"]["Enums"]["integration_provider"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailboxes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          description: string
          discount_percent: number | null
          id: string
          line_total: number
          quantity: number
          quote_id: string
          sort_order: number
          tenant_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          description: string
          discount_percent?: number | null
          id?: string
          line_total?: number
          quantity?: number
          quote_id: string
          sort_order?: number
          tenant_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          description?: string
          discount_percent?: number | null
          id?: string
          line_total?: number
          quantity?: number
          quote_id?: string
          sort_order?: number
          tenant_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_fk"
            columns: ["tenant_id", "quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "quote_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          deal_id: string
          deleted_at: string | null
          discount_percent: number | null
          id: string
          notes: string | null
          quote_number: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_amount: number
          updated_at: string
          valid_until: string | null
          vat_amount: number
          version: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id: string
          deleted_at?: string | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          quote_number: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          version?: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string
          deleted_at?: string | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          quote_number?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_deal_fk"
            columns: ["tenant_id", "deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          agreement_number: string
          annual_price: number | null
          asset_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          custom_interval_months: number | null
          deleted_at: string | null
          end_date: string | null
          id: string
          interval: Database["public"]["Enums"]["agreement_interval"]
          next_visit_due: string | null
          notes: string | null
          scope_description: string | null
          service_template_id: string | null
          site_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["agreement_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agreement_number: string
          annual_price?: number | null
          asset_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_interval_months?: number | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["agreement_interval"]
          next_visit_due?: string | null
          notes?: string | null
          scope_description?: string | null
          service_template_id?: string | null
          site_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agreement_number?: string
          annual_price?: number | null
          asset_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_interval_months?: number | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["agreement_interval"]
          next_visit_due?: string | null
          notes?: string | null
          scope_description?: string | null
          service_template_id?: string | null
          site_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_agreements_company_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_agreements_service_template_id_fkey"
            columns: ["service_template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_generation_runs: {
        Row: {
          agreements_scanned: number
          completed_at: string | null
          error_details: Json | null
          errors_count: number
          id: string
          jobs_created: number
          started_at: string
          status: string
          triggered_by: string | null
          visits_created: number
        }
        Insert: {
          agreements_scanned?: number
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number
          id?: string
          jobs_created?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
          visits_created?: number
        }
        Update: {
          agreements_scanned?: number
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number
          id?: string
          jobs_created?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
          visits_created?: number
        }
        Relationships: []
      }
      service_template_fields: {
        Row: {
          created_at: string
          default_value: Json | null
          field_key: string | null
          field_type: string
          help_text: string | null
          id: string
          is_required: boolean
          label: string
          options: Json | null
          sort_order: number
          template_id: string
          tenant_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_key?: string | null
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          sort_order?: number
          template_id: string
          tenant_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_key?: string | null
          field_type?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          sort_order?: number
          template_id?: string
          tenant_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_template_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_published: boolean
          name: string
          publish_key: string | null
          success_message: string | null
          template_key: string | null
          tenant_id: string
          updated_at: string
          use_context: string | null
          web_form_type: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_published?: boolean
          name: string
          publish_key?: string | null
          success_message?: string | null
          template_key?: string | null
          tenant_id: string
          updated_at?: string
          use_context?: string | null
          web_form_type?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_published?: boolean
          name?: string
          publish_key?: string | null
          success_message?: string | null
          template_key?: string | null
          tenant_id?: string
          updated_at?: string
          use_context?: string | null
          web_form_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_visits: {
        Row: {
          actions_taken: string | null
          agreement_id: string | null
          agreement_period: string | null
          asset_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          findings: string | null
          id: string
          job_id: string | null
          next_visit_recommended: string | null
          report_data: Json | null
          scheduled_date: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["visit_status"]
          technician_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actions_taken?: string | null
          agreement_id?: string | null
          agreement_period?: string | null
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          job_id?: string | null
          next_visit_recommended?: string | null
          report_data?: Json | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          technician_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actions_taken?: string | null
          agreement_id?: string | null
          agreement_period?: string | null
          asset_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          findings?: string | null
          id?: string
          job_id?: string | null
          next_visit_recommended?: string | null
          report_data?: Json | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          technician_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_agreement_fk"
            columns: ["tenant_id", "agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_visits_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_visits_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_visits_site_fk"
            columns: ["tenant_id", "site_id"]
            isOneToOne: false
            referencedRelation: "customer_sites"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "service_visits_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          color: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_credentials: {
        Row: {
          access_token_encrypted: string | null
          client_id: string | null
          client_secret_encrypted: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_verified_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted: string | null
          scopes: Json | null
          status: Database["public"]["Enums"]["credential_status"]
          sync_cursor: string | null
          tenant_domain: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_verified_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: Json | null
          status?: Database["public"]["Enums"]["credential_status"]
          sync_cursor?: string | null
          tenant_domain?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          client_id?: string | null
          client_secret_encrypted?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_verified_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: Json | null
          status?: Database["public"]["Enums"]["credential_status"]
          sync_cursor?: string | null
          tenant_domain?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          activated_at: string | null
          created_at: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          module_name: Database["public"]["Enums"]["module_name"]
          tenant_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_name: Database["public"]["Enums"]["module_name"]
          tenant_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          module_name?: Database["public"]["Enums"]["module_name"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_user_permission_overrides: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key: string
          tenant_id: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_user_permission_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_user_role_assignments: {
        Row: {
          created_at: string
          id: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_user_role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warranty_cases: {
        Row: {
          asset_id: string | null
          case_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          issue_description: string
          job_id: string | null
          manufacturer_ref: string | null
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["warranty_status"]
          tenant_id: string
          updated_at: string
          warranty_number: string
        }
        Insert: {
          asset_id?: string | null
          case_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issue_description: string
          job_id?: string | null
          manufacturer_ref?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          tenant_id: string
          updated_at?: string
          warranty_number: string
        }
        Update: {
          asset_id?: string | null
          case_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          issue_description?: string
          job_id?: string | null
          manufacturer_ref?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["warranty_status"]
          tenant_id?: string
          updated_at?: string
          warranty_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_cases_asset_fk"
            columns: ["tenant_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "hvac_assets"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "warranty_cases_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_cases_company_fk"
            columns: ["tenant_id", "company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "warranty_cases_job_fk"
            columns: ["tenant_id", "job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "warranty_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_tenant_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
        | "note"
        | "call"
        | "email"
        | "meeting"
        | "task"
        | "status_change"
      agreement_interval:
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
        | "biennial"
        | "custom"
      agreement_status: "active" | "paused" | "expired" | "cancelled"
      app_role: "master_admin" | "tenant_admin" | "user"
      asset_status:
        | "planned"
        | "installed"
        | "operational"
        | "needs_service"
        | "decommissioned"
      case_next_action:
        | "call"
        | "quote"
        | "clarify"
        | "order"
        | "schedule"
        | "document"
        | "none"
      case_priority: "low" | "normal" | "high" | "critical"
      case_status:
        | "new"
        | "triage"
        | "in_progress"
        | "waiting_customer"
        | "waiting_internal"
        | "closed"
        | "archived"
        | "converted"
      credential_status: "connected" | "disconnected" | "error" | "pending"
      customer_type: "private" | "business" | "housing_coop" | "public_sector"
      deal_stage:
        | "lead"
        | "qualified"
        | "quote_sent"
        | "site_visit"
        | "negotiation"
        | "won"
        | "lost"
      document_category:
        | "photo"
        | "certificate"
        | "manual"
        | "invoice"
        | "quote_pdf"
        | "service_report"
        | "checklist_pdf"
        | "warranty_doc"
        | "contract"
        | "other"
      energy_source:
        | "air_air"
        | "air_water"
        | "ground_water"
        | "ground_brine"
        | "exhaust_air"
        | "hybrid"
      event_status: "planned" | "in_progress" | "completed" | "cancelled"
      integration_provider: "microsoft" | "google"
      job_status:
        | "planned"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "on_hold"
      job_type:
        | "installation"
        | "service"
        | "repair"
        | "warranty"
        | "inspection"
        | "decommission"
      module_name: "postkontoret" | "ressursplanlegger" | "crm"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      site_type: "residential" | "commercial" | "industrial" | "cabin"
      tenant_status: "active" | "inactive" | "trial" | "suspended"
      visit_status:
        | "planned"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      warranty_status:
        | "open"
        | "investigating"
        | "approved"
        | "rejected"
        | "resolved"
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
      activity_type: [
        "note",
        "call",
        "email",
        "meeting",
        "task",
        "status_change",
      ],
      agreement_interval: [
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
        "biennial",
        "custom",
      ],
      agreement_status: ["active", "paused", "expired", "cancelled"],
      app_role: ["master_admin", "tenant_admin", "user"],
      asset_status: [
        "planned",
        "installed",
        "operational",
        "needs_service",
        "decommissioned",
      ],
      case_next_action: [
        "call",
        "quote",
        "clarify",
        "order",
        "schedule",
        "document",
        "none",
      ],
      case_priority: ["low", "normal", "high", "critical"],
      case_status: [
        "new",
        "triage",
        "in_progress",
        "waiting_customer",
        "waiting_internal",
        "closed",
        "archived",
        "converted",
      ],
      credential_status: ["connected", "disconnected", "error", "pending"],
      customer_type: ["private", "business", "housing_coop", "public_sector"],
      deal_stage: [
        "lead",
        "qualified",
        "quote_sent",
        "site_visit",
        "negotiation",
        "won",
        "lost",
      ],
      document_category: [
        "photo",
        "certificate",
        "manual",
        "invoice",
        "quote_pdf",
        "service_report",
        "checklist_pdf",
        "warranty_doc",
        "contract",
        "other",
      ],
      energy_source: [
        "air_air",
        "air_water",
        "ground_water",
        "ground_brine",
        "exhaust_air",
        "hybrid",
      ],
      event_status: ["planned", "in_progress", "completed", "cancelled"],
      integration_provider: ["microsoft", "google"],
      job_status: [
        "planned",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "on_hold",
      ],
      job_type: [
        "installation",
        "service",
        "repair",
        "warranty",
        "inspection",
        "decommission",
      ],
      module_name: ["postkontoret", "ressursplanlegger", "crm"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      site_type: ["residential", "commercial", "industrial", "cabin"],
      tenant_status: ["active", "inactive", "trial", "suspended"],
      visit_status: [
        "planned",
        "confirmed",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      warranty_status: [
        "open",
        "investigating",
        "approved",
        "rejected",
        "resolved",
      ],
    },
  },
} as const

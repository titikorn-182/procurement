// Generated from read-only public-schema metadata; do not edit manually.
// Regeneration and provenance: docs/type-safety.md.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      catalog_categories: {
        Row: {
          code: string;
          name: string;
        };
        Insert: {
          code: string;
          name: string;
        };
        Update: {
          code?: string;
          name?: string;
        };
        Relationships: [];
      };
      catalog_imports: {
        Row: {
          id: string;
          file_name: string;
          file_sha256: string;
          imported_at: string;
          imported_by: string | null;
          summary: Json;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_sha256: string;
          imported_at?: string;
          imported_by?: string | null;
          summary?: Json;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_sha256?: string;
          imported_at?: string;
          imported_by?: string | null;
          summary?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_imports_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_item_revisions: {
        Row: {
          id: string;
          item_id: string;
          version: number;
          actor_id: string;
          created_at: string;
          before_state: Json | null;
          after_state: Json;
          price_id: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          version: number;
          actor_id: string;
          created_at?: string;
          before_state?: Json | null;
          after_state: Json;
          price_id?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          version?: number;
          actor_id?: string;
          created_at?: string;
          before_state?: Json | null;
          after_state?: Json;
          price_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_item_revisions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_item_revisions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_item_revisions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "catalog_prices";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_items: {
        Row: {
          id: string;
          item_code: string;
          category_code: string;
          subcategory: string;
          name: string;
          specification: string;
          unit: string;
          notes: string;
          image_reference: string | null;
          active: boolean;
          created_at: string;
          version: number;
          updated_at: string;
          updated_by: string | null;
          image_path: string | null;
        };
        Insert: {
          id?: string;
          item_code: string;
          category_code: string;
          subcategory: string;
          name: string;
          specification: string;
          unit: string;
          notes?: string;
          image_reference?: string | null;
          active?: boolean;
          created_at?: string;
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
          image_path?: string | null;
        };
        Update: {
          id?: string;
          item_code?: string;
          category_code?: string;
          subcategory?: string;
          name?: string;
          specification?: string;
          unit?: string;
          notes?: string;
          image_reference?: string | null;
          active?: boolean;
          created_at?: string;
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
          image_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_code_fkey";
            columns: ["category_code"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "catalog_items_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_prices: {
        Row: {
          id: string;
          item_id: string;
          import_id: string | null;
          sheet_name: string | null;
          row_number: number | null;
          reference_price: number;
          source_name: string;
          reference_date: string | null;
          valid_until: string | null;
          status: string;
          verified_by: string | null;
          verified_at: string | null;
          evidence_reference: string | null;
          created_at: string;
          origin: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          import_id?: string | null;
          sheet_name?: string | null;
          row_number?: number | null;
          reference_price: number;
          source_name: string;
          reference_date?: string | null;
          valid_until?: string | null;
          status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          evidence_reference?: string | null;
          created_at?: string;
          origin?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          import_id?: string | null;
          sheet_name?: string | null;
          row_number?: number | null;
          reference_price?: number;
          source_name?: string;
          reference_date?: string | null;
          valid_until?: string | null;
          status?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          evidence_reference?: string | null;
          created_at?: string;
          origin?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_prices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_prices_import_id_sheet_name_row_number_fkey";
            columns: ["import_id", "sheet_name", "row_number"];
            isOneToOne: true;
            referencedRelation: "catalog_source_rows";
            referencedColumns: ["import_id", "sheet_name", "row_number"];
          },
          {
            foreignKeyName: "catalog_prices_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_prices_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_purchase_history: {
        Row: {
          id: string;
          import_id: string;
          sheet_name: string;
          row_number: number;
          fiscal_year: number;
          category_code: string;
          fmis_item_code: string;
          description: string;
          purchased_on: string;
          quantity: number;
          unit: string;
          catalog_item_id: string | null;
        };
        Insert: {
          id?: string;
          import_id: string;
          sheet_name: string;
          row_number: number;
          fiscal_year: number;
          category_code: string;
          fmis_item_code: string;
          description: string;
          purchased_on: string;
          quantity: number;
          unit: string;
          catalog_item_id?: string | null;
        };
        Update: {
          id?: string;
          import_id?: string;
          sheet_name?: string;
          row_number?: number;
          fiscal_year?: number;
          category_code?: string;
          fmis_item_code?: string;
          description?: string;
          purchased_on?: string;
          quantity?: number;
          unit?: string;
          catalog_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_purchase_history_catalog_item_id_fkey";
            columns: ["catalog_item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_purchase_history_category_code_fkey";
            columns: ["category_code"];
            isOneToOne: false;
            referencedRelation: "catalog_categories";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "catalog_purchase_history_import_id_sheet_name_row_number_fkey";
            columns: ["import_id", "sheet_name", "row_number"];
            isOneToOne: true;
            referencedRelation: "catalog_source_rows";
            referencedColumns: ["import_id", "sheet_name", "row_number"];
          },
        ];
      };
      catalog_source_rows: {
        Row: {
          import_id: string;
          sheet_name: string;
          row_number: number;
          row_kind: string;
          raw_cells: Json;
        };
        Insert: {
          import_id: string;
          sheet_name: string;
          row_number: number;
          row_kind: string;
          raw_cells: Json;
        };
        Update: {
          import_id?: string;
          sheet_name?: string;
          row_number?: number;
          row_kind?: string;
          raw_cells?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_source_rows_import_id_fkey";
            columns: ["import_id"];
            isOneToOne: false;
            referencedRelation: "catalog_imports";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name_th: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_th: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_th?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_attachments: {
        Row: {
          id: string;
          payment_request_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_request_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_attachments_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_items: {
        Row: {
          id: string;
          payment_request_id: string;
          line_no: number;
          description: string;
          attachment_type: string;
          document_no: string | null;
          quantity: number;
          unit_price: number;
          total_amount: number | null;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          line_no: number;
          description: string;
          attachment_type: string;
          document_no?: string | null;
          quantity: number;
          unit_price: number;
          total_amount?: never;
        };
        Update: {
          id?: string;
          payment_request_id?: string;
          line_no?: number;
          description?: string;
          attachment_type?: string;
          document_no?: string | null;
          quantity?: number;
          unit_price?: number;
          total_amount?: never;
        };
        Relationships: [
          {
            foreignKeyName: "payment_items_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_requests: {
        Row: {
          id: string;
          payment_no: string;
          procurement_request_id: string;
          requester_id: string;
          invoice_no: string;
          invoice_date: string;
          subtotal: number;
          vat_amount: number;
          total_amount: number | null;
          delivery_detail: string;
          status: Database["public"]["Enums"]["payment_status"];
          current_step: number;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
          idempotency_key: string | null;
          form_data: Json;
        };
        Insert: {
          id?: string;
          payment_no?: string;
          procurement_request_id: string;
          requester_id: string;
          invoice_no: string;
          invoice_date: string;
          subtotal: number;
          vat_amount?: number;
          total_amount?: never;
          delivery_detail: string;
          status?: Database["public"]["Enums"]["payment_status"];
          current_step?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          idempotency_key?: string | null;
          form_data?: Json;
        };
        Update: {
          id?: string;
          payment_no?: string;
          procurement_request_id?: string;
          requester_id?: string;
          invoice_no?: string;
          invoice_date?: string;
          subtotal?: number;
          vat_amount?: number;
          total_amount?: never;
          delivery_detail?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          current_step?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          idempotency_key?: string | null;
          form_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payment_requests_procurement_request_id_fkey";
            columns: ["procurement_request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_revisions: {
        Row: {
          id: string;
          payment_request_id: string;
          actor_id: string;
          snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          actor_id: string;
          snapshot: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_request_id?: string;
          actor_id?: string;
          snapshot?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_revisions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_revisions_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_workflow_actions: {
        Row: {
          id: string;
          payment_request_id: string;
          task_id: string | null;
          actor_id: string;
          action: Database["public"]["Enums"]["workflow_action"];
          comment: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          task_id?: string | null;
          actor_id: string;
          action: Database["public"]["Enums"]["workflow_action"];
          comment?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_request_id?: string;
          task_id?: string | null;
          actor_id?: string;
          action?: Database["public"]["Enums"]["workflow_action"];
          comment?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_workflow_actions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_workflow_actions_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_workflow_actions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "payment_workflow_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_workflow_tasks: {
        Row: {
          id: string;
          payment_request_id: string;
          step_no: number;
          step_name: string;
          required_role: Database["public"]["Enums"]["app_role"];
          assignee_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_request_id: string;
          step_no: number;
          step_name: string;
          required_role: Database["public"]["Enums"]["app_role"];
          assignee_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_request_id?: string;
          step_no?: number;
          step_name?: string;
          required_role?: Database["public"]["Enums"]["app_role"];
          assignee_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_workflow_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_workflow_tasks_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      procurement_requests: {
        Row: {
          id: string;
          request_no: string;
          requester_id: string;
          department_id: string;
          kind: Database["public"]["Enums"]["request_kind"];
          title: string;
          rationale: string;
          required_date: string | null;
          budget_year: number;
          fund_source: string;
          plan_name: string | null;
          expense_category: string | null;
          estimated_amount: number;
          status: Database["public"]["Enums"]["request_status"];
          current_step: number;
          submitted_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          form_data: Json;
        };
        Insert: {
          id?: string;
          request_no?: string;
          requester_id: string;
          department_id: string;
          kind: Database["public"]["Enums"]["request_kind"];
          title: string;
          rationale: string;
          required_date?: string | null;
          budget_year: number;
          fund_source: string;
          plan_name?: string | null;
          expense_category?: string | null;
          estimated_amount?: number;
          status?: Database["public"]["Enums"]["request_status"];
          current_step?: number;
          submitted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          form_data?: Json;
        };
        Update: {
          id?: string;
          request_no?: string;
          requester_id?: string;
          department_id?: string;
          kind?: Database["public"]["Enums"]["request_kind"];
          title?: string;
          rationale?: string;
          required_date?: string | null;
          budget_year?: number;
          fund_source?: string;
          plan_name?: string | null;
          expense_category?: string | null;
          estimated_amount?: number;
          status?: Database["public"]["Enums"]["request_status"];
          current_step?: number;
          submitted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          form_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "procurement_requests_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "procurement_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          employee_code: string | null;
          full_name: string;
          department_id: string | null;
          role: Database["public"]["Enums"]["app_role"];
          position_title: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          employee_code?: string | null;
          full_name?: string;
          department_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          position_title?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_code?: string | null;
          full_name?: string;
          department_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          position_title?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      request_attachments: {
        Row: {
          id: string;
          request_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      request_items: {
        Row: {
          id: string;
          request_id: string;
          line_no: number;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_amount: number | null;
          market_price: number | null;
          price_source: string | null;
        };
        Insert: {
          id?: string;
          request_id: string;
          line_no: number;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_amount?: never;
          market_price?: number | null;
          price_source?: string | null;
        };
        Update: {
          id?: string;
          request_id?: string;
          line_no?: number;
          description?: string;
          quantity?: number;
          unit?: string;
          unit_price?: number;
          total_amount?: never;
          market_price?: number | null;
          price_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          id: string;
          display_name: string;
          search_name: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          search_name?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          search_name?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_actions: {
        Row: {
          id: string;
          request_id: string;
          task_id: string | null;
          actor_id: string;
          action: Database["public"]["Enums"]["workflow_action"];
          comment: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          task_id?: string | null;
          actor_id: string;
          action: Database["public"]["Enums"]["workflow_action"];
          comment?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          task_id?: string | null;
          actor_id?: string;
          action?: Database["public"]["Enums"]["workflow_action"];
          comment?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_actions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_actions_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_actions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "workflow_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_tasks: {
        Row: {
          id: string;
          request_id: string;
          step_no: number;
          step_name: string;
          required_role: Database["public"]["Enums"]["app_role"];
          assignee_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          step_no: number;
          step_name: string;
          required_role: Database["public"]["Enums"]["app_role"];
          assignee_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          step_no?: number;
          step_name?: string;
          required_role?: Database["public"]["Enums"]["app_role"];
          assignee_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_tasks_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "procurement_requests";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_create_vendor: {
        Args: { vendor_name: string | null };
        Returns: { id: string; display_name: string; created: boolean }[];
      };
      admin_list_user_profiles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          position_title: string;
          role: Database["public"]["Enums"]["app_role"];
          department_id: string;
          active: boolean;
        }[];
      };
      catalog_image_path: { Args: { item_uuid: string | null }; Returns: string };
      create_payment_request_draft: {
        Args: {
          source_request_id: string | null;
          payment_idempotency_key: string | null;
          payment_invoice_no: string | null;
          payment_invoice_date: string | null;
          payment_subtotal: number | null;
          payment_vat_amount: number | null;
          payment_delivery_detail: string | null;
          payment_form_data: Json | null;
          payment_items: Json | null;
        };
        Returns: { id: string; payment_no: string }[];
      };
      create_procurement_request_draft: {
        Args: {
          request_kind: Database["public"]["Enums"]["request_kind"] | null;
          request_title: string | null;
          request_rationale: string | null;
          request_required_date: string | null;
          request_budget_year: number | null;
          request_fund_source: string | null;
          request_plan_name: string | null;
          request_expense_category: string | null;
          request_form_data: Json | null;
          request_items: Json | null;
        };
        Returns: { id: string; request_no: string }[];
      };
      resolve_vendor: {
        Args: { vendor_id: string | null };
        Returns: { id: string; display_name: string }[];
      };
      resubmit_returned_procurement_request: {
        Args: { target_request_id: string | null };
        Returns: {
          request_no: string;
          status: Database["public"]["Enums"]["request_status"];
          current_step: number;
        }[];
      };
      save_payment_request_revision: {
        Args: {
          target_payment_id: string | null;
          expected_updated_at: string | null;
          removed_attachment_ids: Array<string> | null;
          source_request_id: string | null;
          payment_idempotency_key: string | null;
          payment_invoice_no: string | null;
          payment_invoice_date: string | null;
          payment_subtotal: number | null;
          payment_vat_amount: number | null;
          payment_delivery_detail: string | null;
          payment_form_data: Json | null;
          payment_items: Json | null;
        };
        Returns: { id: string; payment_no: string; updated_at: string }[];
      };
      save_procurement_catalog_item: { Args: { payload: Json | null }; Returns: Json };
      search_procurement_catalog: {
        Args: {
          catalog_query?: string | null;
          category_filter?: string | null;
          page_number?: number | null;
        };
        Returns: Json;
      };
      search_procurement_catalog_admin: {
        Args: {
          catalog_query?: string | null;
          category_filter?: string | null;
          page_number?: number | null;
        };
        Returns: Json;
      };
      search_vendors: {
        Args: { vendor_query: string | null; max_results?: number | null };
        Returns: { id: string; display_name: string; total_count: number }[];
      };
      set_user_role: {
        Args: {
          target_user_id: string | null;
          new_role: Database["public"]["Enums"]["app_role"] | null;
          new_department_id?: string | null;
        };
        Returns: undefined;
      };
      submit_payment_request: {
        Args: {
          source_request_id: string | null;
          payment_idempotency_key: string | null;
          payment_invoice_no: string | null;
          payment_invoice_date: string | null;
          payment_subtotal: number | null;
          payment_vat_amount: number | null;
          payment_delivery_detail: string | null;
        };
        Returns: { id: string; payment_no: string }[];
      };
      submit_payment_request_draft: {
        Args: { target_payment_id: string | null };
        Returns: { id: string; payment_no: string }[];
      };
      submit_procurement_request: {
        Args: {
          request_kind: Database["public"]["Enums"]["request_kind"] | null;
          request_title: string | null;
          request_rationale: string | null;
          request_required_date: string | null;
          request_budget_year: number | null;
          request_fund_source: string | null;
          request_plan_name: string | null;
          request_expense_category: string | null;
          request_form_data: Json | null;
          request_items: Json | null;
        };
        Returns: { id: string; request_no: string }[];
      };
      submit_procurement_request_draft: {
        Args: { target_request_id: string | null };
        Returns: {
          request_no: string;
          status: Database["public"]["Enums"]["request_status"];
          current_step: number;
        }[];
      };
      transition_payment_request: {
        Args: {
          target_payment_id: string | null;
          decision: Database["public"]["Enums"]["workflow_action"] | null;
          decision_comment?: string | null;
        };
        Returns: {
          payment_no: string;
          status: Database["public"]["Enums"]["payment_status"];
          current_step: number;
        }[];
      };
      transition_procurement_request: {
        Args: {
          target_request_id: string | null;
          decision: Database["public"]["Enums"]["workflow_action"] | null;
          decision_comment?: string | null;
        };
        Returns: {
          request_no: string;
          status: Database["public"]["Enums"]["request_status"];
          current_step: number;
        }[];
      };
      update_returned_procurement_request: {
        Args: {
          target_request_id: string | null;
          request_kind: Database["public"]["Enums"]["request_kind"] | null;
          request_title: string | null;
          request_rationale: string | null;
          request_required_date: string | null;
          request_budget_year: number | null;
          request_fund_source: string | null;
          request_plan_name: string | null;
          request_expense_category: string | null;
          request_form_data: Json | null;
          request_items: Json | null;
        };
        Returns: { id: string; request_no: string }[];
      };
      update_user_admin_settings: {
        Args: {
          target_user_id: string | null;
          new_full_name: string | null;
          new_position_title: string | null;
          new_role: Database["public"]["Enums"]["app_role"] | null;
          new_department_id: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role:
        | "user"
        | "procurement_staff"
        | "finance_staff"
        | "head_procurement"
        | "deputy_secretary"
        | "deputy_finance"
        | "dean"
        | "head_office"
        | "admin";
      payment_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "returned"
        | "approved"
        | "voucher_submitted"
        | "completed"
        | "cancelled";
      request_kind: "purchase" | "hire";
      request_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "returned"
        | "not_approved"
        | "approved"
        | "budget_control"
        | "sourcing"
        | "ordered"
        | "completed"
        | "cancelled";
      task_status: "pending" | "completed" | "returned" | "rejected" | "cancelled";
      workflow_action:
        "submit" | "approve" | "return" | "reject" | "budget_control" | "complete" | "cancel";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
export type Tables<Name extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Name]["Row"];
export type Enums<Name extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][Name];

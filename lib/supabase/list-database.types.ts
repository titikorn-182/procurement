import type { Database, Tables } from "./database.types";

// Additive contract for migration 202610110005, not a claim that production
// metadata has been regenerated. SQL integration tests verify these columns.
export type RequestListRecord = Pick<
  Tables<"procurement_requests">,
  | "id"
  | "request_no"
  | "kind"
  | "title"
  | "estimated_amount"
  | "budget_year"
  | "status"
  | "current_step"
  | "created_at"
  | "required_date"
> & { department_name: string; requester_name: string; list_status: string; search_text: string };
export type PaymentListRecord = Pick<
  Tables<"payment_requests">,
  "id" | "payment_no" | "total_amount" | "status" | "current_step" | "created_at"
> & {
  subject: string;
  requester_name: string;
  department_name: string;
  source_no: string;
  search_text: string;
};

export type ListDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Views"> & {
    Views: {
      procurement_request_list: { Row: RequestListRecord; Relationships: [] };
      payment_request_list: { Row: PaymentListRecord; Relationships: [] };
    };
  };
};

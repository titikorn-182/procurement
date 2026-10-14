import type { Json } from "./database.types";

// Additive contract for 202610140003. Keep generated production metadata untouched.
export type W804Record = {
  id: string;
  request_no: string;
  requester_id: string;
  title: string;
  fiscal_year: string;
  total_amount: number;
  form_data: Json;
  revision: number;
  created_at: string;
  updated_at: string;
  search_text: string;
};
export type W804Table = { Row: W804Record; Insert: never; Update: never; Relationships: [] };
export type W804SaveFunction = {
  Args: { record_id: string; expected_revision: number; draft_data: Json };
  Returns: { id: string; request_no: string; revision: number }[];
};

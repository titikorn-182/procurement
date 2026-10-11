import type { RequestStatus } from "./status.types";
export type RequestRow = {
  id: string;
  type: string;
  title: string;
  unit: string;
  date: string;
  amount: number;
  status: RequestStatus;
  step: string;
  budgetYear?: number;
  rawStatus?: string;
};

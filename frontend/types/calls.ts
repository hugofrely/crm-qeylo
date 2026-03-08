export interface Call {
  id: string;
  contact: string;
  contact_name: string;
  deal: string | null;
  direction: "inbound" | "outbound";
  outcome: "answered" | "voicemail" | "no_answer" | "busy" | "wrong_number";
  duration_seconds: number | null;
  duration_formatted: string;
  started_at: string;
  notes: string;
  logged_by: string;
  created_at: string;
  updated_at: string;
}

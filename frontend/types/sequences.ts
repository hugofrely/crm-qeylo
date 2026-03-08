export interface SequenceStep {
  id: string;
  order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  body_text: string;
  step_type: "email" | "manual_task";
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "archived";
  email_account: string | null;
  created_by: string;
  created_by_name: string;
  steps: SequenceStep[];
  stats: {
    total_enrolled: number;
    active: number;
    completed: number;
    replied: number;
    reply_rate: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence: string;
  contact: string;
  contact_name: string;
  contact_email: string;
  current_step: string | null;
  status: "active" | "completed" | "replied" | "bounced" | "opted_out" | "paused" | "unenrolled";
  enrolled_at: string;
  completed_at: string | null;
  enrolled_by: string;
}

export type Plan = "free" | "pro" | "team";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  plan: Plan;
  default_language: string;
  auto_email_summaries: boolean;
  created_at: string;
  updated_at: string;
}

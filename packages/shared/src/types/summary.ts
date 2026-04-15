export interface ActionItem {
  text: string;
  assignee: string | null;
  due_date: string | null;
  done: boolean;
}

export interface KeyDecision {
  text: string;
  context: string;
  timestamp_ms: number | null;
}

export interface Topic {
  name: string;
  start_ms: number;
  end_ms: number;
  summary: string;
}

export interface Summary {
  id: string;
  recording_id: string;
  overview: string;
  action_items: ActionItem[];
  key_decisions: KeyDecision[];
  topics: Topic[];
  sentiment: string | null;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
}

export interface QAMessage {
  id: string;
  recording_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  referenced_segments: string[];
  model_used: string | null;
  created_at: string;
}

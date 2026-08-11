export type Role = "user" | "admin";

export interface User {
  id: number;
  email: string;
  role: Role;
  tracking_opt_in: boolean;
}

export interface CourseLesson {
  title: string;
  duration_label: string;
}

export interface CourseSection {
  title: string;
  summary: string;
  duration_label: string;
  lessons: CourseLesson[];
}

export interface CourseContent {
  headline: string;
  overview: string;
  outcomes: string[];
  sections: CourseSection[];
}

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  old_price: number | null;
  instructor: string;
  duration_label: string;
  lessons_count: number;
  rating: number;
  reviews_count: number;
  tags: string;
  image_url: string | null;
  course_content: CourseContent | null;
  vector_synced: boolean;
  created_at: string;
}

export type ProductInput = Omit<Product, "id" | "created_at" | "vector_synced" | "course_content"> & {
  course_content?: CourseContent | null;
};

export interface Enrollment {
  id: number;
  product: Product;
  created_at: string;
}

export interface RecommendationItem {
  product: Product;
  rank: number;
  reason: string;
}

export interface Recommendation {
  id: number;
  narrative: string;
  trigger_reason: string;
  evidence: string[];
  created_at: string;
  items: RecommendationItem[];
}

export interface ActivityEvent {
  id: number;
  event_type: string;
  product_id: number | null;
  product_title: string | null;
  search_query: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentOpsOverview {
  tokens_used_today: number;
  active_models: string[];
  requests_routed: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  agent_runs_today: number;
  events_today: number;
  recommendations_today: number;
  recommendation_clicks_today: number;
  recommendation_enrollments_today: number;
  recommendation_click_rate: number;
  recommendation_enrollment_rate: number;
}

export interface AgentOpsEvent {
  id: number;
  created_at: string;
  user_id: number;
  user_label: string;
  event_type: string;
  detail: string;
  product_id: number | null;
  product_title: string | null;
  search_query: string | null;
  dwell_seconds: number | null;
  recommendation_id: number | null;
}

export interface AgentRunSummary {
  id: number;
  user_id: number;
  user_label: string;
  status: string;
  trigger_reason: string;
  interest_summary: string | null;
  retrieval_query: string | null;
  latency_ms: number | null;
  started_at: string;
  completed_at: string | null;
  recommendation_id: number | null;
}

export interface AgentRunStep {
  id: number;
  step_name: string;
  status: string;
  latency_ms: number | null;
  input_snapshot: Record<string, unknown> | null;
  output_snapshot: Record<string, unknown> | null;
  error_message: string | null;
}

export interface MeshCallLog {
  id: number;
  step_name: string;
  endpoint: string;
  requested_model: string;
  resolved_model: string | null;
  status: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  cache_hit: boolean | null;
  routing_attempts: number | null;
  routing_fallback: boolean | null;
  response_metadata: Record<string, unknown> | null;
  error_message: string | null;
}

export interface AgentRunDetail extends AgentRunSummary {
  error_message: string | null;
  steps: AgentRunStep[];
  mesh_calls: MeshCallLog[];
}

export interface CatalogHealth {
  total_courses: number;
  synced_courses: number;
  pending_sync_courses: number;
  failed_sync_courses: number;
  retrieval_coverage_percent: number;
}

export interface CatalogRetryResult extends CatalogHealth {
  retried_courses: number;
}

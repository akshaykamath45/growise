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

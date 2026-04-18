export interface JDResponse {
  job_title: string;
  role_summary: string;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  qualifications: string[];
  experience: string;
  location: string;
  work_mode: string;
  tech_stack: string[];
  soft_skills: string[];
  company_overview: string;
  assumptions: string[];
  social_media: {
    linkedin_post: string;
    short_version: string;
    hashtags: string[];
  };
  search_query_boolean: string;
  search_keywords: string[];
  quality_score: number;
  quality_feedback: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: JDResponse;
}

export interface TabItem {
  id: string;
  title: string;
  data: JDResponse | null;
}

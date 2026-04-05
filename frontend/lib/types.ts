export interface Post {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  url: string;
  domain: string;
  permalink: string;
  is_self: boolean;
}

export interface SearchResponse {
  posts: Post[];
  total: number;
  query: string;
  is_semantic: boolean;
  retrieval_mode: string;
}

export interface ChatResponse {
  answer: string;
  sources: Post[];
  suggested_queries: string[];
}

export interface ClusterTopic {
  id: number;
  name: string;
  keywords: string[];
  post_count: number;
  subreddit_distribution: Record<string, number>;
}

export interface TopicSummaryResponse {
  topic_count: number;
  topics: ClusterTopic[];
  post_topic_map: Record<string, number>;
  landscape_url: string;
}

export interface NetworkNode {
  id: string;
  pagerank: number;
  degree: number;
  community: number;
  subreddits: string[];
  primary_subreddit?: string | null;
  post_count: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  shared_contexts: string[];
  evidence_type: string;
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  removed_node: string | null;
  removed?: boolean;
  component_count: number;
  query: string;
  mode: string;
  matched_posts: number;
  summary: string;
}

export interface TimelinePoint {
  date: string;
  count: number;
  avg_score: number;
}

export interface TimelineResponse {
  series: TimelinePoint[];
  topic_trends: {
    topic_id: number;
    topic_name: string;
    total_posts: number;
    series: Array<{ date: string; count: number }>;
  }[];
  summary: string;
  query: string;
}

export interface HealthResponse {
  status: string;
  posts: number | null;
  subreddits: number | null;
  artifacts_ready?: boolean;
  error?: string | null;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
  sources?: Post[];
  suggestedQueries?: string[];
}

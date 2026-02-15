
export interface StreakHistoryItem {
  id: string;
  startDate: number; // timestamp
  endDate: number;   // timestamp
  days: number;
}

export interface UserData {
  currentStreakStart: number | null; // Timestamp of when the current streak started
  goal: number; // Target days
  history: StreakHistoryItem[];
  uid?: string;
  username?: string; 
  whyStatement?: string; // The user's "Why" or Core Intent
  showMotivation?: boolean;
  totalEvents?: number; // Lifetime count of events
  celebratedMilestones?: string[]; // IDs of milestones already celebrated
}

export interface MotivationResponse {
  message: string;
  author?: string;
}

export interface ForecastResponse {
  prediction: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  insight: string;
}

export interface CelebrationResponse {
  title: string;
  message: string;
  rankInsight: string;
}
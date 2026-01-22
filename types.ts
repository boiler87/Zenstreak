
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
  showMotivation?: boolean;
  totalEvents?: number; // Lifetime count of events
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

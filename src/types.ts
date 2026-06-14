export type FibroidEntry = {
  date: string;
  painLevel: number; // 1-10
  bleedingIntensity: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | 'very-heavy';
  symptoms: string[];
  notes: string;
};

export type UserData = {
  name: string;
  lastPeriodDate: string;
  cycleLength: number;
  periodLength: number;
  onboardingComplete: boolean;
  hasFibroids: boolean;
  isPremiumUnlocked?: boolean;
  notificationsEnabled?: boolean;
  notificationTime?: string; // "HH:MM" format
  skinType?: 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';
  skinTone?: 'fair' | 'light' | 'medium' | 'olive' | 'dark-brown' | 'deep-black';
};

export type MoodEntry = {
  date: string;
  mood: 'happy' | 'sad' | 'anxious' | 'irritable' | 'calm' | 'tired';
  medication?: string;
  symptoms: string[];
  painLevel?: number;
};

export type RecoveryPlan = {
  type: 'abortion' | 'general';
  startDate: string;
  notes: string;
};

export type MealSuggestion = {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

export type MedInfo = {
  id: string;
  name: string;
  purpose: string;
  advice: string;
};

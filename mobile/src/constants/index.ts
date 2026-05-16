export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000';

export const COLORS = {
  primary: '#7c3aed',
  primaryLight: '#a78bfa',
  primaryDark: '#5b21b6',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  border: '#2d2d4a',
  online: '#10b981',
  offline: '#6b7280',
};

export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

export const INTERESTS = [
  'Music', 'Gaming', 'Sports', 'Movies', 'Travel',
  'Food', 'Art', 'Technology', 'Books', 'Fitness',
  'Photography', 'Dancing', 'Comedy', 'Fashion', 'Cooking',
];

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
];

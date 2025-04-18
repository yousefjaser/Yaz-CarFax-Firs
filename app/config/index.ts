import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ENV = {
  dev: {
    SUPABASE_URL: 'https://egnvrxqoamgpjtmhnhri.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbnZyeHFvYW1ncGp0bWhuaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5Mzk4MjYsImV4cCI6MjA1MTUxNTgyNn0.aVuGbcFp8vXTMKMLWq-JcWs7cXM8Iuw3f0N1iTO7qOo',
    API_URL: 'https://egnvrxqoamgpjtmhnhri.supabase.co',
  },
  prod: {
    SUPABASE_URL: 'https://egnvrxqoamgpjtmhnhri.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbnZyeHFvYW1ncGp0bWhuaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5Mzk4MjYsImV4cCI6MjA1MTUxNTgyNn0.aVuGbcFp8vXTMKMLWq-JcWs7cXM8Iuw3f0N1iTO7qOo',
    API_URL: 'https://egnvrxqoamgpjtmhnhri.supabase.co',
  }
};

// تحديد البيئة الحالية
const environment = 'dev';
const currentEnv = ENV[environment as keyof typeof ENV];

// تصدير المتغيرات
export const SUPABASE_URL = currentEnv.SUPABASE_URL;
export const SUPABASE_KEY = currentEnv.SUPABASE_KEY;
export const API_URL = currentEnv.API_URL;

// إنشاء مخزن مخصص للجلسات
const createCustomStorage = () => {
  return {
    async getItem(key: string) {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return AsyncStorage.getItem(key);
    },
    async setItem(key: string, value: string) {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    },
    async removeItem(key: string) {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    }
  };
};

// إنشاء عميل Supabase مع دعم استمرارية الجلسات
export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY,
  {
    auth: {
      storage: createCustomStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
      debug: Platform.OS === 'web' ? true : false,
    }
  }
);

// تكوين التطبيق العام
export const APP_CONFIG = {
  APP_NAME: 'YazCar',
  VERSION: '1.0.0',
};

// ثوابت API
export const API_CONFIG = {
  baseUrl: SUPABASE_URL,
  timeout: 30000,
  retryAttempts: 3,
};

// تصدير افتراضي لدعم NOBRIDGE
export default { supabase, API_CONFIG }; 
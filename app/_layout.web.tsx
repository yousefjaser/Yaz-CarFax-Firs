import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from './utils/store';
import { checkAuthStatus } from './services/auth';
import { Provider as PaperProvider } from 'react-native-paper';
import { Slot } from 'expo-router';

// تعريف Sentry محلي
const Sentry = {
  init: () => {},
  Native: {
    captureException: (error: unknown) => console.error('Error captured:', error),
    captureMessage: (msg: string) => console.warn(msg)
  }
};

export default function RootLayoutWeb() {
  console.log('تحميل التخطيط الخاص بالويب');
  const { setUser, setIsAuthenticated } = useAuthStore();

  useEffect(() => {
    async function loadAuthStatus() {
      try {
        const { isAuthenticated, user, error } = await checkAuthStatus();
        if (error) {
          console.error('فشل في التحقق من حالة المصادقة:', error);
          return;
        }
        
        setUser(user);
        setIsAuthenticated(isAuthenticated);
      } catch (error) {
        console.error('حدث خطأ أثناء التحقق من حالة المصادقة:', error);
      }
    }

    loadAuthStatus();
  }, []);

  // استخدام Slot بدلاً من Stack للويب
  // Slot لا يستخدم NativeStackNavigator
  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
} 
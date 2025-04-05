import React, { useEffect, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useAuthStore } from './utils/store';
import { checkAuthStatus } from './services/auth';

// تعطيل Sentry مؤقتًا لحل مشكلة Android
// import * as Sentry from 'sentry-expo';
// استخدام بديل محلي
const Sentry = {
  init: () => {},
  Native: {
    captureException: (error: unknown) => console.error('Error captured:', error),
    captureMessage: (msg: string) => console.warn(msg)
  }
};

// استيراد reanimated بشكل مشروط بالمنصة
// فقط على المنصات المحمولة وليس الويب
if (Platform.OS !== 'web') {
  try {
    require('react-native-reanimated');
  } catch (e) {
    console.warn('Failed to load reanimated:', e);
  }
}

// تكوين Sentry لتتبع الأخطاء - معطل مؤقتًا
Sentry.init();

// تعريف interface لمكون ErrorBoundary
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// مكون الخطأ العام
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الخطأ في Sentry
    Sentry.Native.captureException(error);
    console.error("خطأ في التطبيق:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // يمكنك هنا عرض واجهة مستخدم للخطأ
      return (
        <PaperProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="error"
              options={{
                title: "حدث خطأ",
                headerShown: true,
              }}
            />
          </Stack>
        </PaperProvider>
      );
    }
    return this.props.children;
  }
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const { setUser, setIsAuthenticated } = useAuthStore();

  useEffect(() => {
    async function loadAuthStatus() {
      try {
        const { isAuthenticated, user, error } = await checkAuthStatus();
        if (error) {
          console.error('فشل في التحقق من حالة المصادقة:', error);
          Sentry.Native.captureMessage('فشل في التحقق من حالة المصادقة');
          return;
        }
        
        setUser(user);
        setIsAuthenticated(isAuthenticated);
      } catch (error) {
        console.error('حدث خطأ أثناء التحقق من حالة المصادقة:', error);
        Sentry.Native.captureException(error);
      }
    }

    loadAuthStatus();
  }, []);

  // تحديد إعدادات تنقل مختلفة بناءً على المنصة
  const isWeb = Platform.OS === 'web';
  
  // تعريف وظيفة لإنشاء خيارات الشاشة
  const getScreenOptions = () => {
    const baseOptions = { headerShown: false };
    
    if (isWeb) {
      return {
        ...baseOptions,
        animation: 'none',
        presentation: 'card',
      };
    } else if (Platform.OS === 'ios') {
      // في iOS نستخدم قيم أكثر توافقاً
      return {
        ...baseOptions,
        presentation: 'card',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'simple_push'
      };
    } else {
      // في Android نستخدم قيم بسيطة
      return {
        ...baseOptions,
        animation: 'fade',
        presentation: 'card',
        gestureEnabled: true,
        animationEnabled: true
      };
    }
  };
  
  return (
    <ErrorBoundary>
      {/* @ts-ignore */}
      <PaperProvider>
        {/* @ts-ignore */}
        <Stack screenOptions={getScreenOptions() as any} />
      </PaperProvider>
    </ErrorBoundary>
  );
}

export default RootLayout; 
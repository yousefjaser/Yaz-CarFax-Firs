import React, { useEffect, ReactNode, useState } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, Platform, View, Text } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { useAuthStore } from './utils/store';
import { checkAuthStatus } from './services/auth';
import { useSegments, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

function AuthContextProvider({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, user, setUser, setIsAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // وظيفة للتحقق من حالة المصادقة
    const checkAuth = async () => {
      try {
        console.log('توقيت التحقق من المصادقة في AuthContextProvider');
        // تأكد من عدم إجراء أي تغييرات قبل التحقق
        setIsLoading(true);
        
        // انتظر قليلاً للتأكد من استكمال عمليات Supabase
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (error) {
        console.error('خطأ في فحص المصادقة:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    // عدم إجراء أي توجيه أثناء التحميل
    if (isLoading) {
      console.log('التطبيق قيد التحميل...');
      return;
    }
    
    // طباعة الحالة للتصحيح بتفاصيل أكثر
    console.log('حالة المصادقة في AuthContextProvider:', { 
      isAuthenticated, 
      المسار: segments.join('/'), 
      النظام: Platform.OS,
      دور_المستخدم: user?.role,
      بيانات_المستخدم_كاملة: JSON.stringify(user)
    });
    
    // تحديد ما إذا كان المسار الحالي يتطلب مصادقة
    // المسارات الآمنة (تتطلب مصادقة): index, shop, admin, customer
    // المسارات العامة: auth (تسجيل الدخول)، وصفحة تفاصيل السيارة
    const inAuthGroup = segments[0] === 'auth';
    const inLoginScreen = segments.join('/') === 'auth/login';
    
    // التحقق من أنها صفحة تفاصيل السيارة العامة
    const segmentsArray = segments as string[];
    let isPublicCarDetails = false;
    if (segmentsArray && segmentsArray.length >= 2) {
      if (segmentsArray[0] === 'shop' && segmentsArray[1] === 'car-details') {
        isPublicCarDetails = true;
      }
      
      // إضافة تحقق من المسارات العامة الجديدة
      if (segmentsArray[0] === 'shop' && segmentsArray[1] === 'public') {
        isPublicCarDetails = true; // نستخدم نفس المتغير للتبسيط
        console.log('تم اكتشاف مسار عام في الدليل public:', segments.join('/'));
      }
    }
    
    // التحقق من مسار المستخدم الحالي ومطابقته مع الدور
    const inShopGroup = segmentsArray[0] === 'shop';
    const inCustomerGroup = segmentsArray[0] === 'customer';
    const inAdminGroup = segmentsArray[0] === 'admin';
    const inRootPath = !segmentsArray[0] || segmentsArray[0] === '';
    
    console.log('تفاصيل المسارات:', {
      inShopGroup,
      inCustomerGroup,
      inAdminGroup,
      inRootPath,
      inAuthGroup,
      inLoginScreen,
      isPublicCarDetails,
      currentPath: segmentsArray[0]
    });
    
    // تأكد من عدم تنفيذ أي منطق توجيه إذا لم يكن هناك مستخدم حتى عندما isAuthenticated = true
    if (isAuthenticated && !user) {
      console.log('تم اكتشاف حالة غريبة: المستخدم مصادق عليه لكن بيانات المستخدم غير موجودة!');
      setIsAuthenticated(false);
      router.replace('/auth/login');
      return;
    }
    
    // توجيه المستخدم بناءً على حالة المصادقة والدور
    if (!isAuthenticated) {
      // إذا كان المستخدم غير مصادق وليس في المسارات العامة
      if (!inAuthGroup && !isPublicCarDetails) {
        console.log('توجيه إلى صفحة تسجيل الدخول لأن المستخدم غير مصادق عليه');
        router.replace('/auth/login');
      }
    } else {
      // إذا كان المستخدم مصادق عليه
      
      // تحويل دور المستخدم إلى نص صغير للمقارنة
      const userRole = user?.role?.toString()?.toLowerCase?.();
      
      // لا نسمح للمستخدم المصادق بالوصول لصفحة تسجيل الدخول
      if (inLoginScreen) {
        console.log('⭐️ المستخدم مصادق عليه ويحاول الوصول لصفحة تسجيل الدخول');
        console.log('⭐️ الدور:', userRole);
        
        // التوجيه حسب دور المستخدم
        if (userRole === 'shop_owner' || userRole === 'shop') {
          console.log('⭐️ توجيه إلى لوحة تحكم المتجر');
          router.replace('/shop/shop-dashboard');
        } else if (userRole === 'customer') {
          console.log('⭐️ توجيه إلى لوحة تحكم العميل');
          router.replace('/customer/customer-dashboard');
        } else if (userRole === 'admin') {
          console.log('⭐️ توجيه إلى لوحة تحكم المسؤول');
          router.replace('/admin/admin-dashboard');
        } else {
          console.log('⭐️ لم يتم تحديد دور صالح للمستخدم:', userRole);
          router.replace('/');
        }
        return;
      }
      
      // إذا كان المستخدم في مسار غير مطابق لدوره
      // فحص توافق المسار مع الدور
      console.log('فحص توافق المسار مع الدور:', {
        دور_المستخدم: userRole,
        دور_خام: user?.role,
        المسار_الحالي: segmentsArray[0],
        هل_يحتاج_توجيه: inRootPath || 
                    ((userRole === 'shop_owner' || userRole === 'shop') && !inShopGroup) || 
                    (userRole === 'customer' && !inCustomerGroup) || 
                    (userRole === 'admin' && !inAdminGroup)
      });
      
      // إجبار توجيه المستخدم حسب دوره
      if (inRootPath || 
          ((userRole === 'shop_owner' || userRole === 'shop') && !inShopGroup) || 
          (userRole === 'customer' && !inCustomerGroup) || 
          (userRole === 'admin' && !inAdminGroup)) {
        
        console.log('⭐️ توجيه المستخدم إلى المسار المناسب لدوره:', userRole);
        
        // التوجيه حسب دور المستخدم
        if (userRole === 'shop_owner' || userRole === 'shop') {
          console.log('⭐️ جاري التوجيه إلى لوحة تحكم المتجر...');
          router.replace('/shop/shop-dashboard');
        } else if (userRole === 'customer') {
          console.log('⭐️ جاري التوجيه إلى لوحة تحكم العميل...');
          router.replace('/customer/customer-dashboard');
        } else if (userRole === 'admin') {
          console.log('⭐️ جاري التوجيه إلى لوحة تحكم المسؤول...');
          router.replace('/admin/admin-dashboard');
        } else {
          console.log('⭐️ لم يتم تحديد دور صالح للمستخدم:', userRole);
          router.replace('/');
        }
      } else {
        console.log('المستخدم بالفعل في المسار الصحيح المناسب لدوره:', {
          دور: userRole,
          مسار: segmentsArray[0]
        });
      }
    }
  }, [segments, isAuthenticated, isLoading, user]);

  // عرض شاشة تحميل أثناء التحقق من المصادقة
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const { setUser, setIsAuthenticated } = useAuthStore();

  useEffect(() => {
    async function loadAuthStatus() {
      try {
        console.log('جاري التحقق من حالة المصادقة في RootLayout...');
        const { isAuthenticated, user, error } = await checkAuthStatus();
        if (error) {
          console.error('فشل في التحقق من حالة المصادقة:', error);
          Sentry.Native.captureMessage('فشل في التحقق من حالة المصادقة');
          return;
        }
        
        console.log('تم العثور على المستخدم:', { 
          isAuthenticated, 
          معرف: user?.id, 
          بريد: user?.email, 
          دور: user?.role 
        });
        
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          <AuthContextProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: Platform.OS === 'web' ? 'none' : 'default',
              }}
            />
          </AuthContextProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default RootLayout; 
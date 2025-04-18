import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from './utils/store';
import { checkAuthStatus } from './services/auth';
import { Provider as PaperProvider } from 'react-native-paper';
import { Slot, useRouter, useSegments } from 'expo-router';

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
  const router = useRouter();
  const segments = useSegments();

  // إضافة تحسينات الأداء للويب عند تحميل التطبيق
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      console.log('تحسين أداء الويب...');
      
      // إضافة preconnect لتسريع الاتصال بـ Supabase
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = 'https://egnvrxqoamgpjtmhnhri.supabase.co';
      preconnectLink.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectLink);
      
      // إضافة بيانات منظمة للمساعدة في تحسين SEO
      const addStructuredData = () => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "ياز كار",
          "alternateName": "ياز كار فاكس",
          "applicationCategory": "AutomotiveApplication",
          "description": "ياز كار - خدمة صيانة السيارات الشاملة في فلسطين، احجز صيانة، تتبع سجل صيانة سيارتك",
          "operatingSystem": "Web, iOS, Android",
          "url": "https://yazcar.xyz",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "keywords": "ياز كار, ياز, ياز كار فاكس, صيانة سيارات, حجز صيانة, فحص سيارات, فلسطين"
        });
        document.head.appendChild(script);
      };
      
      // إضافة البيانات المنظمة
      addStructuredData();
      
      // إضافة dns-prefetch لتسريع عملية DNS
      const dnsPrefetchLink = document.createElement('link');
      dnsPrefetchLink.rel = 'dns-prefetch';
      dnsPrefetchLink.href = 'https://egnvrxqoamgpjtmhnhri.supabase.co';
      document.head.appendChild(dnsPrefetchLink);
      
      // إضافة meta tags لتحسين الأداء
      const metaTags = [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'theme-color', content: '#083c70' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ];
      
      metaTags.forEach(tag => {
        // تجنب إضافة meta tags موجودة مسبقًا
        if (!document.querySelector(`meta[name="${tag.name}"]`)) {
          const meta = document.createElement('meta');
          meta.name = tag.name;
          meta.content = tag.content;
          document.head.appendChild(meta);
        }
      });
      
      // تأجيل تحميل الصفحات الأقل أهمية
      const deferredPaths = [
        // صور وأصول التطبيق
        ['preload', '/assets/images/', 'image'], 
        // ملفات JS للصفحات الأقل استخدامًا
        ['prefetch', '/customer/customer-dashboard', 'document'],
        ['prefetch', '/auth/register', 'document']
      ];
      
      // استخدام Intersection Observer لتحميل الموارد عند الحاجة فقط
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // تأخير التحميل المسبق للصفحات غير المهمة
              setTimeout(() => {
                deferredPaths.forEach(([rel, href, as]) => {
                  const link = document.createElement('link');
                  link.rel = rel;
                  link.href = href;
                  if (as) link.setAttribute('as', as);
                  document.head.appendChild(link);
                });
              }, 2000); // تأخير لمدة 2 ثانية بعد تحميل الصفحة الرئيسية
              
              observer.disconnect();
            }
          });
        });
        
        // مراقبة الجسم بأكمله
        observer.observe(document.body);
      }
      
      // تحميل مسبق للصفحات الشائعة والمهمة على الفور
      const priorityRoutes = [
        '/shop/shop-dashboard',
        '/shop/scan',
        '/shop/service-history',
        '/shop/create-qr'
      ];
      
      console.log('تحميل مسبق للصفحات المهمة...');
      
      // استخدام requestIdleCallback لتنفيذ التحميل المسبق في وقت فراغ المتصفح
      const schedulePreload = (window as any).requestIdleCallback || 
        ((cb: () => void) => setTimeout(cb, 1000));
        
      schedulePreload(() => {
        priorityRoutes.forEach(route => {
          console.log('تحميل مسبق للصفحة:', route);
          try {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = route;
            prefetchLink.as = 'document';
            document.head.appendChild(prefetchLink);
            
            // استباق تحميل أي assets مستخدمة في هذه الصفحات
            if (route.includes('scan')) {
              // تحميل مسبق لمكتبات الباركود
              const scriptPreload = document.createElement('link');
              scriptPreload.rel = 'preload';
              scriptPreload.href = '/assets/jsQR.min.js';
              scriptPreload.as = 'script';
              document.head.appendChild(scriptPreload);
            }
          } catch (e) {
            console.error('خطأ في التحميل المسبق:', e);
          }
        });
      });
      
      // تحسين الأداء على الأجهزة اللمسية
      document.addEventListener('touchmove', function(e) {
        if (document.documentElement.classList.contains('navigation-open')) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // تسريع بدء التصيير
      document.documentElement.classList.add('font-display-swap');
      
      // تحسين استجابة المستخدم على الأجهزة المحمولة
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      window.addEventListener('resize', () => {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      });
      
      // تفعيل التخزين المؤقت للصور
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        img, video {
          content-visibility: auto;
        }
        .prefetch-area {
          content-visibility: auto;
          contain-intrinsic-size: 1px 5000px;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  // متغير مرجعي لتتبع ما إذا تم التحقق من الجلسة بالفعل
  const authCheckComplete = React.useRef(false);

  useEffect(() => {
    async function loadAuthStatus() {
      // تجنب التحقق المتكرر من المصادقة
      if (authCheckComplete.current) {
        console.log('تم التحقق من المصادقة بالفعل، تخطي...');
        return;
      }
      
      try {
        console.log('جاري التحقق من المصادقة...');
        const { isAuthenticated, user, error } = await checkAuthStatus();
        
        if (error) {
          console.error('فشل في التحقق من حالة المصادقة:', error);
          authCheckComplete.current = true;
          return;
        }
        
        setUser(user);
        setIsAuthenticated(isAuthenticated);
        
        // توجيه المستخدم مباشرة إلى لوحة التحكم المناسبة إذا كان مصادقًا
        if (isAuthenticated && user) {
          // التحقق مما إذا كان المستخدم على صفحة تسجيل الدخول
          const isAuthPage = segments[0] === 'auth';
          
          // توجيه المستخدم فقط إذا كان على صفحة المصادقة
          if (isAuthPage) {
            console.log('المستخدم مصادق، توجيه إلى لوحة التحكم...');
            
            setTimeout(() => {
              if (user.role === 'admin') {
                router.replace('/admin/admin-dashboard');
              } else if (user.role === 'shop_owner') {
                router.replace('/shop/shop-dashboard');
              } else if (user.role === 'customer') {
                router.replace('/customer/customer-dashboard');
              } else {
                router.replace('/');
              }
            }, 100); // تأخير قصير لضمان تحديث الحالة
          }
        }
        
        // تحديث حالة إكمال التحقق
        authCheckComplete.current = true;
      } catch (error) {
        console.error('حدث خطأ أثناء التحقق من حالة المصادقة:', error);
        authCheckComplete.current = true;
      }
    }

    loadAuthStatus();
  }, [router, segments]);

  // استخدام Slot بدلاً من Stack للويب
  // Slot لا يستخدم NativeStackNavigator
  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
} 
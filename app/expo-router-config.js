// تكوين مخصص لـ Expo Router
// هذا الملف يقوم بضبط السلوك الافتراضي لجميع شاشات التطبيق

import { Platform } from 'react-native';

export default {
  // الإعدادات الافتراضية لـ Stack Navigator
  default: {
    screenOptions: {
      headerShown: false,
      contentStyle: { backgroundColor: '#fff' },
      
      // خيارات مشتركة لجميع المنصات
      gestureEnabled: true,
      animationEnabled: true,
      
      // خيارات مخصصة حسب المنصة
      ...Platform.select({
        web: {
          animation: 'fade',
        },
        ios: {
          fullScreenGestureEnabled: true,
          animation: 'default',
          presentation: 'card',
          gestureDirection: 'horizontal',
        },
        android: {
          animation: 'slide_from_right',
          presentation: 'card',
          gestureDirection: 'horizontal',
        }
      }),
    },
  },
}; 
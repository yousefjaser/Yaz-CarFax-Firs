// تكوين مخصص لـ Expo Router
// هذا الملف يقوم بضبط السلوك الافتراضي لجميع شاشات التطبيق

import { Platform } from 'react-native';

export default {
  // الإعدادات الافتراضية لـ Stack Navigator
  default: {
    screenOptions: {
      headerShown: false,
      animation: Platform.OS === 'ios' ? 'default' : 'fade',
      presentation: 'card',
      contentStyle: { backgroundColor: '#fff' },
      
      // خيارات للأجهزة المحمولة فقط
      ...Platform.select({
        ios: {
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        },
        android: {
          gestureEnabled: true,
          animationEnabled: true,
          animation: 'fade',
        }
      }),
    },
  },
}; 
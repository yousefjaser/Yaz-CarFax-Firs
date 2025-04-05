import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// تحديد نوع للتوافق مع TypeScript
type ScreenOptionsType = {
  headerShown: boolean;
  animation?: any;
  presentation?: any;
  gestureEnabled?: boolean;
  fullScreenGestureEnabled?: boolean;
  animationEnabled?: boolean;
};

export default function AuthLayout() {
  const isWeb = Platform.OS === 'web';
  
  // تحديد الخيارات بناءً على المنصة
  const getScreenOptions = (): ScreenOptionsType => {
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
    <Stack screenOptions={getScreenOptions() as any} />
  );
} 
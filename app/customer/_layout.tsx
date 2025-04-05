// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../utils/store';

function CustomerLayout() {
  const { user } = useAuthStore();

  // التأكد من أن المستخدم قد سجل الدخول
  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  // التأكد من أن المستخدم هو عميل
  const userRole = String(user.role).toLowerCase();
  if (userRole !== 'customer' && userRole !== 'admin') {
    return <Redirect href="/shop/shop-dashboard" />;
  }

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
    <View style={styles.container}>
      {/* @ts-ignore */}
      <Stack screenOptions={getScreenOptions() as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default CustomerLayout; 
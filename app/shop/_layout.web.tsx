// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuthStore } from '../utils/store';

// ملف تخطيط خاص للويب
function ShopLayoutWeb() {
  console.log('تحميل تخطيط المتجر الخاص بالويب');
  const { user } = useAuthStore();

  // التأكد من أن المستخدم قد سجل الدخول
  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  // التأكد من أن المستخدم هو صاحب محل
  const userRole = String(user.role).toLowerCase();
  if (userRole !== 'shop_owner' && userRole !== 'shop' && userRole !== 'admin') {
    return <Redirect href="/customer/customer-dashboard" />;
  }

  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default ShopLayoutWeb; 
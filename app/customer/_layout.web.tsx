// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useAuthStore } from '../utils/store';

export default function CustomerLayoutWeb() {
  console.log('تحميل تخطيط العميل الخاص بالويب');
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
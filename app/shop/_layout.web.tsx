// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Redirect, Slot, useRouter, usePathname } from 'expo-router';
import { Appbar, Text } from 'react-native-paper';
import { useAuthStore } from '../utils/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants';

// ملف تخطيط خاص للويب
function ShopLayoutWeb() {
  console.log('تحميل تخطيط المتجر الخاص بالويب');
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  
  // تحقق ما إذا كان المسار الحالي هو مسار عام لا يتطلب تسجيل دخول
  const isPublicRoute = pathname.startsWith('/shop/public/');
  
  console.log('المسار الحالي:', pathname, 'مسار عام:', isPublicRoute);

  // التأكد من أن المستخدم قد سجل الدخول (تجاوز للمسارات العامة)
  if (!user && !isPublicRoute) {
    return <Redirect href="/auth/login" />;
  }

  // التأكد من أن المستخدم هو صاحب محل (تجاوز للمسارات العامة)
  if (!isPublicRoute && user) {
    const userRole = String(user.role).toLowerCase();
    if (userRole !== 'shop_owner' && userRole !== 'shop' && userRole !== 'admin') {
      return <Redirect href="/customer/customer-dashboard" />;
    }
  }

  const openMenu = () => {
    router.push('/shop/menu');
  };

  const goToDashboard = () => {
    router.push('/shop/shop-dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* شريط العنوان للويب فقط */}
      <Appbar.Header style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Icon name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToDashboard} style={styles.titleContainer}>
          <Text style={styles.title}>Yaz Car</Text>
        </TouchableOpacity>
        <View style={styles.spacer} />
      </Appbar.Header>
      
      {/* المحتوى الرئيسي */}
      <View style={styles.content}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
  }
});

export default ShopLayoutWeb; 
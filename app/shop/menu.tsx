// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { Text, Divider, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants';
import { useAuthStore } from '../utils/store';
import { signOut } from '../services/auth';

export default function ShopMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        return;
      }
      
      logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
  };
  
  const navigateTo = (route) => {
    router.push(`/shop/${route}`);
  };
  
  const handleBackButton = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackButton}>
          <Icon name="arrow-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>القائمة</Text>
        <View style={{ width: 28 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.userInfoSection}>
          {user?.profile_image ? (
            <Avatar.Image
              size={80}
              source={{ uri: user.profile_image }}
              style={{ backgroundColor: COLORS.primary }}
            />
          ) : (
            <Avatar.Text
              size={80}
              label={user?.name ? user.name.substring(0, 2).toUpperCase() : "??"}
              style={{ backgroundColor: COLORS.primary }}
            />
          )}
          <Text style={styles.userName}>{user?.name || 'مستخدم'}</Text>
          <Text style={styles.userRole}>
            {String(user?.role).toLowerCase() === 'shop_owner' || String(user?.role).toLowerCase() === 'shop'
              ? 'صاحب محل' 
              : String(user?.role).toLowerCase() === 'customer' 
                ? 'عميل' 
                : String(user?.role).toLowerCase() === 'admin' 
                  ? 'مدير' 
                  : 'مستخدم'
            }
          </Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.menuSection}>
          <MenuItem 
            icon="view-dashboard" 
            label="لوحة التحكم" 
            onPress={() => navigateTo('shop-dashboard')} 
          />
          <MenuItem 
            icon="car" 
            label="السيارات" 
            onPress={() => navigateTo('cars')} 
          />
          <MenuItem 
            icon="history" 
            label="سجل الخدمات" 
            onPress={() => navigateTo('service-history')} 
          />
          <MenuItem 
            icon="qrcode-scan" 
            label="مسح QR" 
            onPress={() => navigateTo('scan')} 
          />
          <MenuItem 
            icon="plus-circle" 
            label="إضافة سيارة" 
            onPress={() => navigateTo('add-car')} 
          />
          <MenuItem 
            icon="account" 
            label="الملف الشخصي" 
            onPress={() => navigateTo('profile')} 
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.logoutSection}>
          <MenuItem 
            icon="exit-to-app" 
            label="تسجيل الخروج" 
            color={COLORS.error}
            onPress={handleLogout} 
          />
        </View>
        
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>YazCar - الإصدار 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// مكون عنصر القائمة
function MenuItem({ icon, label, onPress, color = COLORS.primary }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuLabel, color !== COLORS.primary && { color }]}>{label}</Text>
        <Icon name={icon} size={24} color={color} style={styles.menuIcon} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  userInfoSection: {
    padding: 20,
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  userRole: {
    fontSize: 14,
    color: 'gray',
    marginTop: 5,
  },
  userEmail: {
    fontSize: 14,
    color: 'gray',
    marginTop: 5,
  },
  divider: {
    marginVertical: 10,
    height: 1,
  },
  menuSection: {
    padding: 10,
  },
  menuItem: {
    padding: 15,
    borderRadius: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // للغة العربية (RTL)
  },
  menuIcon: {
    marginLeft: 15, // للغة العربية (RTL)
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  logoutSection: {
    padding: 10,
  },
  versionSection: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: 'gray',
  },
}); 
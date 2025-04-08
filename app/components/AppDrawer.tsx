// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity, Linking, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Drawer, Text, Avatar, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';
import { useAuthStore } from '../utils/store';
import { signOut } from '../services/auth';

// تعديل الألوان
const DRAWER_COLORS = {
  ...COLORS,
  danger: COLORS.error  // استخدام اللون الموجود بالفعل
};

// دالة مساعدة للألوان
const getColorWithOpacity = (color, opacity) => {
  // التأكد من أن اللون محدد
  if (!color) {
    return `rgba(0, 0, 0, ${opacity})`;
  }
  
  // إذا كان اللون hex مع #
  if (typeof color === 'string' && color.startsWith('#')) {
    return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  }
  
  // إذا كان اللون بصيغة rgba أو rgb
  if (typeof color === 'string' && (color.startsWith('rgb') || color.startsWith('rgba'))) {
    return color.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
  }
  
  // إذا كان اللون غير معروف، استخدم قيمة افتراضية
  return `rgba(0, 0, 0, ${opacity})`;
};

// مكون لعرض المحتوى الداخلي للدراور
export function DrawerContent(props) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  // هذه دالة لمعالجة تسجيل الخروج
  const handleLogout = async () => {
    try {
      Alert.alert(
        "تسجيل الخروج",
        "هل أنت متأكد من رغبتك في تسجيل الخروج؟",
        [
          {
            text: "إلغاء",
            style: "cancel"
          },
          {
            text: "نعم", 
            onPress: async () => {
              const { error } = await signOut();
              if (error) {
                console.error('خطأ في تسجيل الخروج:', error);
                Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الخروج');
                return;
              }
              
              // تحديث حالة التخزين
              logout();
              
              // التوجيه إلى صفحة تسجيل الدخول
              if (props.navigation && props.navigation.closeDrawer) {
                props.navigation.closeDrawer();
                setTimeout(() => {
                  router.replace('/auth/login');
                }, 300);
              } else {
                router.replace('/auth/login');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };
  
  // دالة للتنقل بين الصفحات
  const navigateTo = (screen) => {
    if (props.navigation && props.navigation.navigate) {
      props.navigation.navigate(screen);
    }
  };
  
  // دالة لتحديد رمز معين حسب دور المستخدم
  const getRoleIcon = () => {
    const userRole = String(user?.role).toLowerCase();
    if (userRole === 'shop_owner' || userRole === 'shop') {
      return 'store';
    } else if (userRole === 'customer') {
      return 'account';
    } else if (userRole === 'admin') {
      return 'shield-account';
    }
    return 'account';
  };
  
  // دالة لإنشاء عناصر القائمة
  const renderMenuItems = () => {
    if (!user) return null;
    
    const userRole = String(user.role).toLowerCase();
    
    // عناصر خاصة بصاحب المحل
    if (userRole === 'shop_owner' || userRole === 'shop') {
      return (
        <>
          <DrawerMenuItem 
            icon="view-dashboard" 
            label="لوحة التحكم"
            color="#3498db" 
            onPress={() => navigateTo('shop-dashboard')} 
          />
          
          <DrawerMenuItem 
            icon="car" 
            label="السيارات"
            color="#27AE60" 
            onPress={() => navigateTo('cars')} 
          />
          
          <DrawerMenuItem 
            icon="history" 
            label="سجل الخدمات"
            color="#9B59B6" 
            onPress={() => navigateTo('service-history')} 
          />
          
          <DrawerMenuItem 
            icon="qrcode-scan" 
            label="مسح QR"
            color="#E67E22" 
            onPress={() => navigateTo('scan')} 
          />
          
          <DrawerMenuItem 
            icon="plus-circle" 
            label="إضافة سيارة"
            color="#16A085" 
            onPress={() => navigateTo('add-car')} 
          />
          
          <DrawerMenuItem 
            icon="account" 
            label="الملف الشخصي"
            color="#34495E" 
            onPress={() => navigateTo('profile')} 
          />
        </>
      );
    }
    
    // عناصر خاصة بالعميل
    else if (userRole === 'customer') {
      return (
        <>
          <DrawerMenuItem 
            icon="view-dashboard" 
            label="لوحة التحكم"
            color="#3498db" 
            onPress={() => navigateTo('customer-dashboard')} 
          />
          
          <DrawerMenuItem 
            icon="car" 
            label="سياراتي"
            color="#27AE60" 
            onPress={() => navigateTo('customer-cars')} 
          />
          
          <DrawerMenuItem 
            icon="account" 
            label="الملف الشخصي"
            color="#34495E" 
            onPress={() => navigateTo('profile')} 
          />
        </>
      );
    }
    
    // عناصر خاصة بالمدير
    else if (userRole === 'admin') {
      return (
        <>
          <DrawerMenuItem 
            icon="view-dashboard" 
            label="لوحة التحكم"
            color="#3498db" 
            onPress={() => navigateTo('admin-dashboard')} 
          />
          
          <DrawerMenuItem 
            icon="account-group" 
            label="المستخدمين"
            color="#9B59B6" 
            onPress={() => navigateTo('admin-users')} 
          />
          
          <DrawerMenuItem 
            icon="store" 
            label="المحلات"
            color="#E67E22" 
            onPress={() => navigateTo('admin-shops')} 
          />
          
          <DrawerMenuItem 
            icon="car" 
            label="السيارات"
            color="#27AE60" 
            onPress={() => navigateTo('admin-cars')} 
          />
          
          <DrawerMenuItem 
            icon="account" 
            label="الملف الشخصي"
            color="#34495E" 
            onPress={() => navigateTo('profile')} 
          />
        </>
      );
    }
    
    return (
      <DrawerMenuItem 
        icon="account" 
        label="الملف الشخصي"
        color="#34495E" 
        onPress={() => navigateTo('profile')} 
      />
    );
  };
  
  // الرمز والاسم حسب دور المستخدم
  const getRoleName = () => {
    const userRole = String(user?.role).toLowerCase();
    if (userRole === 'shop_owner' || userRole === 'shop') {
      return 'صاحب محل';
    } else if (userRole === 'customer') {
      return 'عميل';
    } else if (userRole === 'admin') {
      return 'مدير';
    }
    return 'مستخدم';
  };

  return (
    <View style={styles.container}>
      {/* الهيدر مع تدرج لوني */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary + 'CC', COLORS.primary + '90']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.userInfoSection}>
          {user?.profile_image ? (
            <Image 
              source={{ uri: user.profile_image }} 
              style={styles.userImage} 
            />
          ) : (
            <Avatar.Icon 
              size={80} 
              icon={getRoleIcon()} 
              style={styles.avatar}
              color="#FFF"
            />
          )}
          
          <View style={styles.userTextContainer}>
            <Text style={styles.userName}>{user?.name || 'المستخدم'}</Text>
            <View style={styles.roleContainer}>
              <Icon name={getRoleIcon()} size={16} color="#fff" style={styles.roleIcon} />
              <Text style={styles.userRole}>{getRoleName()}</Text>
            </View>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.drawerContent}>
        {/* عناصر القائمة */}
        <View style={styles.menuSection}>
          {renderMenuItems()}
        </View>
        
        {/* معلومات التطبيق */}
        <View style={styles.bottomSection}>
          {/* زر تسجيل الخروج */}
          <DrawerMenuItem 
            icon="exit-to-app" 
            label="تسجيل الخروج" 
            onPress={handleLogout} 
            color={COLORS.error || "#F44336"}
            style={styles.logoutButton}
          />
          
          <Divider style={styles.divider} />
          
          <View style={styles.appInfoContainer}>
            <Text style={styles.appVersion}>YazCar v1.0.0</Text>
            
            <View style={styles.socialLinks}>
              <SocialButton icon="web" url="https://yazcar.com" />
              <SocialButton icon="instagram" url="https://instagram.com/yazcar" />
              <SocialButton icon="twitter" url="https://twitter.com/yazcar" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// مكون زر شبكات التواصل
function SocialButton({ icon, url }) {
  const handlePress = () => {
    Linking.openURL(url).catch((err) => console.error('Error opening URL: ', err));
  };
  
  return (
    <TouchableOpacity style={styles.socialButton} onPress={handlePress}>
      <Icon name={icon} size={22} color={COLORS.primary} />
    </TouchableOpacity>
  );
}

// مكون عنصر القائمة المحسن
function DrawerMenuItem({ icon, label, onPress, color = "#333333", style }) {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        <View style={[styles.iconContainer, { backgroundColor: getColorWithOpacity(color, 0.1) }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// أنماط لتخصيص مظهر الدراور
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  userInfoSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  userImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  userTextContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  roleIcon: {
    marginLeft: 5,
  },
  userRole: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  userEmail: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.7,
    marginTop: 5,
  },
  drawerContent: {
    flex: 1,
    paddingVertical: 10,
  },
  menuSection: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  menuItem: {
    marginVertical: 5,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSection: {
    marginTop: 'auto',
    padding: 15,
  },
  logoutButton: {
    backgroundColor: getColorWithOpacity(COLORS.error, 0.1),
    borderRadius: 10,
    marginBottom: 15,
  },
  divider: {
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  appInfoContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  appVersion: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  }
});

export default DrawerContent; 
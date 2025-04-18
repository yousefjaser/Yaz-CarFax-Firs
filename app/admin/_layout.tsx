// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Pressable } from 'react-native';
import { Redirect, Slot, useRouter } from 'expo-router';
import { useAuthStore } from '../utils/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// دالة مساعدة لإنشاء عنصر القائمة
const MenuItem = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Icon name={icon} size={24} color="#fff" />
    <Text style={styles.menuText}>{label}</Text>
  </TouchableOpacity>
);

function AdminLayout() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const isMobile = windowWidth < 768 || Platform.OS !== 'web';
  const insets = useSafeAreaInsets();
  const isDrawerInitialized = useRef(false);
  const timerRef = useRef(null);

  // تعريف دالة فتح القائمة كدالة عالمية متاحة لجميع الشاشات
  useEffect(() => {
    // تعريف الدالة في global لكي تكون متاحة في كل مكان
    global.openAdminDrawer = () => toggleDrawer();
    
    return () => {
      // تنظيف عند إزالة المكون
      global.openAdminDrawer = undefined;
    };
  }, []);

  // استمع إلى تغييرات حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      const width = Dimensions.get('window').width;
      setWindowWidth(width);
      
      // إذا لم تتم تهيئة الdrawer بعد، قم بتهيئته حسب حجم الشاشة
      if (!isDrawerInitialized.current) {
        // جعل الdrawer مفتوحًا افتراضيًا في الويب فقط
        setIsDrawerOpen(width >= 768 && Platform.OS === 'web');
        isDrawerInitialized.current = true;
        return;
      }

      // إغلاق الdrawer تلقائيًا على الشاشات الصغيرة فقط عند تغيير الحجم
      if ((width < 768 || Platform.OS !== 'web') && isDrawerOpen) {
        setIsDrawerOpen(false);
      } else if (width >= 768 && Platform.OS === 'web' && !isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    };

    // التغييرات الأولية
    handleResize();

    // إضافة مستمع لتغييرات الحجم
    const subscription = Dimensions.addEventListener('change', handleResize);

    // إزالة المستمع
    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
      
      // تنظيف أي مؤقتات
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isDrawerOpen]);

  // فتح/إغلاق الdrawer مع منع التبديل السريع
  const toggleDrawer = () => {
    console.log("تم استدعاء toggleDrawer");
    
    // إلغاء أي مؤقت سابق
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return; // منع النقر المزدوج السريع
    }
    
    // منع التبديل السريع لفترة أطول (500 مللي ثانية) للأجهزة المحمولة
    if (Platform.OS !== 'web') {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
      }, 500);

      // لا تغلق الدراور تلقائياً في حالة الضغط على زر القائمة
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
        return;
      }
    } else {
      // في حالة الويب استخدم وقت أقصر
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
      }, 300);
    }
    
    setIsDrawerOpen(prev => !prev);
  };

  // التأكد من أن المستخدم قد سجل الدخول
  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  // التحقق من أن المستخدم مسؤول - بأي طريقة ممكنة
  const userType = user.user_type?.toLowerCase() || '';
  const userRole = user.role?.toLowerCase() || '';
  
  // لأغراض التصحيح
  console.log('معلومات المستخدم في _layout:', { 
    user_id: user.id,
    userType, 
    userRole
  });
  
  const isAdmin = userType === 'admin' || userRole === 'admin';
  
  if (!isAdmin) {
    if (userType === 'shop_owner' || userRole === 'shop_owner' || userRole === 'shop') {
      return <Redirect href="/shop/shop-dashboard" />;
    } else {
      return <Redirect href="/customer/customer-dashboard" />;
    }
  }

  const navigateTo = (route) => {
    router.push(`/admin/${route}`);
    // إغلاق الdrawer تلقائيًا بعد التنقل في حالة الشاشات الصغيرة
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };

  // Menu Items القائمة المشتركة
  const menuItems = [
    { icon: 'view-dashboard', label: 'لوحة التحكم', route: 'admin-dashboard' },
    { icon: 'account-multiple', label: 'المستخدمين', route: 'users' },
    { icon: 'store', label: 'المحلات', route: 'shops' },
    { icon: 'car', label: 'السيارات', route: 'cars' },
    { icon: 'format-list-bulleted', label: 'فئات الخدمات', route: 'service-categories' },
  ];

  // استخدام Slot بدلاً من Stack
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* الdrawer للويب فقط */}
        {isDrawerOpen && Platform.OS === 'web' && !isMobile && (
          <View style={[
            styles.sidebar, 
            styles.webSidebar,
            { 
              paddingTop: 15,
              paddingBottom: insets.bottom || 15
            }
          ]}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>يزكار - الإدارة</Text>
            </View>
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <MenuItem 
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => navigateTo(item.route)}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* الdrawer للجوال فقط */}
        {isDrawerOpen && (isMobile || Platform.OS !== 'web') && (
          <View style={[
            styles.sidebar, 
            styles.mobileSidebar,
            { 
              paddingTop: insets.top || 15,
              paddingBottom: insets.bottom || 15
            }
          ]}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>يزكار - الإدارة</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={toggleDrawer}
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <MenuItem 
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => navigateTo(item.route)}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* المحتوى */}
        <View style={styles.content}>
          {/* زر فتح القائمة */}
          {(!isDrawerOpen || isMobile || Platform.OS !== 'web') && (
            <TouchableOpacity 
              style={[
                styles.menuButton,
                { top: insets.top + 10 || 10 }
              ]} 
              onPress={toggleDrawer}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Icon name="menu" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          
          {/* خلفية معتمة عند فتح الdrawer في حالة الجوال */}
          {isMobile && isDrawerOpen && (
            <Pressable 
              style={styles.overlay} 
              onPress={toggleDrawer}
            />
          )}
          
          <View style={[
            styles.contentInner,
            { paddingTop: (!isDrawerOpen || isMobile) ? (insets.top + 50) : 20 },
            isMobile && isDrawerOpen && styles.blurContent
          ]}>
            <Slot />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#333',
    padding: 15,
    height: '100%',
    zIndex: 1000,
  },
  webSidebar: {
    // خصائص تخص drawer الويب فقط
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  mobileSidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoContainer: {
    marginBottom: 30,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  menuItems: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  menuText: {
    color: '#fff',
    marginRight: 10,
    fontSize: 16,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  contentInner: {
    padding: 20,
    flex: 1,
  },
  menuButton: {
    position: 'absolute',
    left: 10,
    zIndex: 100,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 900,
  },
  blurContent: {
    opacity: 0.7,
  },
});

export default AdminLayout; 
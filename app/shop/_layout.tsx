// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Dimensions, ScrollView, PanResponder, Animated, SafeAreaView } from 'react-native';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuthStore } from '../utils/store';
import { DrawerContent } from '../components/AppDrawer';
import Modal from 'react-native-modal';
import { COLORS } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// إنشاء مكون Drawer مخصص باستخدام Modal
const ShopLayout = () => {
  const { user } = useAuthStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const pathname = usePathname();
  
  // تحقق ما إذا كان المسار الحالي هو مسار عام لا يتطلب تسجيل دخول
  const isPublicRoute = pathname.startsWith('/shop/public/');
  
  // تعريف واجهة فتح الدراور عالمياً
  useEffect(() => {
    if (global) {
      global.openDrawer = () => setDrawerVisible(true);
    }
  }, []);
  
  // إتاحة واجهة فتح الدراور لجميع الشاشات الفرعية
  const closeDrawer = () => setDrawerVisible(false);

  // التأكد من أن المستخدم قد سجل الدخول (تجاوز للمسارات العامة)
  if (!user && !isPublicRoute) {
    return <Redirect href="/auth/login" />;
  }

  // التأكد من أن المستخدم هو صاحب محل (تجاوز للمسارات العامة)
  if (!isPublicRoute) {
    const userRole = String(user.role).toLowerCase();
    if (userRole !== 'shop_owner' && userRole !== 'shop' && userRole !== 'admin') {
      return <Redirect href="/customer/customer-dashboard" />;
    }
  }
  
  // تعريف وظيفة لإنشاء خيارات الشاشة للعودة إلى الانتقالات الطبيعية
  const getScreenOptions = () => {
    return {
      headerShown: false,
      animation: Platform.OS === 'web' ? 'none' : 'default',
      // تمكين الإيماءات والسحب
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animationEnabled: true,
      gestureDirection: 'horizontal'
    };
  };
  
  // وظيفة للتمرير
  const handleScrollTo = (e) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(e);
    }
  };

  // معالجة حدث بدء السحب
  const handleSwipeStart = () => {
    setIsGestureActive(true);
  };

  // معالجة حدث انتهاء السحب
  const handleSwipeEnd = () => {
    // تأخير تعيين الحالة للتأكد من عدم تفعيل الأزرار فوراً
    setTimeout(() => {
      setIsGestureActive(false);
    }, 200);
  };

  return (
    <View style={styles.container}>
      <Stack screenOptions={getScreenOptions()} />
      
      {/* مودال الدراور - مع إضافة خاصية حركة انسيابية مع الإصبع وSafe Area */}
      <Modal
        isVisible={drawerVisible}
        onBackdropPress={closeDrawer}
        animationIn="slideInRight"
        animationOut="slideOutRight"
        animationInTiming={400}
        animationOutTiming={400}
        backdropTransitionInTiming={500}
        backdropTransitionOutTiming={300}
        backdropOpacity={0.7}
        backdropColor="rgba(0, 0, 0, 0.7)"
        useNativeDriver={true}
        statusBarTranslucent={true}
        swipeDirection="left"
        swipeThreshold={50}
        onSwipeStart={handleSwipeStart}
        onSwipeMove={() => setIsGestureActive(true)}
        onSwipeComplete={(e) => {
          handleSwipeEnd();
          closeDrawer();
        }}
        onSwipeCancel={handleSwipeEnd}
        propagateSwipe={true}
        scrollTo={handleScrollTo}
        scrollOffset={0}
        scrollOffsetMax={width * 0.85} // عرض الدراور
        style={{
          margin: 0,
          justifyContent: 'flex-start',
          alignItems: 'flex-start', // الدراور من اليسار
        }}
      >
        <SafeAreaView style={styles.drawerContainer}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            style={{ width: '100%', height: '100%' }}
            pointerEvents={isGestureActive ? 'none' : 'auto'}
          >
            <View style={styles.drawer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeDrawer}
                disabled={isGestureActive}
              >
                <Icon name="chevron-left" size={22} color="#333" />
              </TouchableOpacity>
              
              <View style={styles.drawerContentContainer} pointerEvents={isGestureActive ? 'none' : 'auto'}>
                <DrawerContent
                  navigation={{
                    navigate: (screen: string) => {
                      if (isGestureActive) return; // تجاهل الإجراء إذا كان السحب نشطاً
                      closeDrawer();
                      setTimeout(() => {
                        router.push(`/shop/${screen}`);
                      }, 300);
                    },
                    closeDrawer: closeDrawer
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerContainer: {
    width: '85%',
    height: '100%',
    backgroundColor: '#ffffff',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 25,
    overflow: 'hidden',
  },
  drawer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'ios' ? 20 : 60,
    borderTopRightRadius: 25,
  },
  drawerContentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  }
});

export default ShopLayout; 
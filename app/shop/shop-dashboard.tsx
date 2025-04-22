// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, SafeAreaView, Alert, Animated, Easing, Dimensions, RefreshControl, I18nManager } from 'react-native';
import { Text, Badge } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import useSWR, { mutate } from 'swr';
import { fetchUserProfile, fetchShopData, fetchShopCars, getCacheKey } from '../utils/swr-config';

// تطبيق RTL
if (I18nManager && !I18nManager.isRTL) {
  // التأكد فقط من وجود RTL
  console.log("تطبيق RTL في الأنماط");
}

// الحصول على أبعاد الشاشة
const { width } = Dimensions.get('window');

// مكون السيارات المسجلة المتحرك - تصميم احترافي
const ProfessionalCarsCounter = ({ count }) => {
  // قيمة متحركة للعداد
  const countAnim = useRef(new Animated.Value(0)).current;
  // قيمة متحركة للحركة العمودية
  const moveAnim = useRef(new Animated.Value(20)).current;
  // قيمة متحركة للتلاشي
  const opacityAnim = useRef(new Animated.Value(0)).current;
  // قيمة لشريط التقدم
  const progressAnim = useRef(new Animated.Value(0)).current;
  // قيمة للتأثير الاحتفالي
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  
  // قيمة العرض
  const [displayCount, setDisplayCount] = useState(0);
  
  // القيمة الاستهدافية للسيارات
  const targetValue = 200;
  
  // حساب النسبة المئوية
  const percentage = Math.min(100, Math.round((count / targetValue) * 100));
  
  // التحقق من تحقيق الهدف
  const isGoalReached = count >= targetValue;
  
  useEffect(() => {
    // التأكد من أن القيمة رقم صحيح
    const finalCount = typeof count === 'number' ? count : 0;
    
    // متابعة التغييرات في قيمة العداد
    const listener = countAnim.addListener(({ value }) => {
      setDisplayCount(Math.floor(value));
    });
    
    // سلسلة من الانميشن الأكثر احترافية
    Animated.sequence([
      // ظهور تدريجي
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // حركة لأعلى
      Animated.timing(moveAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // تقدم الشريط والعداد معاً
      Animated.parallel([
        // العداد المتزايد
        Animated.timing(countAnim, {
          toValue: finalCount,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        
        // شريط التقدم
        Animated.timing(progressAnim, {
          toValue: percentage,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      ])
    ]).start();
    
    // إضافة تأثير احتفالي إذا تم تحقيق الهدف
    if (isGoalReached) {
      // انيميشن للاحتفال بتحقيق الهدف - نبضة متكررة
      Animated.loop(
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 } // تكرار لا نهائي
      ).start();
    }
    
    // تنظيف عند الخروج
    return () => {
      countAnim.removeListener(listener);
    };
  }, [count]);
  
  // حساب عرض شريط التقدم
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  
  // تأثير نبضي للاحتفال بالإنجاز
  const pulseScale = celebrationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  
  // تأثير لوني للاحتفال
  const celebrationBorder = celebrationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(39, 174, 96, 0.3)', 'rgba(39, 174, 96, 0.8)'],
  });
  
  // ألوان تدرج للخلفية حسب النسبة المئوية
  const getProgressColor = () => {
    if (isGoalReached) return '#FFD700'; // ذهبي للهدف المكتمل
    if (percentage >= 75) return '#27AE60'; // أخضر للنسبة العالية
    if (percentage >= 40) return '#3498DB'; // أزرق للنسبة المتوسطة
    return '#F39C12'; // برتقالي للنسبة المنخفضة
  };
  
  return (
    <Animated.View style={{
      transform: isGoalReached ? [{ scale: pulseScale }] : []
    }}>
      <View 
        style={[
          styles.professionalCounterCard,
          isGoalReached && {
            borderWidth: 2,
            borderColor: celebrationBorder
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.professionalCounterContent,
            {
              opacity: opacityAnim,
              transform: [{ translateY: moveAnim }]
            }
          ]}
        >
          <View style={styles.professionalCounterHeader}>
            <View style={styles.professionalCounterIconContainer}>
              <Icon name="car-multiple" size={24} color="#3498DB" />
            </View>
            <Text style={styles.professionalCounterTitle}>سيارات المحل</Text>
          </View>
          
          <View style={styles.professionalCountValueSection}>
            <Text style={styles.professionalCounterSubtext}>سيارة</Text>
            <Animated.Text style={styles.professionalCounterValue}>
              {displayCount}
            </Animated.Text>
          </View>
          
          <View style={styles.professionalProgressSection}>
            <View style={styles.professionalProgressContainer}>
              <Animated.View 
                style={[
                  styles.professionalProgressBar,
                  {
                    width: progressWidth,
                    backgroundColor: getProgressColor()
                  }
                ]}
              />
            </View>
            <View style={styles.professionalProgressLabels}>
              <Text style={styles.professionalTargetLabel}>
                {isGoalReached ? "تم تحقيق الهدف!" : `هدفك: ${targetValue} سيارة`}
              </Text>
              <Text style={styles.professionalProgressLabel}>
                {percentage}% {isGoalReached ? "مكتمل" : "من الهدف"}
              </Text>
            </View>
          </View>
          
          {isGoalReached && (
            <View style={styles.goalCompletedContainer}>
              <Icon name="trophy" size={28} color="#FFD700" />
              <Text style={styles.goalCompletedText}>تهانينا! لقد حققت الهدف</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default function ShopDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    registeredCars: 0,
    notifications: 3,
  });
  
  // استخدام SWR لتحميل بيانات المستخدم
  const { data: profile, error: profileError, isLoading: profileLoading } = useSWR(
    user ? getCacheKey('user-profile', user.id) : null,
    () => fetchUserProfile(user.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 ثوانٍ
      focusThrottleInterval: 10000,
    }
  );
  
  // استخدام SWR لتحميل بيانات المحل
  const { data: shopData, error: shopError, isLoading: shopLoading } = useSWR(
    user ? getCacheKey('shop-data', user.id) : null,
    () => fetchShopData(user.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      focusThrottleInterval: 10000,
    }
  );
  
  // استخدام SWR لتحميل بيانات السيارات باستخدام معرف المحل
  const { data: carsData, error: carsError, isLoading: carsLoading } = useSWR(
    shopData ? getCacheKey('shop-cars', shopData.id) : null,
    () => fetchShopCars(shopData.id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      focusThrottleInterval: 10000,
    }
  );
  
  // تحديث عدد السيارات عند تغير بيانات السيارات
  useEffect(() => {
    if (carsData) {
      setStats(prev => ({
        ...prev,
        registeredCars: carsData.length || 0
      }));
      console.log("تم تحديث عدد السيارات:", carsData.length);
    }
  }, [carsData]);
  
  // الاستماع إلى تغييرات Supabase في الوقت الفعلي
  useEffect(() => {
    if (!shopData) return;
    
    // إعداد الاستماع لتغييرات جدول cars_new
    const subscription = supabase
      .channel('public:cars_new')
      .on('INSERT', payload => {
        if (payload.new.shop_id === shopData.id) {
          console.log('تم إضافة سيارة جديدة، تحديث البيانات');
          mutate(getCacheKey('shop-cars', shopData.id));
        }
      })
      .on('DELETE', payload => {
        if (payload.old.shop_id === shopData.id) {
          console.log('تم حذف سيارة، تحديث البيانات');
          mutate(getCacheKey('shop-cars', shopData.id));
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [shopData]);
  
  useEffect(() => {
    if (global) {
      global.router = router;
    }
  }, [router]);

  useEffect(() => {
    // تعيين لون أيقونات شريط الحالة للون الأسود
    StatusBar.setBarStyle('dark-content');
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
    
    return () => {
      // استعادة اللون الافتراضي عند الخروج
      StatusBar.setBarStyle('light-content');
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor(COLORS.primary);
    };
  }, []);
  
  const handleAddCar = () => {
    console.log('إضافة سيارة جديدة');
    router.push('/shop/add-car');
  };
  
  const handleScanQR = () => {
    console.log('الانتقال إلى صفحة المسح');
    router.push('/shop/scan');
  };

  const openDrawer = () => {
    try {
      // نستخدم الdrawer المخصص فقط
      if (global && global.openDrawer) {
        global.openDrawer();
      }
      // نلغي الخيار البديل لتجنب التعارض مع الdrawer المخصص
    } catch (error) {
      console.error('خطأ في فتح القائمة:', error);
    }
  };

  // معالج السحب للتحديث
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    console.log("تحديث البيانات...");
    
    // إعادة تحميل جميع البيانات
    if (user) {
      mutate(getCacheKey('user-profile', user.id));
    }
    
    if (shopData) {
      mutate(getCacheKey('shop-data', user.id));
      mutate(getCacheKey('shop-cars', shopData.id));
    }
    
    // إيقاف التحديث بعد 1 ثانية
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [user, shopData]);

  // عرض حالة التحميل إذا كانت البيانات الأساسية قيد التحميل
  const isLoading = profileLoading || shopLoading;
  if (isLoading && !carsData && !refreshing) {
    return <Loading fullScreen message="جاري تحميل البيانات..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent={true}
      />
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498db']}
            tintColor={'#3498db'}
            title={"سحب للتحديث..."}
            titleColor={'#666'}
          />
        }
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* ترتيب وتصميم قسم الترحيب */}
        <View style={styles.welcomeSection}>
          <View style={styles.shopIconContainer}>
            <Icon name="store" size={40} color="#FFF" />
          </View>
          
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>
              أهلاً بك <Text style={styles.waveEmoji}>👋</Text> في
            </Text>
            <Text style={styles.logoText}>Yaz Car</Text>
            <Text style={styles.subtitleText}>يوم جديد مليء بالإنجازات</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Icon name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        {/* انيميشن عدد السيارات المسجلة - التصميم الاحترافي الجديد */}
        <View style={styles.professionalCounterContainer}>
          <ProfessionalCarsCounter count={stats.registeredCars} />
        </View>
        
        {/* الإجراءات السريعة */}
        <View style={styles.quickActionsSection}>
          {/* عنوان الإجراءات السريعة */}
          <Text style={{
            fontSize: 19,
            fontWeight: 'bold',
            marginBottom: 15,
            color: '#333',
            alignSelf: 'flex-end',
            marginRight: 0,
            textAlign: 'right',
          }}>الإجراءات السريعة</Text>
          
          {/* إضافة سيارة جديدة */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#27AE60' }]}
            onPress={handleAddCar}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="plus-box" size={36} color="#FFF" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionCardTitle}>سيارة جديدة</Text>
                <Text style={styles.actionCardDesc}>تسجيل سيارة ومعلومات الزيت</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* مسح QR */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#3498db' }]}
            onPress={handleScanQR}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="qrcode" size={36} color="#FFF" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionCardTitle}>مسح QR</Text>
                <Text style={styles.actionCardDesc}>عرض معلومات الصيانة للسيارة</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* مسح NFC - إضافة جديدة */}
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#9C27B0' }]}
            onPress={() => router.push('/shop/nfc')}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionIconContainer}>
                <Icon name="nfc" size={36} color="#FFF" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionCardTitle}>مسح NFC</Text>
                <Text style={styles.actionCardDesc}>قراءة بطاقات NFC للسيارات</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* عنوان القائمة الرئيسية */}
          <Text style={{
            fontSize: 19,
            fontWeight: 'bold',
            marginBottom: 15,
            marginTop: 30,
            color: '#333',
            alignSelf: 'flex-end',
            marginRight: 0,
            textAlign: 'right',
          }}>القائمة الرئيسية</Text>
          
          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuItemRect} onPress={() => router.push('/shop/cars')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#27AE60' + '15' }]}>
                <Icon name="car" size={24} color="#27AE60" />
              </View>
              <Text style={styles.menuItemText}>السيارات</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItemRect} onPress={() => router.push('/shop/service-history')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#3498DB' + '15' }]}>
                <Icon name="history" size={24} color="#3498DB" />
              </View>
              <Text style={styles.menuItemText}>سجل الخدمات</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItemRect} onPress={() => router.push('/shop/service-reminders')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#F39C12' + '15' }]}>
                <Icon name="bell-ring" size={24} color="#F39C12" />
              </View>
              <Text style={styles.menuItemText}>تذكيرات الصيانة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* بطاقة تذكير تغيير الزيت */}
        <View style={styles.oilReminderCard}>
          <View style={styles.oilReminderHeader}>
            <Text style={styles.oilReminderTitle}>تذكير تغيير الزيت</Text>
            <View style={styles.oilReminderIconContainer}>
              <Icon name="bell-ring" size={24} color="#F39C12" />
            </View>
          </View>
          
          <View style={styles.oilReminderContent}>
            <Text style={styles.oilReminderSubtitle}>السيارات التي اقترب موعد تغيير الزيت:</Text>
            
            {/* قائمة السيارات */}
            <View style={styles.reminderCarsList}>
              <View style={styles.reminderCarItem}>
                <View style={styles.reminderCarInfo}>
                  <Text style={styles.reminderCarModel}>تويوتا كامري</Text>
                  <Text style={styles.reminderCarPlate}>لوحة: أ ب ج ١٢٣٤</Text>
                </View>
                <View style={styles.reminderCarStatus}>
                  <Text style={styles.reminderCarDue}>متبقي 3 أيام</Text>
                  <TouchableOpacity style={styles.reminderSendButton}>
                    <Text style={styles.reminderSendButtonText}>إرسال تذكير</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.reminderCarItem}>
                <View style={styles.reminderCarInfo}>
                  <Text style={styles.reminderCarModel}>نيسان التيما</Text>
                  <Text style={styles.reminderCarPlate}>لوحة: هـ و ز ٥٦٧٨</Text>
                </View>
                <View style={styles.reminderCarStatus}>
                  <Text style={styles.reminderCarDue}>متبقي أسبوع</Text>
                  <TouchableOpacity style={styles.reminderSendButton}>
                    <Text style={styles.reminderSendButtonText}>إرسال تذكير</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.viewAllRemindersButton}>
              <Text style={styles.viewAllRemindersText}>عرض جميع التذكيرات</Text>
              <Icon name="chevron-left" size={18} color="#3498db" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* شريط التنقل السفلي العائم */}
      <View style={styles.floatingNavBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/shop/cars')}>
          <Icon name="car" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>السيارات</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/shop/service-history')}>
          <Icon name="history" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>السجل</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.homeNavItem} onPress={() => router.push('/shop/shop-dashboard')}>
          <Icon name="view-dashboard" size={26} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/shop/service-reminders')}>
          <Icon name="bell-ring" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>التذكيرات</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/shop/more')}>
          <Icon name="dots-horizontal" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>المزيد</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    direction: 'rtl',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 10,
  },
  notificationIconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  shopIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  welcomeTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
    marginHorizontal: 10,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555',
    textAlign: 'center',
  },
  waveEmoji: {
    fontSize: 18,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  quickActionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'right',
    width: '100%',
    paddingRight: 0,
    paddingLeft: 'auto',
    position: 'relative',
    right: 0,
    left: 'auto',
  },
  actionCard: {
    backgroundColor: '#27AE60',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
  },
  actionCardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginLeft: 0,
  },
  actionTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
    textAlign: 'right',
  },
  actionCardDesc: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    textAlign: 'right',
  },
  menuGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  menuItemRect: {
    width: '100%',
    height: 80,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  floatingNavBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 65,
    backgroundColor: '#FFF',
    borderRadius: 35,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 7,
    elevation: 8,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  homeNavItem: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  navItemText: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 3,
    textAlign: 'center',
  },
  emptySection: {
    height: 100,
  },
  professionalCounterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  professionalCounterCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  professionalCounterContent: {
    width: '100%',
  },
  professionalCounterHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  professionalCounterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  professionalCounterIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalCountValueSection: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    marginBottom: 25,
    justifyContent: 'center',
  },
  professionalCounterValue: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  professionalCounterSubtext: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginLeft: 0,
  },
  professionalProgressSection: {
    marginBottom: 10,
  },
  professionalProgressContainer: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  professionalProgressBar: {
    height: '100%',
    borderRadius: 5,
  },
  professionalProgressLabels: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  professionalProgressLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'left',
  },
  professionalTargetLabel: {
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
  },
  scrollViewContent: {
    direction: 'rtl',
    textAlign: 'right',
  },
  goalCompletedContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  goalCompletedText: {
    color: '#d4af37',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
  },
  oilReminderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  oilReminderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  oilReminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  oilReminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F39C12' + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oilReminderContent: {
    width: '100%',
  },
  oilReminderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'right',
  },
  reminderCarsList: {
    width: '100%',
  },
  reminderCarItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  reminderCarInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reminderCarModel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  reminderCarPlate: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
    textAlign: 'right',
  },
  reminderCarStatus: {
    alignItems: 'flex-end',
    marginRight: 15,
  },
  reminderCarDue: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: '600',
    marginBottom: 5,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reminderSendButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  reminderSendButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  viewAllRemindersButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  viewAllRemindersText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
}); 
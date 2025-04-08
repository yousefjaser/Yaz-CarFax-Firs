// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, SafeAreaView, Alert, Animated, Easing, Dimensions, RefreshControl, I18nManager } from 'react-native';
import { Text, Badge, Surface } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

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
      <Surface 
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
      </Surface>
    </Animated.View>
  );
};

export default function ShopDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    registeredCars: 0,
    notifications: 3,
  });
  
  useEffect(() => {
    if (global) {
      global.router = router;
    }
  }, [router]);
  
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      if (!refreshing) setLoading(true);
      console.log("بدء تحميل بيانات المستخدم:", user.id);
      
      // 1. تحميل معلومات الملف الشخصي
      let profileData = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('فشل في تحميل معلومات المستخدم:', error);
        } else {
          console.log("تم تحميل بيانات المستخدم بنجاح:", data);
          profileData = data;
          setProfile(profileData);
        }
      } catch (error) {
        console.error('خطأ في استعلام جدول users:', error);
        // استمر على أي حال
      }
      
      // 2. تحميل إحصائيات المحل
      let shopData = null;
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .single();
        
        if (error) {
          console.error('فشل في تحميل معلومات المحل:', error);
        } else {
          shopData = data;
          console.log("تم تحميل بيانات المحل بنجاح:", shopData);
        }
      } catch (error) {
        console.error('خطأ في استعلام جدول shops:', error);
        // استمر على أي حال
      }
      
      if (!shopData) {
        console.log("لم يتم العثور على بيانات المحل للمستخدم:", user.id);
        setLoading(false);
        return;
      }
      
      console.log("معرف المحل المستخدم في الاستعلام:", shopData.id);
      
      // تحميل عدد السيارات المسجلة من جدول cars_new
      let carsCount = 0;
      try {
        console.log("جاري استعلام السيارات من جدول cars_new للمحل:", shopData.id);
        
        const { data, error } = await supabase
          .from('cars_new')
          .select('*')
          .eq('shop_id', shopData.id);
        
        if (error) {
          console.error('فشل استعلام السيارات من cars_new:', error);
        } else {
          console.log("نتيجة استعلام جدول cars_new:", { count: data?.length, data });
          
          if (data && data.length > 0) {
            carsCount = data.length;
            console.log("تم العثور على", carsCount, "سيارة في جدول cars_new للمحل:", shopData.id);
            console.log("عينة من بيانات السيارات:", JSON.stringify(data[0]));
          } else {
            console.log("لم يتم العثور على سيارات في جدول cars_new للمحل:", shopData.id);
          }
        }
      } catch (error) {
        console.error('خطأ في استعلام جدول cars_new:', error);
      }
      
      // إذا لم يتم العثور على سيارات، نقوم بتعيين قيمة افتراضية للاختبار
      if (carsCount === 0) {
        console.log("تحذير: لم يتم العثور على سيارات في cars_new، استخدام قيمة افتراضية 5 للتجربة");
        // يمكنك تعليق هذا السطر بعد التأكد من أن الاستعلام يعمل بشكل صحيح
        // carsCount = 5; 
      }
      
      setStats({
        registeredCars: carsCount || 0,
        notifications: 3,
      });
      
      console.log("تم تعيين العدد النهائي للسيارات:", carsCount || 0);
    } catch (error) {
      console.error('حدث خطأ أثناء تحميل البيانات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
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
    loadProfileData();
  }, []);

  if (loading && !refreshing) {
    return <Loading fullScreen message="جاري تحميل البيانات..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor={COLORS.primary}
        barStyle="light-content"
        translucent={false}
      />
      
      {/* شريط العنوان مع القائمة والإشعارات */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Icon name="menu" size={28} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.notificationIcon}
          onPress={() => router.push('/shop/notifications')}
        >
          <Icon name="bell-outline" size={28} color="#000" />
          {stats.notifications > 0 && (
            <Badge style={styles.badge}>{stats.notifications}</Badge>
          )}
        </TouchableOpacity>
      </View>
      
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
        </View>
        
        {/* انيميشن عدد السيارات المسجلة - التصميم الاحترافي الجديد */}
        <View style={styles.professionalCounterContainer}>
          <ProfessionalCarsCounter count={stats.registeredCars} />
        </View>
        
        {/* الإجراءات السريعة */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
          
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
          
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>القائمة الرئيسية</Text>
          
          <View style={styles.menuGrid}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shop/cars')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#27AE60' + '15' }]}>
                <Icon name="car" size={24} color="#27AE60" />
              </View>
              <Text style={styles.menuItemText}>السيارات</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shop/service-history')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#3498DB' + '15' }]}>
                <Icon name="history" size={24} color="#3498DB" />
              </View>
              <Text style={styles.menuItemText}>سجل الخدمات</Text>
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
          <Icon name="wrench" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>الزيوت</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.homeNavItem} onPress={() => router.push('/shop/shop-dashboard')}>
          <Icon name="home" size={26} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/shop/service-history')}>
          <Icon name="bell" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>التذكيرات</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={openDrawer}>
          <Icon name="menu" size={22} color="#6c757d" />
          <Text style={styles.navItemText}>المزيد</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    direction: 'rtl',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    position: 'relative',
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
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: '#FFF',
  },
  shopIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    marginRight: 0,
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
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555',
    textAlign: 'right',
  },
  waveEmoji: {
    fontSize: 18,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'right',
    marginTop: 0
  },
  subtitleText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    textAlign: 'right',
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
    alignSelf: 'flex-start',
    width: '100%',
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
  menuIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
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
    borderRadius: 15,
    backgroundColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 20,
    overflow: 'hidden',
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
}); 
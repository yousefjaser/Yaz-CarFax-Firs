import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, RefreshControl, I18nManager, Platform, Alert, ActivityIndicator, Linking } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// تعريف مكون Loading بديل
interface LoadingProps {
  fullScreen?: boolean;
  message: string;
}

const Loading = ({ fullScreen, message }: LoadingProps) => (
  <View style={{ flex: fullScreen ? 1 : undefined, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <ActivityIndicator size="large" color="#3498db" />
    <Text style={{ marginTop: 10, textAlign: 'center' }}>{message}</Text>
  </View>
);

// تعريف الألوان بدلاً من استيرادها
const COLORS = {
  primary: '#3498db',
  secondary: '#f39c12',
  danger: '#e74c3c',
  success: '#27ae60',
  background: '#f8f9fa',
};

// تعريف واجهة السيارة
interface Car {
  id: string;
  make?: string;
  model?: string;
  plate_number?: string;
  owner_name?: string;
  owner_phone?: string;
  whatsapp_country_code?: string;
  whatsapp_number?: string;
  next_oil_change_date?: string;
  shop_id: string;
  service_visits?: any[];
  remainingDays?: number | null;
  reminderStatus?: 'overdue' | 'urgent' | 'soon' | 'ok' | 'unknown';
  qr_id: string;
}

// التأكد من إعدادات RTL
if (I18nManager && !I18nManager.isRTL) {
  console.log("تطبيق RTL في صفحة التذكيرات");
}

export default function ServiceReminders() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopId, setShopId] = useState<string | null>(null);

  // إعداد شريط الحالة
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    
    return () => {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor(COLORS.primary);
      }
    };
  }, []);

  // تحميل البيانات عند بدء الصفحة
  useEffect(() => {
    loadShopData();
  }, []);

  // دالة للحصول على معرف المحل المحفوظ
  const getShopId = async (): Promise<string | null> => {
    if (shopId) return shopId;
    try {
      // محاولة الحصول على بيانات المستخدم من المخزن
      if (user && user.id) {
        console.log("معرف المستخدم من المخزن:", user.id);
        
        // الحصول على معرف المحل مباشرة من معرف المستخدم
        const { data: shopData, error } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        console.log("نتيجة البحث عن المحل عبر owner_id:", shopData);
        
        if (error) {
          console.error("خطأ في البحث عن المحل عبر owner_id:", error);
          
          // محاولة ثانية باستخدام user_id بدلا من owner_id
          const { data: altShopData, error: altError } = await supabase
            .from('shops')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          console.log("نتيجة البحث عن المحل عبر user_id:", altShopData);
          
          if (altError) {
            console.error("خطأ في البحث عن المحل عبر user_id:", altError);
            return null;
          }
          
          if (altShopData) {
            setShopId(altShopData.id);
            console.log("تم العثور على معرف المحل:", altShopData.id);
            return altShopData.id;
          }
        }
        
        if (shopData) {
          setShopId(shopData.id);
          console.log("تم العثور على معرف المحل:", shopData.id);
          return shopData.id;
        }
      } else {
        console.log("لا يوجد مستخدم في المخزن أو معرف المستخدم غير متوفر");
      }
      
      // كحل أخير، حاول الحصول على بيانات المستخدم من Supabase
      const userResponse = await supabase.auth.getUser();
      if (!userResponse.data.user) {
        console.error("لم يتم العثور على بيانات المستخدم في Supabase");
        return null;
      }

      console.log("معرف المستخدم من Supabase:", userResponse.data.user.id);
      
      // البحث عن المحل باستخدام معرف المستخدم من Supabase
      const { data: lastAttemptShopData } = await supabase
        .from('shops')
        .select('id')
        .eq('user_id', userResponse.data.user.id)
        .single();

      if (lastAttemptShopData) {
        setShopId(lastAttemptShopData.id);
        console.log("تم العثور على معرف المحل (المحاولة الأخيرة):", lastAttemptShopData.id);
        return lastAttemptShopData.id;
      }
      
      console.error("لم يتم العثور على معرف المحل بعد كل المحاولات");
      return null;
    } catch (error) {
      console.error('حدث خطأ أثناء جلب معرف المحل:', error);
      return null;
    }
  };

  // تحميل معلومات المحل
  const loadShopData = async () => {
    if (!user) return;
    
    try {
      if (!refreshing) setLoading(true);
      
      const currentShopId = await getShopId();
      if (currentShopId) {
        await loadCarsData();
      } else {
        console.error('لم يتم العثور على المحل للمستخدم الحالي');
        setLoading(false);
      }
    } catch (error) {
      console.error('حدث خطأ أثناء تحميل بيانات المحل:', error);
      setLoading(false);
    }
  };

  // تحميل بيانات السيارات
  const loadCarsData = async () => {
    setLoading(true);
    try {
      const shopId = await getShopId();
      if (!shopId) {
        console.error('No shop ID found');
        setLoading(false);
        return;
      }

      // استعلام بسيط للسيارات بدون العلاقات
      const { data: carsData, error: carsError } = await supabase
        .from('cars_new')
        .select('*')
        .eq('shop_id', shopId)
        .order('next_oil_change_date', { ascending: true });

      if (carsError) {
        console.error('Error loading cars data:', carsError);
        Alert.alert('خطأ', 'حدث خطأ أثناء تحميل بيانات السيارات');
        setLoading(false);
        return;
      }
      
      if (carsData) {
        console.log(`تم تحميل ${carsData.length} سيارة:`, carsData);
        
        // إضافة بيانات زيارات الخدمة لكل سيارة
        if (carsData.length > 0) {
          for (let i = 0; i < carsData.length; i++) {
            try {
              const { data: visitsData } = await supabase
                .from('service_visits')
                .select('*')
                .eq('car_id', carsData[i].id);
                
              carsData[i].service_visits = visitsData || [];
            } catch (visitError) {
              console.error(`خطأ في تحميل بيانات الزيارات للسيارة ${carsData[i].id}:`, visitError);
              carsData[i].service_visits = [];
            }
          }
        }
        
        // معالجة بيانات السيارات وحساب المدة المتبقية للإشعار
        const carsWithRemainingTime = carsData.map((car: Car) => {
          // إضافة معلومات العميل للسيارة
          let ownerName = '';
          let ownerPhone = '';
          
          // تحقق من وجود whatsapp_number أو whatsapp_country_code
          if (car.whatsapp_number) {
            ownerPhone = (car.whatsapp_country_code || '') + car.whatsapp_number;
          }
          
          // حساب الأيام المتبقية للتغيير القادم
          const remainingDays = calculateRemainingDays(car.next_oil_change_date);
          console.log(`السيارة ${car.make} ${car.model} (${car.plate_number}): متبقي ${remainingDays} يوم حتى تغيير الزيت`);
          
          // تحديد حالة التذكير بناء على الأيام المتبقية
          const reminderStatus = getReminderStatus(remainingDays);
          
          return {
            ...car,
            owner_name: ownerName,
            owner_phone: ownerPhone,
            remainingDays,
            reminderStatus
          };
        });
        
        // ترتيب السيارات حسب الأيام المتبقية (الأقرب أولاً)
        const sortedCars = carsWithRemainingTime.sort((a: Car, b: Car) => {
          // ضع السيارات بدون تاريخ تغيير زيت في النهاية
          if (a.remainingDays === null && b.remainingDays !== null) return 1;
          if (a.remainingDays !== null && b.remainingDays === null) return -1;
          if (a.remainingDays === null && b.remainingDays === null) return 0;
          
          // ضع السيارات المتأخرة في المقدمة
          if ((a.remainingDays || 0) < 0 && (b.remainingDays || 0) >= 0) return -1;
          if ((a.remainingDays || 0) >= 0 && (b.remainingDays || 0) < 0) return 1;
          
          // ثم رتب حسب المتبقي الأقل
          return (a.remainingDays || 0) - (b.remainingDays || 0);
        });
        
        setCars(sortedCars);
        setFilteredCars(sortedCars);
      }
    } catch (error) {
      console.error('حدث خطأ أثناء تحميل بيانات السيارات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // حساب الأيام المتبقية حتى تاريخ التغيير القادم
  const calculateRemainingDays = (nextChangeDate?: string): number | null => {
    if (!nextChangeDate) return null;
    
    const today = new Date();
    const nextDate = new Date(nextChangeDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // تحديد حالة التذكير بناء على الأيام المتبقية
  const getReminderStatus = (days: number | null): 'overdue' | 'urgent' | 'soon' | 'ok' | 'unknown' => {
    if (days === null) return 'unknown';
    if (days < 0) return 'overdue';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'soon';
    return 'ok';
  };

  // تنسيق عرض المدة المتبقية
  const formatRemainingTime = (days: number | null): string => {
    if (days === null) return "غير محدد";
    if (days < 0) return `متأخر ${Math.abs(days)} يوم`;
    if (days === 0) return "اليوم";
    if (days === 1) return "غداً";
    if (days < 7) return `${days} أيام`;
    if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
    if (days < 365) return `${Math.floor(days / 30)} شهر`;
    return `${Math.floor(days / 365)} سنة`;
  };

  // تحديد لون حالة التذكير
  const getReminderStatusColor = (status: 'overdue' | 'urgent' | 'soon' | 'ok' | 'unknown'): string => {
    switch (status) {
      case 'overdue': return '#E74C3C'; // أحمر للمتأخر
      case 'urgent': return '#F39C12'; // برتقالي للعاجل
      case 'soon': return '#3498DB'; // أزرق للقريب
      case 'ok': return '#27AE60'; // أخضر للبعيد
      default: return '#95A5A6'; // رمادي للغير معروف
    }
  };

  // تحديد نص حالة التذكير
  const getReminderStatusText = (status: 'overdue' | 'urgent' | 'soon' | 'ok' | 'unknown'): string => {
    switch (status) {
      case 'overdue': return 'متأخر';
      case 'urgent': return 'عاجل';
      case 'soon': return 'قريباً';
      case 'ok': return 'لاحقاً';
      default: return 'غير محدد';
    }
  };

  // البحث في السيارات
  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredCars(cars);
    } else {
      const filtered = cars.filter(car => 
        car.make?.toLowerCase().includes(query.toLowerCase()) ||
        car.model?.toLowerCase().includes(query.toLowerCase()) ||
        car.plate_number?.toLowerCase().includes(query.toLowerCase()) ||
        car.owner_name?.toLowerCase().includes(query.toLowerCase()) ||
        car.owner_phone?.includes(query)
      );
      setFilteredCars(filtered);
    }
  };

  // إرسال تذكير للعميل
  const sendReminder = async (car: Car) => {
    let phoneNumber = car.owner_phone;
    
    // إذا لم يكن هناك رقم هاتف مخزن في owner_phone، حاول استخدام whatsapp_number
    if (!phoneNumber && car.whatsapp_number) {
      phoneNumber = (car.whatsapp_country_code || '') + car.whatsapp_number;
    }
    
    // هنا يمكن إضافة رمز لإرسال رسالة SMS أو WhatsApp للعميل
    if (phoneNumber) {
      // افتح تطبيق الواتساب مع رسالة مخصصة
      const message = `مرحباً، نود تذكيرك بأن موعد تغيير زيت السيارة ${car.make || ''} ${car.model || ''} (${car.plate_number || ''}) قد حان. نتطلع لرؤيتك قريباً.`;
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      
      try {
        await Linking.openURL(whatsappUrl);
        console.log(`تم فتح تطبيق واتساب لإرسال تذكير إلى الرقم ${phoneNumber}`);
      } catch (error) {
        console.error('فشل في فتح تطبيق الواتساب:', error);
        Alert.alert('خطأ', 'فشل في فتح تطبيق واتساب. تأكد من تثبيت التطبيق.');
      }
    } else {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذه السيارة!');
    }
  };

  // معالج السحب للتحديث
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (shopId) {
      loadCarsData();
    } else {
      loadShopData();
    }
  }, [shopId]);

  // تعامل مع حالة التحميل
  if (loading && !refreshing) {
    return <Loading fullScreen message="جاري تحميل بيانات السيارات..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent={true}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-right" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تذكيرات الصيانة</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="بحث عن سيارة..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ textAlign: 'right' }}
          iconColor="#666"
        />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E74C3C15' }]}>
              <Icon name="bell-ring" size={24} color="#E74C3C" />
            </View>
            <Text style={styles.statValue}>{cars.filter(car => car.reminderStatus === 'overdue' || car.reminderStatus === 'urgent').length}</Text>
            <Text style={styles.statLabel}>بحاجة للتذكير</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#3498DB15' }]}>
              <Icon name="car" size={24} color="#3498DB" />
            </View>
            <Text style={styles.statValue}>{cars.length}</Text>
            <Text style={styles.statLabel}>إجمالي السيارات</Text>
          </View>
        </View>
        
        <View style={styles.reminderSection}>
          <Text style={styles.sectionTitle}>التذكيرات العاجلة</Text>
          
          {filteredCars.length === 0 ? (
            <View style={styles.emptyCarsContainer}>
              <Icon name="bell-off" size={50} color="#ccc" />
              <Text style={styles.emptyCarsText}>لا توجد تذكيرات حالياً</Text>
            </View>
          ) : (
            filteredCars.map(car => (
              <View key={car.id} style={styles.carItem}>
                <View style={styles.carHeader}>
                  <View style={styles.carInfo}>
                    <Text style={styles.carName}>{car.make || 'غير محدد'} {car.model || ''}</Text>
                    <Text style={styles.carPlate}>{car.plate_number || 'رقم اللوحة غير محدد'}</Text>
                  </View>
                  
                  <View style={[styles.reminderBadge, { backgroundColor: getReminderStatusColor(car.reminderStatus || 'unknown') + '20' }]}>
                    <Text style={[styles.reminderBadgeText, { color: getReminderStatusColor(car.reminderStatus || 'unknown') }]}>
                      {getReminderStatusText(car.reminderStatus || 'unknown')}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.carDetails}>
                  <View style={styles.carDetailItem} key={`${car.id}-owner`}>
                    <Icon name="account" size={16} color="#666" />
                    <Text style={styles.carDetailText}>{car.owner_name || 'غير محدد'}</Text>
                  </View>
                  
                  <View style={styles.carDetailItem} key={`${car.id}-phone`}>
                    <Icon name="phone" size={16} color="#666" />
                    <Text style={styles.carDetailText}>{car.owner_phone || 'غير محدد'}</Text>
                  </View>
                  
                  <View style={styles.carDetailItem} key={`${car.id}-date`}>
                    <Icon name="calendar-clock" size={16} color="#666" />
                    <Text style={styles.carDetailText}>
                      {car.next_oil_change_date ? new Date(car.next_oil_change_date).toLocaleDateString('ar-SA') : 'غير محدد'}
                    </Text>
                  </View>
                  
                  <View style={styles.carDetailItem} key={`${car.id}-time`}>
                    <Icon name="timer-sand" size={16} color={getReminderStatusColor(car.reminderStatus || 'unknown')} />
                    <Text style={[styles.carDetailText, { color: getReminderStatusColor(car.reminderStatus || 'unknown'), fontWeight: '600' }]}>
                      {formatRemainingTime(car.remainingDays || null)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.carActions}>
                  <TouchableOpacity 
                    style={styles.reminderButton}
                    onPress={() => sendReminder(car)}
                  >
                    <Icon name="bell-ring-outline" size={18} color="#FFF" />
                    <Text style={styles.reminderButtonText}>إرسال تذكير</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => router.push(`/shop/car-details/${car.qr_id}`)}
                  >
                    <Icon name="eye-outline" size={18} color="#3498DB" />
                    <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    height: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reminderSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'right',
  },
  emptyCarsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyCarsText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  carItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  carHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  carInfo: {
    flex: 1,
  },
  carName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  carPlate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  reminderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  carDetails: {
    marginBottom: 16,
  },
  carDetailItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 8,
  },
  carDetailText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    textAlign: 'right',
  },
  carActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  reminderButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reminderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  viewDetailsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  viewDetailsText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  bottomSpacer: {
    height: 100,
  },
}); 
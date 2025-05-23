import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  Image,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../../../config';
import { COLORS } from '../../../constants';
import { I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getBannerImageUrl, 
  getProfileImageUrl 
} from '../../../services/cloudinary';
import useSWR from 'swr';
import { fetchCarDetails, fetchCarServiceHistory, getCacheKey } from '../../../utils/swr-config';

// إجبار واجهة من اليمين لليسار
I18nManager.forceRTL(true);

interface Car {
  qr_id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  chassis_number: string;
  color: string;
  oil_type: string;
  oil_grade: string;
  current_odometer: number;
  next_oil_change_odometer: number;
  last_oil_change_date: string;
  next_oil_change_date: string;
  oil_filter_changed: boolean;
  air_filter_changed: boolean;
  cabin_filter_changed: boolean;
  created_at: string;
  customer_id: string;
  shop_id: string;
  whatsapp_number: string;
  whatsapp_country_code: string;
  shop: {
    phone: string;
    whatsapp_prefix: string;
    name: string;
    banner_image: string | null;
    logo_url: string | null;
    address: string;
    coordinates: { latitude: number; longitude: number } | null;
    working_hours: string;
    is_approved: boolean;
  };
}

interface ServiceRecord {
  id: string;
  date: string;
  mileage: number;
  next_service_mileage: number;
  oil_type: string;
  oil_grade: string;
  notes: string;
  service_type?: string;
  air_filter_changed?: boolean;
  oil_filter_changed?: boolean;
  cabin_filter_changed?: boolean;
}

export default function CarDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);
  
  // استخدام SWR لتحميل تفاصيل السيارة
  const { data: car, error: carError, isLoading: carLoading, mutate: mutateCar } = useSWR(
    id ? getCacheKey('car-details', id) : null,
    () => fetchCarDetails(id as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 ثوانٍ
      focusThrottleInterval: 10000
    }
  );
  
  // استخدام SWR لتحميل سجل خدمات السيارة
  const { data: serviceRecords, error: serviceError, isLoading: serviceLoading, mutate: mutateServices } = useSWR(
    id ? getCacheKey('car-service-history', id) : null,
    () => fetchCarServiceHistory(id as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 ثوانٍ
      focusThrottleInterval: 10000
    }
  );
  
  // الاستماع إلى تغييرات قاعدة البيانات في الوقت الفعلي
  useEffect(() => {
    if (!id) return;
    
    // إعداد الاستماع لتغييرات جدول service_visits
    const serviceChannel = supabase.channel('service-changes');
    const serviceSubscription = serviceChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'service_visits',
        filter: `car_id=eq.${id}`
      }, (payload) => {
        console.log('تم إضافة خدمة جديدة، تحديث البيانات');
        mutateServices();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_visits',
        filter: `car_id=eq.${id}`
      }, (payload) => {
        console.log('تم تحديث خدمة، تحديث البيانات');
        mutateServices();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'service_visits',
        filter: `car_id=eq.${id}`
      }, (payload) => {
        console.log('تم حذف خدمة، تحديث البيانات');
        mutateServices();
      })
      .subscribe();
    
    // إعداد الاستماع لتغييرات جدول cars_new
    const carChannel = supabase.channel('car-changes');
    const carSubscription = carChannel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cars_new',
        filter: `qr_id=eq.${id}`
      }, (payload) => {
        console.log('تم تحديث بيانات السيارة، تحديث البيانات');
        mutateCar();
      })
      .subscribe();
    
    return () => {
      // إلغاء الاشتراكات بالطريقة الصحيحة
      serviceChannel.unsubscribe();
      carChannel.unsubscribe();
    };
  }, [id]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      mutateCar(),
      mutateServices()
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const handleCall = () => {
    if (car?.shop?.phone) {
      Linking.openURL(`tel:${car.shop.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (car?.shop?.phone) {
      const message = `أهلا! أنا أتصفح معلومات سيارتك ${car.make} ${car.model} على تطبيق YazCar.`;
      const phoneNumber = car.shop.phone.startsWith('0') ? car.shop.phone.substring(1) : car.shop.phone;
      const whatsappUrl = `https://wa.me/${(car.shop.whatsapp_prefix || '966')}${phoneNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(whatsappUrl);
    }
  };

  const openMap = () => {
    if (car?.shop?.coordinates) {
      // إذا كانت الإحداثيات متوفرة، استخدمها (أكثر دقة)
      const { latitude, longitude } = car.shop.coordinates;
      let mapUrl;
      
      if (Platform.OS === 'ios') {
        // تنسيق Apple Maps للأيفون
        mapUrl = `maps:?ll=${latitude},${longitude}&q=${encodeURIComponent(car.shop.name || 'المحل')}`;
      } else if (Platform.OS === 'android') {
        // تنسيق خرائط جوجل للأندرويد
        mapUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(car.shop.name || 'المحل')})`;
      } else {
        // للويب استخدم جوجل ماب
        mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      }
      
      Linking.openURL(mapUrl).catch(() => {
        // إذا فشل، استخدم رابط الويب
        Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
      });
    } else if (car?.shop?.address) {
      // إذا لم تكن الإحداثيات متوفرة، استخدم العنوان النصي
      const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(car.shop.address)}`;
      Linking.openURL(mapUrl);
    } else {
      Alert.alert('تنبيه', 'معلومات الموقع غير متوفرة');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    // تنسيق التاريخ بالصيغة الميلادية (يوم/شهر/سنة)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  // حالة التحميل
  const isLoading = carLoading || serviceLoading;
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // حالة حدوث خطأ أو عدم وجود بيانات
  if (carError || !car) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
        />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="car-off" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>لم يتم العثور على بيانات السيارة</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
        <TouchableOpacity 
          style={styles.refreshBtn} 
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={22} 
            color={refreshing ? "#999" : "#333"} 
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* بانر المحل والصورة الشخصية */}
        <View style={styles.shopProfileContainer}>
          {/* بانر المحل */}
          <View style={styles.bannerContainer}>
            {car.shop?.banner_image ? (
              <Image 
                source={{ uri: getBannerImageUrl(car.shop.banner_image, 1200, 220) }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#3B82F6', '#204080']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.defaultBanner}
              />
            )}
            
            {/* صورة المحل */}
            <View style={styles.shopLogoContainer}>
              {car.shop?.logo_url ? (
                <Image 
                  source={{ uri: getProfileImageUrl(car.shop.logo_url, 120) }}
                  style={styles.shopLogo}
                />
              ) : (
                <View style={styles.defaultShopLogo}>
                  <MaterialCommunityIcons name="store" size={32} color="#fff" />
                </View>
              )}
            </View>
          </View>
          
          {/* شارة مركز معتمد وساعات العمل فوق المعلومات الأخرى */}
          <View style={styles.badgesContainer}>
            {car.shop?.is_approved && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>مركز معتمد</Text>
                <Ionicons name="shield-checkmark" size={14} color="#00703C" style={styles.verifiedIcon} />
              </View>
            )}
            
            {car.shop?.working_hours && (
              <View style={styles.workingHoursBadge}>
                <Text style={styles.workingHoursText}>{car.shop.working_hours}</Text>
                <Ionicons name="time-outline" size={14} color="#0D47A1" style={styles.workingHoursIcon} />
              </View>
            )}
          </View>
          
          {/* معلومات المحل */}
          <View style={styles.shopInfoContainer}>
            <View style={styles.shopInfoCard}>
              <Text style={styles.shopName}>{car.shop?.name || 'Yaz Car'}</Text>
              
              <View style={styles.detailInfoRow}>
                <Ionicons name="call-outline" size={14} color="#777" style={styles.infoIcon} />
                <Text style={styles.shopPhone}>{car.shop?.phone ? `+ ${car.shop.whatsapp_prefix || '966'} ${car.shop.phone}` : 'رقم غير متوفر'}</Text>
              </View>
              
              {car.shop?.address && (
                <View style={styles.detailInfoRow}>
                  <Ionicons name="location-outline" size={14} color="#777" style={styles.infoIcon} />
                  <Text style={styles.shopAddress} numberOfLines={1}>{car.shop.address}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* أزرار التواصل */}
          <View style={styles.quickContactContainer}>
            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={handleCall}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="call" size={20} color="#3498db" />
              </View>
              <Text style={styles.contactBtnText}>اتصال</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={handleWhatsApp}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <Text style={styles.contactBtnText}>واتساب</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={openMap}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name="location" size={20} color="#E74C3C" />
              </View>
              <Text style={styles.contactBtnText}>الموقع</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* بانر إعلاني */}
        <View style={styles.adBanner}>
          <LinearGradient
            colors={['#6200EA', '#9C27B0']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.adGradient}
          >
            <Text style={styles.adButtonText}>أعلن عن خدماتك معنا</Text>
            <Text style={styles.adButtonSubtext}>احصل على المزيد من العملاء عبر منصتنا</Text>
            
            {/* زر واتساب داخل البانر */}
            <TouchableOpacity style={styles.whatsappInBanner} onPress={handleWhatsApp}>
              <FontAwesome5 name="whatsapp" size={20} color="#fff" />
              <Text style={styles.whatsappButtonText}>تواصل معنا عبر واتساب</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* معلومات السيارة الأساسية */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>معلومات السيارة الأساسية</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>الطراز</Text>
                <Text style={styles.infoValue}>{car.make || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>الموديل</Text>
                <Text style={styles.infoValue}>{car.model || 'غير محدد'}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>سنة الصنع</Text>
                <Text style={styles.infoValue}>{car.year || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>اللون</Text>
                <Text style={styles.infoValue}>{car.color || 'غير محدد'}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>رقم اللوحة</Text>
                <Text style={styles.infoValue}>{car.plate_number || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>رقم الشاصي</Text>
                <Text style={styles.infoValue}>{car.chassis_number?.slice(0, 10) || 'غير محدد'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* معلومات الزيت والصيانة */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>معلومات الزيت والصيانة</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>تصنيف الزيت</Text>
                <Text style={styles.infoValue}>{car.oil_type || 'غير محدد'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>درجة الزيت</Text>
                <Text style={styles.infoValue}>{car.oil_grade || 'غير محدد'}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>العداد الحالي</Text>
                <Text style={styles.infoValue}>{car.current_odometer ? `${car.current_odometer} كم` : 'غير محدد'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>آخر تغيير للزيت</Text>
                <Text style={styles.infoValue}>{formatDate(car.last_oil_change_date)}</Text>
              </View>
            </View>
          </View>
          
          {/* حالة الفلاتر */}
          <View style={styles.filterStatusContainer}>
            <Text style={styles.filterTitle}>الفلاتر</Text>
            <View style={styles.filterStatus}>
              <View style={styles.filterItem}>
                <Text style={styles.filterName}>فلتر زيت</Text>
                <Text style={[
                  styles.filterStatusText,
                  car.oil_filter_changed ? styles.filterChanged : styles.filterNotChanged
                ]}>
                  {car.oil_filter_changed ? 'تم التغيير' : 'لم يتم التغيير'}
                </Text>
              </View>
              
              <View style={styles.filterItem}>
                <Text style={styles.filterName}>فلتر هواء</Text>
                <Text style={[
                  styles.filterStatusText,
                  car.air_filter_changed ? styles.filterChanged : styles.filterNotChanged
                ]}>
                  {car.air_filter_changed ? 'تم التغيير' : 'لم يتم التغيير'}
                </Text>
              </View>
              
              <View style={styles.filterItem}>
                <Text style={styles.filterName}>فلتر مكيف</Text>
                <Text style={[
                  styles.filterStatusText,
                  car.cabin_filter_changed ? styles.filterChanged : styles.filterNotChanged
                ]}>
                  {car.cabin_filter_changed ? 'تم التغيير' : 'لم يتم التغيير'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* جدول الصيانات */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="chevron-down" size={18} color="#2196F3" style={{marginLeft: 5}} />
              <Text style={styles.sectionTitle}>جدول الصيانات</Text>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, {flex: 1.5}]}>اسم الصيانة</Text>
            <Text style={[styles.tableHeaderText, {flex: 1}]}>التاريخ</Text>
            <Text style={[styles.tableHeaderText, {flex: 1}]}>الكيلومترات</Text>
            <Text style={[styles.tableHeaderText, {flex: 1}]}>العداد القادم</Text>
          </View>

          {serviceRecords && serviceRecords.length > 0 ? (
            serviceRecords.map((record: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, {flex: 1.5}]}>{record.service_type || 'غير محدد'}</Text>
                <Text style={[styles.tableCell, {flex: 1}]}>{formatDate(record.date)}</Text>
                <Text style={[styles.tableCell, {flex: 1}]}>{record.mileage ? `${record.mileage} كم` : '-'}</Text>
                <Text style={[styles.tableCell, {flex: 1}]}>{record.next_service_mileage ? `${record.next_service_mileage} كم` : '-'}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyRecords}>
              <Text style={styles.emptyRecordsText}>لا توجد سجلات صيانة حتى الآن</Text>
            </View>
          )}
        </View>
        
        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  // تصميم جديد لمعلومات المحل في الأعلى
  shopProfileContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
    elevation: 1,
  },
  bannerContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  defaultBanner: {
    width: '100%',
    height: '100%',
  },
  shopLogoContainer: {
    position: 'absolute',
    bottom: -40,
    right: 15,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  shopLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultShopLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    marginRight: 105,
    zIndex: 5,
    position: 'relative',
    top: -5,
    gap: 12,
  },
  verifiedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 83, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 83, 0.5)',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  verifiedIcon: {
    marginRight: 8,
  },
  verifiedText: {
    color: '#00703C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workingHoursBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(25, 118, 210, 0.5)',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  workingHoursIcon: {
    marginRight: 8,
  },
  workingHoursText: {
    color: '#0D47A1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shopInfoContainer: {
    padding: 0,
    marginTop: 10,
    marginBottom: 5,
    width: '100%',
  },
  shopInfoCard: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: 15,
    marginLeft: 0,
    marginRight: 0,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginLeft: 6,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    marginBottom: 8,
  },
  shopPhone: {
    fontSize: 14,
    color: '#777',
    textAlign: 'right',
  },
  shopAddress: {
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
  },
  quickContactContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginTop: 10,
  },
  quickContactButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 6,
  },
  contactIconContainer: {
    marginRight: 8,
  },
  contactBtnText: {
    color: '#fff',
    marginRight: 5,
    fontSize: 13,
    fontWeight: 'bold',
  },
  adBanner: {
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  adGradient: {
    paddingTop: 15,
    paddingBottom: 5,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  adButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  adButtonSubtext: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
  },
  whatsappInBanner: {
    backgroundColor: '#00C853',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginTop: 15,
    marginBottom: 10,
    width: '100%',
  },
  whatsappButtonText: {
    color: '#fff',
    marginRight: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoGrid: {
    paddingHorizontal: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoItem: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  filterStatusContainer: {
    marginTop: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'right',
  },
  filterStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterItem: {
    alignItems: 'center',
    width: '30%',
  },
  filterName: {
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  filterStatusText: {
    fontSize: 11,
    textAlign: 'center',
  },
  filterChanged: {
    color: '#333',
  },
  filterNotChanged: {
    color: '#9E9E9E',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
  },
  emptyRecords: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyRecordsText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  footerSpace: {
    height: 30,
  },
  refreshBtn: {
    padding: 5,
  },
}); 
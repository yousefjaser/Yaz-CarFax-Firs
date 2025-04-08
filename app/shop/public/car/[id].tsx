import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Easing, 
  I18nManager,
  StatusBar,
  SafeAreaView,
  Linking,
  Image
} from 'react-native';
import { Text, Divider, Surface, ActivityIndicator } from 'react-native-paper';
import { COLORS, SPACING } from '../../../constants';
import { supabase } from '../../../config';
import Loading from '../../../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

// إجبار واجهة من اليمين لليسار
I18nManager.forceRTL(true);

export default function PublicCarDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const carId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  
  const [loading, setLoading] = useState(true);
  const [car, setCar] = useState<any>(null);
  const [serviceVisits, setServiceVisits] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [shopOwner, setShopOwner] = useState<any>(null);
  
  // إضافة متغيرات الرسوم المتحركة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    loadCarDetails();
  }, [carId]);
  
  useEffect(() => {
    // تشغيل حركة الظهور عند تحميل الصفحة
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, [car]);
  
  const loadCarDetails = async () => {
    if (!carId) return;
    
    setLoading(true);
    try {
      // البحث في جدول cars_new باستخدام qr_id
      console.log("البحث في جدول cars_new باستخدام qr_id:", carId);
      const { data: carData, error: carError } = await supabase
        .from('cars_new')
        .select(`
          *,
          customer:customer_id (
            id,
            name,
            phone,
            email
          ),
          shop:shop_id (
            id,
            name,
            phone,
            address,
            logo_url,
            owner_id
          )
        `)
        .eq('qr_id', carId)
        .maybeSingle();
      
      if (carError) throw carError;
      
      if (!carData) {
        console.error('لم يتم العثور على السيارة بالمعرف المقدم:', carId);
        setCar(null);
        setLoading(false);
        return;
      }
      
      console.log("تم العثور على السيارة:", carData);
      
      // تأكد من أن البيانات غير الموجودة تكون فارغة بدلاً من null لتجنب خطأ "غير محدد"
      const processedCarData = {
        ...carData,
        oil_type: carData.oil_type || '',
        oil_grade: carData.oil_grade || '',
        current_odometer: carData.current_odometer || '',
        next_oil_change_odometer: carData.next_oil_change_odometer || '',
        color: carData.color || '',
        chassis_number: carData.chassis_number || ''
      };
      
      setCar(processedCarData);
      
      if (carData.shop) {
        setShop(carData.shop);
        
        // تحميل بيانات مالك المحل
        if (carData.shop.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', carData.shop.owner_id)
            .maybeSingle();
            
          if (!ownerError && ownerData) {
            setShopOwner(ownerData);
          }
        }
      }
      
      // تحميل سجل الخدمات باستخدام qr_id
      await loadServiceVisits(carData.qr_id);
      
    } catch (error) {
      console.error('فشل في تحميل تفاصيل السيارة:', error);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل السيارة');
    } finally {
      setLoading(false);
    }
  };
  
  const loadServiceVisits = async (carId: string) => {
    try {
      const { data: visitsData, error: visitsError } = await supabase
        .from('service_visits')
        .select(`
          *,
          service_categories (
            id,
            name
          )
        `)
        .eq('car_id', carId)
        .order('date', { ascending: false });
      
      if (visitsError) throw visitsError;
      console.log("عدد زيارات الخدمة:", visitsData ? visitsData.length : 0);
      setServiceVisits(visitsData || []);
    } catch (error) {
      console.error('فشل في تحميل سجل الخدمات:', error);
    }
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير متوفر';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return 'غير متوفر';
    }
  };
  
  const openDirections = () => {
    if (shop && shop.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`;
      Linking.openURL(url).catch(err => {
        console.error('فشل في فتح تطبيق الخرائط:', err);
        Alert.alert('خطأ', 'فشل في فتح تطبيق الخرائط');
      });
    }
  };
  
  const callShop = () => {
    if (shop && shop.phone) {
      Linking.openURL(`tel:${shop.phone}`).catch(err => {
        console.error('فشل في فتح تطبيق الهاتف:', err);
        Alert.alert('خطأ', 'فشل في فتح تطبيق الهاتف');
      });
    }
  };
  
  const getNextOilChangeDate = () => {
    if (!car.last_oil_change_date) return 'غير متوفر';
    
    try {
      // نفترض أن الزيت يتم تغييره كل 6 أشهر كمثال
      const lastChangeDate = new Date(car.last_oil_change_date);
      const nextChangeDate = new Date(lastChangeDate);
      nextChangeDate.setMonth(lastChangeDate.getMonth() + 6);
      
      // حساب الأيام المتبقية
      const today = new Date();
      const timeDiff = nextChangeDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysRemaining <= 0) {
        return 'متأخر عن الموعد';
      } else {
        return `متبقي ${daysRemaining} يوم`;
      }
    } catch (e) {
      return 'غير متوفر';
    }
  };
  
  const getFilterStatusText = (isChanged: boolean, changeDate: string | null) => {
    if (!isChanged) {
      return 'يحتاج للتغيير';
    }
    
    if (changeDate) {
      return `تم التغيير في ${formatDate(changeDate)}`;
    }
    
    return 'تم التغيير';
  };

  const openWhatsapp = () => {
    // تنسيق الرقم مع رمز الدولة وإزالة الصفر من البداية
    const whatsappNumber = '0598565009';
    const formattedNumber = '972' + whatsappNumber.substring(1); // إضافة 972 (رمز فلسطين) وإزالة الصفر الأول

    // تحضير النص مع تشفير صحيح للحروف العربية
    const message = "أود الاستفسار عن الإعلان في تطبيق YazCar";
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('خطأ', 'تطبيق واتساب غير مثبت على جهازك');
        }
      })
      .catch(err => {
        console.error('فشل في فتح واتساب:', err);
        Alert.alert('خطأ', 'فشل في فتح تطبيق واتساب');
      });
  };
  
  // في حالة جاري التحميل
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>جاري تحميل بيانات السيارة...</Text>
      </SafeAreaView>
    );
  }
  
  // في حالة عدم العثور على السيارة
  if (!car) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.primary}
        />
        <View style={styles.topSection}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-right" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={() => router.replace('/')}
          >
            <Icon name="home" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.bottomSection, styles.centerContent]}>
          <Surface style={styles.errorSurface}>
            <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
            <Text style={styles.errorText}>لم يتم العثور على بيانات السيارة</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.primaryButtonText}>الصفحة الرئيسية</Text>
            </TouchableOpacity>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      <View style={styles.topSection}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace('/')}
        >
          <Icon name="home" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.bottomSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* بطاقة معلومات المالك والمحل */}
          {shop && (
            <Surface style={styles.ownerCard} elevation={4}>
              <LinearGradient
                colors={[COLORS.primary, '#3d84a8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ownerBanner}
              >
                <View style={styles.ownerInfo}>
                  <View style={styles.shopLogoContainer}>
                    {shop.logo_url ? (
                      <Image 
                        source={{ uri: shop.logo_url }} 
                        style={styles.shopLogo} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.shopLogoPlaceholder}>
                        <Icon name="store" size={30} color="#fff" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.ownerTextInfo}>
                    <Text style={styles.shopNameBanner}>{shop.name}</Text>
                    {shopOwner && (
                      <Text style={styles.ownerName}>
                        <Icon name="account" size={16} color="#f0f0f0" /> {shopOwner.full_name || shopOwner.email}
                      </Text>
                    )}
                    <View style={styles.ownerDetail}>
                      <Icon name="phone" size={16} color="#f0f0f0" />
                      <Text style={styles.ownerDetailText}>
                        {shop.phone || 'غير متوفر'}
                      </Text>
                    </View>
                    {shop.address && (
                      <View style={styles.ownerDetail}>
                        <Icon name="map-marker" size={16} color="#f0f0f0" />
                        <Text style={styles.ownerDetailText}>
                          {shop.address}
                        </Text>
                      </View>
                    )}
                    <View style={styles.ownerContact}>
                      <TouchableOpacity onPress={callShop} style={styles.ownerContactButton}>
                        <Icon name="phone" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={openDirections} style={styles.ownerContactButton}>
                        <Icon name="map-marker" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.verification}>
                  <Icon name="check-decagram" size={24} color="#fff" />
                  <Text style={styles.verificationText}>مركز معتمد</Text>
                </View>
              </LinearGradient>
            </Surface>
          )}
          
          {/* بطاقة الإعلانات */}
          <Surface style={styles.adCard} elevation={4}>
            <LinearGradient
              colors={['#6a11cb', '#2575fc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.adBanner}
            >
              <View style={styles.adContent}>
                <View style={styles.adTextContainer}>
                  <Text style={styles.adTitle}>أعلن معنا الآن!</Text>
                  <Text style={styles.adDescription}>احصل على مكان لإعلانك في تطبيق YazCar واستفد من تواجدك على منصتنا</Text>
                  <TouchableOpacity 
                    style={styles.whatsappButton}
                    onPress={openWhatsapp}
                  >
                    <Icon name="whatsapp" size={18} color="#fff" />
                    <Text style={styles.whatsappButtonText}>تواصل معنا عبر واتساب</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.adImageContainer}>
                  <View style={styles.adImagePlaceholder}>
                    <Icon name="bullhorn" size={40} color="#ffffff" />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Surface>
          
          <Surface style={styles.topCard} elevation={4}>
            <View style={styles.carBanner}>
              <LinearGradient
                colors={[COLORS.primary, '#3d84a8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBanner}
              />
              <View style={styles.carIconContainer}>
                <Icon name="car-side" size={70} color="#fff" />
              </View>
            </View>
            
            <View style={styles.carHeader}>
              <View style={styles.carTitleContainer}>
                <Text style={styles.carTitle}>
                  {car.make} {car.model}
                </Text>
                <Text style={styles.carSubtitle}>{car.year}</Text>
                <View style={styles.plateContainer}>
                  <Icon name="card-account-details" size={18} color={COLORS.primary} />
                  <Text style={styles.plateNumber}>{car.plate_number}</Text>
                </View>
              </View>
            </View>
            
            <Divider style={styles.coloredDivider} />
            
            <View style={styles.carStatusContainer}>
              <View style={styles.carStatusItem}>
                <Icon name="check-circle" size={22} color="#4CAF50" />
                <Text style={styles.carStatusText}>مسجلة لدى {shop ? shop.name : 'YazCar'}</Text>
              </View>
              
              <View style={styles.carStatusItem}>
                <Icon 
                  name={car.current_odometer ? "speedometer" : "speedometer-medium"} 
                  size={22} 
                  color={car.current_odometer ? "#4CAF50" : "#ff6b6b"} 
                />
                <Text style={styles.carStatusText}>
                  {car.current_odometer ? `${car.current_odometer} كم` : 'لم يتم تسجيل قراءة العداد'}
                </Text>
              </View>
            </View>
            
            <View style={styles.carDetails}>
              <View style={styles.detailHeader}>
                <Icon name="card-text" size={24} color={COLORS.primary} />
                <Text style={styles.detailHeaderText}>بيانات السيارة</Text>
              </View>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="factory" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>الشركة المصنعة</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.make || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="car-side" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>الطراز</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.model || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="calendar" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>سنة الصنع</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.year || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="palette" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>اللون</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.color || 'غير محدد'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="identifier" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>رقم الشاسيه</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.chassis_number || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailGridItem}>
                  <View style={styles.detailItem}>
                    <Icon name="calendar-clock" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>تاريخ التسجيل</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {formatDate(car.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Surface>
          
          <Surface style={styles.card} elevation={4}>
            <View style={styles.contentContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.headerIconContainer}>
                  <Icon name="oil" size={24} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>معلومات الصيانة</Text>
              </View>
              
              <Divider style={styles.coloredDivider} />
              
              <View style={styles.maintenanceInfo}>
                <View style={styles.detailHeader}>
                  <Icon name="oil-level" size={24} color={COLORS.primary} />
                  <Text style={styles.detailHeaderText}>تفاصيل الزيت</Text>
                </View>
                
                <View style={styles.maintenanceRow}>
                  <View style={styles.maintenanceItem}>
                    <View style={styles.maintenanceIcon}>
                      <Icon name="oil" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.maintenanceTextContainer}>
                      <Text style={styles.maintenanceLabel}>نوع الزيت</Text>
                      <Text style={styles.maintenanceValue}>{car.oil_type || 'غير متوفر'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.maintenanceItem}>
                    <View style={styles.maintenanceIcon}>
                      <Icon name="label" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.maintenanceTextContainer}>
                      <Text style={styles.maintenanceLabel}>تصنيف الزيت</Text>
                      <Text style={styles.maintenanceValue}>{car.oil_grade || 'غير متوفر'}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.maintenanceRow}>
                  <View style={styles.maintenanceItem}>
                    <View style={styles.maintenanceIcon}>
                      <Icon name="calendar" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.maintenanceTextContainer}>
                      <Text style={styles.maintenanceLabel}>تاريخ آخر تغيير</Text>
                      <Text style={styles.maintenanceValue}>{formatDate(car.last_oil_change_date)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.maintenanceItem}>
                    <View style={styles.maintenanceIcon}>
                      <Icon name="calendar-clock" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.maintenanceTextContainer}>
                      <Text style={styles.maintenanceLabel}>موعد التغيير القادم</Text>
                      <Text style={[
                        styles.maintenanceValue,
                        {color: getNextOilChangeDate() === 'متأخر عن الموعد' ? '#ff6b6b' : '#4CAF50'}
                      ]}>
                        {getNextOilChangeDate()}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailHeader}>
                  <Icon name="filter" size={24} color={COLORS.primary} />
                  <Text style={styles.detailHeaderText}>حالة الفلاتر</Text>
                </View>
                
                <View style={styles.maintenanceRow}>
                  {car.air_filter_changed ? (
                    <View style={styles.maintenanceItem}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="air-filter" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={styles.maintenanceLabel}>فلتر الهواء</Text>
                        <View style={styles.filterChangedContainer}>
                          <Icon name="check-circle-outline" size={18} color="#4CAF50" />
                          <Text style={[styles.maintenanceValue, styles.goodStatus]}> تم التغيير</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.maintenanceItem, styles.grayFilter]}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="air-filter" size={24} color="#999" />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={[styles.maintenanceLabel, {color: '#999'}]}>فلتر الهواء</Text>
                        <Text style={[styles.maintenanceValue, {color: '#999'}]}>
                          لم يتم التغيير
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {car.oil_filter_changed ? (
                    <View style={styles.maintenanceItem}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="oil-level" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={styles.maintenanceLabel}>فلتر الزيت</Text>
                        <View style={styles.filterChangedContainer}>
                          <Icon name="check-circle-outline" size={18} color="#4CAF50" />
                          <Text style={[styles.maintenanceValue, styles.goodStatus]}> تم التغيير</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.maintenanceItem, styles.grayFilter]}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="oil-level" size={24} color="#999" />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={[styles.maintenanceLabel, {color: '#999'}]}>فلتر الزيت</Text>
                        <Text style={[styles.maintenanceValue, {color: '#999'}]}>
                          لم يتم التغيير
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.maintenanceRow}>
                  {car.cabin_filter_changed ? (
                    <View style={styles.maintenanceItem}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="air-conditioner" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={styles.maintenanceLabel}>فلتر المكيف</Text>
                        <View style={styles.filterChangedContainer}>
                          <Icon name="check-circle-outline" size={18} color="#4CAF50" />
                          <Text style={[styles.maintenanceValue, styles.goodStatus]}> تم التغيير</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.maintenanceItem, styles.grayFilter]}>
                      <View style={styles.maintenanceIcon}>
                        <Icon name="air-conditioner" size={24} color="#999" />
                      </View>
                      <View style={styles.maintenanceTextContainer}>
                        <Text style={[styles.maintenanceLabel, {color: '#999'}]}>فلتر المكيف</Text>
                        <Text style={[styles.maintenanceValue, {color: '#999'}]}>
                          لم يتم التغيير
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                
                {car.last_oil_change_date && (
                  <View style={styles.progressContainer}>
                    <View style={styles.detailHeader}>
                      <Icon name="information" size={24} color={COLORS.primary} />
                      <Text style={styles.detailHeaderText}>معلومات آخر صيانة</Text>
                    </View>
                    
                    <View style={styles.lastServiceInfo}>
                      <View style={styles.lastServiceItem}>
                        <Text style={styles.lastServiceLabel}>تاريخ آخر صيانة:</Text>
                        <Text style={styles.lastServiceValue}>{formatDate(car.last_service_date || car.last_oil_change_date)}</Text>
                      </View>
                      
                      {car.last_oil_change_odometer && (
                        <View style={styles.lastServiceItem}>
                          <Text style={styles.lastServiceLabel}>قراءة العداد عند آخر صيانة:</Text>
                          <Text style={styles.lastServiceValue}>{car.last_oil_change_odometer} كم</Text>
                        </View>
                      )}
                      
                      {car.oil_type && (
                        <View style={styles.lastServiceItem}>
                          <Text style={styles.lastServiceLabel}>تفاصيل الزيت:</Text>
                          <Text style={styles.lastServiceValue}>{car.oil_type} {car.oil_grade || ''}</Text>
                        </View>
                      )}
                      
                      {car.next_service_notes && (
                        <View style={styles.lastServiceItem}>
                          <Text style={styles.lastServiceLabel}>ملاحظات:</Text>
                          <Text style={styles.lastServiceValue}>{car.next_service_notes}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Surface>
          
          {serviceVisits.length > 0 && (
            <Surface style={styles.card} elevation={4}>
              <View style={styles.contentContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.headerIconContainer}>
                    <Icon name="history" size={24} color="#fff" />
                  </View>
                  <Text style={styles.sectionTitle}>سجل الصيانة</Text>
                </View>
                
                <Divider style={styles.coloredDivider} />
                
                <View style={styles.serviceHistory}>
                  {serviceVisits.slice(0, 5).map((visit, index) => (
                    <View key={visit.id} style={styles.serviceVisitItem}>
                      <View style={styles.serviceVisitIcon}>
                        <Icon name="wrench" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.serviceVisitContent}>
                        <Text style={styles.serviceVisitTitle}>
                          {visit.service_categories?.name || 'صيانة'}
                        </Text>
                        <Text style={styles.serviceVisitDate}>{formatDate(visit.date)}</Text>
                        <Text style={styles.serviceVisitMileage}>
                          {visit.mileage ? `قراءة العداد: ${visit.mileage} كم` : ''}
                        </Text>
                        {visit.notes && (
                          <Text style={styles.serviceVisitNotes} numberOfLines={2}>
                            {visit.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  
                  {serviceVisits.length > 5 && (
                    <View style={styles.moreVisitsContainer}>
                      <Text style={styles.moreVisitsText}>
                        يوجد {serviceVisits.length - 5} زيارات إضافية في السجل
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Surface>
          )}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>تم إنشاؤه بواسطة YazCar</Text>
            <Text style={styles.footerCopyright}>© {new Date().getFullYear()} جميع الحقوق محفوظة</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  homeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rightPlaceholder: {
    width: 40,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  topCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  card: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  carBanner: {
    height: 150,
    position: 'relative',
  },
  gradientBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  carIconContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#ffffff',
  },
  carTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  carTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  carSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  plateContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  plateNumber: {
    color: '#333',
    marginRight: 8,
    fontWeight: 'bold',
  },
  coloredDivider: {
    height: 2,
    backgroundColor: COLORS.primary,
  },
  carStatusContainer: {
    padding: 15,
  },
  carStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  carStatusText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  carDetails: {
    padding: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailHeaderText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  detailsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  detailGridItem: {
    width: '48%',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  detailIcon: {
    marginLeft: 10,
  },
  detailTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  contentContainer: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  errorSurface: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '85%',
    elevation: 4,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 15,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shopInfo: {
    marginTop: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  shopContact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  contactButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contactText: {
    marginTop: 5,
    color: COLORS.primary,
    fontWeight: '500',
  },
  shopDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  shopDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  shopDetailIcon: {
    marginLeft: 10,
  },
  shopDetailText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  maintenanceInfo: {
    marginTop: 10,
  },
  maintenanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  maintenanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    width: '48%',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  maintenanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  maintenanceTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  maintenanceLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  maintenanceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  progressLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressDetail: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDetailLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 10,
  },
  progressDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  serviceHistory: {
    marginTop: 10,
  },
  serviceVisitItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
  },
  serviceVisitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceVisitContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  serviceVisitTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceVisitDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  serviceVisitMileage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  serviceVisitNotes: {
    fontSize: 13,
    color: '#666',
    textAlign: 'right',
  },
  moreVisitsContainer: {
    padding: 10,
    alignItems: 'center',
  },
  moreVisitsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 15,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerCopyright: {
    fontSize: 14,
    color: '#666',
  },
  goodStatus: {
    color: '#4CAF50',
  },
  warningStatus: {
    color: '#ff6b6b',
  },
  lastServiceInfo: {
    marginTop: 10,
  },
  lastServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  lastServiceLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 10,
  },
  lastServiceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filterChangedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grayFilter: {
    backgroundColor: '#f0f0f0',
  },
  ownerCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  ownerBanner: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginLeft: 15,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  shopLogo: {
    width: '100%',
    height: '100%',
  },
  shopLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ownerTextInfo: {
    alignItems: 'flex-end',
  },
  shopNameBanner: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  ownerName: {
    fontSize: 14,
    color: '#f0f0f0',
    marginBottom: 10,
  },
  ownerContact: {
    flexDirection: 'row',
  },
  ownerContactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verificationText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  ownerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ownerDetailText: {
    fontSize: 12,
    color: '#f0f0f0',
    marginRight: 5,
  },
  adCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  adBanner: {
    padding: 15,
  },
  adContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  adTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  adDescription: {
    fontSize: 12,
    color: '#f0f0f0',
    marginBottom: 12,
    textAlign: 'right',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  whatsappButtonText: {
    color: '#ffffff',
    marginRight: 8,
    fontWeight: 'bold',
    fontSize: 12,
  },
  adImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginLeft: 10,
  },
  adImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
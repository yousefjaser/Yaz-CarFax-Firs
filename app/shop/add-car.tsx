import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Animated,
  Easing,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import { Text, Appbar, Divider, Button, Menu } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Input from '../components/Input';
import { Car } from '../types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// استيراد DateTimePicker للأندرويد وiOS فقط
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddCarScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shop, setShop] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('carInfo');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [serviceWorker, setServiceWorker] = useState('');
  const [currentMileage, setCurrentMileage] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [oilType, setOilType] = useState('');
  const [oilGrade, setOilGrade] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [oilFilterChanged, setOilFilterChanged] = useState(false);
  const [airFilterChanged, setAirFilterChanged] = useState(false);
  const [cabinFilterChanged, setCabinFilterChanged] = useState(false);
  const [carColor, setCarColor] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [qrId, setQrId] = useState('');
  
  // قوائم منسدلة
  const [oilTypes, setOilTypes] = useState<any[]>([]);
  const [oilCategories, setOilCategories] = useState<any[]>([]);
  const [showOilTypeDropdown, setShowOilTypeDropdown] = useState(false);
  const [showOilGradeDropdown, setShowOilGradeDropdown] = useState(false);
  
  // تأثيرات الحركة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // تحديث المتغيرات المتعلقة بالزيت
  const [lastOilChangeDate, setLastOilChangeDate] = useState(new Date());
  const [nextOilChangeDate, setNextOilChangeDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 6)));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [customOilType, setCustomOilType] = useState('');
  const [customOilGrade, setCustomOilGrade] = useState('');
  const [showCustomOilType, setShowCustomOilType] = useState(false);
  const [showCustomOilGrade, setShowCustomOilGrade] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+966'); // بادئة السعودية افتراضيًا

  useEffect(() => {
    loadShopData();
    loadOilData();
    
    // تأثير ظهور الصفحة
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();

    // التحقق من وجود QR ID من الماسح
    if (searchParams.qrId) {
      console.log('تم استلام QR ID من الماسح:', searchParams.qrId);
      setQrId(searchParams.qrId.toString());
    }
  }, []);

  const loadShopData = async () => {
    if (!user) return;
    
    try {
      console.log('البحث عن المحل في جدول shops للمستخدم:', user.id);
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        console.log('تم العثور على المحل:', data.name);
      setShop(data);
      } else {
        console.log('لم يتم العثور على محل مسجل للمستخدم');
      }
    } catch (error) {
      console.error('فشل في تحميل بيانات المحل:', error);
    }
  };

  const loadOilData = async () => {
    try {
      console.log('جاري تحميل بيانات الزيوت...');
      
      // استرجاع أنواع الزيوت
      const { data: oilTypesData, error: oilTypesError } = await supabase
        .from('oil_types')
        .select('*');
      
      if (oilTypesError) {
        console.error('خطأ في استرجاع أنواع الزيوت:', oilTypesError);
        throw oilTypesError;
      }
      
      console.log('تم تحميل أنواع الزيوت:', oilTypesData ? oilTypesData.length : 0);
      setOilTypes(oilTypesData || []);
      
      // إضافة بيانات افتراضية إذا لم توجد بيانات
      if (!oilTypesData || oilTypesData.length === 0) {
        console.log('إضافة أنواع زيوت افتراضية');
        setOilTypes([
          { id: 1, name: 'Mobil' },
          { id: 2, name: 'Shell' },
          { id: 3, name: 'Castrol' },
          { id: 4, name: 'Valvoline' },
          { id: 5, name: 'Petromin' }
        ]);
      }
      
      // استرجاع تصنيفات الزيوت
      const { data: oilCategoriesData, error: oilCategoriesError } = await supabase
        .from('oil_categories')
        .select('*');
      
      if (oilCategoriesError) {
        console.error('خطأ في استرجاع تصنيفات الزيوت:', oilCategoriesError);
        throw oilCategoriesError;
      }
      
      console.log('تم تحميل تصنيفات الزيوت:', oilCategoriesData ? oilCategoriesData.length : 0);
      setOilCategories(oilCategoriesData || []);
      
      // إضافة بيانات افتراضية إذا لم توجد بيانات
      if (!oilCategoriesData || oilCategoriesData.length === 0) {
        console.log('إضافة تصنيفات زيوت افتراضية');
        setOilCategories([
          { id: 1, name: '5W-30' },
          { id: 2, name: '5W-40' },
          { id: 3, name: '10W-30' },
          { id: 4, name: '10W-40' },
          { id: 5, name: '15W-40' },
          { id: 6, name: '20W-50' }
        ]);
      }
      
    } catch (error) {
      console.error('فشل في تحميل بيانات الزيوت:', error);
      
      // في حالة الفشل، نضع بيانات افتراضية
      setOilTypes([
        { id: 1, name: 'Mobil' },
        { id: 2, name: 'Shell' },
        { id: 3, name: 'Castrol' },
        { id: 4, name: 'Valvoline' },
        { id: 5, name: 'Petromin' }
      ]);
      
      setOilCategories([
        { id: 1, name: '5W-30' },
        { id: 2, name: '5W-40' },
        { id: 3, name: '10W-30' },
        { id: 4, name: '10W-40' },
        { id: 5, name: '15W-40' },
        { id: 6, name: '20W-50' }
      ]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!make.trim()) {
      newErrors.make = 'الرجاء إدخال اسم الشركة المصنعة';
    }
    
    if (!model.trim()) {
      newErrors.model = 'الرجاء إدخال طراز السيارة';
    }
    
    if (!year.trim()) {
      newErrors.year = 'الرجاء إدخال سنة الصنع';
    } else if (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1) {
      newErrors.year = 'الرجاء إدخال سنة صنع صحيحة';
    }
    
    if (!plateNumber.trim()) {
      newErrors.plateNumber = 'الرجاء إدخال رقم اللوحة';
    }
    
    if (!customerPhone.trim()) {
      newErrors.phoneNumber = 'الرجاء إدخال رقم هاتف العميل';
    }
    
    if (!customerName.trim()) {
      newErrors.customerName = 'الرجاء إدخال اسم العميل';
    }
    
    // التحقق من رمز QR للسيارة
    if (!qrId) {
      newErrors.qrId = 'الرجاء مسح رمز QR للسيارة';
    }
    
    // التحقق من بيانات الزيت إذا كان المستخدم في قسم الزيت
    if (activeSection === 'oilInfo' || activeSection === 'additionalInfo') {
      if (currentMileage && isNaN(Number(currentMileage))) {
        newErrors.currentMileage = 'الرجاء إدخال عداد مسافة صحيح';
      }
      
      if (nextServiceMileage && isNaN(Number(nextServiceMileage))) {
        newErrors.nextServiceMileage = 'الرجاء إدخال عداد مسافة صحيح للصيانة القادمة';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!shop) {
      Alert.alert('خطأ', 'يجب أن يكون لديك محل مسجل لإضافة سيارة');
      return;
    }
    
    setLoading(true);
    
    try {
      // البحث عن العميل أو إنشاء عميل جديد
      let customerId;
      
      // البحث في جدول customers أولاً 
      const { data: existingCustomerFromCustomers, error: customersError } = await supabase
        .from('customers')
        .select('id, user_id, phone')
        .eq('phone', customerPhone)
        .maybeSingle();
      
      if (customersError && customersError.code !== 'PGRST116') throw customersError;
      
      // إذا وجدنا العميل في جدول customers
      if (existingCustomerFromCustomers) {
        customerId = existingCustomerFromCustomers.id;
        console.log('تم العثور على العميل في جدول customers:', customerId);
      } else {
        // البحث عن العميل في جدول المستخدمين
        const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', customerPhone)
        .eq('role', 'customer')
        .maybeSingle();
      
        if (userError && userError.code !== 'PGRST116') throw userError;
        
        let userId;
        
        // إذا وجدنا المستخدم في جدول users
        if (existingUser) {
          userId = existingUser.id;
          console.log('تم العثور على المستخدم في جدول users:', userId);
      } else {
          // إنشاء مستخدم جديد إذا لم نجده - مع كلمة مرور آمنة
          const securePassword = `pass_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          
          const { data: newUser, error: newUserError } = await supabase
          .from('users')
          .insert({
            name: customerName,
            phone: customerPhone,
            role: 'customer',
            email: `${customerPhone}@placeholder.com`, // مؤقت، يمكن تغييره لاحقاً
              password: securePassword // كلمة مرور آمنة وفريدة
            })
            .select()
            .single();
          
          if (newUserError) {
            console.error('خطأ في إنشاء المستخدم الجديد:', newUserError);
            throw newUserError;
          }
          
          userId = newUser.id;
          console.log('تم إنشاء مستخدم جديد:', userId);
        }
        
        // إنشاء سجل جديد في جدول customers
        const { data: newCustomer, error: newCustomerError } = await supabase
          .from('customers')
          .insert({
            user_id: userId,
            name: customerName,
            phone: customerPhone,
            email: `${customerPhone}@placeholder.com`,
          })
          .select()
          .single();
        
        if (newCustomerError) throw newCustomerError;
        customerId = newCustomer.id;
        console.log('تم إنشاء عميل جديد في جدول customers:', customerId);
      }
      
      // استخدام QR ID الذي تم مسحه أو إنشاء واحد جديد إذا لم يوجد
      const finalQrId = qrId || `CAR_${Math.floor(Math.random() * 100000)}_${Date.now()}`;

      // تحديد معرف نوع الزيت
      let finalOilTypeId = null;
      let finalOilType = oilType;
      
      // البحث عن نوع الزيت في القائمة أو إضافة نوع جديد
      if (showCustomOilType && customOilType.trim()) {
        finalOilType = customOilType.trim();
        const { data: newOilType, error: newOilTypeError } = await supabase
          .from('oil_types')
          .insert({ name: finalOilType })
          .select()
          .single();
          
        if (newOilTypeError) {
          console.error('خطأ في إضافة نوع زيت جديد:', newOilTypeError);
        } else if (newOilType) {
          finalOilTypeId = newOilType.id;
        }
      } else if (oilType) {
        // البحث عن نوع الزيت الموجود
        const oilTypeObj = oilTypes.find(t => t.name === oilType);
        if (oilTypeObj) {
          finalOilTypeId = oilTypeObj.id;
        }
      }
      
      // تحديد معرف تصنيف الزيت
      let finalOilCategoryId = null;
      let finalOilGrade = oilGrade;
      
      // البحث عن تصنيف الزيت في القائمة أو إضافة تصنيف جديد
      if (showCustomOilGrade && customOilGrade.trim()) {
        finalOilGrade = customOilGrade.trim();
        const { data: newOilCategory, error: newOilCategoryError } = await supabase
          .from('oil_categories')
          .insert({ name: finalOilGrade })
          .select()
          .single();
          
        if (newOilCategoryError) {
          console.error('خطأ في إضافة تصنيف زيت جديد:', newOilCategoryError);
        } else if (newOilCategory) {
          finalOilCategoryId = newOilCategory.id;
        }
      } else if (oilGrade) {
        // البحث عن تصنيف الزيت الموجود
        const oilCategoryObj = oilCategories.find(c => c.name === oilGrade);
        if (oilCategoryObj) {
          finalOilCategoryId = oilCategoryObj.id;
        }
      }
      
      // إضافة السيارة إلى قاعدة البيانات
      const carData = {
          make,
          model,
          year: Number(year),
          plate_number: plateNumber,
          customer_id: customerId,
          shop_id: shop.id,
        qr_id: finalQrId,
        color: carColor,
        chassis_number: chassisNumber,
        current_odometer: currentMileage ? Number(currentMileage) : null,
        oil_type: finalOilType,
        oil_grade: finalOilGrade,
        oil_type_id: finalOilTypeId,
        oil_category_id: finalOilCategoryId,
        next_oil_change_odometer: nextServiceMileage ? Number(nextServiceMileage) : null,
        last_oil_change_date: lastOilChangeDate.toISOString(),
        next_oil_change_date: nextOilChangeDate.toISOString(),
        // إضافة حالة الفلاتر
        oil_filter_changed: oilFilterChanged,
        air_filter_changed: airFilterChanged,
        cabin_filter_changed: cabinFilterChanged,
        // تاريخ تغيير الفلاتر (نفس تاريخ تغيير الزيت)
        oil_filter_change_date: oilFilterChanged ? lastOilChangeDate.toISOString() : null,
        air_filter_change_date: airFilterChanged ? lastOilChangeDate.toISOString() : null,
        cabin_filter_change_date: cabinFilterChanged ? lastOilChangeDate.toISOString() : null
      };
      
      console.log('بيانات السيارة المرسلة:', JSON.stringify({
        next_oil_change_date: carData.next_oil_change_date,
        whatsapp_info: `${countryCode} ${whatsappNumber} (تم تخزينه مؤقتاً فقط في التطبيق)`
      }, null, 2));
      
      const { data, error } = await supabase
        .from('cars_new')
        .insert(carData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('تم إدخال السيارة بنجاح:', JSON.stringify({
        id: data.id,
        next_oil_change_date: data.next_oil_change_date,
        whatsapp_info: `${data.whatsapp_country_code} ${data.whatsapp_number}`
      }, null, 2));
      
      Alert.alert(
        'تم بنجاح',
        `تمت إضافة السيارة بنجاح\nتم تعيين موعد تذكير الزيت: ${new Date(data.next_oil_change_date).toLocaleDateString('ar')}`,
        [
          {
            text: 'عرض التفاصيل',
            onPress: () => router.push(`/shop/car-details/${data.qr_id}`),
          },
          {
            text: 'موافق',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('فشل في إضافة السيارة:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إضافة السيارة');
    } finally {
      setLoading(false);
    }
  };

  // تأثير تغيير القسم مع انيميشن
  const handleSectionChange = (section: string) => {
    Animated.timing(fadeAnim, {
      toValue: 0.5,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      setActiveSection(section);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  };

  // تأثير ضغط زر
  const animatePress = (ref: Animated.Value) => {
    Animated.sequence([
      Animated.timing(ref, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(ref, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // دالة للانتقال إلى صفحة مسح QR
  const navigateToScan = () => {
    router.push('/shop/scan?returnTo=add-car');
  };

  // عرض منتقي التاريخ بناءً على المنصة
  const showDatePickerComponent = () => {
    if (Platform.OS === 'web') {
      // استخدام منتقي تاريخ HTML للويب
  return (
        <View style={styles.webDatePickerContainer}>
          <input
            type="date"
            value={lastOilChangeDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              setLastOilChangeDate(date);
            }}
            style={{
              padding: 8,
              fontSize: 16,
              width: '100%',
              borderRadius: 8,
              border: '1px solid #ddd'
            }}
          />
        </View>
      );
    } else if (showDatePicker) {
      // استخدام DateTimePicker لمنصات غير الويب
      return (
        <DateTimePicker
          value={lastOilChangeDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, selectedDate?: Date) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setLastOilChangeDate(selectedDate);
            }
          }}
        />
      );
    }
    return null;
  };

  // عرض منتقي التاريخ للموعد المستقبلي لتغيير الزيت
  const showNextDatePickerComponent = () => {
    if (Platform.OS === 'web') {
      // استخدام منتقي تاريخ HTML للويب
      return (
        <View style={styles.webDatePickerContainer}>
          <input
            type="date"
            value={nextOilChangeDate.toISOString().split('T')[0]}
            onChange={(e) => {
              const date = new Date(e.target.value);
              setNextOilChangeDate(date);
            }}
            style={{
              padding: 8,
              fontSize: 16,
              width: '100%',
              borderRadius: 8,
              border: '1px solid #ddd'
            }}
          />
        </View>
      );
    } else if (showNextDatePicker) {
      // استخدام DateTimePicker لمنصات غير الويب
      return (
        <DateTimePicker
          value={nextOilChangeDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: any, selectedDate?: Date) => {
            setShowNextDatePicker(false);
            if (selectedDate) {
              setNextOilChangeDate(selectedDate);
            }
          }}
        />
      );
    }
    return null;
  };

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
        <Text style={styles.headerTitle}>إضافة سيارة جديدة</Text>
        <View style={styles.rightPlaceholder} />
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
          {loading ? (
            <Loading />
          ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
              {/* مؤشر التقدم */}
              <View style={styles.progressContainer}>
                <TouchableOpacity 
                  style={[
                    styles.progressStep, 
                    activeSection === 'carInfo' ? styles.activeProgressStep : {}
                  ]}
                  onPress={() => handleSectionChange('carInfo')}
                >
                  <View style={[
                    styles.progressCircle,
                    activeSection === 'carInfo' ? styles.activeProgressCircle : {}
                  ]}>
                    <Text style={[
                      styles.progressNumber,
                      activeSection === 'carInfo' ? styles.activeProgressNumber : {}
                    ]}>١</Text>
                  </View>
                  <Text style={styles.progressText}>معلومات السيارة</Text>
                </TouchableOpacity>
                
                <View style={styles.progressLine} />
                
                <TouchableOpacity 
                  style={[
                    styles.progressStep, 
                    activeSection === 'oilInfo' ? styles.activeProgressStep : {}
                  ]}
                  onPress={() => handleSectionChange('oilInfo')}
                >
                  <View style={[
                    styles.progressCircle,
                    activeSection === 'oilInfo' ? styles.activeProgressCircle : {}
                  ]}>
                    <Text style={[
                      styles.progressNumber,
                      activeSection === 'oilInfo' ? styles.activeProgressNumber : {}
                    ]}>٢</Text>
                  </View>
                  <Text style={styles.progressText}>معلومات الزيت</Text>
                </TouchableOpacity>
                
                <View style={styles.progressLine} />
                
                <TouchableOpacity 
                  style={[
                    styles.progressStep, 
                    activeSection === 'additionalInfo' ? styles.activeProgressStep : {}
                  ]}
                  onPress={() => handleSectionChange('additionalInfo')}
                >
                  <View style={[
                    styles.progressCircle,
                    activeSection === 'additionalInfo' ? styles.activeProgressCircle : {}
                  ]}>
                    <Text style={[
                      styles.progressNumber,
                      activeSection === 'additionalInfo' ? styles.activeProgressNumber : {}
                    ]}>٣</Text>
                  </View>
                  <Text style={styles.progressText}>معلومات إضافية</Text>
                </TouchableOpacity>
              </View>
              
              {activeSection === 'carInfo' && (
                <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>معلومات السيارة</Text>

                  <View style={styles.qrScanContainer}>
                    <View style={styles.qrTextContainer}>
                      <Text style={styles.qrTitle}>رمز QR للسيارة</Text>
                      <Text style={styles.qrDescription}>
                        امسح رمز QR ليكون معرّف فريد للسيارة
                      </Text>
                      {qrId ? (
                        <Text style={styles.qrIdText}>
                          تم تعيين: {qrId}
                        </Text>
                      ) : errors.qrId ? (
                        <Text style={styles.errorText}>
                          {errors.qrId}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity 
                      style={styles.scanButton}
                      onPress={navigateToScan}
                    >
                      <Icon name="qrcode-scan" size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
          
          <Input
            label="الشركة المصنعة"
            value={make}
            onChangeText={(text) => {
              setMake(text);
              if (errors.make) {
                setErrors({ ...errors, make: '' });
              }
            }}
            error={errors.make}
            icon="car-side"
                    placeholder="أدخل اسم الشركة المصنعة للسيارة مثل: تويوتا، نيسان"
          />
          
          <Input
            label="الطراز"
            value={model}
            onChangeText={(text) => {
              setModel(text);
              if (errors.model) {
                setErrors({ ...errors, model: '' });
              }
            }}
            error={errors.model}
            icon="car-info"
                    placeholder="أدخل طراز السيارة مثل: كامري، مكسيما، كورولا"
          />
          
          <Input
            label="سنة الصنع"
            value={year}
            onChangeText={(text) => {
              setYear(text);
              if (errors.year) {
                setErrors({ ...errors, year: '' });
              }
            }}
            error={errors.year}
            keyboardType="numeric"
            maxLength={4}
            icon="calendar"
                    placeholder="أدخل سنة صنع السيارة بالأرقام مثل: 2023"
          />
          
          <Input
            label="رقم اللوحة"
            value={plateNumber}
            onChangeText={(text) => {
              setPlateNumber(text);
              if (errors.plateNumber) {
                setErrors({ ...errors, plateNumber: '' });
              }
            }}
            error={errors.plateNumber}
            icon="card-text"
                    placeholder="أدخل رقم لوحة السيارة كما هو مكتوب"
          />
          
          <Input
            label="اسم العميل"
            value={customerName}
            onChangeText={(text) => {
              setCustomerName(text);
              if (errors.customerName) {
                setErrors({ ...errors, customerName: '' });
              }
            }}
            error={errors.customerName}
            icon="account"
                    placeholder="أدخل اسم صاحب السيارة الثلاثي"
          />
          
          <Input
            label="رقم الهاتف"
            value={customerPhone}
            onChangeText={(text) => {
              setCustomerPhone(text);
                      if (errors.phoneNumber) {
                        setErrors({ ...errors, phoneNumber: '' });
              }
            }}
                    error={errors.phoneNumber}
            keyboardType="phone-pad"
            icon="phone"
                    placeholder="أدخل رقم هاتف العميل مثل: 05xxxxxxxx"
                  />
                  
                  <View style={styles.navigationButtons}>
                    <Animated.View
                      style={{ opacity: 1, transform: [{ scale: buttonScale }] }}
                    >
                      <TouchableOpacity
                        style={[styles.navigationButton, styles.nextBtn]}
                        onPress={() => {
                          animatePress(buttonScale);
                          handleSectionChange('oilInfo');
                        }}
                      >
                        <Text style={styles.nextBtnText}>التالي</Text>
                        <Icon name="arrow-left" size={18} color="#fff" />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </Animated.View>
              )}

              {activeSection === 'oilInfo' && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <Text style={styles.sectionTitle}>معلومات الزيت والصيانة</Text>
                  
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.datePickerLabel}>تاريخ تغيير الزيت</Text>
                    <View style={styles.datePickerContent}>
                      <Icon name="calendar" size={22} color={COLORS.primary} style={styles.dateIcon} />
                      <Text style={styles.datePickerText}>
                        {lastOilChangeDate.toLocaleDateString('ar', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {showDatePickerComponent()}
                  
                  <Input
                    label="العامل"
                    value={serviceWorker}
                    onChangeText={(text: string) => {
                      setServiceWorker(text);
                    }}
                    placeholder="اسم العامل الذي قام بالصيانة"
                    icon="account-wrench"
                  />
                  
                  <Input
                    label="قراءة العداد"
                    value={currentMileage}
                    onChangeText={(text) => {
                      setCurrentMileage(text);
                      if (errors.currentMileage) {
                        setErrors({ ...errors, currentMileage: '' });
                      }
                    }}
                    error={errors.currentMileage}
                    keyboardType="numeric"
                    icon="speedometer"
                    placeholder="أدخل قراءة العداد الحالية بالكيلومترات"
                  />
                  
                  <View style={styles.dropdownContainer}>
                    <Text style={styles.dropdownLabel}>نوع الزيت</Text>
                    {!showCustomOilType ? (
                      <>
                        <TouchableOpacity 
                          style={[
                            styles.dropdownButton,
                            errors.oilType ? styles.errorInput : null
                          ]}
                          onPress={() => setShowOilTypeDropdown(true)}
                        >
                          <Icon name="oil" size={22} color={errors.oilType ? '#FF3B30' : COLORS.primary} style={styles.dropdownIcon} />
                          <Text style={styles.dropdownButtonText}>
                            {oilType || 'اختر نوع الزيت'}
                          </Text>
                          <Icon name="chevron-down" size={22} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setShowCustomOilType(true)}
                          style={styles.addCustomButton}
                        >
                          <Text style={styles.addCustomText}>إضافة نوع مخصص</Text>
                          <Icon name="plus-circle-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.customInputContainer}>
                        <TextInput
                          style={[styles.customInput, errors.oilType ? styles.errorInput : null]}
                          value={customOilType}
                          onChangeText={setCustomOilType}
                          placeholder="أدخل نوع الزيت المخصص"
                          placeholderTextColor="#999"
                        />
                        <TouchableOpacity 
                          onPress={() => {
                            setShowCustomOilType(false);
                            setCustomOilType('');
                          }}
                          style={styles.cancelCustomButton}
                        >
                          <Icon name="close-circle" size={24} color="#999" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {errors.oilType ? <Text style={styles.errorText}>{errors.oilType}</Text> : null}
                  </View>
                  
                  <View style={styles.dropdownContainer}>
                    <Text style={styles.dropdownLabel}>تصنيف الزيت</Text>
                    {!showCustomOilGrade ? (
                      <>
                        <TouchableOpacity 
                          style={[
                            styles.dropdownButton,
                            errors.oilGrade ? styles.errorInput : null
                          ]}
                          onPress={() => setShowOilGradeDropdown(true)}
                        >
                          <Icon name="label" size={22} color={errors.oilGrade ? '#FF3B30' : COLORS.primary} style={styles.dropdownIcon} />
                          <Text style={styles.dropdownButtonText}>
                            {oilGrade || 'اختر تصنيف الزيت'}
                          </Text>
                          <Icon name="chevron-down" size={22} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setShowCustomOilGrade(true)}
                          style={styles.addCustomButton}
                        >
                          <Text style={styles.addCustomText}>إضافة تصنيف مخصص</Text>
                          <Icon name="plus-circle-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.customInputContainer}>
                        <TextInput
                          style={[styles.customInput, errors.oilGrade ? styles.errorInput : null]}
                          value={customOilGrade}
                          onChangeText={setCustomOilGrade}
                          placeholder="أدخل تصنيف الزيت المخصص (مثل 5W-30)"
                          placeholderTextColor="#999"
                        />
                        <TouchableOpacity 
                          onPress={() => {
                            setShowCustomOilGrade(false);
                            setCustomOilGrade('');
                          }}
                          style={styles.cancelCustomButton}
                        >
                          <Icon name="close-circle" size={24} color="#999" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {errors.oilGrade ? <Text style={styles.errorText}>{errors.oilGrade}</Text> : null}
                  </View>
                  
                  <Input
                    label="قراءة العداد للصيانة القادمة"
                    value={nextServiceMileage}
                    onChangeText={(text: string) => {
                      setNextServiceMileage(text);
                      if (errors.nextServiceMileage) {
                        setErrors({ ...errors, nextServiceMileage: '' });
                      }
                    }}
                    placeholder="أدخل القراءة المتوقعة للصيانة القادمة"
                    keyboardType="numeric"
                    icon="map-marker-distance"
                    error={errors.nextServiceMileage}
                  />
                  
                  <Text style={styles.filtersTitle}>الفلاتر</Text>
                  
                  <View style={styles.filtersContainer}>
                    <TouchableOpacity 
                      style={styles.filterOption}
                      onPress={() => setOilFilterChanged(!oilFilterChanged)}
                    >
                      <View style={[styles.checkbox, oilFilterChanged && styles.checkboxChecked]}>
                        {oilFilterChanged && <Icon name="check" size={16} color="#FFF" />}
                      </View>
                      <View style={styles.filterContent}>
                        <Text style={styles.filterText}>فلتر زيت</Text>
                        <Text style={styles.filterDesc}>يعمل على تنقية الزيت من الشوائب</Text>
                      </View>
                      <Icon name="filter-variant" size={22} color={oilFilterChanged ? COLORS.primary : "#888"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.filterOption}
                      onPress={() => setAirFilterChanged(!airFilterChanged)}
                    >
                      <View style={[styles.checkbox, airFilterChanged && styles.checkboxChecked]}>
                        {airFilterChanged && <Icon name="check" size={16} color="#FFF" />}
                      </View>
                      <View style={styles.filterContent}>
                        <Text style={styles.filterText}>فلتر هواء</Text>
                        <Text style={styles.filterDesc}>يحافظ على نقاء الهواء الداخل للمحرك</Text>
                      </View>
                      <Icon name="air-filter" size={22} color={airFilterChanged ? COLORS.primary : "#888"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.filterOption}
                      onPress={() => setCabinFilterChanged(!cabinFilterChanged)}
                    >
                      <View style={[styles.checkbox, cabinFilterChanged && styles.checkboxChecked]}>
                        {cabinFilterChanged && <Icon name="check" size={16} color="#FFF" />}
                      </View>
                      <View style={styles.filterContent}>
                        <Text style={styles.filterText}>فلتر مكيف</Text>
                        <Text style={styles.filterDesc}>يعمل على تنقية الهواء داخل المقصورة</Text>
                      </View>
                      <Icon name="air-conditioner" size={22} color={cabinFilterChanged ? COLORS.primary : "#888"} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.navigationButtons}>
                    <TouchableOpacity
                      style={[styles.navigationButton, styles.backButton2]}
                      onPress={() => handleSectionChange('carInfo')}
                    >
                      <Icon name="arrow-right" size={20} color={COLORS.primary} />
                      <Text style={styles.backButtonText}>رجوع</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.navigationButton, styles.nextBtn]}
                      onPress={() => handleSectionChange('additionalInfo')}
                    >
                      <Text style={styles.nextBtnText}>التالي</Text>
                      <Icon name="arrow-left" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}

              {activeSection === 'additionalInfo' && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <Text style={styles.sectionTitle}>معلومات إضافية</Text>
                  
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => setShowNextDatePicker(true)}
                  >
                    <Text style={styles.datePickerLabel}>موعد تذكير تغيير الزيت</Text>
                    <View style={styles.datePickerContent}>
                      <Icon name="bell-ring-outline" size={22} color={COLORS.primary} style={styles.dateIcon} />
                      <Text style={styles.datePickerText}>
                        {nextOilChangeDate.toLocaleDateString('ar', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.reminderBoxContainer}>
                    <View style={styles.whatsappRow}>
                      <Icon name="whatsapp" size={20} color="#25D366" style={styles.whatsappIcon} />
                      <Text style={styles.whatsappText}>رسالة واتساب</Text>
                    </View>
                    <Text style={styles.reminderText}>
                      سيتم إرسال رسالة تذكير بموعد الصيانة
                    </Text>
                  </View>
                  
                  {showNextDatePickerComponent()}
                  
                  <View style={styles.whatsappContainer}>
                    <Text style={styles.datePickerLabel}>رقم واتساب العميل</Text>
                    <View style={styles.whatsappInputRow}>
                      <View style={styles.countryCodeContainer}>
                        <TextInput
                          style={styles.countryCodeInput}
                          value={countryCode}
                          onChangeText={setCountryCode}
                          placeholder="+966"
                          keyboardType="phone-pad"
                        />
                      </View>
                      <View style={styles.whatsappNumberContainer}>
                        <TextInput
                          style={styles.whatsappNumberInput}
                          value={whatsappNumber}
                          onChangeText={setWhatsappNumber}
                          placeholder="5xxxxxxxx"
                          keyboardType="phone-pad"
                        />
                        <Icon name="whatsapp" size={24} color="#25D366" />
                      </View>
                    </View>
                    <Text style={[styles.reminderText, {flexShrink: 1}]}>
                      أدخل رقم واتساب العميل لإرسال رسالة تذكير (اختياري)
                    </Text>
                  </View>
                  
                  <Input
                    label="لون السيارة"
                    value={carColor}
                    onChangeText={(text: string) => {
                      setCarColor(text);
                    }}
                    placeholder="مثال: أبيض، أسود، أحمر"
                    icon="palette"
                  />
                  
                  <Input
                    label="رقم الشاصي"
                    value={chassisNumber}
                    onChangeText={(text: string) => {
                      setChassisNumber(text);
                    }}
                    placeholder="أدخل رقم الشاصي (اختياري)"
                    icon="car-info"
                  />
                  
                  <Input
                    label="ملاحظات"
                    value={maintenanceNotes}
                    onChangeText={(text: string) => {
                      setMaintenanceNotes(text);
                    }}
                    placeholder="أي ملاحظات إضافية عن السيارة أو الصيانة"
                    icon="note-text"
                  />
                  
                  <View style={styles.navigationButtons}>
                    <TouchableOpacity
                      style={[styles.navigationButton, styles.backButton2]}
                      onPress={() => handleSectionChange('oilInfo')}
                    >
                      <Icon name="arrow-right" size={20} color={COLORS.primary} />
                      <Text style={styles.backButtonText}>رجوع</Text>
                    </TouchableOpacity>
                    
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                      <TouchableOpacity
                        style={[styles.navigationButton, styles.saveButton]}
                        onPress={() => {
                          animatePress(buttonScale);
                          handleSubmit();
                        }}
                      >
                        <Text style={styles.nextBtnText}>حفظ السيارة</Text>
                        <Icon name="check" size={20} color="#FFF" />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </Animated.View>
              )}
        </ScrollView>
          )}
      </KeyboardAvoidingView>
      </Animated.View>

      {/* Dropdown Modals */}
      <Modal
        visible={showOilTypeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOilTypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOilTypeDropdown(false)}
        >
          <View style={styles.dropdownModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownModalTitle}>اختر نوع الزيت</Text>
            
            {oilTypes.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Icon name="oil" size={40} color="#ccc" />
                <Text style={styles.emptyListText}>لا توجد أنواع زيوت</Text>
    </View>
            ) : (
              <FlatList
                data={oilTypes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setOilType(item.name);
                      setShowOilTypeDropdown(false);
                      if (errors.oilType) {
                        setErrors({ ...errors, oilType: '' });
                      }
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    {oilType === item.name && (
                      <Icon name="check" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.dropdownList}
              />
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOilTypeDropdown(false)}
            >
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      <Modal
        visible={showOilGradeDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOilGradeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOilGradeDropdown(false)}
        >
          <View style={styles.dropdownModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownModalTitle}>اختر تصنيف الزيت</Text>
            
            {oilCategories.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Icon name="label" size={40} color="#ccc" />
                <Text style={styles.emptyListText}>لا توجد تصنيفات زيوت</Text>
              </View>
            ) : (
              <FlatList
                data={oilCategories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setOilGrade(item.name);
                      setShowOilGradeDropdown(false);
                      if (errors.oilGrade) {
                        setErrors({ ...errors, oilGrade: '' });
                      }
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    {oilGrade === item.name && (
                      <Icon name="check" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.dropdownList}
              />
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOilGradeDropdown(false)}
            >
              <Text style={styles.closeButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
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
  },
  backButton: {
    padding: 8,
  },
  rightPlaceholder: {
    width: 40,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    color: COLORS.primary,
    textAlign: 'right',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: COLORS.primary,
    textAlign: 'right',
  },
  divider: {
    marginVertical: SPACING.md,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  activeProgressStep: {
    transform: [{scale: 1.05}],
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeProgressCircle: {
    backgroundColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  activeProgressNumber: {
    color: '#fff',
  },
  progressText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filtersContainer: {
    marginTop: 5,
    marginBottom: 20,
  },
  filterOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 8,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterContent: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'flex-end', // RTL support
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5, // RTL support
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    textAlign: 'right',
  },
  filterDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textAlign: 'right',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  navigationButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton2: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 15,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  qrScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qrTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.primary,
    textAlign: 'right',
  },
  qrDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  qrIdText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginTop: 8,
    textAlign: 'right',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  scanButton: {
    padding: 15,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  dropdownButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: COLORS.primary,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    textAlign: 'right',
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyListText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  closeButton: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorInput: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    marginRight: 15,
    textAlign: 'right',
  },
  datePickerButton: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    textAlign: 'right',
  },
  datePickerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  dateIcon: {
    marginLeft: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  addCustomButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  addCustomText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 5,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    padding: 10,
  },
  cancelCustomButton: {
    padding: 5,
  },
  webDatePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderBoxContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    marginBottom: 15,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    justifyContent: 'flex-end',
  },
  whatsappText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
    marginRight: 8,
  },
  whatsappIcon: {
    marginLeft: 8,
  },
  reminderText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  whatsappContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  whatsappInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  countryCodeContainer: {
    width: 80,
    marginRight: 10,
  },
  countryCodeInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  whatsappNumberContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  whatsappNumberInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
}); 
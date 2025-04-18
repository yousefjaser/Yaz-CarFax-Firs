// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Image, SafeAreaView, StatusBar, Animated, Easing, Platform } from 'react-native';
import { Text, Appbar, TextInput, Button, Divider, Surface, Checkbox, RadioButton, Menu, Chip } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const SERVICE_TYPES = [
  { id: 1, name: 'تغيير زيت', icon: 'oil' },
  { id: 2, name: 'فلتر هواء', icon: 'air-filter' },
  { id: 3, name: 'فحص فرامل', icon: 'car-brake-abs' },
  { id: 4, name: 'تغيير إطارات', icon: 'tire' },
  { id: 5, name: 'صيانة دورية', icon: 'wrench' },
  { id: 7, name: 'تغيير بطارية', icon: 'car-battery' },
  { id: 8, name: 'فحص كهرباء', icon: 'flash' },
  { id: 9, name: 'صيانة تكييف', icon: 'air-conditioner' },
  { id: 10, name: 'تغيير سيور', icon: 'sync' },
  { id: 11, name: 'فحص محرك', icon: 'engine' },
  { id: 12, name: 'فحص كمبيوتر', icon: 'chip' },
  { id: 6, name: 'أخرى', icon: 'cog' },
];

const OIL_TYPES = [
  'Castrol EDGE (سينثتك)',
  'Castrol Magnatec (نصف سينثتك)',
  'Mobil 1 (سينثتك)',
  'Mobil Super (نصف سينثتك)',
  'Shell Helix Ultra (سينثتك)',
  'Shell Helix HX7 (نصف سينثتك)',
  'Total Quartz (سينثتك)',
  'Valvoline (سينثتك)',
  'Havoline (نصف سينثتك)',
  'Pennzoil (سينثتك)',
  'زيت عادي',
  'زيت اصطناعي - سينثتك',
  'زيت نصف اصطناعي',
  'زيت آخر'
];

const OIL_GRADES = [
  '0W-20',
  '0W-30',
  '5W-20',
  '5W-30',
  '5W-40',
  '10W-30',
  '10W-40',
  '15W-40',
  '20W-50',
  '0W-16',
  '5W-50',
  'أخرى'
];

export default function AddServiceVisitScreen() {
  const router = useRouter();
  const { carId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [car, setCar] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  
  // تأثيرات الحركة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // بيانات الصيانة
  const [date, setDate] = useState<Date>(new Date());
  const [serviceType, setServiceType] = useState(1); // القيمة الافتراضية: تغيير زيت
  const [selectedServices, setSelectedServices] = useState<number[]>([1]); // إضافة دعم لأنواع متعددة من الصيانة
  const [odometer, setOdometer] = useState('');
  const [isOdometerVerified, setIsOdometerVerified] = useState(false); // حالة التحقق من قراءة العداد
  const [nextServiceOdometer, setNextServiceOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [customPrice, setCustomPrice] = useState<Record<number, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceDetails, setCustomServiceDetails] = useState('');
  
  // بيانات تغيير الزيت (تظهر فقط إذا كان نوع الصيانة هو تغيير زيت)
  const [oilType, setOilType] = useState('');
  const [oilGrade, setOilGrade] = useState('');
  const [customOilType, setCustomOilType] = useState('');
  const [customOilGrade, setCustomOilGrade] = useState('');
  
  // حالة الفلاتر (تظهر فقط في حالات معينة)
  const [oilFilterChanged, setOilFilterChanged] = useState(true);
  const [airFilterChanged, setAirFilterChanged] = useState(false);
  const [cabinFilterChanged, setCabinFilterChanged] = useState(false);
  const [fuelFilterChanged, setFuelFilterChanged] = useState(false);  // فلتر بنزين
  const [dieselFilterChanged, setDieselFilterChanged] = useState(false);  // فلتر سولار
  
  // إضافة state لقوائم الزيت
  const [oilTypeMenu, setOilTypeMenu] = useState(false);
  const [oilGradeMenu, setOilGradeMenu] = useState(false);
  
  // إضافة المزيد من الحقول المخصصة
  const [serviceNotes, setServiceNotes] = useState<Record<number, string>>({});
  const [additionalDetails, setAdditionalDetails] = useState('');
  
  useEffect(() => {
    loadShopData();
    if (carId) {
      loadCarData();
    }

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
  }, [carId]);
  
  useEffect(() => {
    // زيادة العداد القادم بناءً على نوع الصيانة ونوع الزيت
    if (odometer) {
      const currentOdometer = parseInt(odometer) || 0;
      let interval = 5000; // القيمة الافتراضية
      
      // تحديد أعلى مسافة صيانة من بين الأنواع المختارة
      let maxInterval = 0;
      
      selectedServices.forEach(sType => {
        let typeInterval = 5000;
        
        // تحديد الفاصل بناءً على نوع الصيانة
        switch (sType) {
          case 1: // تغيير زيت
            // تحديد المسافة حسب نوع الزيت
            if (oilType.toLowerCase().includes('synthetic') || 
                oilType.toLowerCase().includes('سينثتك') ||
                oilType.toLowerCase().includes('اصطناعي')) {
              typeInterval = 7000; // زيت اصطناعي
            } else if (oilType.toLowerCase().includes('semi') || 
                       oilType.toLowerCase().includes('نصف')) {
              typeInterval = 5000; // زيت نصف اصطناعي
            } else {
              typeInterval = 3000; // زيت عادي
            }
            break;
          case 2: // فلتر هواء
            typeInterval = 15000;
            break;
          case 3: // فحص فرامل
            typeInterval = 10000;
            break;
          case 4: // تغيير إطارات
            typeInterval = 40000;
            break;
          case 5: // صيانة دورية
            typeInterval = 10000;
            break;
          case 7: // تغيير بطارية
            typeInterval = 30000;
            break;
          case 8: // فحص كهرباء
            typeInterval = 15000;
            break;
          case 9: // صيانة تكييف
            typeInterval = 20000;
            break;
          case 10: // تغيير سيور
            typeInterval = 50000;
            break;
          case 11: // فحص محرك
            typeInterval = 10000;
            break;
          case 12: // فحص كمبيوتر
            typeInterval = 15000;
            break;
          default:
            typeInterval = 5000;
        }
        
        // تحديث أعلى مسافة
        if (typeInterval > maxInterval) {
          maxInterval = typeInterval;
        }
      });
      
      // استخدام أعلى مسافة لحساب موعد الصيانة القادمة
      setNextServiceOdometer((currentOdometer + (maxInterval > 0 ? maxInterval : interval)).toString());
    }
  }, [selectedServices, odometer, oilType]);
  
  const loadShopData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setShop(data);
    } catch (error) {
      console.error('فشل في تحميل بيانات المحل:', error);
    }
  };
  
  const loadCarData = async () => {
    try {
      const { data, error } = await supabase
        .from('cars_new')
        .select(`
          *,
          customer:customer_id (
            id,
            name,
            phone
          )
        `)
        .eq('qr_id', carId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setCar(data);
        if (data.current_odometer) {
          setOdometer(data.current_odometer.toString());
          // حساب العداد للتغيير القادم (+5000 كم)
          const nextOdo = parseInt(data.current_odometer) + 5000;
          setNextServiceOdometer(nextOdo.toString());
        }
        
        // استخدام البيانات السابقة للزيت إن وجدت
        if (data.oil_type) setOilType(data.oil_type);
        if (data.oil_grade) setOilGrade(data.oil_grade);
      }
      
    } catch (error) {
      console.error('فشل في تحميل بيانات السيارة:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات السيارة');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const formatDate = (date: Date) => {
    // تنسيق التاريخ بالصيغة الميلادية (يوم/شهر/سنة)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };
  
  const validateForm = () => {
    if (!odometer.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال قراءة العداد الحالية');
      return false;
    }
    
    if (selectedServices.includes(1) && !oilType.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال نوع الزيت');
      return false;
    }
    
    if (!nextServiceOdometer.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال قراءة العداد للصيانة القادمة');
      return false;
    }
    
    if (selectedServices.includes(6) && !customServiceName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال نوع الصيانة المخصصة');
      return false;
    }
    
    return true;
  };
  
  const getServiceTypeName = () => {
    if (selectedServices.length === 1 && selectedServices[0] === 6) {
      return customServiceName;
    }
    
    const serviceNames = selectedServices.map(id => {
      if (id === 6) return customServiceName;
      const selectedService = SERVICE_TYPES.find(s => s.id === id);
      return selectedService ? selectedService.name : '';
    });
    
    return serviceNames.filter(Boolean).join(' + ');
  };
  
  const handleServiceToggle = (serviceId: number) => {
    if (selectedServices.includes(serviceId)) {
      // إزالة الخدمة إذا كانت موجودة بالفعل
      if (selectedServices.length > 1) { // لا تسمح بإزالة جميع الخدمات
        setSelectedServices(selectedServices.filter(id => id !== serviceId));
      }
    } else {
      // إضافة الخدمة إذا لم تكن موجودة
      setSelectedServices([...selectedServices, serviceId]);
    }
  };
  
  const handleSubmit = async () => {
    if (!validateForm() || !car || !shop) return;
    
    setSubmitting(true);
    
    try {
      // تحديث بيانات السيارة في جدول cars_new
      const updateData = {
        current_odometer: odometer,
        next_service_mileage: nextServiceOdometer,
        updated_at: new Date().toISOString(),
        odometer_verified: isOdometerVerified // إضافة حالة التحقق من قراءة العداد
      };
      
      // إذا كان النوع هو تغيير زيت، أضف بيانات الزيت
      if (selectedServices.includes(1)) {
        updateData.last_oil_change_date = date.toISOString();
        updateData.last_oil_change_odometer = odometer;
        updateData.next_oil_change_odometer = nextServiceOdometer;
        updateData.oil_type = oilType === 'زيت آخر' ? customOilType : oilType;
        updateData.oil_grade = oilGrade === 'أخرى' ? customOilGrade : oilGrade;
        updateData.oil_filter_changed = oilFilterChanged;
      }
      
      // إذا كان النوع هو فلتر هواء، حدث حالة الفلتر
      if (selectedServices.includes(2)) {
        updateData.air_filter_changed = true;
      }
      
      const { error: updateError } = await supabase
        .from('cars_new')
        .update(updateData)
        .eq('qr_id', car.qr_id);
      
      if (updateError) throw updateError;
      
      // إضافة سجل الصيانة في جدول service_visits
      const visitData = {
        car_id: car.qr_id, // استخدام qr_id مباشرة من cars_new
        shop_id: shop.id,
        visit_date: date.toISOString(),
        service_type: getServiceTypeName(),
        mileage: odometer,
        next_service_mileage: nextServiceOdometer,
        cost: price ? parseFloat(price) : 0,
        notes: notes.trim() || null,
        oil_type: selectedServices.includes(1) ? (oilType === 'زيت آخر' ? customOilType : oilType) : null,
        oil_grade: selectedServices.includes(1) ? (oilGrade === 'أخرى' ? customOilGrade : oilGrade) : null,
        oil_filter_changed: selectedServices.includes(1) ? oilFilterChanged : null,
        air_filter_changed: selectedServices.includes(2) ? true : (selectedServices.includes(1) ? airFilterChanged : null),
        cabin_filter_changed: selectedServices.includes(1) ? cabinFilterChanged : null,
        fuel_filter_changed: selectedServices.includes(1) ? fuelFilterChanged : null,
        diesel_filter_changed: selectedServices.includes(1) ? dieselFilterChanged : null,
        service_category_id: selectedServices.length === 1 && selectedServices[0] !== 6 ? selectedServices[0] : null,
        additional_details: additionalDetails || null,
        description: getServiceTypeName() + (notes.trim() ? ` - ${notes.trim()}` : ''),
        odometer_verified: isOdometerVerified // إضافة حالة التحقق من قراءة العداد
      };
      
      const { error: visitError } = await supabase
        .from('service_visits')
        .insert(visitData);
      
      if (visitError) throw visitError;
      
      Alert.alert(
        'تم بنجاح',
        'تم تسجيل الصيانة بنجاح',
        [
          {
            text: 'العودة إلى تفاصيل السيارة',
            onPress: () => router.replace(`/shop/public/car/${car.qr_id}`)
          }
        ]
      );
      
    } catch (error) {
      console.error('فشل في تسجيل الصيانة:', error);
      Alert.alert('خطأ', 'فشل في تسجيل الصيانة. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Loading fullScreen message="جاري تحميل بيانات السيارة..." />;
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
        <Text style={styles.headerTitle}>إضافة صيانة جديدة</Text>
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <Surface style={styles.carInfoCard}>
            <View style={styles.cardBanner}>
              <Icon name="car" size={28} color="#fff" />
              <Text style={styles.bannerTitle}>بيانات السيارة</Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.carInfoRow}>
                <View style={styles.carInfoItem}>
                  <Text style={styles.carInfoLabel}>الطراز:</Text>
                  <Text style={styles.carInfoValue}>{car?.make} {car?.model}</Text>
                </View>
                
                <View style={styles.carInfoItem}>
                  <Text style={styles.carInfoLabel}>رقم اللوحة:</Text>
                  <Text style={styles.carInfoValue}>{car?.plate_number}</Text>
                </View>
              </View>
              
              <View style={styles.carInfoRow}>
                <View style={styles.carInfoItem}>
                  <Text style={styles.carInfoLabel}>العميل:</Text>
                  <Text style={styles.carInfoValue}>{car?.customer?.name || 'غير معروف'}</Text>
                </View>
                
                <View style={styles.carInfoItem}>
                  <Text style={styles.carInfoLabel}>آخر قراءة عداد:</Text>
                  <Text style={styles.carInfoValue}>
                    {car?.current_odometer ? `${car.current_odometer} كم` : 'لا يوجد'}
                  </Text>
                </View>
              </View>
              
              {car?.year && (
                <View style={styles.carInfoRow}>
                  <View style={styles.carInfoItem}>
                    <Text style={styles.carInfoLabel}>سنة الصنع:</Text>
                    <Text style={styles.carInfoValue}>{car.year}</Text>
                  </View>
                  
                  <View style={styles.carInfoItem}>
                    <Text style={styles.carInfoLabel}>اللون:</Text>
                    <Text style={styles.carInfoValue}>{car.color || 'غير محدد'}</Text>
                  </View>
                </View>
              )}
            </View>
          </Surface>
          
          <Surface style={styles.formCard}>
            <View style={styles.cardBanner}>
              <Icon name="wrench" size={28} color="#fff" />
              <Text style={styles.bannerTitle}>تفاصيل الصيانة</Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>تاريخ الصيانة:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <Icon name="calendar" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.sectionTitle}>أنواع الصيانة:</Text>
                <Text style={styles.sectionSubtitle}>اختر نوع أو أكثر من أنواع الصيانة</Text>
                
                <View style={styles.servicesGrid}>
                  {SERVICE_TYPES.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceItem,
                        selectedServices.includes(service.id) && styles.serviceItemSelected
                      ]}
                      onPress={() => handleServiceToggle(service.id)}
                    >
                      <Icon
                        name={service.icon}
                        size={28}
                        color={selectedServices.includes(service.id) ? '#fff' : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.serviceItemText,
                          selectedServices.includes(service.id) && styles.serviceItemTextSelected
                        ]}
                      >
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {selectedServices.includes(6) && (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>وصف الصيانة المخصصة:</Text>
                  <TextInput
                    mode="outlined"
                    value={customServiceName}
                    onChangeText={setCustomServiceName}
                    placeholder="أدخل نوع الصيانة المخصصة"
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    value={customServiceDetails}
                    onChangeText={setCustomServiceDetails}
                    placeholder="تفاصيل إضافية (اختياري)"
                    multiline
                    numberOfLines={2}
                    style={[styles.input, { marginTop: 8 }]}
                  />
                </View>
              )}
              
              <View style={styles.formGroup}>
                <View style={styles.rowWithCheck}>
                  <Text style={styles.inputLabel}>قراءة العداد الحالية:</Text>
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      status={isOdometerVerified ? 'checked' : 'unchecked'}
                      onPress={() => setIsOdometerVerified(!isOdometerVerified)}
                      color={COLORS.primary}
                    />
                    <Text style={styles.checkboxLabel}>تم التحقق من القراءة</Text>
                  </View>
                </View>
                <TextInput
                  mode="outlined"
                  value={odometer}
                  onChangeText={setOdometer}
                  keyboardType="numeric"
                  placeholder="أدخل قراءة العداد"
                  right={<TextInput.Affix text="كم" />}
                  style={styles.input}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>قراءة العداد للصيانة القادمة:</Text>
                <TextInput
                  mode="outlined"
                  value={nextServiceOdometer}
                  onChangeText={setNextServiceOdometer}
                  keyboardType="numeric"
                  placeholder="أدخل قراءة العداد للصيانة القادمة"
                  right={<TextInput.Affix text="كم" />}
                  style={styles.input}
                />
                <View style={styles.intervalInfo}>
                  <Icon name="information-outline" size={18} color={COLORS.primary} style={{marginLeft: 5}} />
                  <Text style={styles.intervalText}>
                    تم حساب المسافة تلقائيًا بناءً على نوع الصيانة المختار
                  </Text>
                </View>
              </View>
              
              {/* قسم الزيت يظهر فقط عند اختيار "تغيير زيت" */}
              {selectedServices.includes(1) && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionDivider}>
                    <Icon name="oil" size={20} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>بيانات الزيت</Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>نوع الزيت:</Text>
                    <Menu
                      visible={!!oilTypeMenu}
                      onDismiss={() => setOilTypeMenu(false)}
                      anchor={
                        <TouchableOpacity 
                          style={styles.dropdownButton}
                          onPress={() => setOilTypeMenu(true)}
                        >
                          <View style={styles.dropdownContent}>
                            <Text style={styles.serviceTypeText}>
                              {oilType || 'اختر نوع الزيت'}
                            </Text>
                          </View>
                          <Icon name="chevron-down" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                      }
                    >
                      {OIL_TYPES.map((oil) => (
                        <Menu.Item
                          key={oil}
                          title={oil}
                          onPress={() => {
                            setOilType(oil);
                            setOilTypeMenu(false);
                          }}
                        />
                      ))}
                    </Menu>
                    
                    {oilType === 'زيت آخر' && (
                      <TextInput
                        mode="outlined"
                        value={customOilType}
                        onChangeText={setCustomOilType}
                        placeholder="أدخل نوع الزيت المخصص"
                        style={[styles.input, { marginTop: 8 }]}
                      />
                    )}
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>تصنيف الزيت:</Text>
                    <Menu
                      visible={!!oilGradeMenu}
                      onDismiss={() => setOilGradeMenu(false)}
                      anchor={
                        <TouchableOpacity 
                          style={styles.dropdownButton}
                          onPress={() => setOilGradeMenu(true)}
                        >
                          <View style={styles.dropdownContent}>
                            <Text style={styles.serviceTypeText}>
                              {oilGrade || 'اختر تصنيف الزيت'}
                            </Text>
                          </View>
                          <Icon name="chevron-down" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                      }
                    >
                      {OIL_GRADES.map((grade) => (
                        <Menu.Item
                          key={grade}
                          title={grade}
                          onPress={() => {
                            setOilGrade(grade);
                            setOilGradeMenu(false);
                          }}
                        />
                      ))}
                    </Menu>
                    
                    {oilGrade === 'أخرى' && (
                      <TextInput
                        mode="outlined"
                        value={customOilGrade}
                        onChangeText={setCustomOilGrade}
                        placeholder="أدخل تصنيف الزيت المخصص"
                        style={[styles.input, { marginTop: 8 }]}
                      />
                    )}
                    
                    <Text style={styles.infoHint}>* يؤثر نوع الزيت على حساب العداد القادم</Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.sectionSubtitle}>الفلاتر المغيرة:</Text>
                    
                    <View style={styles.filtersGrid}>
                      <TouchableOpacity 
                        style={[styles.filterBox, oilFilterChanged && styles.filterBoxSelected]} 
                        onPress={() => setOilFilterChanged(!oilFilterChanged)}
                      >
                        <Icon 
                          name="oil" 
                          size={24} 
                          color={oilFilterChanged ? '#fff' : COLORS.primary} 
                        />
                        <Text style={[styles.filterBoxText, oilFilterChanged && styles.filterBoxTextSelected]}>
                          فلتر زيت
                        </Text>
                        <View style={[styles.checkCircle, oilFilterChanged && styles.checkCircleSelected]}>
                          {oilFilterChanged && <Icon name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.filterBox, airFilterChanged && styles.filterBoxSelected]} 
                        onPress={() => setAirFilterChanged(!airFilterChanged)}
                      >
                        <Icon 
                          name="air-filter" 
                          size={24} 
                          color={airFilterChanged ? '#fff' : COLORS.primary} 
                        />
                        <Text style={[styles.filterBoxText, airFilterChanged && styles.filterBoxTextSelected]}>
                          فلتر هواء
                        </Text>
                        <View style={[styles.checkCircle, airFilterChanged && styles.checkCircleSelected]}>
                          {airFilterChanged && <Icon name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.filterBox, cabinFilterChanged && styles.filterBoxSelected]} 
                        onPress={() => setCabinFilterChanged(!cabinFilterChanged)}
                      >
                        <Icon 
                          name="air-conditioner" 
                          size={24} 
                          color={cabinFilterChanged ? '#fff' : COLORS.primary} 
                        />
                        <Text style={[styles.filterBoxText, cabinFilterChanged && styles.filterBoxTextSelected]}>
                          فلتر مكيف
                        </Text>
                        <View style={[styles.checkCircle, cabinFilterChanged && styles.checkCircleSelected]}>
                          {cabinFilterChanged && <Icon name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.filterBox, fuelFilterChanged && styles.filterBoxSelected]} 
                        onPress={() => setFuelFilterChanged(!fuelFilterChanged)}
                      >
                        <Icon 
                          name="gas-station" 
                          size={24} 
                          color={fuelFilterChanged ? '#fff' : COLORS.primary} 
                        />
                        <Text style={[styles.filterBoxText, fuelFilterChanged && styles.filterBoxTextSelected]}>
                          فلتر بنزين
                        </Text>
                        <View style={[styles.checkCircle, fuelFilterChanged && styles.checkCircleSelected]}>
                          {fuelFilterChanged && <Icon name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.filterBox, dieselFilterChanged && styles.filterBoxSelected]} 
                        onPress={() => setDieselFilterChanged(!dieselFilterChanged)}
                      >
                        <Icon 
                          name="fuel" 
                          size={24} 
                          color={dieselFilterChanged ? '#fff' : COLORS.primary} 
                        />
                        <Text style={[styles.filterBoxText, dieselFilterChanged && styles.filterBoxTextSelected]}>
                          فلتر سولار
                        </Text>
                        <View style={[styles.checkCircle, dieselFilterChanged && styles.checkCircleSelected]}>
                          {dieselFilterChanged && <Icon name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>تكلفة الخدمة:</Text>
                <TextInput
                  mode="outlined"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="أدخل التكلفة الإجمالية"
                  right={<TextInput.Affix text="₪" />}
                  style={styles.input}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>ملاحظات إضافية:</Text>
                <TextInput
                  mode="outlined"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="أدخل أي ملاحظات إضافية عن الصيانة"
                  multiline
                  numberOfLines={5}
                  style={styles.textArea}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>تفاصيل فنية (اختياري):</Text>
                <TextInput
                  mode="outlined"
                  value={additionalDetails}
                  onChangeText={setAdditionalDetails}
                  placeholder="أدخل تفاصيل فنية إضافية عن الخدمة المقدمة"
                  multiline
                  numberOfLines={3}
                  style={styles.textArea}
                />
              </View>
            </View>
          </Surface>
            
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonLabel}>حفظ الصيانة</Text>
                <Icon name="check-circle" size={22} color="#fff" style={{marginRight: 8}} />
              </View>
            )}
          </TouchableOpacity>
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
  header: {
    backgroundColor: COLORS.primary,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.xl,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  rightPlaceholder: {
    width: 40,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    paddingTop: 15,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  carInfoCard: {
    marginBottom: SPACING.md,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    color: '#fff',
  },
  cardContent: {
    padding: SPACING.md,
    backgroundColor: '#fff',
  },
  carInfoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  carInfoItem: {
    flex: 1,
  },
  carInfoLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  carInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: SPACING.md,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  textArea: {
    backgroundColor: COLORS.white,
    minHeight: 100,
    borderRadius: 10,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    marginLeft: SPACING.md,
  },
  serviceTypeText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionContainer: {
    backgroundColor: '#f9f9f9',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  oilSection: {
    backgroundColor: '#f9f9f9',
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filtersGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: SPACING.xs,
  },
  filterLabel: {
    fontSize: 16,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
    paddingVertical: 15,
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  infoHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  intervalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  intervalText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    padding: SPACING.sm,
  },
  serviceItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  serviceItemText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.dark,
  },
  serviceItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filtersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  filterBox: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    padding: SPACING.md,
    paddingVertical: 15,
  },
  filterBoxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    elevation: 4,
  },
  filterBoxText: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.dark,
    marginTop: 5,
  },
  filterBoxTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: '#fff',
  },
  checkCircleSelected: {
    borderColor: '#fff',
    backgroundColor: '#4CAF50',
  },
  rowWithCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e6f2ff',
  },
  checkboxLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
}); 
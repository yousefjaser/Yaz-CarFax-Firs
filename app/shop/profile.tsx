// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  Platform, 
  StatusBar,
  Linking,
  Alert,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { 
  uploadToCloudinary, 
  pickImage, 
  takePicture, 
  getBannerImageUrl, 
  getProfileImageUrl 
} from '../services/cloudinary';

// إضافة polyfill للـ crypto.getRandomValues لحل مشكلة uuid
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

const { width, height } = Dimensions.get('window');

// دالة للحصول على المفتاح الصحيح حسب المنصة
// إزالة هذه الدالة لأننا لن نستخدم Google Maps API بعد الآن
// const getGoogleMapsApiKey = () => {
//   return 'AIzaSyAWp1chILdfMqIjFk8uWXmPkaUTVKY1NHI'; // استخدام مفتاح ويب موحد لجميع المنصات
// };

// استخدام الدالة للحصول على المفتاح
// const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// قائمة البادئات الدولية للواتساب
const COUNTRY_CODES_LIST = [
  { code: '970', country: 'فلسطين 🇵🇸' },
  { code: '972', country: 'إسرائيل 🇮🇱' },
  { code: '20', country: 'مصر 🇪🇬' },
  { code: '962', country: 'الأردن 🇯🇴' },
  { code: '963', country: 'سوريا 🇸🇾' },
  { code: '966', country: 'السعودية 🇸🇦' },
  { code: '971', country: 'الإمارات 🇦🇪' },
  { code: '965', country: 'الكويت 🇰🇼' },
  { code: '973', country: 'البحرين 🇧🇭' },
  { code: '974', country: 'قطر 🇶🇦' },
  { code: '968', country: 'عمان 🇴🇲' },
  { code: '961', country: 'لبنان 🇱🇧' },
  { code: '964', country: 'العراق 🇮🇶' },
  { code: '967', country: 'اليمن 🇾🇪' },
  { code: '218', country: 'ليبيا 🇱🇾' },
  { code: '213', country: 'الجزائر 🇩🇿' },
  { code: '216', country: 'تونس 🇹🇳' },
  { code: '212', country: 'المغرب 🇲🇦' },
  { code: '249', country: 'السودان 🇸🇩' },
  { code: '90', country: 'تركيا 🇹🇷' },
  { code: '357', country: 'قبرص 🇨🇾' },
  { code: '30', country: 'اليونان 🇬🇷' },
  { code: '98', country: 'إيران 🇮🇷' },
];

// تعريف أيقونة TikTok المخصصة إذا لم تكن متوفرة في المكتبة الأساسية
const TikTokIcon = ({ size, color }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontFamily: 'Arial', fontSize: size * 0.7, color: color, fontWeight: 'bold' }}>TT</Text>
  </View>
);

export default function ShopProfile() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [stats, setStats] = useState({
    carsCount: 0,
    servicesCount: 0,
  });
  
  // بيانات المستخدم وبيانات المحل
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    profile_image: null,
  });
  
  const [shopData, setShopData] = useState({
    id: '',
    shop_name: '',
    address: '',
    coordinates: null,
    banner_image: null,
    logo_url: null,
    phone: '',
    whatsapp: '',
    whatsapp_prefix: '966',
    description: '',
    working_hours: '',
    working_days: 'السبت - الخميس',
    instagram: '',
    twitter: '',
    facebook: '',
    tiktok: '',
    gallery: [],
    ratings: {
      average: 4.7,
      count: 125,
    }
  });
  
  const [showPrefixPicker, setShowPrefixPicker] = useState(false);
  // حالة لإظهار مربع حوار اختيار المواقع
  const [showPlacesModal, setShowPlacesModal] = useState(false);
  const [tempAddress, setTempAddress] = useState(''); // حالة مؤقتة لتخزين العنوان أثناء التعديل
  
  // تحميل بيانات المستخدم والمحل
  useEffect(() => {
    fetchProfileData();
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    if (!user) return;
    
    try {
      // تحميل بيانات المحل أولاً
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (shopError || !shopData) {
        console.error('خطأ في تحميل معرف المحل:', shopError);
        return;
      }
      
      const shopId = shopData.id;
      
      // تحميل عدد السيارات
      const { count: carsCount, error: carsError } = await supabase
        .from('cars')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId);
      
      // تحميل عدد الخدمات
      const { count: servicesCount, error: servicesError } = await supabase
        .from('service_visits')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId);
      
      setStats({
        carsCount: carsCount || 0,
        servicesCount: servicesCount || 0,
      });
      
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };
  
  const fetchProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // تحميل بيانات الملف الشخصي
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('خطأ في تحميل بيانات المستخدم:', userError);
      } else if (userData) {
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          profile_image: userData.profile_image || null
        });
      }
      
      // تحميل بيانات المحل
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (shopError) {
        console.error('خطأ في تحميل بيانات المحل:', shopError);
      } else if (shopData) {
        setShopData({
          id: shopData.id || '',
          shop_name: shopData.name || '',
          address: shopData.address || '',
          coordinates: shopData.coordinates || null,
          banner_image: shopData.banner_image || null,
          logo_url: shopData.logo_url || null,
          phone: shopData.phone || '',
          whatsapp: shopData.phone || '',
          whatsapp_prefix: shopData.whatsapp_prefix || '966',
          description: shopData.description || '',
          working_hours: shopData.working_hours || '',
          working_days: shopData.working_days || 'السبت - الخميس',
          instagram: shopData.instagram || '',
          twitter: shopData.twitter || '',
          facebook: shopData.facebook || '',
          tiktok: shopData.tiktok || '',
          gallery: shopData.gallery || [],
          ratings: shopData.ratings || {
            average: 4.7,
            count: 125
          }
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // حفظ البيانات المعدلة
  const saveProfileData = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // تحديث بيانات المستخدم
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profile.name,
          phone: profile.phone
        })
        .eq('id', user.id);
      
      if (userError) {
        console.error('خطأ في حفظ بيانات المستخدم:', userError);
        Alert.alert('خطأ', 'حدث خطأ أثناء حفظ بيانات المستخدم');
        return;
      }
      
      // تجهيز بيانات المحل الأساسية
      const basicShopData = {
        name: shopData.shop_name,
        address: shopData.address,
        coordinates: shopData.coordinates,
        phone: shopData.phone
      };

      // التحقق من وجود الأعمدة الإضافية قبل إضافتها للتحديث
      // استخدام الدالة getTableColumns للحصول على أعمدة الجدول
      const columns = await getTableColumns('shops');
      
      // إضافة الحقول الاختيارية فقط إذا كانت موجودة في الجدول
      const shopUpdateData = { ...basicShopData };
      
      if (columns.includes('whatsapp_prefix')) {
        shopUpdateData.whatsapp_prefix = shopData.whatsapp_prefix;
      }
      
      if (columns.includes('description')) {
        shopUpdateData.description = shopData.description;
      }
      
      if (columns.includes('working_hours')) {
        shopUpdateData.working_hours = shopData.working_hours;
      }
      
      if (columns.includes('working_days')) {
        shopUpdateData.working_days = shopData.working_days;
      }
      
      if (columns.includes('instagram')) {
        shopUpdateData.instagram = shopData.instagram;
      }
      
      if (columns.includes('twitter')) {
        shopUpdateData.twitter = shopData.twitter;
      }
      
      if (columns.includes('facebook')) {
        shopUpdateData.facebook = shopData.facebook;
      }
      
      if (columns.includes('tiktok')) {
        shopUpdateData.tiktok = shopData.tiktok;
      }
      
      if (columns.includes('banner_image') && shopData.banner_image) {
        shopUpdateData.banner_image = shopData.banner_image;
      }
      
      console.log('البيانات المراد تحديثها:', shopUpdateData);
      
      const { error: shopError } = await supabase
        .from('shops')
        .update(shopUpdateData)
        .eq('owner_id', user.id);
      
      if (shopError) {
        console.error('خطأ في حفظ بيانات المحل:', shopError);
        Alert.alert('خطأ', 'حدث خطأ أثناء حفظ بيانات المحل');
        return;
      }
      
      Alert.alert('تم', 'تم حفظ البيانات بنجاح');
      setEditMode(false);
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setSaving(false);
    }
  };
  
  // إضافة دالة للحصول على أعمدة الجدول
  /**
   * الحصول على أسماء الأعمدة في جدول معين
   * @param tableName اسم الجدول
   * @returns قائمة بأسماء الأعمدة
   */
  const getTableColumns = async (tableName: string): Promise<string[]> => {
    try {
      // استعلام للحصول على معلومات الأعمدة من جدول الوصف 
      const { data, error } = await supabase
        .rpc('get_table_columns', { p_table_name: tableName });
      
      if (error) {
        console.error('خطأ في الحصول على أعمدة الجدول:', error);
        return [];
      }
      
      // تحويل النتيجة إلى مصفوفة من أسماء الأعمدة
      return Array.isArray(data) ? data.map(col => col.column_name) : [];
    } catch (error) {
      console.error('خطأ غير متوقع في الحصول على أعمدة الجدول:', error);
      return [];
    }
  };
  
  // فتح وسائل التواصل الاجتماعي
  const openSocialMedia = (platform) => {
    let url = '';
    
    switch (platform) {
      case 'instagram':
        url = shopData.instagram;
        break;
      case 'twitter':
        url = shopData.twitter;
        break;
      case 'facebook':
        url = shopData.facebook;
        break;
    }
    
    if (!url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('خطأ', `لا يمكن فتح ${platform}`);
        }
      })
      .catch(err => console.error(`خطأ في فتح ${platform}:`, err));
  };
  
  // فتح المنتقي لاختيار بادئة الواتساب
  const openPrefixPicker = () => {
    if (editMode) {
      setShowPrefixPicker(true);
    }
  };
  
  // اختيار بادئة الواتساب
  const selectPrefix = (prefix) => {
    setShopData({ ...shopData, whatsapp_prefix: prefix });
    setShowPrefixPicker(false);
  };
  
  // الحصول على اسم الدولة من البادئة
  const getCountryName = (prefix) => {
    const country = COUNTRY_CODES_LIST.find(c => c.code === prefix);
    return country ? country.country : prefix;
  };
  
  // فتح مربع حوار اختيار الموقع
  const openPlacesModal = () => {
    if (editMode) {
      // نسخ العنوان الحالي إلى الحالة المؤقتة
      setTempAddress(shopData.address);
      setShowPlacesModal(true);
    }
  };
  
  // تحديد الموقع
  const selectLocation = (address) => {
    setShopData(prev => ({...prev, address}));
    setShowPlacesModal(false);
  };
  
  // تحميل صورة البانر
  const uploadBannerImage = async () => {
    try {
      // عرض خيارات اختيار الصورة
      Alert.alert(
        'إضافة صورة غلاف',
        'اختر مصدر الصورة',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'معرض الصور', 
            onPress: async () => {
              const imageUri = await pickImage();
              if (imageUri) {
                uploadAndSaveBannerImage(imageUri);
              }
            } 
          },
          { 
            text: 'الكاميرا', 
            onPress: async () => {
              const imageUri = await takePicture();
              if (imageUri) {
                uploadAndSaveBannerImage(imageUri);
              }
            } 
          },
        ]
      );
    } catch (error) {
      console.error('خطأ في تحميل صورة الغلاف:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل الصورة');
    }
  };

  // رفع وحفظ صورة البانر
  const uploadAndSaveBannerImage = async (imageUri) => {
    try {
      setLoading(true);
      
      // رفع الصورة إلى Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageUri, 'yazcar/banners');
      
      if (!cloudinaryUrl) {
        throw new Error('فشل في تحميل الصورة');
      }
      
      // تحديث البيانات محلياً
      setShopData(prevData => ({
        ...prevData,
        banner_image: cloudinaryUrl
      }));
      
      // حفظ رابط الصورة في قاعدة البيانات
      const { error } = await supabase
        .from('shops')
        .update({ banner_image: cloudinaryUrl })
        .eq('id', shopData.id);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('تم', 'تم تحميل صورة الغلاف بنجاح');
    } catch (error) {
      console.error('خطأ في حفظ صورة الغلاف:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الصورة');
    } finally {
      setLoading(false);
    }
  };

  // تحميل صورة الملف الشخصي
  const uploadProfileImage = async () => {
    try {
      // عرض خيارات اختيار الصورة
      Alert.alert(
        'تغيير صورة المحل',
        'اختر مصدر الصورة',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'معرض الصور', 
            onPress: async () => {
              const imageUri = await pickImage();
              if (imageUri) {
                uploadAndSaveProfileImage(imageUri);
              }
            } 
          },
          { 
            text: 'الكاميرا', 
            onPress: async () => {
              const imageUri = await takePicture();
              if (imageUri) {
                uploadAndSaveProfileImage(imageUri);
              }
            } 
          },
        ]
      );
    } catch (error) {
      console.error('خطأ في تحميل صورة المحل:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل الصورة');
    }
  };

  // رفع وحفظ صورة الملف الشخصي
  const uploadAndSaveProfileImage = async (imageUri) => {
    try {
      setLoading(true);
      
      // رفع الصورة إلى Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageUri, 'yazcar/profiles');
      
      if (!cloudinaryUrl) {
        throw new Error('فشل في تحميل الصورة');
      }
      
      // تحديث البيانات محلياً
      setShopData(prevData => ({
        ...prevData,
        logo_url: cloudinaryUrl
      }));
      
      // حفظ رابط الصورة في قاعدة البيانات
      const { error } = await supabase
        .from('shops')
        .update({ logo_url: cloudinaryUrl })
        .eq('id', shopData.id);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('تم', 'تم تحديث صورة المحل بنجاح');
    } catch (error) {
      console.error('خطأ في حفظ صورة المحل:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الصورة');
    } finally {
      setLoading(false);
    }
  };
  
  // إنشاء QR
  const generateQRCode = () => {
    Alert.alert('إنشاء QR', 'سيتم توفير رمز QR خاص بالمحل قريباً');
  };

  // مشاركة الملف الشخصي
  const handleShareProfile = () => {
    const url = `https://yazcar.xyz/shop/${shopData.id}`;
    Linking.canOpenURL(url)
      .then(() => {
        Alert.alert(
          'مشاركة الملف الشخصي',
          'اختر طريقة المشاركة',
          [
            { text: 'نسخ الرابط', onPress: () => Alert.alert('تم', 'تم نسخ الرابط') },
            { text: 'واتساب', onPress: () => Alert.alert('واتساب', 'جاري فتح واتساب للمشاركة') },
            { text: 'المزيد...', onPress: () => Alert.alert('مشاركة', 'جاري فتح خيارات المشاركة') },
            { text: 'إلغاء', style: 'cancel' },
          ]
        );
      })
      .catch(err => console.error('خطأ في المشاركة:', err));
  };
  
  // الحصول على موقع المستخدم الحالي
  const getCurrentLocation = async () => {
    if (!editMode) return;
    
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'لم يتم منح إذن الوصول للموقع');
        setLocationLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeout: 15000
      });
      
      const { latitude, longitude } = location.coords;
      
      // تحديث بيانات الإحداثيات
      setShopData(prevData => ({
        ...prevData,
        coordinates: { latitude, longitude }
      }));
      
      // محاولة الحصول على العنوان من الإحداثيات
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (address) {
          const formattedAddress = [
            address.name,
            address.street,
            address.district,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', ');
          
          if (formattedAddress && !shopData.address) {
            Alert.alert(
              'هل تريد استخدام هذا العنوان؟',
              formattedAddress,
              [
                { text: 'لا', style: 'cancel' },
                { 
                  text: 'نعم', 
                  onPress: () => setShopData(prev => ({...prev, address: formattedAddress}))
                }
              ]
            );
          }
        }
      } catch (error) {
        console.error('خطأ في تحويل الإحداثيات إلى عنوان:', error);
      }
      
      Alert.alert('تم', 'تم تحديد موقعك بنجاح');
    } catch (error) {
      console.error('خطأ في الحصول على الموقع:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء محاولة تحديد موقعك');
    } finally {
      setLocationLoading(false);
    }
  };
  
  // فتح الموقع في خرائط Google
  const openLocationInMaps = () => {
    if (!shopData.coordinates) return;
    
    const { latitude, longitude } = shopData.coordinates;
    const label = encodeURIComponent(shopData.shop_name || "موقع المتجر");
    
    let url;
    if (Platform.OS === 'ios') {
      // تنسيق Apple Maps للأيفون
      url = `maps:?ll=${latitude},${longitude}&q=${label}`;
    } else if (Platform.OS === 'android') {
      // تنسيق خرائط جوجل للأندرويد
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    } else {
      // للويب استخدم جوجل ماب
      url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    }
    
    console.log("فتح URL الخرائط:", url);
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // إذا فشل، جرب دائماً خرائط جوجل في المتصفح
          const webUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch(err => {
        console.error('خطأ في فتح الخرائط:', err);
        Alert.alert('خطأ', 'لا يمكن فتح تطبيق الخرائط. تأكد من تثبيته على جهازك.');
      });
  };
  
  if (loading) {
    return <Loading fullScreen message="جاري تحميل البيانات..." />;
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="#204080"
        barStyle="light-content"
        translucent={false}
      />
      
      {/* شريط العنوان مع تدرج لوني */}
      <LinearGradient
        colors={['#6B5B95', '#4A3B74']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            if (editMode) {
              saveProfileData();
            } else {
              setEditMode(true);
            }
          }}
          disabled={saving}
        >
          <Icon name={editMode ? "content-save" : "pencil"} size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* صورة الخلفية وشعار المحل */}
        <View style={styles.profileHeader}>
          {/* صورة الغلاف */}
          <LinearGradient
            colors={['#3B82F6', '#204080']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.coverContainer}
          >
            {shopData.banner_image ? (
              <View style={{ width: '100%', height: '100%' }}>
                <Image 
                  source={{ uri: getBannerImageUrl(shopData.banner_image, 1200, 400) }} 
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                {editMode && (
                  <TouchableOpacity 
                    style={styles.changeBannerBtn}
                    onPress={uploadBannerImage}
                  >
                    <Icon name="camera" size={22} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.coverPlaceholder}>
                <TouchableOpacity
                  style={styles.addBannerButton}
                  onPress={uploadBannerImage}
                >
                  <Icon name="image-plus" size={40} color="#FFFFFF" />
                  <Text style={styles.addBannerText}>إضافة صورة غلاف</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
          
          <View style={styles.shopInfoContainer}>
            <View style={styles.logoContainer}>
              {shopData.logo_url ? (
                <Image 
                  source={{ uri: getProfileImageUrl(shopData.logo_url, 160) }} 
                  style={styles.logoImage}
                />
              ) : (
                <TouchableOpacity 
                  style={styles.placeholderLogo}
                  onPress={uploadProfileImage}
                >
                  <Icon name="store" size={35} color="#FFF" />
                  {editMode && <Text style={styles.addPhotoText}>تغيير</Text>}
                </TouchableOpacity>
              )}
              {editMode && shopData.logo_url && (
                <TouchableOpacity 
                  style={styles.changeProfileImage}
                  onPress={uploadProfileImage}
                >
                  <Icon name="camera" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.shopNameContainer}>
              {editMode ? (
                <TextInput
                  style={[styles.shopNameInput, styles.editableField, { fontSize: 20, fontWeight: 'bold' }]}
                  value={shopData.shop_name}
                  onChangeText={(text) => setShopData(prev => ({...prev, shop_name: text}))}
                  placeholder="اسم المتجر"
                  maxLength={30}
                />
              ) : (
                <Text style={styles.shopName}>{shopData.shop_name || "اسم المتجر"}</Text>
              )}
              
              <Text style={styles.ownerName}>{profile.name || "اسم المالك"}</Text>
            </View>
          </View>
          
          {/* أزرار الاتصال السريع */}
          <View style={styles.quickContactContainer}>
            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={() => Linking.openURL(`tel:${shopData.phone}`)}
            >
              <View style={[styles.quickContactIcon, { backgroundColor: '#4CAF50' }]}>
                <Icon name="phone" size={22} color="#FFF" />
              </View>
              <Text style={styles.quickContactText}>اتصال</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={() => Linking.openURL(`https://wa.me/${shopData.whatsapp_prefix}${shopData.whatsapp}`)}
            >
              <View style={[styles.quickContactIcon, { backgroundColor: '#25D366' }]}>
                <Icon name="whatsapp" size={22} color="#FFF" />
              </View>
              <Text style={styles.quickContactText}>واتساب</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={() => shopData.instagram && Linking.openURL(`https://instagram.com/${shopData.instagram}`)}
            >
              <View style={[styles.quickContactIcon, { backgroundColor: '#E1306C' }]}>
                <Icon name="instagram" size={22} color="#FFF" />
              </View>
              <Text style={styles.quickContactText}>انستغرام</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickContactButton}
              onPress={() => shopData.tiktok && Linking.openURL(`https://tiktok.com/@${shopData.tiktok}`)}
            >
              <View style={[styles.quickContactIcon, { backgroundColor: '#000000' }]}>
                <TikTokIcon size={22} color="#FFF" />
              </View>
              <Text style={styles.quickContactText}>تيك توك</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* إحصائيات المحل */}
        <View style={styles.statsCardContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="car" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{stats.carsCount}</Text>
              <Text style={styles.statLabel}>سيارة</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="wrench" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{stats.servicesCount}</Text>
              <Text style={styles.statLabel}>صيانة</Text>
            </View>
          </View>
        </View>
        
        {/* معلومات المحل */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>معلومات المحل</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Icon name="map-marker" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>العنوان</Text>
                {editMode ? (
                  <TouchableOpacity 
                    onPress={openPlacesModal}
                    style={[styles.locationPickerButton, styles.editableField]}
                    activeOpacity={0.7}
                  >
                    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
                      <View style={styles.locationPickerIcon}>
                        <Icon name="map-marker-plus" size={18} color="#6B5B95" />
                      </View>
                      <Text style={{flex: 1, textAlign: 'right', color: shopData.address ? '#333' : '#999', fontSize: 14, marginRight: 8}}>
                        {shopData.address || "اضغط لتحديد عنوان المحل"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.infoCardText}>{shopData.address || "لم يتم تحديد العنوان"}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <Icon name="crosshairs-gps" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>الإحداثيات</Text>
                {editMode ? (
                  <TouchableOpacity 
                    onPress={getCurrentLocation}
                    style={[styles.locationPickerButton, styles.editableField]}
                    activeOpacity={0.7}
                    disabled={locationLoading}
                  >
                    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'}}>
                      {locationLoading ? (
                        <ActivityIndicator size="small" color="#6B5B95" style={{marginLeft: 10}} />
                      ) : (
                        <View style={styles.locationPickerIcon}>
                          <Icon name="crosshairs-gps" size={18} color="#6B5B95" />
                        </View>
                      )}
                      <Text style={{flex: 1, textAlign: 'right', color: shopData.coordinates ? '#333' : '#999', fontSize: 14, marginRight: 8}}>
                        {shopData.coordinates 
                          ? `${shopData.coordinates.latitude.toFixed(6)}, ${shopData.coordinates.longitude.toFixed(6)}` 
                          : "اضغط لتحديد موقعك الحالي"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={shopData.coordinates ? openLocationInMaps : undefined}
                    style={{opacity: shopData.coordinates ? 1 : 0.5}}
                  >
                    <Text style={[
                      styles.infoCardText,
                      shopData.coordinates && styles.coordinatesText
                    ]}>
                      {shopData.coordinates 
                        ? `${shopData.coordinates.latitude.toFixed(6)}, ${shopData.coordinates.longitude.toFixed(6)}` 
                        : "لم يتم تحديد الإحداثيات"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <Icon name="phone" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>رقم الهاتف</Text>
                {editMode ? (
                  <TextInput
                    style={[styles.infoInput, styles.editableField]}
                    value={shopData.phone}
                    onChangeText={(text) => setShopData(prev => ({...prev, phone: text}))}
                    placeholder="رقم الهاتف"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoCardText}>{shopData.phone || "لم يتم تحديد رقم الهاتف"}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <Icon name="whatsapp" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>رقم الواتساب</Text>
                {editMode ? (
                  <View style={[styles.whatsappInputContainer, styles.editableField]}>
                    <TouchableOpacity 
                      style={styles.prefixButton}
                      onPress={openPrefixPicker}
                    >
                      <Text style={styles.prefixText}>+{shopData.whatsapp_prefix}</Text>
                      <Icon name="chevron-down" size={16} color="#6B5B95" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.whatsappInput}
                      value={shopData.whatsapp}
                      onChangeText={(text) => setShopData(prev => ({...prev, whatsapp: text}))}
                      placeholder="رقم الواتساب"
                      keyboardType="phone-pad"
                    />
                  </View>
                ) : (
                  <Text style={styles.infoCardText}>+{shopData.whatsapp_prefix} {shopData.whatsapp || "لم يتم تحديد رقم الواتساب"}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <Icon name="calendar-range" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>أيام العمل</Text>
                {editMode ? (
                  <TextInput
                    style={[styles.infoInput, styles.editableField]}
                    value={shopData.working_days}
                    onChangeText={(text) => setShopData(prev => ({...prev, working_days: text}))}
                    placeholder="أيام العمل"
                  />
                ) : (
                  <Text style={styles.infoCardText}>{shopData.working_days || "لم يتم تحديد أيام العمل"}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.infoCard}>
              <Icon name="clock-outline" size={24} color="#6B5B95" style={styles.infoCardIcon} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>ساعات العمل</Text>
                {editMode ? (
                  <TextInput
                    style={[styles.infoInput, styles.editableField]}
                    value={shopData.working_hours}
                    onChangeText={(text) => setShopData(prev => ({...prev, working_hours: text}))}
                    placeholder="ساعات العمل"
                  />
                ) : (
                  <Text style={styles.infoCardText}>{shopData.working_hours || "لم يتم تحديد ساعات العمل"}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
        
        {/* وصف المحل */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>وصف المحل</Text>
          
          <View style={styles.descriptionBox}>
            {editMode ? (
              <TextInput
                style={[styles.descriptionInput, styles.editableField]}
                value={shopData.description}
                onChangeText={(text) => setShopData(prev => ({...prev, description: text}))}
                placeholder="أدخل وصفًا للمحل..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.descriptionText}>
                {shopData.description || "لا يوجد وصف للمحل"}
              </Text>
            )}
          </View>
        </View>
        
        {/* حسابات التواصل الاجتماعي */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>حسابات التواصل الاجتماعي</Text>
          
          <View style={styles.socialContainer}>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIconContainer}>
                <Icon name="instagram" size={22} color="#fff" style={styles.socialIcon} />
              </View>
              {editMode ? (
                <View style={styles.socialInputContainer}>
                  <Text style={styles.socialInputPrefix}>instagram.com/</Text>
                  <TextInput
                    style={[styles.socialInput, styles.editableField]}
                    value={shopData.instagram}
                    onChangeText={(text) => setShopData(prev => ({...prev, instagram: text}))}
                    placeholder="اسم المستخدم"
                  />
                </View>
              ) : (
                <Text style={styles.socialText}>
                  {shopData.instagram ? `@${shopData.instagram}` : "غير محدد"}
                </Text>
              )}
            </View>
            
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconContainer, {backgroundColor: '#1DA1F2'}]}>
                <Icon name="twitter" size={22} color="#fff" style={styles.socialIcon} />
              </View>
              {editMode ? (
                <View style={styles.socialInputContainer}>
                  <Text style={styles.socialInputPrefix}>twitter.com/</Text>
                  <TextInput
                    style={[styles.socialInput, styles.editableField]}
                    value={shopData.twitter}
                    onChangeText={(text) => setShopData(prev => ({...prev, twitter: text}))}
                    placeholder="اسم المستخدم"
                  />
                </View>
              ) : (
                <Text style={styles.socialText}>
                  {shopData.twitter ? `@${shopData.twitter}` : "غير محدد"}
                </Text>
              )}
            </View>
            
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconContainer, {backgroundColor: '#4267B2'}]}>
                <Icon name="facebook" size={22} color="#fff" style={styles.socialIcon} />
              </View>
              {editMode ? (
                <View style={styles.socialInputContainer}>
                  <Text style={styles.socialInputPrefix}>facebook.com/</Text>
                  <TextInput
                    style={[styles.socialInput, styles.editableField]}
                    value={shopData.facebook}
                    onChangeText={(text) => setShopData(prev => ({...prev, facebook: text}))}
                    placeholder="اسم المستخدم"
                  />
                </View>
              ) : (
                <Text style={styles.socialText}>
                  {shopData.facebook ? `@${shopData.facebook}` : "غير محدد"}
                </Text>
              )}
            </View>
            
            <View style={styles.socialInputRow}>
              <View style={[styles.socialIconContainer, {backgroundColor: '#000000'}]}>
                <TikTokIcon size={22} color="#fff" />
              </View>
              {editMode ? (
                <View style={styles.socialInputContainer}>
                  <Text style={styles.socialInputPrefix}>tiktok.com/@</Text>
                  <TextInput
                    style={[styles.socialInput, styles.editableField]}
                    value={shopData.tiktok}
                    onChangeText={(text) => setShopData(prev => ({...prev, tiktok: text}))}
                    placeholder="اسم المستخدم"
                  />
                </View>
              ) : (
                <Text style={styles.socialText}>
                  {shopData.tiktok ? `@${shopData.tiktok}` : "غير محدد"}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* مساحة لتسهيل التمرير */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* منتقي بادئة الدولة */}
      <Modal
        visible={showPrefixPicker}
        transparent={true}
        onRequestClose={() => setShowPrefixPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر بادئة الدولة</Text>
              <TouchableOpacity 
                onPress={() => setShowPrefixPicker(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={COUNTRY_CODES_LIST}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.countryItem}
                  onPress={() => selectPrefix(item.code)}
                >
                  <Text style={styles.countryText}>{item.country}</Text>
                  {shopData.whatsapp_prefix === item.code && (
                    <Icon name="check" size={18} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.countryList}
            />
          </View>
        </View>
      </Modal>
      
      {/* منتقي المواقع */}
      <Modal
        visible={showPlacesModal}
        transparent={true}
        onRequestClose={() => setShowPlacesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, {height: height * 0.6, width: '90%'}]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setShowPlacesModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={18} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>أدخل عنوان المحل</Text>
            </View>
            
            <View style={{padding: 16, flex: 1}}>
              <Text style={{textAlign: 'right', marginBottom: 15, fontSize: 16}}>
                يرجى إدخال عنوان محلك بالتفصيل:
              </Text>
              
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  padding: 15,
                  textAlign: 'right',
                  backgroundColor: '#fff',
                  minHeight: 120,
                  textAlignVertical: 'top',
                  fontSize: 16
                }}
                placeholder="مثال: شارع الرشيد، بناية رقم 24، الطابق الأول، رام الله، فلسطين"
                multiline={true}
                numberOfLines={4}
                value={tempAddress}
                onChangeText={setTempAddress}
              />
              
              <TouchableOpacity 
                style={{
                  backgroundColor: '#3B82F6',
                  padding: 15,
                  borderRadius: 8,
                  marginTop: 20,
                  alignItems: 'center'
                }}
                onPress={() => {
                  if (tempAddress && tempAddress.trim() !== '') {
                    selectLocation(tempAddress.trim());
                  } else {
                    Alert.alert("تنبيه", "الرجاء إدخال العنوان");
                  }
                }}
              >
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>تأكيد العنوان</Text>
              </TouchableOpacity>
              
              <View style={{marginTop: 20}}>
                <Text style={{textAlign: 'right', marginBottom: 10, fontWeight: 'bold'}}>نصائح كتابة العنوان:</Text>
                <Text style={{textAlign: 'right', marginBottom: 5, color: '#555'}}>• اذكر اسم المدينة والمنطقة بوضوح</Text>
                <Text style={{textAlign: 'right', marginBottom: 5, color: '#555'}}>• اذكر اسم الشارع أو الحي</Text>
                <Text style={{textAlign: 'right', marginBottom: 5, color: '#555'}}>• أضف أي معالم قريبة تساعد في تحديد الموقع</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
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
  editButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  coverContainer: {
    height: 160,
    width: '100%',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBannerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBannerText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopInfoContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 15,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: -30,
  },
  placeholderLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    marginTop: -30,
  },
  shopNameContainer: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  shopNameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  statsCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 5,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#EEEEEE',
    alignSelf: 'center',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    textAlign: 'right',
  },
  infoGrid: {
    marginTop: 5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCardIcon: {
    marginLeft: 12,
    alignSelf: 'center',
  },
  infoCardContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  infoCardText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    lineHeight: 22,
  },
  descriptionInput: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  socialButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  toolButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  toolIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryText: {
    fontSize: 14,
  },
  changeProfileImage: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changeBannerBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  quickContactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickContactButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickContactIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  quickContactText: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
  },
  whatsappInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  prefixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
  },
  prefixText: {
    fontSize: 14,
    marginRight: 4,
    color: '#333',
  },
  whatsappInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  infoInput: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  socialContainer: {
    marginTop: 10,
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  socialIconContainer: {
    backgroundColor: '#E1306C',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  socialIcon: {
    
  },
  socialInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  socialInputPrefix: {
    fontSize: 14,
    color: '#777',
    marginLeft: 5,
  },
  socialInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  socialText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  locationPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  locationPickerIcon: {
    marginLeft: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placesAutoCompleteContainer: {
    flex: 1,
  },
  instructionsContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  locationPicker: {
    flex: 1,
  },
  cityButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 5,
  },
  cityButton: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cityButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  manualAddressContainer: {
    marginBottom: 15,
  },
  manualAddressInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 80,
    backgroundColor: '#fff',
  },
  confirmAddressButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  confirmAddressButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editableField: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d0e1f9',
    minHeight: 40,
  },
  coordinatesText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
}); 
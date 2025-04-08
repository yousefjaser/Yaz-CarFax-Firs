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
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import { LinearGradient } from 'expo-linear-gradient';
import { Surface } from 'react-native-paper';

const { width } = Dimensions.get('window');

// قائمة البادئات الدولية للواتساب
const COUNTRY_CODES = [
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

export default function ShopProfile() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
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
    shop_name: '',
    location: '',
    whatsapp: '',
    whatsapp_prefix: '966',
    description: '',
    working_hours: '',
    instagram: '',
    twitter: '',
    facebook: '',
    services: []
  });
  
  const [showPrefixPicker, setShowPrefixPicker] = useState(false);
  
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
          shop_name: shopData.name || '',
          location: shopData.location || '',
          whatsapp: shopData.whatsapp || '',
          whatsapp_prefix: shopData.whatsapp_prefix || '966',
          description: shopData.description || '',
          working_hours: shopData.working_hours || '',
          instagram: shopData.instagram || '',
          twitter: shopData.twitter || '',
          facebook: shopData.facebook || '',
          services: shopData.services || []
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
      
      // تحقق من وجود الجدول وعرض حقوله
      const { data: shopColumns, error: columnsError } = await supabase
        .from('shops')
        .select('*')
        .limit(1);
      
      if (columnsError) {
        console.error('خطأ في التحقق من حقول الجدول:', columnsError);
      }
      
      // إنشاء كائن للتحديث يحتوي فقط على الحقول الموجودة
      const updateData = {};
      
      // إضافة الحقول إلى كائن التحديث فقط إذا كانت موجودة في قاعدة البيانات
      const firstShop = shopColumns?.[0] || {};
      
      // الحقول الأساسية التي يجب أن تكون موجودة
      if ('name' in firstShop) updateData['name'] = shopData.shop_name;
      if ('location' in firstShop) updateData['location'] = shopData.location;
      if ('whatsapp' in firstShop) updateData['whatsapp'] = shopData.whatsapp;
      
      // الحقول الإضافية التي قد تكون غير موجودة
      if ('whatsapp_prefix' in firstShop) updateData['whatsapp_prefix'] = shopData.whatsapp_prefix;
      if ('description' in firstShop) updateData['description'] = shopData.description;
      if ('working_hours' in firstShop) updateData['working_hours'] = shopData.working_hours;
      if ('instagram' in firstShop) updateData['instagram'] = shopData.instagram;
      if ('twitter' in firstShop) updateData['twitter'] = shopData.twitter;
      if ('facebook' in firstShop) updateData['facebook'] = shopData.facebook;
      
      console.log('بيانات التحديث:', updateData);
      
      // تحديث بيانات المحل فقط بالحقول الموجودة
      const { error: shopError } = await supabase
        .from('shops')
        .update(updateData)
        .eq('owner_id', user.id);
      
      if (shopError) {
        console.error('خطأ في حفظ بيانات المحل:', shopError);
        
        // التعامل مع خطأ العمود غير الموجود
        if (shopError.code === 'PGRST204') {
          Alert.alert(
            'تنبيه', 
            'بعض الحقول غير موجودة في قاعدة البيانات. يرجى التواصل مع المطور لتحديث هيكل قاعدة البيانات.',
            [{ text: 'حسناً' }]
          );
        } else {
          Alert.alert('خطأ', 'حدث خطأ أثناء حفظ بيانات المحل');
        }
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
  
  // فتح الواتساب
  const openWhatsapp = () => {
    if (!shopData.whatsapp) return;
    
    const prefix = shopData.whatsapp_prefix || '966';
    let phoneNumber = shopData.whatsapp.replace(/\D/g, '');
    
    // إزالة الصفر من البداية إذا وجد
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    const url = `https://wa.me/${prefix}${phoneNumber}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('خطأ', 'لا يمكن فتح تطبيق واتساب');
        }
      })
      .catch(err => console.error('خطأ في فتح واتساب:', err));
  };
  
  // فتح خرائط جوجل
  const openMaps = () => {
    if (!shopData.location) return;
    
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopData.location)}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('خطأ', 'لا يمكن فتح تطبيق الخرائط');
        }
      })
      .catch(err => console.error('خطأ في فتح الخرائط:', err));
  };
  
  // الاتصال بالرقم
  const callNumber = () => {
    if (!profile.phone) return;
    
    const phoneNumber = profile.phone.replace(/\D/g, '');
    const url = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('خطأ', 'لا يمكن الاتصال بالرقم');
        }
      })
      .catch(err => console.error('خطأ في الاتصال:', err));
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
    const country = COUNTRY_CODES.find(c => c.code === prefix);
    return country ? country.country : prefix;
  };
  
  if (loading) {
    return <Loading fullScreen message="جاري تحميل البيانات..." />;
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor={COLORS.primary}
        barStyle="light-content"
        translucent={false}
      />
      
      {/* شريط العنوان مع القائمة والعودة */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.notificationIcon}
          onPress={() => router.push('/shop/notifications')}
        >
          <Icon name="bell-outline" size={28} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>الملف الشخصي</Text>
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-right" size={28} color="#000" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* العنوان والترحيب */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>
              مرحباً بك <Text style={styles.waveEmoji}>👋</Text>
            </Text>
            <Text style={styles.subtitleText}>في صفحة الملف الشخصي</Text>
          </View>
          
          <View style={styles.profileImageOuterContainer}>
            {profile.profile_image ? (
              <Image 
                source={{ uri: profile.profile_image }}
                style={styles.userImage}
              />
            ) : (
              <View style={styles.shopIconContainer}>
                <Icon name="account" size={40} color="#FFF" />
              </View>
            )}
            
            {editMode && (
              <TouchableOpacity style={styles.changeImageButton}>
                <Icon name="camera" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* معلومات المستخدم الرئيسية */}
        <View style={styles.userInfoContainer}>
          {editMode ? (
            <TextInput
              style={styles.userNameInput}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="الاسم"
            />
          ) : (
            <Text style={styles.userNameText}>{profile.name || 'غير محدد'}</Text>
          )}
          
          {editMode ? (
            <TextInput
              style={styles.shopNameInput}
              value={shopData.shop_name}
              onChangeText={(text) => setShopData({ ...shopData, shop_name: text })}
              placeholder="اسم المحل"
            />
          ) : (
            <Text style={styles.userRoleText}>{shopData.shop_name || 'اسم المحل غير محدد'}</Text>
          )}
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => {
              if (editMode) {
                saveProfileData();
              } else {
                setEditMode(true);
              }
            }}
            disabled={saving}
          >
            <Text style={styles.editButtonText}>
              {editMode ? (saving ? 'جاري الحفظ...' : 'حفظ') : 'تعديل الملف الشخصي'}
            </Text>
            <Icon name={editMode ? "content-save" : "pencil"} size={16} color={COLORS.primary} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </View>
        
        {/* إحصائيات المحل */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>إحصائيات المحل</Text>
          
          <View style={styles.statCardsContainer}>
            <LinearGradient
              colors={['#2196F3', '#2196F3CC']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.statGradientCard}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statInfo}>
                  <Text style={styles.statTitle}>السيارات</Text>
                  <Text style={styles.statCount}>{stats.carsCount}</Text>
                </View>
                <View style={styles.statIconContainer}>
                  <Icon name="car" size={32} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
            
            <LinearGradient
              colors={['#FF9500', '#FF9500CC']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.statGradientCard}
            >
              <View style={styles.statCardContent}>
                <View style={styles.statInfo}>
                  <Text style={styles.statTitle}>الخدمات</Text>
                  <Text style={styles.statCount}>{stats.servicesCount}</Text>
                </View>
                <View style={styles.statIconContainer}>
                  <Icon name="wrench" size={32} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
        
        {/* أقسام المعلومات */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>معلومات المحل</Text>
          
          <View style={styles.infoCard}>
            <InfoItem 
              icon="store"
              label="اسم المحل"
              value={shopData.shop_name}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, shop_name: text })}
            />
            
            <InfoItem 
              icon="map-marker"
              label="الموقع"
              value={shopData.location}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, location: text })}
              onIconPress={openMaps}
            />
            
            <InfoItem 
              icon="whatsapp"
              label="رقم الواتساب"
              value={shopData.whatsapp}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, whatsapp: text })}
              onIconPress={openWhatsapp}
            />
            
            <InfoItem 
              icon="phone-plus"
              label="بادئة الواتساب"
              value={getCountryName(shopData.whatsapp_prefix)}
              editMode={editMode}
              onIconPress={openPrefixPicker}
              isButton={editMode}
            />
            
            <InfoItem 
              icon="clock-outline"
              label="ساعات العمل"
              value={shopData.working_hours}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, working_hours: text })}
            />
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>وصف المحل</Text>
          
          <View style={styles.infoCard}>
            {editMode ? (
              <TextInput
                style={styles.descriptionInput}
                value={shopData.description}
                onChangeText={(text) => setShopData({ ...shopData, description: text })}
                placeholder="أدخل وصفاً للمحل..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.descriptionText}>
                {shopData.description || 'لا يوجد وصف للمحل'}
              </Text>
            )}
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 25 }]}>وسائل التواصل</Text>
          
          <View style={styles.menuGrid}>
            <SocialMediaButton 
              icon="instagram" 
              title="انستغرام"
              value={shopData.instagram}
              onPress={() => openSocialMedia('instagram')}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, instagram: text })}
              color="#E1306C"
            />
            
            <SocialMediaButton 
              icon="twitter" 
              title="تويتر"
              value={shopData.twitter}
              onPress={() => openSocialMedia('twitter')}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, twitter: text })}
              color="#1DA1F2"
            />
            
            <SocialMediaButton 
              icon="facebook" 
              title="فيسبوك"
              value={shopData.facebook}
              onPress={() => openSocialMedia('facebook')}
              editMode={editMode}
              onChangeText={(text) => setShopData({ ...shopData, facebook: text })}
              color="#4267B2"
            />
            
            <SocialMediaButton 
              icon="phone" 
              title="هاتف"
              value={profile.phone}
              onPress={callNumber}
              editMode={editMode}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              color="#27AE60"
            />
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>الوصول السريع</Text>
          
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
            
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shop/scan')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#9B59B6' + '15' }]}>
                <Icon name="qrcode-scan" size={24} color="#9B59B6" />
              </View>
              <Text style={styles.menuItemText}>مسح QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shop/shop-dashboard')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#E67E22' + '15' }]}>
                <Icon name="view-dashboard" size={24} color="#E67E22" />
              </View>
              <Text style={styles.menuItemText}>لوحة التحكم</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.emptySection} />
      </ScrollView>
      
      {/* منتقي بادئة الواتساب */}
      <Modal
        visible={showPrefixPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrefixPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.prefixPickerContainer}>
            <View style={styles.prefixPickerHeader}>
              <Text style={styles.prefixPickerTitle}>اختر بادئة الدولة</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPrefixPicker(false)}
              >
                <Icon name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.prefixItem,
                    shopData.whatsapp_prefix === item.code && styles.selectedPrefixItem
                  ]}
                  onPress={() => selectPrefix(item.code)}
                >
                  <Text style={[
                    styles.prefixItemText,
                    shopData.whatsapp_prefix === item.code && styles.selectedPrefixItemText
                  ]}>
                    {`${item.country} (+${item.code})`}
                  </Text>
                  {shopData.whatsapp_prefix === item.code && (
                    <Icon name="check" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.prefixList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// مكون عنصر التواصل الاجتماعي
function SocialMediaButton({ icon, title, value, onPress, editMode, onChangeText, color }) {
  return (
    <View style={styles.socialMediaItem}>
      {editMode ? (
        <View style={styles.socialMediaEditContainer}>
          <View style={[styles.socialMediaIcon, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={22} color={color} />
          </View>
          <Text style={styles.socialMediaTitle}>{title}</Text>
          <TextInput
            style={styles.socialMediaInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={`${title}...`}
          />
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.socialMediaButton}
          onPress={onPress}
          disabled={!value}
        >
          <View style={[styles.socialMediaIcon, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={22} color={color} />
          </View>
          <Text style={styles.socialMediaTitle}>{title}</Text>
          <Text style={styles.socialMediaValue} numberOfLines={1} ellipsizeMode="tail">
            {value || 'غير محدد'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// مكون لعرض عنصر معلومات
function InfoItem({ icon, label, value, editMode, onChangeText, onIconPress, multiline = false, keyboardType = 'default', helperText, isButton = false }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoContent}>
        <View style={styles.labelContainer}>
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        
        {editMode && !isButton ? (
          <View>
            <TextInput
              style={[
                styles.infoInput, 
                multiline && { height: 80, textAlignVertical: 'top' }
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={`أدخل ${label}`}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              keyboardType={keyboardType}
            />
            {helperText && (
              <Text style={styles.helperText}>{helperText}</Text>
            )}
          </View>
        ) : isButton ? (
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={onIconPress}
          >
            <Text style={styles.pickerButtonText}>{value || 'اختر'}</Text>
            <Icon name="chevron-down" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.infoValue}>{value || 'غير محدد'}</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.infoIcon, 
          { backgroundColor: COLORS.primary + '20' }
        ]}
        onPress={onIconPress}
        disabled={(editMode && !isButton) || !onIconPress}
      >
        <Icon name={icon} size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: '#FFF',
  },
  welcomeTextContainer: {
    flex: 1,
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
  subtitleText: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    textAlign: 'right',
  },
  userImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImageOuterContainer: {
    position: 'relative',
  },
  shopIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoContainer: {
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  userNameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  userRoleText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'right',
    marginTop: 5,
  },
  shopNameInput: {
    fontSize: 16,
    color: '#777',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 3,
    marginTop: 5,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  editButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  statCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statGradientCard: {
    width: '48%',
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textAlign: 'right',
  },
  statCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  infoContent: {
    flex: 1,
  },
  labelContainer: {
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: '#777',
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  infoInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'right',
  },
  helperText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    textAlign: 'right',
  },
  descriptionInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    textAlign: 'right',
    minHeight: 100,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'right',
  },
  menuGrid: {
    flexDirection: 'row',
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
  },
  socialMediaItem: {
    width: '48%',
    marginBottom: 15,
  },
  socialMediaButton: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
    height: 120,
    justifyContent: 'center',
  },
  socialMediaEditContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
    minHeight: 140,
  },
  socialMediaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialMediaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  socialMediaValue: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: '100%',
  },
  socialMediaInput: {
    width: '100%',
    fontSize: 12,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    marginTop: 5,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  floatingNavBar: {
    display: 'none',
  },
  navItem: {
    display: 'none',
  },
  homeNavItem: {
    display: 'none',
  },
  navItemText: {
    display: 'none',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixPickerContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
  },
  prefixPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prefixPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  prefixList: {
    maxHeight: 500,
  },
  prefixItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPrefixItem: {
    backgroundColor: COLORS.primary + '10',
  },
  prefixItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedPrefixItemText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptySection: {
    height: 100,
  }
}); 
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ToastAndroid, 
  Alert, 
  Animated, 
  Easing, 
  I18nManager,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Text, Appbar, Card, Divider, Button, List, Avatar, Dialog, Portal, Surface } from 'react-native-paper';
import { COLORS, SPACING } from '../../constants';
import { supabase } from '../../config';
import { useAuthStore } from '../../utils/store';
import Loading from '../../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// إجبار واجهة من اليمين لليسار
I18nManager.forceRTL(true);

export default function CarDetailsScreen() {
  const router = useRouter();
  const { id, source } = useLocalSearchParams();
  const carId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const carSource = typeof source === 'string' ? source : '';
  const { user, isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [car, setCar] = useState<any>(null);
  const [serviceVisits, setServiceVisits] = useState<any[]>([]);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  
  // إضافة متغيرات الرسوم المتحركة
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    loadCarDetails();
  }, [carId, carSource]);
  
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
      // التحقق من وجود بيانات مؤقتة (نقلت من scan.tsx)
      if (global.tempCarData && global.tempCarData.qr_id === carId) {
        console.log("استخدام البيانات المؤقتة للسيارة:", global.tempCarData);
        setCar(global.tempCarData);
        
        // تنظيف البيانات المؤقتة بعد استخدامها
        setTimeout(() => {
          global.tempCarData = null;
        }, 1000);
        
        // لا نقوم بتحميل سجل الخدمات للسيارات من cars_new لأنها غير موجودة بعد
        setServiceVisits([]);
        setLoading(false);
        return;
      }
      
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
      
      // تحميل سجل الخدمات باستخدام qr_id
      await loadServiceVisits(carData.qr_id);
      
    } catch (error) {
      console.error('فشل في تحميل تفاصيل السيارة:', error);
      ToastAndroid.show('فشل في تحميل تفاصيل السيارة', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };
  
  const loadServiceVisits = async (carId) => {
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
  
  const handleEdit = () => {
    router.push(`/shop/edit-car/${carId}`);
  };
  
  const handleDelete = async () => {
    setDeleteDialogVisible(false);
    setLoading(true);
    
    try {
      // حذف سجلات الخدمة المرتبطة بالسيارة
      const { error: servicesError } = await supabase
        .from('service_visits')
        .delete()
        .eq('car_id', car.qr_id);
      
      if (servicesError) {
        console.error('فشل في حذف سجلات الخدمة:', servicesError);
        throw servicesError;
      }
      
      // حذف السيارة من جدول cars_new
      const { error: carError } = await supabase
        .from('cars_new')
        .delete()
        .eq('qr_id', car.qr_id);
      
      if (carError) {
        console.error('فشل في حذف السيارة:', carError);
        throw carError;
      }
      
      ToastAndroid.show('تم حذف السيارة بنجاح', ToastAndroid.SHORT);
      router.back();
    } catch (error) {
      console.error('فشل في حذف السيارة:', error);
      ToastAndroid.show('فشل في حذف السيارة', ToastAndroid.SHORT);
      setLoading(false);
    }
  };
  
  const addServiceVisit = () => {
    router.push(`/shop/add-service-visit?carId=${carId}`);
  };
  
  const viewServiceHistory = () => {
    router.push(`/shop/service-history?carId=${carId}`);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'غير متوفر';
    try {
    const date = new Date(dateString);
      return date.toLocaleDateString('ar', {
      year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    } catch (error) {
      console.error('خطأ في تنسيق التاريخ:', error);
      return dateString;
    }
  };
  
  const showDeleteDialog = () => {
    setDeleteDialogVisible(true);
  };
  
  const hideDeleteDialog = () => {
    setDeleteDialogVisible(false);
  };
  
  if (loading) {
    return <Loading fullScreen message="جاري تحميل بيانات السيارة..." />;
  }
  
  if (!car) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          {/* عرض زر العودة فقط للمستخدمين المسجلين */}
          {isAuthenticated ? (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Icon name="arrow-right" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
          <View style={styles.rightPlaceholder} />
        </View>
        
        <View style={[styles.bottomSection, styles.centerContent]}>
          <Surface style={styles.errorSurface}>
        <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>لم يتم العثور على بيانات السيارة</Text>
            {isAuthenticated ? (
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.back()}
              >
                <Text style={styles.primaryButtonText}>العودة</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.primaryButtonText}>الصفحة الرئيسية</Text>
              </TouchableOpacity>
            )}
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
        {/* عرض أزرار التحكم فقط للمستخدمين المسجلين */}
        {isAuthenticated ? (
          <>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Icon name="arrow-right" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={handleEdit}>
                <Icon name="pencil" size={24} color="#fff" style={{marginLeft: 20}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={showDeleteDialog}>
                <Icon name="delete" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.backButton} />
            <Text style={styles.headerTitle}>تفاصيل السيارة</Text>
            <View style={styles.rightPlaceholder} />
          </>
        )}
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
          <Surface style={styles.topCard} elevation={4}>
            <View style={styles.carHeader}>
              <View style={styles.carIconContainer}>
                <Icon name="car-side" size={60} color="#fff" />
              </View>
              <View style={styles.carTitleContainer}>
              <Text style={styles.carTitle}>
                  {car.make} {car.model}
              </Text>
                <Text style={styles.carSubtitle}>{car.year}</Text>
                <View style={styles.plateContainer}>
                  <Icon name="card-account-details" size={18} color="#fff" />
                  <Text style={styles.plateNumber}>{car.plate_number}</Text>
                </View>
              </View>
            </View>
            
            <Divider style={styles.coloredDivider} />
            
            <View style={styles.carDetails}>
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Icon name="qrcode" size={24} color={COLORS.primary} style={styles.detailIcon} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>رمز QR</Text>
                    <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                      {car.qr_id || 'غير متوفر'}
                    </Text>
                </View>
                </View>
                
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
              
              <View style={styles.detailColumn}>
                <View style={styles.detailItem}>
                  <Icon name="identifier" size={24} color={COLORS.primary} style={styles.detailIcon} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>رقم الشاسيه</Text>
                    <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                      {car.chassis_number || 'غير متوفر'}
                    </Text>
              </View>
            </View>
                
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
          </Surface>
          
          <Surface style={styles.card} elevation={4}>
            <View style={styles.contentContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.headerIconContainer}>
                  <Icon name="car" size={24} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>معلومات السيارة</Text>
              </View>
              
              <Divider style={styles.coloredDivider} />
              
              <View style={styles.carDetailsContainer}>
                <View style={styles.detailColumn}>
                  <View style={styles.detailItem}>
                    <Icon name="qrcode" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>رمز QR</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.qr_id || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                  
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
                
                <View style={styles.detailColumn}>
                  <View style={styles.detailItem}>
                    <Icon name="identifier" size={24} color={COLORS.primary} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>رقم الشاسيه</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                        {car.chassis_number || 'غير متوفر'}
                      </Text>
                    </View>
                  </View>
                  
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
            <View style={styles.sectionHeader}>
              <View style={styles.headerIconContainer}>
                <Icon name="account-circle" size={24} color="#fff" />
              </View>
            <Text style={styles.sectionTitle}>بيانات المالك</Text>
            </View>
            
            <Divider style={styles.coloredDivider} />
            
            <View style={styles.ownerInfo}>
              <View style={styles.ownerAvatarContainer}>
                <Surface style={styles.avatarSurface} elevation={4}>
                  <Avatar.Icon 
                    size={60} 
                    icon="account" 
                    style={styles.ownerAvatar} 
                    color="#fff"
                  />
                </Surface>
              </View>
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>{car.customer?.name || 'غير محدد'}</Text>
                
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => {/* اتصال بالرقم */}}
                >
                  <Surface style={styles.contactIconContainer} elevation={2}>
                    <Icon name="phone" size={18} color="#fff" />
                  </Surface>
                  <Text style={styles.contactText}>{car.customer?.phone || 'غير محدد'}</Text>
                </TouchableOpacity>
                
                {car.customer?.email && car.customer.email !== `${car.customer?.phone}@placeholder.com` && (
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => {/* إرسال بريد إلكتروني */}}
                  >
                    <Surface style={styles.contactIconContainer} elevation={2}>
                      <Icon name="email" size={18} color="#fff" />
                    </Surface>
                    <Text style={styles.contactText}>{car.customer.email}</Text>
                  </TouchableOpacity>
                )}
                </View>
                  </View>
          </Surface>
          
          <Surface style={styles.card} elevation={4}>
            <View style={styles.contentContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.headerIconContainer}>
                  <Icon name="oil" size={24} color="#fff" />
              </View>
                <Text style={styles.sectionTitle}>معلومات الزيت والصيانة</Text>
            </View>
              
              <Divider style={styles.coloredDivider} />
              
              <View style={styles.maintenanceSection}>
                <Surface style={styles.infoBlockContainer}>
                  <View style={styles.infoBlockWrapper}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>نوع الزيت</Text>
                      <Divider style={styles.infoDivider} />
                      <Text style={styles.infoValue}>{car.oil_type || 'غير محدد'}</Text>
                    </View>
                  </View>
                </Surface>
                
                <Surface style={styles.infoBlockContainer}>
                  <View style={styles.infoBlockWrapper}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>تصنيف الزيت</Text>
                      <Divider style={styles.infoDivider} />
                      <Text style={styles.infoValue}>{car.oil_grade || 'غير محدد'}</Text>
                    </View>
                  </View>
                </Surface>
                
                <Surface style={styles.infoBlockContainer}>
                  <View style={styles.infoBlockWrapper}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>العداد القادم</Text>
                      <Divider style={styles.infoDivider} />
                      <Text style={styles.infoValue}>
                        {car.next_oil_change_odometer ? `${car.next_oil_change_odometer} كم` : 'غير محدد'}
                      </Text>
                    </View>
                  </View>
                </Surface>
                
                <Surface style={styles.infoBlockContainer}>
                  <View style={styles.infoBlockWrapper}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>آخر تغيير للزيت</Text>
                      <Divider style={styles.infoDivider} />
                      <Text style={styles.infoValue}>
                        {car.last_oil_change_date 
                          ? new Date(car.last_oil_change_date).toLocaleDateString('ar', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })
                          : 'غير محدد'}
                      </Text>
                    </View>
                  </View>
                </Surface>
                
                <Surface style={styles.infoBlockContainer}>
                  <View style={styles.infoBlockWrapper}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoTitle}>قراءة العداد الحالية</Text>
                      <Divider style={styles.infoDivider} />
                      <Text style={styles.infoValue}>
                        {car.current_odometer ? `${car.current_odometer} كم` : 'غير محدد'}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </View>
            </View>
          </Surface>
          
          {/* عرض أزرار إضافة الخدمات فقط للمستخدمين المسجلين */}
          {isAuthenticated && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.primaryAction}
            onPress={addServiceVisit}
                activeOpacity={0.8}
              >
                <Surface style={styles.actionButton} elevation={4}>
                  <View style={styles.actionContent}>
                    <Icon name="wrench" size={28} color="#fff" style={styles.actionIcon} />
                    <Text style={styles.actionText}>إضافة خدمة جديدة</Text>
                  </View>
                </Surface>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryAction}
            onPress={viewServiceHistory}
                activeOpacity={0.8}
              >
                <Surface style={styles.actionButtonSecondary} elevation={4}>
                  <View style={styles.actionContent}>
                    <Icon name="history" size={28} color={COLORS.primary} style={styles.actionIcon} />
                    <Text style={[styles.actionText, styles.secondaryActionText]}>سجل الخدمات</Text>
        </View>
                </Surface>
              </TouchableOpacity>
            </View>
          )}
          
          {/* عرض قسم آخر الخدمات بشكل مختلف للمستخدمين المسجلين وغير المسجلين */}
          <Surface style={styles.card} elevation={4}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerIconContainer}>
                <Icon name="tools" size={24} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>آخر الخدمات</Text>
              {isAuthenticated && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                onPress={viewServiceHistory}
                >
                  <Text style={styles.viewAllText}>عرض الكل</Text>
                  <Icon name="chevron-left" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            
            <Divider style={styles.coloredDivider} />
            
            {serviceVisits.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Icon name="calendar-remove" size={60} color="#DDD" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>لا توجد خدمات مسجلة لهذه السيارة</Text>
                {isAuthenticated && (
                  <TouchableOpacity 
                    style={styles.emptyActionButton}
                    onPress={addServiceVisit}
                  >
                    <Text style={styles.emptyActionText}>إضافة خدمة جديدة</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              serviceVisits.slice(0, 3).map((visit) => (
                <TouchableOpacity
                  key={visit.id}
                  onPress={isAuthenticated ? () => router.push(`/shop/service-details/${visit.id}`) : undefined}
                  style={styles.visitItem}
                  disabled={!isAuthenticated}
                >
                  <View style={styles.visitHeader}>
                    <View style={styles.visitTitleContainer}>
                      <Icon 
                        name="wrench" 
                        size={18} 
                        color={COLORS.primary} 
                        style={styles.visitIcon}
                      />
                      <Text style={styles.visitTitle}>
                        {visit.service_categories?.name || visit.service_type || 'خدمة'}
                      </Text>
                    </View>
                    <View style={styles.visitDateContainer}>
                      <Icon name="calendar" size={14} color={COLORS.gray} style={{marginRight: 4}} />
                    <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
                  </View>
                  </View>
                  
                  <View style={styles.visitDetails}>
                    <View style={styles.visitPriceContainer}>
                      <Icon name="cash" size={16} color="#218c74" style={{marginRight: 4}} />
                      <Text style={styles.visitPrice}>{visit.cost || 0} ريال</Text>
                    </View>
                    
                    {visit.mileage && (
                      <View style={styles.mileageContainer}>
                        <Icon name="speedometer" size={16} color={COLORS.gray} style={{marginRight: 4}} />
                        <Text style={styles.mileageText}>{visit.mileage} كم</Text>
                      </View>
                    )}
                  </View>
                  
                  {visit.notes && (
                    <View style={styles.notesContainer}>
                      <Icon name="text-box" size={14} color="#666" style={{marginRight: 4}} />
                    <Text style={styles.visitNotes} numberOfLines={1}>
                      {visit.notes}
                    </Text>
                    </View>
                  )}
                  
                  {isAuthenticated && (
                    <View style={styles.visitFooter}>
                      <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
                      <Icon name="chevron-left" size={14} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </Surface>
          
          {/* عرض إشعار للمستخدمين غير المسجلين في نهاية الصفحة */}
          {!isAuthenticated && (
            <Surface style={[styles.card, styles.publicNoticeCard]} elevation={4}>
              <View style={styles.publicNotice}>
                <Icon name="information-outline" size={32} color={COLORS.primary} style={styles.publicNoticeIcon} />
                <Text style={styles.publicNoticeText}>
                  هذه البيانات متاحة للعرض العام. قم بتسجيل الدخول للوصول إلى جميع الميزات.
                </Text>
                <TouchableOpacity 
                  style={styles.loginButton}
                  onPress={() => router.push('/auth/login')}
                >
                  <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          )}
      </ScrollView>
      </Animated.View>
      
      {/* عرض حوار حذف السيارة فقط للمستخدمين المسجلين */}
      {isAuthenticated && (
      <Portal>
          <Dialog visible={deleteDialogVisible} onDismiss={hideDeleteDialog} style={styles.deleteDialog}>
            <Dialog.Title style={styles.dialogTitle}>تأكيد الحذف</Dialog.Title>
          <Dialog.Content>
              <View style={styles.dialogContent}>
                <Icon name="alert-circle" size={40} color={COLORS.error} style={styles.dialogIcon} />
                <Text style={styles.dialogText}>
                  هل أنت متأكد من رغبتك في حذف هذه السيارة؟ سيتم حذف جميع سجلات الخدمة المرتبطة بها أيضًا.
            </Text>
                <Text style={styles.dialogWarning}>
                  لا يمكن التراجع عن هذا الإجراء.
                </Text>
              </View>
          </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <Button 
                mode="outlined" 
                onPress={hideDeleteDialog} 
                style={styles.cancelButton}
              >
                إلغاء
              </Button>
              <Button 
                mode="contained" 
                onPress={handleDelete} 
                style={styles.deleteButton}
                labelStyle={styles.deleteButtonText}
              >
              حذف
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      )}
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  topCard: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    padding: 15,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    padding: 15,
  },
  carHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
  },
  carIconContainer: {
    width: 70,
    height: 70,
    backgroundColor: COLORS.primary,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  carTitleContainer: {
    flex: 1,
  },
  carTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'right',
  },
  carSubtitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'right',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  plateNumber: {
    fontSize: 14,
    color: '#fff',
    marginRight: 6,
    fontWeight: '500',
  },
  coloredDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  carDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailColumn: {
    width: '48%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    marginLeft: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 8,
    borderRadius: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
  detailTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
    flex: 1,
    textAlign: 'right',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  ownerAvatarContainer: {
    marginLeft: 16,
  },
  ownerAvatar: {
    backgroundColor: COLORS.primary,
  },
  avatarSurface: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
  },
  ownerDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#555',
    marginRight: 8,
  },
  contactIconContainer: {
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailIconContainer: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  valueSurface: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f5f8ff',
    width: '100%',
    alignItems: 'flex-end',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  primaryAction: {
    width: '48%',
  },
  secondaryAction: {
    width: '48%',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  secondaryActionText: {
    color: COLORS.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyActionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  visitItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitIcon: {
    marginLeft: 6,
  },
  visitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  visitDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitDate: {
    fontSize: 12,
    color: '#666',
  },
  visitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  visitPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#218c74',
  },
  mileageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mileageText: {
    fontSize: 12,
    color: '#555',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  visitNotes: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  visitFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  deleteDialog: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 18,
    color: COLORS.error,
  },
  dialogContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dialogIcon: {
    marginBottom: 16,
  },
  dialogText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  dialogWarning: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.error,
    fontWeight: 'bold',
  },
  dialogActions: {
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cancelButton: {
    borderColor: '#ddd',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorSurface: {
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    color: COLORS.error,
  },
  animatedView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintenanceSection: {
    padding: 10,
  },
  infoBlockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  infoBlockWrapper: {
    flex: 1,
  },
  infoBlock: {
    flex: 1,
    padding: 10,
    margin: 5,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  infoDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#ddd',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  latestServiceContainer: {
    marginTop: 15,
  },
  sectionSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 8,
  },
  serviceDetailsCard: {
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    backgroundColor: '#fff',
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceDetailItem: {
    flex: 1,
  },
  serviceDetailLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 3,
  },
  serviceDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  notesContainer: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  notesLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  notesValue: {
    fontSize: 13,
    color: '#333',
  },
  serviceTypeContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  serviceTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceTypeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  viewServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  viewServiceButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 6,
  },
  contentContainer: {
    padding: 15,
  },
  carDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  publicNoticeCard: {
    backgroundColor: '#f8f8ff',
    marginVertical: 10,
  },
  publicNotice: {
    alignItems: 'center',
    padding: 15,
  },
  publicNoticeIcon: {
    marginBottom: 10,
  },
  publicNoticeText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 
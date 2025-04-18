import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Share, Alert, Linking, Platform } from 'react-native';
import { Appbar, Text, Card, Searchbar, FAB, ActivityIndicator, Badge, Divider } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// تحديث كائن الألوان لإضافة لون النجاح
const COLORS_EXTENDED = {
  ...COLORS,
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
};

export default function CarsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true); // حالة جديدة لتحميل البيانات الأولي
  const [refreshing, setRefreshing] = useState(false);
  const [cars, setCars] = useState<any[]>([]);
  const [filteredCars, setFilteredCars] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shop, setShop] = useState<any>(null);
  
  // متغيرات التحميل التدريجي الجديدة
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const ITEMS_PER_PAGE = 10; // عدد السيارات في كل صفحة
  
  useEffect(() => {
    loadShopData();
  }, []);
  
  useEffect(() => {
    if (shop) {
      // تحميل البيانات الأولية فقط (الصفحة الأولى)
      loadCars(1, true);
    }
  }, [shop]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCars(cars);
    } else {
      filterCars();
    }
  }, [cars, searchQuery]);
  
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
  
  // دالة معدلة لتحميل السيارات مع دعم التحميل التدريجي
  const loadCars = async (pageNumber = page, isInitial = false) => {
    if (!shop) return;
    
    if (isInitial) {
      setInitialLoading(true);
    } else if (!isInitial && pageNumber === 1) {
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      // حساب الحدود للتحميل التدريجي
      const from = (pageNumber - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // تحسين طلب البيانات عن طريق طلب المعلومات الضرورية فقط
      const { data, error, count } = await supabase
        .from('cars_new')
        .select(`
          qr_id,
          make,
          model,
          year,
          color,
          plate_number,
          last_oil_change_date,
          updated_at,
          customer:customer_id (
            id,
            name,
            phone
          )
        `, { count: 'exact' })
        .eq('shop_id', shop.id)
        .order('updated_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      // تعيين قيم افتراضية لبيانات الخدمة وتحسين الأداء
      const carsWithFormattedData = data?.map(car => ({
        ...car,
        lastServiceDate: car.last_oil_change_date || null,
        lastServiceType: 'تغيير زيت',
        visitsCount: car.last_oil_change_date ? 1 : 0
      }));
      
      // إضافة السيارات الجديدة أو استبدال القائمة حسب رقم الصفحة
      if (pageNumber === 1) {
        setCars(carsWithFormattedData || []);
      } else {
        setCars(prev => [...prev, ...(carsWithFormattedData || [])]);
      }
      
      // التحقق مما إذا كان هناك المزيد من البيانات للتحميل
      setHasMoreData(data ? data.length === ITEMS_PER_PAGE : false);
      
      // تحديث رقم الصفحة الحالية
      setPage(pageNumber);
      
    } catch (error) {
      console.error('فشل في تحميل السيارات:', error);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else if (!isInitial && pageNumber === 1) {
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
      setLoading(false);
    }
  };
  
  // تحميل المزيد من السيارات عند التمرير
  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData) {
      loadCars(page + 1);
    }
  };
  
  // تحسين أداء الترشيح باستخدام useMemo
  const filterCars = () => {
    if (searchQuery.trim() === '') {
      return;
    }
    
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = cars.filter(
      car =>
        (car.make?.toLowerCase() || '').includes(lowercasedQuery) ||
        (car.model?.toLowerCase() || '').includes(lowercasedQuery) ||
        (car.year?.toString() || '').includes(lowercasedQuery) ||
        (car.plate_number?.toLowerCase() || '').includes(lowercasedQuery) ||
        (car.vin?.toLowerCase() || '').includes(lowercasedQuery) ||
        (car.customer?.name?.toLowerCase() || '').includes(lowercasedQuery) ||
        (car.customer?.phone || '').includes(lowercasedQuery)
    );
    
    setFilteredCars(filtered);
  };
  
  // حساب الإحصائيات بطريقة أكثر كفاءة باستخدام useMemo
  const statistics = React.useMemo(() => {
    const carsWithService = filteredCars.filter(car => car.lastServiceDate).length;
    const carsWithoutService = filteredCars.length - carsWithService;
    
    return {
      total: filteredCars.length,
      serviced: carsWithService,
      needService: carsWithoutService
    };
  }, [filteredCars]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadCars(1);
  };
  
  const handleAddCar = () => {
    router.push('/shop/add-car');
  };
  
  const handleCarPress = (car: any) => {
    router.push(`/shop/public/car/${car.qr_id}`);
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'لا يوجد';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const handleShareCar = async (car: any) => {
    try {
      const shareUrl = `https://yazcar.xyz/shop/public/car/${car.qr_id}`;
      const shareMessage = `معلومات سيارة ${car.make} ${car.model} - ${car.plate_number}\n\nللإطلاع على تفاصيل السيارة والصيانة، اضغط على الرابط:\n${shareUrl}`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: `معلومات سيارة ${car.make} ${car.model}`,
      });
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء محاولة المشاركة');
      console.error(error);
    }
  };
  
  const handleShareApp = async () => {
    try {
      const shareUrl = `https://yazcar.xyz/shop`;
      const shareMessage = `تطبيق يازكار - نظام إدارة ورش السيارات\n\nلتجربة التطبيق، اضغط على الرابط:\n${shareUrl}`;

      await Share.share({
        message: shareMessage,
        url: shareUrl,
        title: 'شارك تطبيق يازكار',
      });
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء محاولة المشاركة');
      console.error(error);
    }
  };
  
  const handleCallCustomer = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('خطأ', 'رقم الهاتف غير متوفر');
    }
  };
  
  // استخدام React.memo للأداء الأفضل في عرض العناصر
  const CarItem = React.memo(({ item }: { item: any }) => {
    return (
      <Card style={styles.carCard}>
        <TouchableOpacity onPress={() => handleCarPress(item)}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.carHeader}>
              <View style={styles.carInfo}>
                <Text style={styles.carTitle}>
                  {item.make} {item.model}
                </Text>
                <Text style={styles.carSubtitle}>
                  <Icon name="calendar" size={14} color={COLORS.gray} style={styles.smallIcon} />
                  {item.year || 'غير محدد'}
                  {item.color && (
                    <>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Icon name="palette" size={14} color={COLORS.gray} style={styles.smallIcon} />
                      {item.color}
                    </>
                  )}
                </Text>
              </View>
              <View style={styles.badgeContainer}>
                <Badge style={styles.badge}>{item.plate_number}</Badge>
                {item.lastServiceDate && (
                  <View style={styles.serviceIndicator}>
                    <Icon 
                      name="check-circle" 
                      size={16} 
                      color={COLORS_EXTENDED.success} 
                      style={styles.serviceIcon} 
                    />
                    <Text style={styles.serviceText}>تمت الصيانة</Text>
                  </View>
                )}
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.detailsContainer}>
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameContainer}>
                  <Icon name="account" size={16} color={COLORS.gray} style={styles.icon} />
                  <Text style={styles.ownerName}>{item.customer?.name || 'غير معروف'}</Text>
                </View>
                
                {item.customer?.phone && (
                  <TouchableOpacity 
                    style={styles.phoneButton}
                    onPress={() => handleCallCustomer(item.customer?.phone)}
                  >
                    <Icon name="phone" size={16} color={COLORS_EXTENDED.success} />
                    <Text style={styles.phoneButtonText}>{item.customer?.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.serviceInfo}>
                <View style={styles.serviceRow}>
                  <View style={styles.serviceBlock}>
                    <Text style={styles.serviceLabel}>آخر خدمة:</Text>
                    <Text style={styles.serviceValue}>
                      {item.lastServiceDate ? formatDate(item.lastServiceDate) : 'لا توجد خدمات'}
                    </Text>
                  </View>
                  
                  {item.lastServiceType && (
                    <View style={styles.serviceBlock}>
                      <Text style={styles.serviceLabel}>نوع الخدمة:</Text>
                      <Text style={styles.serviceValue}>{item.lastServiceType}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.serviceVisitsBlock}>
                  <Icon name="history" size={16} color={COLORS.primary} style={styles.visitIcon} />
                  <Text style={styles.serviceLabel}>عدد الزيارات:</Text>
                  <Text style={styles.serviceValue}>{item.visitsCount}</Text>
                </View>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.cardFooter}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleCarPress(item)}
              >
                <Icon name="qrcode-scan" size={18} color={COLORS.primary} />
                <Text style={styles.actionText}>عرض التفاصيل</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleShareCar(item)}
              >
                <Icon name="share-variant" size={18} color={COLORS.primary} />
                <Text style={styles.actionText}>مشاركة</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/shop/add-service-visit?carId=${item.qr_id}`)}
              >
                <Icon name="wrench" size={18} color={COLORS.primary} />
                <Text style={styles.actionText}>خدمة جديدة</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  });
  
  // مكون عرض مؤشر التحميل في نهاية القائمة
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingMoreText}>جاري تحميل المزيد من السيارات...</Text>
      </View>
    );
  };
  
  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="car-outline" size={80} color={COLORS.gray} />
      <Text style={styles.emptyText}>لا توجد سيارات مسجلة</Text>
    </View>
  );
  
  // شاشة التحميل الأولية فقط تظهر في المرة الأولى
  if (initialLoading) {
    return <Loading fullScreen message="جاري تحميل السيارات..." />;
  }
  
  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content
          title="إدارة السيارات"
          titleStyle={[styles.headerTitle, { color: "#fff" }]}
        />
        <Appbar.Action
          icon="filter-variant"
          color="#fff"
          onPress={() => {
            Alert.alert(
              'تصفية السيارات',
              'اختر فلتر',
              [
                {
                  text: 'الكل',
                  onPress: () => setFilteredCars(cars)
                },
                {
                  text: 'تمت صيانتها',
                  onPress: () => setFilteredCars(cars.filter(car => car.lastServiceDate))
                },
                {
                  text: 'بحاجة للصيانة',
                  onPress: () => setFilteredCars(cars.filter(car => !car.lastServiceDate))
                },
                {
                  text: 'إلغاء',
                  style: 'cancel'
                },
              ]
            );
          }}
        />
        <Appbar.Action
          icon="share-variant"
          color="#fff"
          onPress={handleShareApp}
        />
        <Appbar.Action
          icon="magnify"
          color="#fff"
          onPress={() => {
            const searchInput = document.querySelector('input');
            if (searchInput) searchInput.focus();
          }}
        />
      </Appbar.Header>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.total}</Text>
          <Text style={styles.statLabel}>إجمالي السيارات</Text>
        </View>
        
        <View style={[styles.statCard, { marginHorizontal: SPACING.md }]}>
          <Text style={styles.statNumber}>{statistics.serviced}</Text>
          <Text style={styles.statLabel}>تمت صيانتها</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{statistics.needService}</Text>
          <Text style={styles.statLabel}>بحاجة للصيانة</Text>
        </View>
      </View>
      
      <Searchbar
        placeholder="بحث عن سيارة..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={COLORS.primary}
        placeholderTextColor="#777"
        inputStyle={{ color: '#333', textAlign: 'right', paddingHorizontal: 15 }}
        theme={{ colors: { text: '#333', primary: COLORS.primary } }}
      />
      
      <FlatList
        data={filteredCars}
        renderItem={({ item }) => <CarItem item={item} />}
        keyExtractor={(item) => item.qr_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={EmptyList}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={ITEMS_PER_PAGE}
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddCar}
        color={COLORS.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: COLORS.primary,
    elevation: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  searchBar: {
    margin: SPACING.md,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    paddingHorizontal: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #eaeaea',
    } : {})
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: '#f5f7fa',
    marginBottom: 5,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
    elevation: 0,
    shadowOpacity: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none',
    } : {})
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  carCard: {
    marginBottom: SPACING.md,
    elevation: 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      border: '1px solid #eaeaea',
    } : {})
  },
  cardContent: {
    padding: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  carTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  carSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  smallIcon: {
    marginRight: SPACING.xs,
  },
  dotSeparator: {
    marginHorizontal: SPACING.xs,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  serviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  serviceIcon: {
    marginRight: 4,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS_EXTENDED.success,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    margin: SPACING.xs,
    padding: SPACING.sm,
  },
  divider: {
    marginVertical: SPACING.sm,
    backgroundColor: '#e0e0e0',
    height: 1,
  },
  ownerInfo: {
    padding: SPACING.xs,
  },
  ownerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  ownerName: {
    fontSize: 15,
    color: '#333',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  phoneButtonText: {
    fontSize: 14,
    marginLeft: SPACING.xs,
    color: COLORS_EXTENDED.success,
  },
  serviceInfo: {
    padding: SPACING.xs,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceBlock: {
    marginBottom: SPACING.xs,
    flex: 1,
  },
  serviceVisitsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
  },
  visitIcon: {
    marginRight: SPACING.xs,
  },
  serviceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginRight: 5,
  },
  serviceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    marginLeft: SPACING.xs,
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  // أنماط جديدة للتحميل التدريجي
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  loadingMoreText: {
    marginLeft: 10,
    color: COLORS.gray,
    fontSize: 14,
  },
}); 
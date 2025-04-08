import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Share, Alert, Linking } from 'react-native';
import { Appbar, Text, Card, Badge, Searchbar, Divider, FAB } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// تحديث كائن الألوان لإضافة لون النجاح إذا لم يكن موجوداً
const COLORS_EXTENDED = {
  ...COLORS,
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
};

export default function CarsListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cars, setCars] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCars, setFilteredCars] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    loadShopData();
  }, []);

  useEffect(() => {
    if (shop) {
      loadCars();
    }
  }, [shop]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCars(cars);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = cars.filter(car => 
        car.make.toLowerCase().includes(lowercasedQuery) ||
        car.model.toLowerCase().includes(lowercasedQuery) ||
        car.plate_number.toLowerCase().includes(lowercasedQuery) ||
        car.customer?.name?.toLowerCase().includes(lowercasedQuery) ||
        car.customer?.phone?.includes(lowercasedQuery)
      );
      setFilteredCars(filtered);
    }
  }, [searchQuery, cars]);

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
  
  const loadCars = async () => {
    if (!shop) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          *,
          customer:customer_id (
            id,
            name,
            phone
          )
        `)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCars(data || []);
      setFilteredCars(data || []);
    } catch (error) {
      console.error('فشل في تحميل قائمة السيارات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCars();
  };

  const handleShareCar = async (car: any) => {
    try {
      const shareUrl = `${window.location.origin}/shop/public/car/${car.qr_id}`;
      const shareMessage = `معلومات سيارة ${car.make} ${car.model} - ${car.plate_number}\n\nللإطلاع على تفاصيل السيارة والصيانة، اضغط على الرابط:\n${shareUrl}`;

      await Share.share({
        message: shareMessage,
        url: shareUrl, // This will be used on iOS
        title: `معلومات سيارة ${car.make} ${car.model}`,
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

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.carCard}>
      <TouchableOpacity
        onPress={() => router.push(`/shop/public/car/${item.qr_id}`)}
      >
        <Card.Content>
          <View style={styles.carHeader}>
            <View style={styles.carInfo}>
              <Text style={styles.carTitle}>{item.make} {item.model}</Text>
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
              {item.last_oil_change_date && (
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
          
          <View style={styles.ownerInfo}>
            <View style={styles.ownerNameContainer}>
              <Icon name="account" size={20} color={COLORS.gray} style={styles.infoIcon} />
              <Text style={styles.ownerName}>{item.customer?.name || 'غير معروف'}</Text>
            </View>
            
            {item.customer?.phone && (
              <TouchableOpacity 
                style={styles.phoneButton}
                onPress={() => handleCallCustomer(item.customer?.phone)}
              >
                <Icon name="phone" size={18} color={COLORS_EXTENDED.success} />
                <Text style={styles.phoneButtonText}>{item.customer?.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.cardFooter}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push(`/shop/public/car/${item.qr_id}`)}
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
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="car-off" size={80} color={COLORS.gray} />
      <Text style={styles.emptyText}>لا توجد سيارات مسجلة</Text>
      <Text style={styles.emptySubText}>قم بإضافة سيارة جديدة من زر الإضافة أدناه</Text>
    </View>
  );

  if (loading && !refreshing) {
    return <Loading fullScreen message="جاري تحميل قائمة السيارات..." />;
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="قائمة السيارات" />
        <Appbar.Action icon="filter-variant" onPress={() => {
          // هنا يمكن إضافة منطق تصفية السيارات لاحقاً
          Alert.alert('تصفية السيارات', 'سيتم تنفيذ هذه الميزة قريباً');
        }} />
      </Appbar.Header>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredCars.length}</Text>
          <Text style={styles.statLabel}>إجمالي السيارات</Text>
        </View>
        
        <View style={[styles.statCard, { marginHorizontal: SPACING.md }]}>
          <Text style={styles.statNumber}>
            {filteredCars.filter(car => new Date(car.last_oil_change_date || 0) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length}
          </Text>
          <Text style={styles.statLabel}>تمت صيانتها حديثاً</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {filteredCars.filter(car => !car.last_oil_change_date).length}
          </Text>
          <Text style={styles.statLabel}>بحاجة للصيانة</Text>
        </View>
      </View>

      <Searchbar
        placeholder="البحث عن سيارة..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={COLORS.primary}
      />

      <FlatList
        data={filteredCars}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={EmptyList}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/shop/add-car')}
        color={COLORS.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    elevation: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: SPACING.sm,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  searchBar: {
    margin: SPACING.md,
    elevation: 2,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2, // للفاب
  },
  carCard: {
    marginBottom: SPACING.md,
    elevation: 2,
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  carInfo: {
    flexDirection: 'column',
  },
  carTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  carSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  ownerInfo: {
    flexDirection: 'column',
    paddingVertical: SPACING.sm,
  },
  infoIcon: {
    marginRight: SPACING.xs,
  },
  phoneIcon: {
    marginLeft: SPACING.md,
  },
  ownerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ownerName: {
    fontSize: 14,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
    backgroundColor: '#f0f8f0',
    borderRadius: SPACING.xs,
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  phoneButtonText: {
    marginLeft: SPACING.xs,
    color: COLORS_EXTENDED.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    color: COLORS.gray,
  },
  emptySubText: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: SPACING.xs,
  },
  smallIcon: {
    marginRight: SPACING.xs,
  },
  dotSeparator: {
    marginHorizontal: SPACING.xs,
  },
  serviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  serviceIcon: {
    marginRight: SPACING.xs,
  },
  serviceText: {
    fontSize: 14,
  },
}); 
// @ts-ignore
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Appbar, Text, Card, Divider, Searchbar, Chip, Button, Badge } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollView } from 'react-native-gesture-handler';
import useSWR, { mutate } from 'swr';
import { fetchShopData, fetchShopServiceHistory, fetchCarDetails, fetchCarServiceHistory, getCacheKey } from '../utils/swr-config';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams();
  const carId = params.carId?.toString();
  
  const [serviceVisits, setServiceVisits] = useState<any[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [car, setCar] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // استخدام SWR لتحميل بيانات المحل
  const { data: shopData, error: shopError, isLoading: shopLoading } = useSWR(
    user ? getCacheKey('shop-data', user.id) : null,
    () => user ? fetchShopData(user.id) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 ثوانٍ
      focusThrottleInterval: 10000
    }
  );
  
  // استخدام SWR لتحميل بيانات السيارة إذا تم تحديد سيارة
  const { data: carData, error: carError, isLoading: carLoading } = useSWR(
    carId ? getCacheKey('car-details', carId) : null,
    () => fetchCarDetails(carId as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000
    }
  );
  
  // استخدام SWR لتحميل سجل خدمات السيارة أو المحل
  const { data: serviceHistory, error: serviceError, isLoading: serviceLoading, mutate: mutateServices } = useSWR(
    () => {
      if (carId) {
        return getCacheKey('car-service-history', carId);
      } else if (shopData) {
        return getCacheKey('shop-service-history', shopData.id);
      }
      return null;
    },
    () => {
      if (carId) {
        return fetchCarServiceHistory(carId);
      } else if (shopData) {
        return fetchShopServiceHistory(shopData.id);
      }
      return null;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000
    }
  );
  
  useEffect(() => {
    if (shopData) {
      setShop(shopData);
    }
  }, [shopData]);
  
  useEffect(() => {
    if (carData) {
      setCar(carData);
    }
  }, [carData]);
  
  useEffect(() => {
    if (serviceHistory) {
      const carLogs: any[] = [];
      const combinedData = [...(serviceHistory || []), ...carLogs];
      
      // ترتيب البيانات المدمجة حسب التاريخ
      const sortedData = combinedData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setServiceVisits(sortedData || []);
      setFilteredVisits(sortedData || []);
    }
  }, [serviceHistory]);
  
  useEffect(() => {
    filterVisits();
  }, [serviceVisits, searchQuery, selectedCategoryId]);
  
  const getCarIdAsString = (): string => {
    return carId ? carId.toString() : '';
  };
  
  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('فشل في تحميل فئات الخدمة:', error);
    }
  };
  
  const filterVisits = () => {
    let filtered = [...serviceVisits];
    
    // البحث
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        visit =>
          visit.service_categories?.name?.toLowerCase().includes(lowercasedQuery) ||
          visit.service_category?.name?.toLowerCase().includes(lowercasedQuery) ||
          visit.notes?.toLowerCase().includes(lowercasedQuery) ||
          visit.car?.make?.toLowerCase().includes(lowercasedQuery) ||
          visit.car?.model?.toLowerCase().includes(lowercasedQuery) ||
          visit.car?.plate_number?.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    // فلترة حسب الفئة
    if (selectedCategoryId) {
      if (selectedCategoryId === 'logs') {
        // إظهار السجلات فقط
        filtered = filtered.filter(visit => visit.is_log_entry);
      } else if (selectedCategoryId === 'services') {
        // إظهار الخدمات فقط
        filtered = filtered.filter(visit => !visit.is_log_entry);
      } else if (selectedCategoryId === 'oil_related') {
        // إظهار خدمات الزيت فقط
        filtered = filtered.filter(
          visit => 
            visit.log_type === 'oil_change' || 
            visit.category_id === 'oil_change' ||
            visit.service_categories?.name?.toLowerCase().includes('زيت') ||
            visit.service_category?.name?.toLowerCase().includes('زيت')
        );
      } else if (selectedCategoryId === 'filters') {
        // إظهار خدمات تغيير الفلاتر فقط
        filtered = filtered.filter(
          visit => 
            visit.log_type === 'oil_filter' || 
            visit.log_type === 'air_filter' || 
            visit.log_type === 'cabin_filter' ||
            visit.service_categories?.name?.toLowerCase().includes('فلتر') ||
            visit.service_category?.name?.toLowerCase().includes('فلتر')
        );
      } else {
        // فلترة عادية حسب معرف الفئة
      filtered = filtered.filter(
          visit => visit.category_id === selectedCategoryId
      );
      }
    }
    
    setFilteredVisits(filtered);
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    mutateServices().finally(() => {
      setRefreshing(false);
    });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => {
        // إذا كان سجل توجه لتفاصيل السيارة، وإلا إلى تفاصيل الخدمة
        if (item.is_log_entry) {
          router.push(`/shop/public/car/${item.car_id}`);
        } else {
          router.push(`/shop/service-details/${item.id}`);
        }
      }}
    >
      <Card 
        style={[
          styles.visitCard, 
          item.is_log_entry && styles.logEntryCard,
          { borderRadius: 10 }
        ]}
        elevation={item.is_log_entry ? 1 : 3}
      >
        <Card.Content>
          {!getCarIdAsString() && (
            <>
              <View style={styles.carInfoContainer}>
                <Icon name="car" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.carInfo}>
                {item.car?.make} {item.car?.model} ({item.car?.year})
              </Text>
              </View>
              <Text style={styles.plateNumber}>رقم اللوحة: {item.car?.plate_number}</Text>
              <Divider style={styles.divider} />
            </>
          )}
          
          <View style={styles.visitHeader}>
            <View style={styles.titleContainer}>
              {item.is_log_entry && (
                <Icon 
                  name={item.icon || (item.log_type === 'car_registration' ? 'car-hatchback' : 'history')} 
                  size={22} 
                  color={COLORS.primary} 
                  style={styles.logIcon}
                />
              )}
            <View>
                <Text style={[styles.visitTitle, item.is_log_entry && styles.logEntryTitle]}>
                  {item.service_categories?.name || item.service_category?.name}
                </Text>
              <Text style={styles.visitDate}>{formatDate(item.date)}</Text>
              </View>
            </View>
            {!item.is_log_entry && (
            <Text style={styles.visitPrice}>{item.price} ريال</Text>
            )}
          </View>
          
          {item.mileage && (
            <View style={styles.mileageContainer}>
              <Icon name="speedometer" size={16} color={COLORS.gray} />
              <Text style={styles.mileageText}>{item.mileage} كم</Text>
            </View>
          )}
          
          {item.notes && (
            <View style={styles.notesContainer}>
              {!item.is_log_entry && <Text style={styles.notesLabel}>ملاحظات:</Text>}
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          {item.is_log_entry && (
            <View style={styles.viewDetailsContainer}>
              <Text style={styles.viewDetailsText}>اضغط للتفاصيل</Text>
              <Icon name="chevron-left" size={16} color={COLORS.primary} />
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
  
  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="wrench-outline" size={60} color={COLORS.white} />
      </View>
      <Text style={styles.emptyText}>لا توجد خدمات مسجلة</Text>
      <Text style={styles.emptySubText}>
        {getCarIdAsString() 
          ? "لم يتم تسجيل أي خدمات لهذه السيارة بعد" 
          : "قم بإضافة خدمات جديدة لتظهر هنا"}
      </Text>
      {carId && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push(`/shop/add-service-visit?carId=${getCarIdAsString()}`)}
          style={styles.addButton}
          labelStyle={styles.addButtonLabel}
        >
          إضافة خدمة جديدة
        </Button>
      )}
    </View>
  );
  
  const renderCategoriesFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScrollContent}
      >
        <Chip
          mode={selectedCategoryId === null ? 'flat' : 'outlined'}
          selected={selectedCategoryId === null}
          onPress={() => setSelectedCategoryId(null)}
          style={[styles.filterChip, selectedCategoryId === null ? styles.activeFilterChip : null]}
          selectedColor={selectedCategoryId === null ? COLORS.white : COLORS.primary}
          icon="view-list"
        >
          الكل
        </Chip>
        
        <Chip
          mode={selectedCategoryId === 'services' ? 'flat' : 'outlined'}
          selected={selectedCategoryId === 'services'}
          onPress={() => setSelectedCategoryId('services')}
          style={[styles.filterChip, selectedCategoryId === 'services' ? styles.activeFilterChip : null]}
          selectedColor={selectedCategoryId === 'services' ? COLORS.white : COLORS.primary}
          icon="wrench"
        >
          خدمات
        </Chip>
        
        <Chip
          mode={selectedCategoryId === 'logs' ? 'flat' : 'outlined'}
          selected={selectedCategoryId === 'logs'}
          onPress={() => setSelectedCategoryId('logs')}
          style={[styles.filterChip, selectedCategoryId === 'logs' ? styles.activeFilterChip : null]}
          selectedColor={selectedCategoryId === 'logs' ? COLORS.white : COLORS.primary}
          icon="history"
        >
          سجلات
        </Chip>
        
        <Chip
          mode={selectedCategoryId === 'oil_related' ? 'flat' : 'outlined'}
          selected={selectedCategoryId === 'oil_related'}
          onPress={() => setSelectedCategoryId('oil_related')}
          style={[styles.filterChip, selectedCategoryId === 'oil_related' ? styles.activeFilterChip : null]}
          selectedColor={selectedCategoryId === 'oil_related' ? COLORS.white : COLORS.primary}
          icon="oil"
        >
          خدمات الزيت
        </Chip>
        
        <Chip
          mode={selectedCategoryId === 'filters' ? 'flat' : 'outlined'}
          selected={selectedCategoryId === 'filters'}
          onPress={() => setSelectedCategoryId('filters')}
          style={[styles.filterChip, selectedCategoryId === 'filters' ? styles.activeFilterChip : null]}
          selectedColor={selectedCategoryId === 'filters' ? COLORS.white : COLORS.primary}
          icon="air-filter"
        >
          الفلاتر
        </Chip>
        
        {categories.map((category) => (
          <Chip
            key={category.id}
            mode={selectedCategoryId === category.id ? 'flat' : 'outlined'}
            selected={selectedCategoryId === category.id}
            onPress={() => setSelectedCategoryId(category.id)}
            style={[styles.filterChip, selectedCategoryId === category.id ? styles.activeFilterChip : null]}
            selectedColor={selectedCategoryId === category.id ? COLORS.white : COLORS.primary}
          >
            {category.name}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
  
  const FAB = () => (
    <TouchableOpacity 
      style={styles.fab}
      onPress={() => router.push(`/shop/add-service-visit?carId=${getCarIdAsString()}`)}
    >
      <View style={styles.fabContent}>
        <Icon name="plus" size={24} color={COLORS.white} />
      </View>
    </TouchableOpacity>
  );
  
  const title = car ? `سجل خدمات ${car.make} ${car.model}` : "سجل الخدمات";
  
  // حالة التحميل
  const isLoading = shopLoading || (carId ? carLoading : false) || serviceLoading;
  if (isLoading && !refreshing) {
    return <Loading fullScreen message="جاري تحميل سجل الخدمات..." />;
  }
  
  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color={COLORS.white} />
        <Appbar.Content title={title} titleStyle={styles.headerTitle} />
        <Appbar.Action icon="refresh" onPress={handleRefresh} color={COLORS.white} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
      <Searchbar
        placeholder="بحث في سجل الخدمات..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={COLORS.primary}
          placeholderTextColor={COLORS.gray}
      />
      </View>
      
      {renderCategoriesFilter()}
      
      <FlatList
        data={filteredVisits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={EmptyList}
        showsVerticalScrollIndicator={false}
      />
      
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    elevation: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  searchContainer: {
    margin: SPACING.md,
  },
  searchBar: {
    elevation: 2,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  filterContainer: {
    marginBottom: SPACING.sm,
  },
  filtersScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  filterChip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: 20,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
  },
  visitCard: {
    marginBottom: SPACING.md,
    elevation: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  carInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  carInfo: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  plateNumber: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.xs,
    marginLeft: 24,
  },
  divider: {
    marginVertical: SPACING.xs,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logIcon: {
    marginRight: SPACING.xs,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    padding: 5,
    borderRadius: 15,
  },
  visitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  visitDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  visitPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  mileageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  mileageText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    padding: 10,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 12,
    color: COLORS.dark,
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
    marginBottom: SPACING.lg,
    color: COLORS.gray,
  },
  emptyIconContainer: {
    backgroundColor: COLORS.primary,
    borderRadius: 100,
    padding: SPACING.md,
  },
  emptySubText: {
    marginBottom: SPACING.md,
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.gray,
  },
  addButton: {
    marginTop: SPACING.md,
    borderRadius: 20,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logEntryCard: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    elevation: 1,
  },
  logEntryTitle: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 4,
  },
}); 
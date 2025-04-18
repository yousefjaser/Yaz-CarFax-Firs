// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, RefreshControl } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../utils/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants';
import { supabase } from '../config';
import { Button, Card, Title, Paragraph, Badge, Divider, ActivityIndicator, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShops: 0,
    totalCars: 0,
    pendingShops: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentShops, setRecentShops] = useState([]);
  
  // استخدام مكون التنقل للوصول إلى الدراور
  const navigation = useNavigation();
  
  // فتح الdrawer باستخدام الدالة العالمية - نفس طريقة shop-dashboard
  const openDrawer = () => {
    try {
      // منع الاستدعاءات المتكررة
      if (global._isOpeningAdminDrawer) {
        console.log("تم تجاهل طلب فتح القائمة - القائمة تفتح حالياً");
        return;
      }
      
      // وضع علامة أن الفتح قيد التنفيذ
      global._isOpeningAdminDrawer = true;
      
      // حماية إضافية للجوال مع تأخير إزالة العلامة
      setTimeout(() => {
        global._isOpeningAdminDrawer = false;
      }, Platform.OS === 'ios' ? 800 : 500);
      
      // نستخدم الdrawer المخصص فقط
      if (global && global.openAdminDrawer) {
        global.openAdminDrawer();
      }
      // نلغي الخيار البديل لتجنب التعارض
    } catch (error) {
      global._isOpeningAdminDrawer = false;
      console.error('خطأ في فتح القائمة:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // استرجاع بيانات لوحة التحكم
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // إحصائيات المستخدمين
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) throw userError;
      
      // إحصائيات المحلات
      const { count: shopCount, error: shopError } = await supabase
        .from('shops')
        .select('*', { count: 'exact', head: true });
        
      if (shopError) throw shopError;
      
      // إحصائيات المحلات المعلقة
      const { count: pendingShopCount, error: pendingError } = await supabase
        .from('shops')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);
        
      if (pendingError) throw pendingError;
      
      // إحصائيات السيارات
      const { count: carCount, error: carError } = await supabase
        .from('cars_new')
        .select('*', { count: 'exact', head: true });
        
      if (carError) throw carError;
      
      // الحصول على آخر 5 مستخدمين تم تسجيلهم
      const { data: recentUsersData, error: recentUsersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (recentUsersError) throw recentUsersError;
      
      // الحصول على آخر 5 محلات تم تسجيلها
      const { data: recentShopsData, error: recentShopsError } = await supabase
        .from('shops')
        .select('*, users:owner_id(name, email)')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (recentShopsError) throw recentShopsError;
      
      setStats({
        totalUsers: userCount || 0,
        totalShops: shopCount || 0,
        totalCars: carCount || 0,
        pendingShops: pendingShopCount || 0
      });
      
      setRecentUsers(recentUsersData || []);
      setRecentShops(recentShopsData || []);
      
    } catch (error) {
      console.error('خطأ في استرجاع البيانات:', error);
      Alert.alert('خطأ', 'فشل في استرجاع البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleQuickAction = (route) => {
    router.push(route);
  };

  const getUserTypeText = (type) => {
    switch (type) {
      case 'admin': return 'مسؤول';
      case 'shop_owner': return 'مالك محل';
      case 'customer': return 'عميل';
      default: return 'غير معروف';
    }
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'admin': return 'shield-account';
      case 'shop_owner': return 'store';
      case 'customer': return 'account';
      default: return 'account-question';
    }
  };

  const getShopStatusBadge = (shop) => {
    if (!shop.is_approved) {
      return <Badge style={styles.pendingBadge}>قيد الانتظار</Badge>;
    } else {
      return <Badge style={styles.verifiedBadge}>موثق</Badge>;
    }
  };

  // دالة لتنسيق التاريخ بشكل بسيط
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'غير معروف';
      
      const date = new Date(dateString);
      const now = new Date();
      
      // حساب الفرق بالأيام
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'اليوم';
      } else if (diffDays === 1) {
        return 'أمس';
      } else if (diffDays < 7) {
        return `منذ ${diffDays} أيام`;
      } else {
        // تنسيق التاريخ
        return date.toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return 'تاريخ غير صالح';
    }
  };

  return (
    <View style={styles.container}>
      {/* رأس الصفحة مع أيقونة الدراور */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer}>
          <Icon name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>لوحة تحكم المدير</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => fetchDashboardData()}>
            <Icon name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('الإشعارات', 'ستظهر هنا إشعارات النظام')}>
            <Icon name="bell-outline" size={24} color="#FFF" />
            {stats.pendingShops > 0 && (
              <Badge style={styles.notificationBadge}>{stats.pendingShops}</Badge>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
          </View>
        ) : (
          <>
            {/* ترحيب */}
            <View style={styles.welcomeSection}>
              <Card style={styles.welcomeCard}>
                <Card.Content>
                  <View style={styles.welcomeHeader}>
                    <Title style={styles.welcomeTitle}>مرحباً بك، {user?.name || 'المدير'}</Title>
                    <Icon name="hand-wave" size={30} color="#F9A825" />
                  </View>
                  <Text style={styles.welcomeSubtitle}>
                    {new Date().getHours() < 12 
                      ? 'صباح الخير! نتمنى لك يوم عمل سعيد' 
                      : new Date().getHours() < 17 
                        ? 'ظهر سعيد! كيف تسير الأمور اليوم؟' 
                        : 'مساء الخير! نأمل أن يكون يومك قد مر بشكل جيد'}
                  </Text>
                </Card.Content>
              </Card>
            </View>
            
            {/* بطاقات الإحصائيات */}
            <View style={styles.statsContainer}>
              <Card style={[styles.statsCard, styles.userCard]}>
                <Card.Content>
                  <Title style={styles.statTitle}>{stats.totalUsers}</Title>
                  <Paragraph style={styles.statLabel}>المستخدمين</Paragraph>
                </Card.Content>
                <View style={[styles.cardIcon, {backgroundColor: '#3498db20'}]}>
                  <Icon name="account-group" size={24} color="#3498db" />
                </View>
              </Card>
              
              <Card style={[styles.statsCard, styles.shopCard]}>
                <Card.Content>
                  <Title style={styles.statTitle}>{stats.totalShops}</Title>
                  <Paragraph style={styles.statLabel}>المحلات</Paragraph>
                </Card.Content>
                <View style={[styles.cardIcon, {backgroundColor: '#2ecc7120'}]}>
                  <Icon name="store" size={24} color="#2ecc71" />
                </View>
              </Card>
              
              <Card style={[styles.statsCard, styles.carCard]}>
                <Card.Content>
                  <Title style={styles.statTitle}>{stats.totalCars}</Title>
                  <Paragraph style={styles.statLabel}>السيارات</Paragraph>
                </Card.Content>
                <View style={[styles.cardIcon, {backgroundColor: '#9b59b620'}]}>
                  <Icon name="car" size={24} color="#9b59b6" />
                </View>
              </Card>
              
              <Card style={[styles.statsCard, styles.pendingCard]}>
                <Card.Content>
                  <Title style={styles.statTitle}>{stats.pendingShops}</Title>
                  <Paragraph style={styles.statLabel}>محلات معلقة</Paragraph>
                </Card.Content>
                <View style={[styles.cardIcon, {backgroundColor: '#e67e2220'}]}>
                  <Icon name="clock-outline" size={24} color="#e67e22" />
                </View>
              </Card>
            </View>
            
            {/* الإجراءات السريعة */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('/admin/users')}
                >
                  <View style={[styles.quickActionIcon, {backgroundColor: '#3498db20'}]}>
                    <Icon name="account-plus" size={24} color="#3498db" />
                  </View>
                  <Text style={styles.quickActionLabel}>إضافة مستخدم</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('/admin/shops')}
                >
                  <View style={[styles.quickActionIcon, {backgroundColor: '#2ecc7120'}]}>
                    <Icon name="store-plus" size={24} color="#2ecc71" />
                  </View>
                  <Text style={styles.quickActionLabel}>إضافة محل</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('/admin/pending-shops')}
                >
                  <View style={[styles.quickActionIcon, {backgroundColor: '#e67e2220'}]}>
                    <Icon name="clipboard-check" size={24} color="#e67e22" />
                  </View>
                  <Text style={styles.quickActionLabel}>الطلبات المعلقة</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleQuickAction('/admin/service-categories')}
                >
                  <View style={[styles.quickActionIcon, {backgroundColor: '#9b59b620'}]}>
                    <Icon name="tag-plus" size={24} color="#9b59b6" />
                  </View>
                  <Text style={styles.quickActionLabel}>إضافة فئة</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Divider style={styles.divider} />
            
            {/* القسم الرئيسي */}
            <View style={styles.mainSection}>
              {/* المحلات المعلقة */}
              {stats.pendingShops > 0 && (
                <View style={styles.pendingSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      المحلات المعلقة
                      <Badge style={styles.headerBadge}>{stats.pendingShops}</Badge>
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/admin/pending-shops')}>
                      <Text style={styles.viewAll}>عرض الكل</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Card style={styles.alertCard}>
                    <Card.Content>
                      <View style={styles.alertContent}>
                        <Icon name="alert-circle" size={30} color={COLORS.warning} />
                        <Text style={styles.alertText}>
                          يوجد {stats.pendingShops} محل بحاجة إلى موافقة
                        </Text>
                      </View>
                      <Button 
                        mode="contained" 
                        style={styles.actionButton}
                        onPress={() => router.push('/admin/pending-shops')}
                      >
                        مراجعة الطلبات
                      </Button>
                    </Card.Content>
                  </Card>
                </View>
              )}
              
              {/* آخر المستخدمين */}
              <View style={styles.recentUsersSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>آخر المستخدمين المسجلين</Text>
                  <TouchableOpacity onPress={() => router.push('/admin/users')}>
                    <Text style={styles.viewAll}>عرض الكل</Text>
                  </TouchableOpacity>
                </View>
                
                <Card style={styles.listCard}>
                  <Card.Content>
                    {recentUsers.length > 0 ? (
                      recentUsers.map((user, index) => (
                        <React.Fragment key={user.id}>
                          <View style={styles.userItem}>
                            <View style={styles.userInfo}>
                              <View style={styles.userAvatar}>
                                <Icon name={getUserTypeIcon(user.user_type)} size={20} color="#FFF" />
                              </View>
                              <View>
                                <Text style={styles.userName}>{user.full_name || 'بدون اسم'}</Text>
                                <Text style={styles.userEmail}>{user.email}</Text>
                              </View>
                            </View>
                            <View style={styles.userMeta}>
                              <Badge style={styles.userTypeBadge}>{getUserTypeText(user.user_type)}</Badge>
                              <Text style={styles.userDate}>{formatDate(user.created_at)}</Text>
                            </View>
                          </View>
                          {index < recentUsers.length - 1 && <Divider style={styles.itemDivider} />}
                        </React.Fragment>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>لا يوجد مستخدمين حديثين</Text>
                    )}
                  </Card.Content>
                </Card>
              </View>
              
              {/* آخر المحلات */}
              <View style={styles.recentShopsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>آخر المحلات المسجلة</Text>
                  <TouchableOpacity onPress={() => router.push('/admin/shops')}>
                    <Text style={styles.viewAll}>عرض الكل</Text>
                  </TouchableOpacity>
                </View>
                
                <Card style={styles.listCard}>
                  <Card.Content>
                    {recentShops.length > 0 ? (
                      recentShops.map((shop, index) => (
                        <React.Fragment key={shop.id}>
                          <View style={styles.shopItem}>
                            <View style={styles.shopInfo}>
                              <View style={styles.shopAvatar}>
                                <Icon name="store" size={20} color="#FFF" />
                              </View>
                              <View>
                                <Text style={styles.shopName}>{shop.name || 'بدون اسم'}</Text>
                                <Text style={styles.shopOwner}>
                                  {shop.users?.name || 'مالك غير معروف'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.shopMeta}>
                              {getShopStatusBadge(shop)}
                              <Text style={styles.shopDate}>{formatDate(shop.created_at)}</Text>
                            </View>
                          </View>
                          {index < recentShops.length - 1 && <Divider style={styles.itemDivider} />}
                        </React.Fragment>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>لا يوجد محلات حديثة</Text>
                    )}
                  </Card.Content>
                </Card>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* زر الإضافة السريع */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          Alert.alert(
            'إضافة جديد',
            'ماذا تريد أن تضيف؟',
            [
              {
                text: 'مستخدم جديد',
                onPress: () => router.push('/admin/users'),
              },
              {
                text: 'محل جديد',
                onPress: () => router.push('/admin/shops'),
              },
              {
                text: 'إلغاء',
                style: 'cancel',
              },
            ]
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    elevation: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    width: '48%',
    marginBottom: 10,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  userCard: {
    borderTopColor: '#3498db',
    borderTopWidth: 3,
  },
  shopCard: {
    borderTopColor: '#2ecc71',
    borderTopWidth: 3,
  },
  carCard: {
    borderTopColor: '#9b59b6',
    borderTopWidth: 3,
  },
  pendingCard: {
    borderTopColor: '#e67e22',
    borderTopWidth: 3,
  },
  statTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  cardIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.dark,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '23%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  quickActionIcon: {
    padding: 10,
    borderRadius: 50,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.dark,
  },
  divider: {
    marginVertical: 15,
  },
  mainSection: {
    marginBottom: 20,
  },
  pendingSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBadge: {
    marginLeft: 10,
    backgroundColor: COLORS.warning,
  },
  viewAll: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#fff',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  alertText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
  },
  recentUsersSection: {
    marginBottom: 20,
  },
  listCard: {
    backgroundColor: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.gray,
  },
  userMeta: {
    alignItems: 'flex-end',
  },
  userTypeBadge: {
    marginBottom: 5,
    fontSize: 10,
    backgroundColor: COLORS.primary + '40',
  },
  userDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  itemDivider: {
    marginVertical: 5,
  },
  recentShopsSection: {
    marginBottom: 20,
  },
  shopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ecc71',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  shopName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  shopOwner: {
    fontSize: 12,
    color: COLORS.gray,
  },
  shopMeta: {
    alignItems: 'flex-end',
  },
  pendingBadge: {
    marginBottom: 5,
    fontSize: 10,
    backgroundColor: COLORS.warning,
  },
  verifiedBadge: {
    marginBottom: 5,
    fontSize: 10,
    backgroundColor: COLORS.success,
  },
  shopDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray,
    padding: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
}); 
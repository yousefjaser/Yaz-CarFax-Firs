// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, ScrollView, Platform, Dimensions } from 'react-native';
import { Text, Appbar, Card, Button, Chip, ActivityIndicator, Dialog, Portal, TextInput, FAB, Modal } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ShopsScreen() {
  const { user, logout } = useAuthStore();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [shopToDisable, setShopToDisable] = useState(null);
  
  // متغيرات لإضافة محل جديد
  const [showAddModal, setShowAddModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newShopData, setNewShopData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    owner_email: '',
    owner_name: '',
    owner_phone: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          owner:owner_id(id, full_name, email),
          cars:cars(id),
          service_visits:service_visits(id)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('فشل في تحميل المحلات:', error);
        return;
      }
      
      // إضافة معلومات إضافية
      const shopsWithExtra = data.map(shop => ({
        ...shop,
        cars_count: shop.cars ? shop.cars.length : 0,
        service_visits_count: shop.service_visits ? shop.service_visits.length : 0
      }));
      
      setShops(shopsWithExtra || []);
    } catch (error) {
      console.error('حدث خطأ أثناء تحميل المحلات:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadShops();
  };

  const handleDisableShop = (shop) => {
    setShopToDisable(shop);
    setDialogVisible(true);
  };

  const confirmDisableShop = async () => {
    if (!shopToDisable) return;
    
    try {
      const { error } = await supabase
        .from('shops')
        .update({ status: 'disabled', updated_at: new Date() })
        .eq('id', shopToDisable.id);
      
      if (error) {
        Alert.alert('خطأ', 'فشل في تعطيل المحل');
        console.error('فشل في تعطيل المحل:', error);
        return;
      }
      
      Alert.alert('نجاح', 'تم تعطيل المحل بنجاح');
      loadShops(); // إعادة تحميل القائمة
    } catch (error) {
      console.error('حدث خطأ أثناء تعطيل المحل:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تعطيل المحل');
    } finally {
      setDialogVisible(false);
      setShopToDisable(null);
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderShopItem = ({ item }) => (
    <Card style={styles.shopCard}>
      <Card.Content>
        <View style={styles.shopHeader}>
          <View>
            <Text style={styles.shopName}>{item.name}</Text>
            <Text style={styles.ownerName}>
              {item.owner?.full_name || 'غير معروف'}
            </Text>
          </View>
          <Chip icon="check-circle" mode="flat" style={item.verified ? styles.verifiedChip : styles.unverifiedChip}>
            {item.verified ? 'موثق' : 'غير موثق'}
          </Chip>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="map-marker" size={16} color={COLORS.gray} />
            <Text style={styles.infoText}>{item.address || 'لا يوجد عنوان'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="phone" size={16} color={COLORS.gray} />
            <Text style={styles.infoText}>{item.phone || 'لا يوجد رقم'}</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.cars_count}</Text>
            <Text style={styles.statLabel}>سيارة</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.service_visits_count}</Text>
            <Text style={styles.statLabel}>صيانة</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{new Date(item.created_at).toLocaleDateString('ar-SA')}</Text>
            <Text style={styles.statLabel}>تاريخ التسجيل</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            icon="eye" 
            style={styles.viewButton} 
            onPress={() => console.log('View details of shop:', item.id)}
          >
            عرض
          </Button>
          
          {item.verified ? (
            <Button 
              mode="outlined" 
              icon="close-circle" 
              style={styles.disableButton} 
              textColor={COLORS.error}
              onPress={() => handleDisableShop(item)}
            >
              تعطيل
            </Button>
          ) : (
            <Button 
              mode="outlined" 
              icon="check-circle" 
              style={styles.verifyButton} 
              textColor={COLORS.success}
              onPress={() => console.log('Verify shop:', item.id)}
            >
              توثيق
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  // دالة للتحقق من صحة بيانات المحل الجديد
  const validateShopData = () => {
    const newErrors = {};
    
    if (!newShopData.name.trim()) {
      newErrors.name = 'يرجى إدخال اسم المحل';
    }
    
    if (!newShopData.owner_email.trim()) {
      newErrors.owner_email = 'يرجى إدخال البريد الإلكتروني لمالك المحل';
    } else if (!/\S+@\S+\.\S+/.test(newShopData.owner_email)) {
      newErrors.owner_email = 'يرجى إدخال بريد إلكتروني صحيح';
    }
    
    if (!newShopData.owner_name.trim()) {
      newErrors.owner_name = 'يرجى إدخال اسم مالك المحل';
    }
    
    if (!newShopData.phone.trim()) {
      newErrors.phone = 'يرجى إدخال رقم هاتف المحل';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // دالة لإنشاء مالك المحل
  const createShopOwner = async () => {
    try {
      // التحقق من وجود مستخدم بنفس البريد الإلكتروني
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newShopData.owner_email)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      // إذا كان المستخدم موجود بالفعل، نحصل على المعرف الخاص به
      if (existingUser) {
        return { ownerId: existingUser.id, isExisting: true };
      }
      
      // إنشاء كلمة مرور عشوائية
      const randomPassword = Math.random().toString(36).slice(-8);
      
      // إنشاء مستخدم جديد في Supabase Authentication
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newShopData.owner_email,
        password: randomPassword,
        email_confirm: true,
      });
      
      if (authError) throw authError;
      
      // إنشاء ملف تعريف المستخدم
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: newShopData.owner_email,
          full_name: newShopData.owner_name,
          phone: newShopData.owner_phone,
          user_type: 'shop_owner',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      
      return { 
        ownerId: authData.user.id, 
        isExisting: false,
        password: randomPassword
      };
    } catch (error) {
      console.error('فشل في إنشاء مالك المحل:', error);
      throw error;
    }
  };

  // دالة لإنشاء المحل
  const createShop = async () => {
    if (!validateShopData()) return;
    
    setCreateLoading(true);
    
    try {
      // إنشاء مالك المحل أو استخدام واحد موجود
      const { ownerId, isExisting, password } = await createShopOwner();
      
      // إنشاء المحل
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: newShopData.name,
          address: newShopData.address,
          phone: newShopData.phone,
          email: newShopData.email || newShopData.owner_email,
          owner_id: ownerId,
          verified: true,  // محل موثق لأنه تم إنشاؤه بواسطة مسؤول
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();
      
      if (shopError) throw shopError;
      
      // إظهار رسالة نجاح مع تفاصيل المستخدم إذا كان جديدًا
      if (isExisting) {
        Alert.alert(
          'تم إنشاء المحل بنجاح',
          `تم ربط المحل بالمستخدم الموجود مسبقًا (${newShopData.owner_email}).`
        );
      } else {
        Alert.alert(
          'تم إنشاء المحل والحساب بنجاح',
          `تم إنشاء حساب جديد لمالك المحل.\n\nالبريد الإلكتروني: ${newShopData.owner_email}\nكلمة المرور: ${password}\n\nيرجى حفظ هذه المعلومات وإرسالها للمالك.`
        );
      }
      
      // إعادة تعيين البيانات وإغلاق المودال
      setNewShopData({
        name: '',
        address: '',
        phone: '',
        email: '',
        owner_email: '',
        owner_name: '',
        owner_phone: '',
      });
      setShowAddModal(false);
      
      // إعادة تحميل المحلات
      await loadShops();
      
    } catch (error) {
      console.error('فشل في إنشاء المحل:', error);
      Alert.alert('خطأ', 'فشل في إنشاء المحل. يرجى المحاولة مرة أخرى.');
    } finally {
      setCreateLoading(false);
    }
  };

  // فتح الdrawer باستخدام الدالة العالمية
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
      
      // نستخدم الdrawer المخصص للمشرف
      if (global && global.openAdminDrawer) {
        global.openAdminDrawer();
      }
    } catch (error) {
      global._isOpeningAdminDrawer = false;
      console.error('خطأ في فتح القائمة:', error);
    }
  };

  // دالة تنفيذ تسجيل الخروج
  const handleLogout = async () => {
    try {
      // تأكيد مع المستخدم
      Alert.alert(
        "تسجيل الخروج", 
        "هل أنت متأكد من رغبتك في تسجيل الخروج؟",
        [
          { text: "إلغاء", style: "cancel" },
          { 
            text: "تسجيل الخروج", 
            style: "destructive",
            onPress: async () => {
              await logout();
            }
          }
        ]
      );
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        {(Platform.OS !== 'web' || Dimensions.get('window').width < 768) && (
          <Appbar.Action icon="menu" onPress={openDrawer} />
        )}
        <Appbar.Content title="محلات الصيانة" />
        <Appbar.Action icon="plus" onPress={() => setShowAddModal(true)} />
        <Appbar.Action 
          icon="logout" 
          onPress={handleLogout} 
        />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="البحث عن محل..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          right={<TextInput.Icon icon="magnify" />}
          clearButtonMode="while-editing"
        />
      </View>
      
      {loading && !refreshing ? (
        <Loading fullScreen message="جاري تحميل المحلات..." />
      ) : (
        <>
          {filteredShops.length > 0 ? (
            <FlatList
              data={filteredShops}
              renderItem={renderShopItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="store-off" size={80} color={COLORS.gray} />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'لا توجد نتائج مطابقة لبحثك' 
                  : 'لا توجد محلات صيانة مسجلة حتى الآن'}
              </Text>
              {searchQuery && (
                <Button mode="outlined" onPress={() => setSearchQuery('')}>
                  مسح البحث
                </Button>
              )}
            </View>
          )}
        </>
      )}
      
      {/* زر إضافة محل جديد */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="إضافة محل"
        onPress={() => setShowAddModal(true)}
      />
      
      {/* مودال إضافة محل جديد */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>إضافة محل جديد</Text>
          
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.sectionTitle}>معلومات المحل</Text>
            
            <TextInput
              label="اسم المحل *"
              value={newShopData.name}
              onChangeText={(text) => setNewShopData({...newShopData, name: text})}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            
            <TextInput
              label="عنوان المحل"
              value={newShopData.address}
              onChangeText={(text) => setNewShopData({...newShopData, address: text})}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="رقم هاتف المحل *"
              value={newShopData.phone}
              onChangeText={(text) => setNewShopData({...newShopData, phone: text})}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              error={!!errors.phone}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            
            <TextInput
              label="بريد المحل الإلكتروني"
              value={newShopData.email}
              onChangeText={(text) => setNewShopData({...newShopData, email: text})}
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
            />
            
            <Text style={styles.sectionTitle}>معلومات المالك</Text>
            
            <TextInput
              label="اسم المالك *"
              value={newShopData.owner_name}
              onChangeText={(text) => setNewShopData({...newShopData, owner_name: text})}
              mode="outlined"
              style={styles.input}
              error={!!errors.owner_name}
            />
            {errors.owner_name ? <Text style={styles.errorText}>{errors.owner_name}</Text> : null}
            
            <TextInput
              label="بريد المالك الإلكتروني *"
              value={newShopData.owner_email}
              onChangeText={(text) => setNewShopData({...newShopData, owner_email: text})}
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              error={!!errors.owner_email}
            />
            {errors.owner_email ? <Text style={styles.errorText}>{errors.owner_email}</Text> : null}
            
            <TextInput
              label="رقم هاتف المالك"
              value={newShopData.owner_phone}
              onChangeText={(text) => setNewShopData({...newShopData, owner_phone: text})}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
            />
            
            <Text style={styles.noteText}>
              * في حالة وجود مستخدم بنفس البريد الإلكتروني، سيتم ربط المحل به بدلاً من إنشاء مستخدم جديد.
            </Text>
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowAddModal(false)}
                style={styles.modalButton}
              >
                إلغاء
              </Button>
              
              <Button
                mode="contained"
                onPress={createShop}
                style={styles.modalButton}
                loading={createLoading}
                disabled={createLoading}
              >
                إنشاء المحل
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
      
      {/* رسالة تأكيد تعطيل المحل */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Icon icon="alert" />
          <Dialog.Title>تأكيد تعطيل المحل</Dialog.Title>
          <Dialog.Content>
            <Text>
              هل أنت متأكد من رغبتك في تعطيل محل "{shopToDisable?.name}"؟
              سيؤدي ذلك إلى منع المحل وصاحبه من الوصول إلى النظام.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>إلغاء</Button>
            <Button onPress={confirmDisableShop} textColor={COLORS.error}>تعطيل</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    backgroundColor: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
  },
  shopCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ownerName: {
    fontSize: 14,
    color: COLORS.gray,
  },
  verifiedChip: {
    backgroundColor: COLORS.success + '20',
  },
  unverifiedChip: {
    backgroundColor: COLORS.warning + '20',
  },
  infoRow: {
    marginBottom: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.gray,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  disableButton: {
    flex: 1,
    marginLeft: SPACING.xs,
    borderColor: COLORS.error,
  },
  verifyButton: {
    flex: 1,
    marginLeft: SPACING.xs,
    borderColor: COLORS.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: SPACING.md,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: COLORS.primary,
  },
  input: {
    marginBottom: 10,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
  },
  noteText: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
}); 
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { Text, Appbar, Card, Button, Chip, TextInput, Divider, SegmentedButtons, Portal, Dialog, Modal, FAB } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { useAuthStore } from '../utils/store';
import { supabase } from '../config';
import Loading from '../components/Loading';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function UsersScreen() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [userToDisable, setUserToDisable] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  
  // متغيرات لإضافة مستخدم جديد
  const [showAddModal, setShowAddModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    user_type: 'customer', // افتراضي: عميل
    password: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUsers();
  }, [userTypeFilter, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // بناء الاستعلام الأساسي
      let query = supabase.from('users').select('*');
      
      // تطبيق مرشح نوع المستخدم (إذا تم تحديده)
      if (userTypeFilter !== 'all') {
        query = query.eq('role', userTypeFilter);
      }
      
      // تطبيق عامل تصفية البحث (إذا تم تحديده)
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }
      
      // تنفيذ الاستعلام
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // تحميل معلومات المحلات لمالكي المحلات
      const shopOwners = data.filter(user => user.role === 'shop_owner');
      
      if (shopOwners.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from('shops')
          .select('*')
          .in('owner_id', shopOwners.map(owner => owner.id));
        
        if (!shopsError && shopsData) {
          // ربط بيانات المحلات بالمستخدمين
          const usersWithShops = data.map(user => {
            if (user.role === 'shop_owner') {
              const userShops = shopsData.filter(shop => shop.owner_id === user.id);
              return { ...user, shops: userShops };
            }
            return user;
          });
          
          setUsers(usersWithShops);
        } else {
          console.error('فشل في تحميل بيانات المحلات:', shopsError);
          setUsers(data);
        }
      } else {
        setUsers(data);
      }
    } catch (error) {
      console.error('فشل في تحميل المستخدمين:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات المستخدمين. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleDisableUser = (user) => {
    setUserToDisable(user);
    setDialogVisible(true);
  };

  const confirmDisableUser = async () => {
    if (!userToDisable) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ updated_at: new Date() })
        .eq('id', userToDisable.id);
      
      if (error) {
        Alert.alert('خطأ', 'فشل في تعطيل المستخدم');
        console.error('فشل في تعطيل المستخدم:', error);
        return;
      }
      
      // إذا كان مالك محل، قم بتعطيل المحل أيضًا
      if (userToDisable.role === 'shop_owner' && userToDisable.shops && userToDisable.shops.length > 0) {
        const { error: shopError } = await supabase
          .from('shops')
          .update({ updated_at: new Date() })
          .eq('owner_id', userToDisable.id);
        
        if (shopError) {
          console.error('فشل في تعطيل المحل:', shopError);
        }
      }
      
      Alert.alert('نجاح', 'تم تعطيل المستخدم بنجاح');
      loadUsers(); // إعادة تحميل القائمة
    } catch (error) {
      console.error('حدث خطأ أثناء تعطيل المستخدم:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تعطيل المستخدم');
    } finally {
      setDialogVisible(false);
      setUserToDisable(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const renderUserItem = ({ item }) => {
    const getUserTypeLabel = (type) => {
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
    
    return (
      <Card style={styles.userCard}>
        <Card.Content>
          <View style={styles.userHeader}>
            <View>
              <Text style={styles.userName}>{item.name || 'مستخدم بدون اسم'}</Text>
              <View style={styles.userTypeContainer}>
                <Icon name={getUserTypeIcon(item.role)} size={14} color={COLORS.primary} />
                <Text style={styles.userType}>{getUserTypeLabel(item.role)}</Text>
              </View>
            </View>
            <Chip icon="calendar" mode="flat" style={styles.dateChip}>
              {new Date(item.created_at).toLocaleDateString('ar-SA')}
            </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.contactInfo}>
            {item.email && (
              <View style={styles.infoItem}>
                <Icon name="email" size={16} color={COLORS.gray} />
                <Text style={styles.infoText}>{item.email}</Text>
              </View>
            )}
            
            {item.phone && (
              <View style={styles.infoItem}>
                <Icon name="phone" size={16} color={COLORS.gray} />
                <Text style={styles.infoText}>{item.phone}</Text>
              </View>
            )}
          </View>
          
          {item.role === 'shop_owner' && item.shops && item.shops.length > 0 && (
            <View style={styles.shopInfo}>
              <Text style={styles.shopInfoLabel}>معلومات المحل:</Text>
              <View style={styles.shopDetails}>
                <Text style={styles.shopName}>{item.shops[0].name}</Text>
                <View style={styles.shopStatusContainer}>
                  <Icon 
                    name={item.shops[0].is_approved ? "check-circle" : "clock-outline"} 
                    size={14} 
                    color={item.shops[0].is_approved ? COLORS.success : COLORS.warning} 
                  />
                  <Text style={[
                    styles.shopStatus, 
                    {color: item.shops[0].is_approved ? COLORS.success : COLORS.warning}
                  ]}>
                    {item.shops[0].is_approved ? "موثق" : "قيد المراجعة"}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {item.role === 'customer' && (
            <View style={styles.customerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{item.shops?.length || 0}</Text>
                <Text style={styles.statLabel}>محل</Text>
              </View>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              icon="eye" 
              style={styles.viewButton} 
              onPress={() => console.log('View details of user:', item.id)}
            >
              عرض
            </Button>
            
            <Button 
              mode="outlined" 
              icon="close-circle" 
              style={styles.disableButton} 
              textColor={COLORS.error}
              onPress={() => handleDisableUser(item)}
            >
              تعطيل
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // دالة للتحقق من صحة بيانات المستخدم الجديد
  const validateUserData = () => {
    const newErrors = {};
    
    if (!newUserData.full_name.trim()) {
      newErrors.full_name = 'يرجى إدخال اسم المستخدم';
    }
    
    if (!newUserData.email.trim()) {
      newErrors.email = 'يرجى إدخال البريد الإلكتروني';
    } else if (!/\S+@\S+\.\S+/.test(newUserData.email)) {
      newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
    }
    
    if (!newUserData.password.trim()) {
      newErrors.password = 'يرجى إدخال كلمة المرور';
    } else if (newUserData.password.length < 6) {
      newErrors.password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // دالة لإنشاء مستخدم جديد
  const createUser = async () => {
    try {
      if (!validateUserData()) {
        return;
      }
      
      setCreateLoading(true);
      
      // التحقق من وجود مستخدم بنفس البريد الإلكتروني
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', newUserData.email)
        .maybeSingle();
      
      if (existingUser) {
        setErrors({
          ...errors,
          email: 'البريد الإلكتروني مستخدم بالفعل'
        });
        return;
      }
      
      // إنشاء حساب المستخدم في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
      });
      
      if (authError) {
        console.error('فشل في إنشاء حساب المستخدم:', authError);
        setErrors({
          ...errors,
          submit: 'فشل في إنشاء الحساب. الرجاء المحاولة مرة أخرى.'
        });
        return;
      }
      
      // إنشاء ملف تعريف المستخدم
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newUserData.email,
          name: newUserData.full_name,
          phone: newUserData.phone,
          role: newUserData.user_type,
          password: newUserData.password,
          created_at: new Date(),
          updated_at: new Date()
        });
      
      if (profileError) {
        console.error('فشل في إنشاء ملف تعريف المستخدم:', profileError);
        setErrors({
          ...errors,
          submit: 'فشل في إنشاء ملف تعريف المستخدم.'
        });
        return;
      }
      
      // إذا كان المستخدم مالك محل، قم بإنشاء سجل محل افتراضي له
      if (newUserData.user_type === 'shop_owner') {
        const { error: shopError } = await supabase
          .from('shops')
          .insert({
            owner_id: authData.user.id,
            name: `محل ${newUserData.full_name}`,
            is_approved: false,
            created_at: new Date(),
            updated_at: new Date()
          });
        
        if (shopError) {
          console.error('فشل في إنشاء سجل المحل:', shopError);
        }
      }
      
      // إعادة تحميل المستخدمين وإغلاق النافذة
      Alert.alert('نجاح', 'تم إنشاء حساب المستخدم بنجاح');
      setShowAddModal(false);
      setNewUserData({
        full_name: '',
        email: '',
        phone: '',
        user_type: 'customer',
        password: '',
      });
      setErrors({});
      loadUsers();
    } catch (error) {
      console.error('حدث خطأ أثناء إنشاء المستخدم:', error);
      setErrors({
        ...errors,
        submit: 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.'
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // دالة لإنشاء كلمة مرور عشوائية
  const generateRandomPassword = () => {
    const length = 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    setNewUserData({ ...newUserData, password });
  };

  // معالجة تغيير نوع المستخدم المعروض
  const handleUserTypeChange = (type) => {
    setUserTypeFilter(type);
  };

  // معالجة البحث
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // زر إضافة مستخدم جديد
  const handleAddUser = () => {
    console.log("تم الضغط على زر إضافة مستخدم");
    setShowAddModal(true);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="إدارة المستخدمين" />
        <Appbar.Action 
          icon="plus" 
          onPress={handleAddUser} 
        />
      </Appbar.Header>
      
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={userTypeFilter}
          onValueChange={setUserTypeFilter}
          buttons={[
            { value: 'all', label: 'الكل' },
            { value: 'customers', label: 'العملاء' },
            { value: 'shop_owners', label: 'مالكي المحلات' },
            { value: 'admins', label: 'المسؤولين' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="البحث عن مستخدم..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          right={<TextInput.Icon icon="magnify" />}
          clearButtonMode="while-editing"
        />
      </View>
      
      {loading && !refreshing ? (
        <Loading fullScreen message="جاري تحميل المستخدمين..." />
      ) : (
        <>
          {filteredUsers.length > 0 ? (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="account-off" size={80} color={COLORS.gray} />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'لا توجد نتائج مطابقة لبحثك' 
                  : 'لا يوجد مستخدمون مسجلون في هذه الفئة'}
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
      
      {/* زر إضافة مستخدم جديد */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="إضافة مستخدم"
        onPress={handleAddUser}
      />
      
      {/* مودال إضافة مستخدم جديد */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => {
            console.log("إغلاق المودال");
            setShowAddModal(false);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>إضافة مستخدم جديد</Text>
          
          <ScrollView style={styles.modalScroll}>
            <View style={styles.userTypeSelector}>
              <Text style={styles.sectionTitle}>نوع المستخدم:</Text>
              <SegmentedButtons
                value={newUserData.user_type}
                onValueChange={(value) => setNewUserData({...newUserData, user_type: value})}
                buttons={[
                  { value: 'customer', label: 'عميل' },
                  { value: 'shop_owner', label: 'مالك محل' },
                  { value: 'admin', label: 'مسؤول' },
                ]}
                style={styles.userTypeButtons}
              />
            </View>
            
            <TextInput
              label="الاسم الكامل *"
              value={newUserData.full_name}
              onChangeText={(text) => setNewUserData({...newUserData, full_name: text})}
              mode="outlined"
              style={styles.input}
              error={!!errors.full_name}
            />
            {errors.full_name ? <Text style={styles.errorText}>{errors.full_name}</Text> : null}
            
            <TextInput
              label="البريد الإلكتروني *"
              value={newUserData.email}
              onChangeText={(text) => setNewUserData({...newUserData, email: text})}
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              error={!!errors.email}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            
            <TextInput
              label="رقم الهاتف"
              value={newUserData.phone}
              onChangeText={(text) => setNewUserData({...newUserData, phone: text})}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                label="كلمة المرور *"
                value={newUserData.password}
                onChangeText={(text) => setNewUserData({...newUserData, password: text})}
                secureTextEntry
                mode="outlined"
                style={[styles.input, styles.passwordInput]}
                error={!!errors.password}
              />
              <Button
                mode="outlined"
                icon="dice-multiple"
                onPress={generateRandomPassword}
                style={styles.generateButton}
              >
                توليد
              </Button>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            
            {newUserData.user_type === 'shop_owner' && (
              <Text style={styles.noteText}>
                ملاحظة: سيتم إنشاء محل افتراضي لمالك المحل. يمكنك تعديل بيانات المحل لاحقًا من صفحة إدارة المحلات.
              </Text>
            )}
            
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
                onPress={createUser}
                style={styles.modalButton}
                loading={createLoading}
                disabled={createLoading}
              >
                إنشاء مستخدم
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
      
      {/* رسالة تأكيد تعطيل المستخدم */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Icon icon="alert" />
          <Dialog.Title>تأكيد تعطيل المستخدم</Dialog.Title>
          <Dialog.Content>
            <Text>
              هل أنت متأكد من رغبتك في تعطيل المستخدم "{userToDisable?.full_name}"؟
              سيؤدي ذلك إلى منع المستخدم من الوصول إلى النظام.
              {userToDisable?.user_type === 'shop_owner' && '\nسيتم أيضًا تعطيل المحل المرتبط بهذا المستخدم.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>إلغاء</Button>
            <Button onPress={confirmDisableUser} textColor={COLORS.error}>تعطيل</Button>
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
  filtersContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  segmentedButtons: {
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.md,
  },
  userCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userType: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  dateChip: {
    backgroundColor: COLORS.background,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  contactInfo: {
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
  shopInfo: {
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  shopInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  shopDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '500',
  },
  shopStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopStatus: {
    fontSize: 12,
    marginLeft: 4,
  },
  customerStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4,
  },
  statLabel: {
    fontSize: 14,
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
    alignSelf: 'center',
    width: Platform.OS === 'web' ? '60%' : undefined,
    minWidth: Platform.OS === 'web' ? 500 : undefined,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  userTypeSelector: {
    marginBottom: 15,
  },
  userTypeButtons: {
    marginTop: 10,
  },
  input: {
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
  },
  generateButton: {
    marginBottom: 15,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 10,
  },
  noteText: {
    color: COLORS.gray,
    fontSize: 12,
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
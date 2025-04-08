// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Appbar, TextInput, Button, Divider, Surface, Checkbox } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import { supabase } from '../config';
import { useAuthStore } from '../utils/store';
import Loading from '../components/Loading';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AddServiceVisitScreen() {
  const router = useRouter();
  const { carId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [car, setCar] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  
  // بيانات تغيير الزيت
  const [date, setDate] = useState<Date>(new Date());
  const [odometer, setOdometer] = useState('');
  const [oilType, setOilType] = useState('');
  const [oilGrade, setOilGrade] = useState('');
  const [nextChangeOdometer, setNextChangeOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // حالة الفلاتر
  const [oilFilterChanged, setOilFilterChanged] = useState(true);
  const [airFilterChanged, setAirFilterChanged] = useState(false);
  const [cabinFilterChanged, setCabinFilterChanged] = useState(false);
  
  useEffect(() => {
    loadShopData();
    if (carId) {
      loadCarData();
    }
  }, [carId]);
  
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
          setNextChangeOdometer(nextOdo.toString());
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
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const validateForm = () => {
    if (!odometer.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال قراءة العداد الحالية');
      return false;
    }
    
    if (!oilType.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال نوع الزيت');
      return false;
    }
    
    if (!nextChangeOdometer.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال قراءة العداد للتغيير القادم');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm() || !car || !shop) return;
    
    setSubmitting(true);
    
    try {
      // تحديث بيانات السيارة في جدول cars_new
      const { error } = await supabase
        .from('cars_new')
        .update({
          current_odometer: odometer,
          last_oil_change_date: date.toISOString(),
          last_oil_change_odometer: odometer,
          next_oil_change_odometer: nextChangeOdometer,
          oil_type: oilType,
          oil_grade: oilGrade,
          oil_filter_changed: oilFilterChanged,
          air_filter_changed: airFilterChanged,
          cabin_filter_changed: cabinFilterChanged,
          next_service_notes: notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('qr_id', car.qr_id);
      
      if (error) throw error;
      
      Alert.alert(
        'تم بنجاح',
        'تم تسجيل تغيير الزيت بنجاح',
        [
          {
            text: 'العودة إلى قائمة السيارات',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error) {
      console.error('فشل في تسجيل تغيير الزيت:', error);
      Alert.alert('خطأ', 'فشل في تسجيل تغيير الزيت. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <Loading fullScreen message="جاري تحميل بيانات السيارة..." />;
  }
  
  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} color="#fff" />
        <Appbar.Content title="تغيير زيت" titleStyle={{ color: '#fff' }} />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.carInfoCard}>
          <View style={styles.carInfoHeader}>
            <Icon name="car" size={24} color={COLORS.primary} />
            <Text style={styles.carInfoTitle}>بيانات السيارة</Text>
          </View>
          
          <Divider style={styles.divider} />
          
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
              <Text style={styles.carInfoLabel}>آخر تغيير زيت:</Text>
              <Text style={styles.carInfoValue}>
                {car?.last_oil_change_date ? formatDate(new Date(car.last_oil_change_date)) : 'لا يوجد'}
              </Text>
            </View>
          </View>
        </Surface>
        
        <Surface style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Icon name="oil" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>تفاصيل تغيير الزيت</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>تاريخ تغيير الزيت:</Text>
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
            <Text style={styles.inputLabel}>قراءة العداد الحالية:</Text>
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
            <Text style={styles.inputLabel}>نوع الزيت:</Text>
            <TextInput
              mode="outlined"
              value={oilType}
              onChangeText={setOilType}
              placeholder="مثال: Mobil 1, Castrol Edge"
              style={styles.input}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>تصنيف الزيت:</Text>
            <TextInput
              mode="outlined"
              value={oilGrade}
              onChangeText={setOilGrade}
              placeholder="مثال: 5W-30, 10W-40"
              style={styles.input}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>قراءة العداد للتغيير القادم:</Text>
            <TextInput
              mode="outlined"
              value={nextChangeOdometer}
              onChangeText={setNextChangeOdometer}
              keyboardType="numeric"
              placeholder="أدخل قراءة العداد للتغيير القادم"
              right={<TextInput.Affix text="كم" />}
              style={styles.input}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.sectionTitle}>الفلاتر المغيرة:</Text>
            
            <View style={styles.filtersGroup}>
              <View style={styles.filterItem}>
                <Checkbox
                  status={oilFilterChanged ? 'checked' : 'unchecked'}
                  onPress={() => setOilFilterChanged(!oilFilterChanged)}
                  color={COLORS.primary}
                />
                <Text style={styles.filterLabel}>فلتر زيت</Text>
              </View>
              
              <View style={styles.filterItem}>
                <Checkbox
                  status={airFilterChanged ? 'checked' : 'unchecked'}
                  onPress={() => setAirFilterChanged(!airFilterChanged)}
                  color={COLORS.primary}
                />
                <Text style={styles.filterLabel}>فلتر هواء</Text>
              </View>
              
              <View style={styles.filterItem}>
                <Checkbox
                  status={cabinFilterChanged ? 'checked' : 'unchecked'}
                  onPress={() => setCabinFilterChanged(!cabinFilterChanged)}
                  color={COLORS.primary}
                />
                <Text style={styles.filterLabel}>فلتر مكيف</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>تكلفة الخدمة:</Text>
            <TextInput
              mode="outlined"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="أدخل التكلفة"
              right={<TextInput.Affix text="ريال" />}
              style={styles.input}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>ملاحظات:</Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              placeholder="أدخل أي ملاحظات إضافية"
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
          </View>
        </Surface>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
          labelStyle={styles.submitButtonLabel}
        >
          حفظ تغيير الزيت
        </Button>
      </ScrollView>
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
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  carInfoCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 10,
    elevation: 2,
  },
  carInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    color: COLORS.primary,
  },
  divider: {
    marginVertical: SPACING.sm,
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
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    color: COLORS.primary,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
  },
  textArea: {
    backgroundColor: COLORS.white,
    minHeight: 100,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: COLORS.primary,
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
    padding: SPACING.xs,
    backgroundColor: COLORS.primary,
  },
  submitButtonLabel: {
    fontSize: 18,
    paddingVertical: SPACING.xs,
  },
}); 
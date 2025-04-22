import { supabase } from '../config';

// دالة لاستدعاء بيانات المستخدم
export const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
};

// دالة لاستدعاء بيانات المحل
export const fetchShopData = async (userId: string) => {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', userId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
};

// دالة لاستدعاء سيارات المحل
export const fetchShopCars = async (shopId: string) => {
  const { data, error } = await supabase
    .from('cars_new')
    .select('*')
    .eq('shop_id', shopId);
  
  if (error) throw new Error(error.message);
  return data;
};

// دالة لاستدعاء تفاصيل سيارة محددة
export const fetchCarDetails = async (carId: string) => {
  try {
    const { data, error } = await supabase
      .from('cars_new')
      .select(`
        *,
        shop:shop_id (
          id,
          name,
          phone,
          address,
          coordinates,
          whatsapp_prefix,
          banner_image,
          logo_url,
          working_hours,
          is_approved
        )
      `)
      .eq('qr_id', carId)
      .single();
    
    if (error) throw new Error(error.message);
    
    console.log('بيانات السيارة المسترجعة:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('خطأ في استدعاء بيانات السيارة:', error);
    throw error;
  }
};

// دالة لاستدعاء سجل خدمات السيارة
export const fetchCarServiceHistory = async (carId: string) => {
  try {
    // نستخدم * للحصول على جميع الأعمدة بدلاً من تحديد أسماء قد تكون غير موجودة
    const { data, error } = await supabase
      .from('service_visits')
      .select('*')
      .eq('car_id', carId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    
    // تنسيق البيانات بعد استلامها لضمان وجود الحقول المطلوبة
    const formattedData = data?.map(visit => ({
      id: visit.id,
      date: visit.date || visit.created_at,
      mileage: visit.odometer || visit.mileage || visit.current_odometer || 0,
      next_service_mileage: visit.next_service_odometer || visit.next_service_mileage || 0,
      oil_type: visit.oil_type || '',
      oil_grade: visit.oil_grade || '',
      notes: visit.notes || '',
      service_type: visit.service_type || 'صيانة',
      air_filter_changed: visit.air_filter_changed || false,
      oil_filter_changed: visit.oil_filter_changed || false,
      cabin_filter_changed: visit.cabin_filter_changed || false
    }));
    
    console.log('سجل خدمات السيارة (تم التنسيق):', JSON.stringify(formattedData, null, 2));
    return formattedData;
  } catch (error) {
    console.error('خطأ في استدعاء سجل خدمات السيارة:', error);
    return [];
  }
};

// دالة لاستدعاء سجل خدمات المحل
export const fetchShopServiceHistory = async (shopId: string) => {
  try {
    const { data, error } = await supabase
      .from('service_visits')
      .select(`
        *,
        cars_new(make, model, plate_number)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    
    // تنسيق البيانات بعد استلامها لتجنب مشاكل الأعمدة المفقودة
    const formattedData = data?.map(visit => ({
      ...visit,
      date: visit.date || visit.created_at,
      service_date: visit.service_date || visit.created_at,
      mileage: visit.odometer || visit.mileage || visit.current_odometer || 0,
      next_service_mileage: visit.next_service_odometer || visit.next_service_mileage || 0
    }));
    
    return formattedData;
  } catch (error) {
    console.error('خطأ في استدعاء سجل خدمات المحل:', error);
    return [];
  }
};

// مفتاح مخصص للتخزين المؤقت
export const getCacheKey = (baseKey: string, params: any) => {
  return `${baseKey}-${JSON.stringify(params)}`;
}; 
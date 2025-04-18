import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

// بيانات اعتماد Cloudinary
const CLOUD_NAME = 'dnacv6pnj';
const API_KEY = '946784763242121';
const UPLOAD_PRESET = 'yazcar_preset'; // يجب إنشاء upload preset في لوحة تحكم Cloudinary

/**
 * تحميل صورة إلى Cloudinary
 * @param uri مسار الصورة المحلي
 * @param folder مجلد التخزين في Cloudinary (اختياري)
 * @returns وعد يحتوي على رابط الصورة بعد التحميل
 */
export const uploadToCloudinary = async (uri: string, folder = 'yazcar'): Promise<string> => {
  try {
    // ضغط الصورة قبل تحميلها لتحسين الأداء
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // تغيير حجم الصورة للتقليل من حجم الملف
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    const localUri = manipResult.uri;
    const filename = localUri.split('/').pop() || 'image.jpg';
    
    // تحديد نوع الملف
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : 'image/jpeg';
    
    // إنشاء FormData لتحميل الصورة
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      name: filename,
      type: fileType,
    } as any);
    
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('api_key', API_KEY);
    
    // تحميل الصورة إلى Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      },
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // إرجاع رابط الصورة المحسّن
    return data.secure_url;
  } catch (error) {
    console.error('خطأ في تحميل الصورة إلى Cloudinary:', error);
    throw error;
  }
};

/**
 * اختيار صورة من معرض الصور
 * @returns وعد يحتوي على مسار الصورة المحلي
 */
export const pickImage = async (): Promise<string | null> => {
  try {
    // طلب إذن الوصول لمعرض الصور
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      console.error('يجب السماح بإذن الوصول لمعرض الصور');
      return null;
    }
    
    // فتح معرض الصور لاختيار صورة
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    
    return null;
  } catch (error) {
    console.error('خطأ في اختيار الصورة:', error);
    return null;
  }
};

/**
 * التقاط صورة من الكاميرا
 * @returns وعد يحتوي على مسار الصورة المحلي
 */
export const takePicture = async (): Promise<string | null> => {
  try {
    // طلب إذن الوصول للكاميرا
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      console.error('يجب السماح بإذن الوصول للكاميرا');
      return null;
    }
    
    // فتح الكاميرا لالتقاط صورة
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    
    return null;
  } catch (error) {
    console.error('خطأ في التقاط الصورة:', error);
    return null;
  }
};

/**
 * نوع طريقة المعالجة للصور عند تغيير الحجم
 */
export enum ImageFitMode {
  /**
   * شد الصورة لملء المساحة (قد يشوه نسب العرض للارتفاع)
   */
  STRETCH = 'scale',
  
  /**
   * قص الصورة لملء المساحة (يحافظ على النسب)
   */
  CROP = 'fill',
  
  /**
   * احتواء الصورة بالكامل مع إضافة حدود (يحافظ على النسب)
   */
  CONTAIN = 'fit',
  
  /**
   * احتواء الصورة مع استخدام خلفية تدريجية من ألوان الصورة
   */
  PAD_WITH_GRADIENT = 'pad',
}

/**
 * الحصول على رابط تحويل صورة Cloudinary
 * يتيح تحويل الصور حسب المقاس والجودة وغيرها من الإعدادات
 * @param url رابط الصورة الأصلي من Cloudinary
 * @param width العرض المطلوب
 * @param height الطول المطلوب (اختياري)
 * @param quality جودة الصورة (1-100)
 * @param fitMode طريقة احتواء الصورة (اختياري)
 * @returns رابط الصورة المحولة
 */
export const getTransformedImageUrl = (
  url: string,
  width: number,
  height?: number,
  quality = 80,
  fitMode: ImageFitMode = ImageFitMode.CROP
): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  // تحليل رابط الصورة لإضافة تحويلات
  const parts = url.split('/upload/');
  if (parts.length !== 2) {
    return url;
  }
  
  const transformations: string[] = [`w_${width}`, `q_${quality}`];
  
  if (height) {
    transformations.push(`h_${height}`);
  }
  
  // إضافة خيارات احتواء الصورة حسب الوضع المحدد
  if (fitMode === ImageFitMode.PAD_WITH_GRADIENT) {
    // استخدام وضع "pad" مع استخراج الألوان التلقائي من الصورة للخلفية
    transformations.push('c_pad');
    transformations.push('b_auto:predominant_gradient:2:vertical'); // خلفية تدريجية عمودية 
  } else if (fitMode === ImageFitMode.CROP) {
    // وضع القص مع تلقائية اختيار منطقة القص مع التركيز على الأشياء المهمة
    transformations.push('c_fill');
    transformations.push('g_auto:subject');
  } else if (fitMode === ImageFitMode.CONTAIN) {
    // احتواء الصورة بالكامل
    transformations.push('c_fit');
  } else {
    // الوضع الافتراضي (شد الصورة)
    transformations.push(`c_${fitMode}`);
  }
  
  // إنشاء رابط جديد مع التحويلات - إصلاح التنسيق
  return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
};

/**
 * الحصول على رابط صورة البانر مع خلفية تدريجية
 * مخصص لصور البانر ليظهر بشكل أفضل
 * @param url رابط الصورة الأصلي
 * @param width العرض
 * @param height الارتفاع
 * @returns رابط الصورة المحولة
 */
export const getBannerImageUrl = (
  url: string,
  width: number,
  height: number
): string => {
  return getTransformedImageUrl(url, width, height, 85, ImageFitMode.PAD_WITH_GRADIENT);
};

/**
 * الحصول على رابط صورة الملف الشخصي
 * مخصص لصور الملفات الشخصية ليظهر مع قص دائري
 * @param url رابط الصورة الأصلي
 * @param size حجم الصورة
 * @returns رابط الصورة المحولة
 */
export const getProfileImageUrl = (
  url: string,
  size: number = 200
): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }
  
  // تحليل رابط الصورة لإضافة تحويلات
  const parts = url.split('/upload/');
  if (parts.length !== 2) {
    return url;
  }
  
  // تحويلات صورة الملف الشخصي: قص دائري مع تركيز على الوجه
  const transformations: string[] = [
    `w_${size}`,
    `h_${size}`,
    'c_fill',
    'g_face',
    'r_max', // قص دائري
    'q_auto:good'
  ];
  
  // إنشاء رابط جديد مع التحويلات - إصلاح التنسيق
  return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
}; 
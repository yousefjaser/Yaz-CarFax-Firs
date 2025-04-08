import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config';
import { UserRole } from '../types';
import { Platform } from 'react-native';

const TOKEN_KEY = 'yazcar_auth_token';
const USER_KEY = 'yazcar_user_data';

/**
 * طريقة مساعدة للتخزين المحلي تعمل على الويب والأجهزة المحمولة
 */
const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      // على الويب، نستخدم localStorage
      localStorage.setItem(key, value);
    } else {
      // على الأجهزة المحمولة، نستخدم AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // على الويب، نستخدم localStorage
      return localStorage.getItem(key);
    } else {
      // على الأجهزة المحمولة، نستخدم AsyncStorage
      return await AsyncStorage.getItem(key);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      // على الويب، نستخدم localStorage
      localStorage.removeItem(key);
    } else {
      // على الأجهزة المحمولة، نستخدم AsyncStorage
      await AsyncStorage.removeItem(key);
    }
  }
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'shop_owner' | 'customer' | 'admin';
  shop_id?: string;
  created_at: string;
}

/**
 * تسجيل الدخول
 */
export const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
  try {
    console.log('محاولة تسجيل الدخول:', { email, rememberMe });
    
    // تعيين وضع المصادقة استنادًا إلى rememberMe
    if (Platform.OS === 'web') {
      // على الويب، نستخدم localStorage لتخزين الجلسة
      await supabase.auth.setSession({
        access_token: '',
        refresh_token: ''
      });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log('خطأ في مصادقة Supabase:', error);
      throw error;
    }

    console.log('نجاح المصادقة مع Supabase');
    const { user, session } = data;
    
    if (user && session) {
      console.log('معرف المستخدم من المصادقة:', user.id);
      
      // الحصول على بيانات المستخدم الإضافية من جدول المستخدمين
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('نتيجة البحث عن المستخدم في جدول users:', { userData, userError });
      
      if (userError) {
        console.log('خطأ في البحث عن المستخدم:', userError);
        throw userError;
      }
      
      if (!userData) {
        console.log('لم يتم العثور على المستخدم في جدول users');
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }

      console.log('تم العثور على المستخدم وجاري حفظ البيانات');
      
      // حفظ بيانات المستخدم في التخزين المحلي 
      // الملاحظة: Supabase سيتعامل مع تخزين الجلسة تلقائيًا بعد التكوين الجديد
      await storage.setItem(USER_KEY, JSON.stringify(userData));
      console.log('تم حفظ بيانات المستخدم المخزنة محلياً');

      return {
        data: {
          user: userData,
          session,
        },
        error: null,
      };
    }

    return { data, error: null };
  } catch (error) {
    console.log('خطأ غير متوقع في تسجيل الدخول:', error);
    return { data: null, error };
  }
};

/**
 * تسجيل الخروج
 */
export const signOut = async () => {
  try {
    // تسجيل الخروج من Supabase (سيمسح الجلسة تلقائيًا)
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // حذف البيانات من التخزين المحلي الخاص بالتطبيق
    await storage.removeItem(USER_KEY);
    console.log('تم تسجيل الخروج ومسح بيانات المستخدم');

    return { error: null };
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    return { error };
  }
};

/**
 * الحصول على بيانات المستخدم المسجل دخوله
 */
export const getCurrentUser = async (): Promise<{ user: AuthUser | null; error: any }> => {
  try {
    const userJson = await storage.getItem(USER_KEY);
    
    if (!userJson) {
      return { user: null, error: null };
    }
    
    const user = JSON.parse(userJson) as AuthUser;
    return { user, error: null };
  } catch (error: any) {
    return {
      user: null,
      error: {
        message: error.message || 'فشل في الحصول على بيانات المستخدم',
      },
    };
  }
};

/**
 * التحقق من حالة المصادقة للمستخدم
 */
export const checkAuthStatus = async (): Promise<{ isAuthenticated: boolean; user: AuthUser | null; error: any }> => {
  console.log('التحقق من حالة المصادقة...');
  console.log('المنصة:', Platform.OS);
  
  try {
    // محاولة الحصول على الجلسة من Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log('هل توجد جلسة نشطة؟', !!sessionData?.session);
    
    if (sessionError) {
      console.error('خطأ في الحصول على الجلسة:', sessionError.message);
      return { isAuthenticated: false, user: null, error: sessionError };
    }
    
    if (!sessionData.session) {
      console.log('لا توجد جلسة نشطة في supabase');
      // لا توجد جلسة نشطة في Supabase، نحاول قراءة من التخزين المحلي
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) {
        console.log('لا توجد بيانات مستخدم في التخزين المحلي');
        return { isAuthenticated: false, user: null, error: userError };
      }
      // لدينا بيانات مستخدم في التخزين المحلي لكن لا توجد جلسة نشطة
      console.log('تم العثور على بيانات مستخدم في التخزين المحلي ولكن لا توجد جلسة');
      return { isAuthenticated: false, user: null, error: null };
    }
    
    // هناك جلسة نشطة
    const userId = sessionData.session.user.id;
    console.log('معرف المستخدم من الجلسة:', userId);
    
    // محاولة الحصول على بيانات المستخدم من التخزين المحلي أولاً
    const { user: localUser, error: localUserError } = await getCurrentUser();
    
    if (localUser && localUser.id === userId) {
      console.log('تم استرجاع بيانات المستخدم من التخزين المحلي:', localUser.id);
      console.log('بيانات المستخدم:', {
        معرف: localUser.id,
        بريد: localUser.email,
        دور: localUser.role
      });
      return { isAuthenticated: true, user: localUser, error: null };
    }
    
    // إذا لم نجد بيانات المستخدم في التخزين المحلي أو معرف المستخدم غير متطابق
    // نحاول الحصول على بيانات المستخدم من قاعدة البيانات
    console.log('لم يتم العثور على بيانات المستخدم في التخزين المحلي أو المعرف غير متطابق');
    console.log('جار محاولة الحصول على بيانات المستخدم من قاعدة البيانات...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('خطأ في الحصول على الملف الشخصي:', profileError.message);
      return { isAuthenticated: false, user: null, error: profileError };
    }
    
    if (!profileData) {
      console.log('لم يتم العثور على ملف شخصي للمستخدم في قاعدة البيانات');
      return { isAuthenticated: false, user: null, error: new Error('لم يتم العثور على ملف شخصي للمستخدم') };
    }
    
    console.log('تم العثور على ملف شخصي للمستخدم:', {
      معرف: profileData.id,
      بريد: profileData.email,
      دور: profileData.user_type
    });
    
    // تحويل من بيانات قاعدة البيانات إلى كائن المستخدم المطلوب
    const user: AuthUser = {
      id: profileData.id,
      email: profileData.email,
      name: profileData.full_name,
      phone: profileData.phone,
      role: profileData.user_type as AuthUser['role'],
      created_at: profileData.created_at
    };
    
    // حفظ بيانات المستخدم في التخزين المحلي للاستخدام اللاحق
    await storage.setItem(USER_KEY, JSON.stringify(user));
    console.log('تم حفظ بيانات المستخدم في التخزين المحلي');
    
    return { isAuthenticated: true, user, error: null };
  } catch (error: any) {
    console.error('خطأ غير متوقع أثناء التحقق من حالة المصادقة:', error.message);
    return {
      isAuthenticated: false,
      user: null,
      error: {
        message: error.message || 'خطأ غير معروف أثناء التحقق من حالة المصادقة',
      },
    };
  }
};

// دوال المصادقة
export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password });
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

// تصدير افتراضي لدعم NOBRIDGE
export default {
  signUp,
  signIn,
  signOut,
  getSession
}; 
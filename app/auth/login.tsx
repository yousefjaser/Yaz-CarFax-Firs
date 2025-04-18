// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ImageBackground, StatusBar, ScrollView, Dimensions, SafeAreaView, Keyboard, Animated, KeyboardAvoidingView, Platform, Image, Easing, Linking, Alert } from 'react-native';
import { Text, Checkbox, Surface, ActivityIndicator } from 'react-native-paper';
import { COLORS, SPACING } from '../constants';
import Input from '../components/Input';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { signIn } from '../services/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../utils/store';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { setUser, setIsAuthenticated } = useAuthStore();
  
  // مرجع للانيميشن
  const lottieRef = useRef<LottieView>(null);
  
  // قيم الانيميشن المدعومة في useNativeDriver: true
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeTopSection = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  
  // استخدام transform: scaleY بدلاً من height (مدعوم في native driver)
  const topSectionScaleY = useRef(new Animated.Value(1)).current;
  const topSectionTranslateY = useRef(new Animated.Value(0)).current;
  
  // حالة إخفاء القسم العلوي
  const [topSectionHidden, setTopSectionHidden] = useState(false);
  
  // ثوابت للأنيميشن
  const TOP_SECTION_HEIGHT = height * 0.35;

  // مراقبة ظهور واختفاء لوحة المفاتيح
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // تعيين حالة ظهور لوحة المفاتيح
        setKeyboardVisible(true);

        // تنفيذ كل الأنيميشن مع useNativeDriver: true
        Animated.parallel([
          // تقليص القسم العلوي (استخدام scaleY بدلاً من height)
          Animated.timing(topSectionScaleY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // تحريك القسم العلوي للأعلى
          Animated.timing(topSectionTranslateY, {
            toValue: -TOP_SECTION_HEIGHT,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // إخفاء تدريجي للقسم العلوي
          Animated.timing(fadeTopSection, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // إخفاء الشعار
          Animated.timing(logoScale, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        ]).start(() => {
          // بعد انتهاء أنيميشن الإخفاء، نضبط حالة الإخفاء
          setTopSectionHidden(true);
        });
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // تعيين حالة إخفاء لوحة المفاتيح
        setKeyboardVisible(false);
        setTopSectionHidden(false);
        
        // تنفيذ كل الأنيميشن مع useNativeDriver: true
        Animated.stagger(100, [
          // تكبير القسم العلوي (استخدام scaleY بدلاً من height)
          Animated.timing(topSectionScaleY, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // تحريك القسم العلوي للأسفل
          Animated.timing(topSectionTranslateY, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // إظهار القسم العلوي تدريجيًا
          Animated.timing(fadeTopSection, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // إظهار الشعار مع تأثير مرن
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 500,
            easing: Easing.elastic(1.2),
            useNativeDriver: true,
          })
        ]).start();
      }
    );

    // تأثير ظهور الصفحة
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
    
    // تشغيل انيميشن Lottie
    if (lottieRef.current) {
      lottieRef.current.play();
    }

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);
  
  const handleLogin = async () => {
    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (loading) {
      console.log('عملية تسجيل الدخول قيد التنفيذ بالفعل، تم تجاهل الطلب المكرر');
      return;
    }
    
    // تعيين حالة التحميل فوراً لمنع النقرات المتعددة
    setLoading(true);
    setError('');

    try {
      // تسجيل معلومات تسجيل الدخول
      console.log(`محاولة تسجيل الدخول ${Platform.OS === 'web' ? 'على الويب' : 'على الجوال'} مع تذكرني: ${rememberMe}`);
      
      // استخدام Promise.race مع timeout لتجنب الانتظار الطويل
      const loginPromise = signIn(email, password, rememberMe);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة تسجيل الدخول')), 15000)
      );
      
      const { data, error: loginError } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any;
      
      if (loginError) {
        console.error('خطأ في تسجيل الدخول:', loginError);
        setError(typeof loginError === 'object' && loginError !== null && 'message' in loginError 
          ? String(loginError.message) 
          : 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      // نجاح تسجيل الدخول - تعيين حالة المستخدم وتفعيل المصادقة
      if (data?.user) {
        console.log('تم تسجيل الدخول بنجاح كـ: ', data.user.role);
        
        // حفظ معلومات الجلسة في store
        setUser(data.user);
        setIsAuthenticated(true);
        
        // على الويب، تأكد من حفظ معلومات الجلسة بالشكل الصحيح
        if (Platform.OS === 'web' && rememberMe) {
          // تحقق مما إذا كان هناك خطأ في حفظ الجلسة
          try {
            const storedValue = localStorage.getItem('sb-egnvrxqoamgpjtmhnhri-auth-token');
            console.log('تم حفظ الجلسة في localStorage:', !!storedValue);
          } catch (e) {
            console.error('فشل في التحقق من localStorage:', e);
          }
        }
        
        // تحميل مسبق للصفحات التي سيتم توجيه المستخدم إليها
        if (Platform.OS === 'web') {
          let targetRoute = '/';
          if (data.user.role === 'admin') {
            targetRoute = '/admin/admin-dashboard';
          } else if (data.user.role === 'shop_owner') {
            targetRoute = '/shop/shop-dashboard';
          } else if (data.user.role === 'customer') {
            targetRoute = '/customer/customer-dashboard';
          }
          
          // تحميل الصفحة الهدف مسبقًا قبل الانتقال إليها
          try {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.href = targetRoute;
            preloadLink.as = 'document';
            document.head.appendChild(preloadLink);
            
            console.log('تم تحميل الصفحة الهدف مسبقًا:', targetRoute);
          } catch (e) {
            console.error('فشل في التحميل المسبق للصفحة الهدف:', e);
          }
        }
        
        // استخدام setTimeout لضمان استكمال تحديث الحالة قبل الانتقال
        // يساعد في تجنب حدوث توجيه مكرر
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.replace('/admin/admin-dashboard');
          } else if (data.user.role === 'shop_owner') {
            console.log("تم تسجيل الدخول بنجاح كصاحب محل، جاري التوجيه...");
            router.replace('/shop/shop-dashboard');
          } else if (data.user.role === 'customer') {
            router.replace('/customer/customer-dashboard');
          } else {
            // إذا لم يكن هناك دور محدد، يتم الانتقال إلى الصفحة الرئيسية
            router.replace('/');
          }
        }, 100);
      } else {
        setError('لم يتم استرجاع بيانات المستخدم بشكل صحيح');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('خطأ غير متوقع أثناء تسجيل الدخول:', err);
      setError(err.message || 'فشل تسجيل الدخول');
      setLoading(false);
    }
  };

  // تأثير ضغط الزر
  const animatePress = (ref: Animated.Value) => {
    Animated.sequence([
      Animated.timing(ref, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(ref, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loginButtonAnim = useRef(new Animated.Value(1)).current;

  // حساب حجم النص بناءً على حالة الكيبورد
  const logoTextSize = keyboardVisible ? 16 : 32;
  
  // حساب حالة الحواف لقسم تسجيل الدخول
  const borderRadius = keyboardVisible ? 0 : 30;

  const openWhatsapp = (type = 'help') => {
    // تنسيق الرقم مع رمز الدولة وإزالة الصفر من البداية
    const whatsappNumber = '0598565009';
    const formattedNumber = '972' + whatsappNumber.substring(1); // إضافة 972 (رمز فلسطين) وإزالة الصفر الأول

    // تحضير النص حسب نوع المساعدة المطلوبة
    let message = "مرحبا، أحتاج للمساعدة في حسابي على تطبيق YazCar";
    if (type === 'register') {
      message = "مرحبا، أرغب في إنشاء حساب جديد في تطبيق YazCar";
    } else if (type === 'password') {
      message = "مرحبا، أحتاج إلى استعادة كلمة المرور في تطبيق YazCar";
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert('خطأ', 'تطبيق واتساب غير مثبت على جهازك');
        }
      })
      .catch(err => {
        console.error('فشل في فتح واتساب:', err);
        Alert.alert('خطأ', 'فشل في فتح تطبيق واتساب');
      });
  };
  
  const showRegisterOptions = () => {
    Alert.alert(
      'إنشاء حساب جديد',
      'تواصل معنا للحصول على حساب في التطبيق',
      [
        {
          text: 'طلب حساب جديد (واتساب)',
          onPress: () => openWhatsapp('register'),
        },
        {
          text: 'استعادة كلمة المرور (واتساب)',
          onPress: () => openWhatsapp('password'),
        },
        {
          text: 'إلغاء',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const showPasswordResetOptions = () => {
    Alert.alert(
      'استعادة كلمة المرور',
      'تواصل معنا لاستعادة كلمة المرور الخاصة بك',
      [
        {
          text: 'استعادة عبر واتساب',
          onPress: () => openWhatsapp('password'),
        },
        {
          text: 'إلغاء',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: keyboardVisible ? '#fff' : '#083c70' }
    ]}>
      <StatusBar 
        barStyle={keyboardVisible ? "dark-content" : "light-content"} 
        backgroundColor={keyboardVisible ? "#fff" : "#083c70"} 
      />
      
      {/* القسم العلوي - الهيدر */}
      {!topSectionHidden && (
        <Animated.View 
          style={[
            styles.topSection, 
            { 
              height: TOP_SECTION_HEIGHT, // ارتفاع ثابت
              opacity: fadeTopSection,
              transform: [
                { scaleY: topSectionScaleY },
                { translateY: topSectionTranslateY }
              ]
            }
          ]}
        >
          <View style={styles.circleOverlay} />
          
          {/* استخدام انيميشن Lottie للسيارة */}
          <View style={styles.lottieContainer}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/animations/car-animat.json')}
              autoPlay
              loop
              speed={0.8}
              style={styles.lottieAnimation}
            />
          </View>
          
          <Animated.View style={[
            styles.logoContainer,
            { 
              transform: [{ scale: logoScale }],
              bottom: 15
            }
          ]}>
            <Animated.Text style={[
              styles.appName,
              { 
                fontSize: logoTextSize,
                opacity: fadeTopSection,
                color: '#2196F3'
              }
            ]}>YazCarFax</Animated.Text>
            <Animated.Text style={[
              styles.tagline,
              { opacity: fadeTopSection }
            ]}>سجل معلومات سيارتك بمسح رمز QR</Animated.Text>
          </Animated.View>
        </Animated.View>
      )}
      
      {/* القسم السفلي - نموذج تسجيل الدخول */}
      <Animated.View style={[
        styles.bottomSection,
        { 
          opacity: fadeAnim, 
          flex: 1,
          borderTopLeftRadius: keyboardVisible ? 0 : 30,
          borderTopRightRadius: keyboardVisible ? 0 : 30,
          // في حالة ظهور الكيبورد، نضيف بعض الأساليب
          ...(keyboardVisible ? {
            paddingTop: 50, // إضافة مساحة علوية عند اختفاء الـ header
            shadowOpacity: 0, // إزالة الظل عند تغطية كامل الشاشة
            elevation: 0,
          } : {})
        }
      ]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: keyboardVisible ? 50 : 20,
              paddingTop: keyboardVisible ? 15 : 30
            }}
          >
            <Animated.Text 
              style={[
                styles.welcomeText,
                { opacity: fadeAnim }
              ]}
            >
              أهلاً بك مجدداً
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.subTitle,
                { opacity: fadeAnim }
              ]}
            >
              قم بتسجيل الدخول للمتابعة
            </Animated.Text>
            
            {error ? (
              <ErrorMessage
                message={error}
                onDismiss={() => setError('')}
              />
            ) : null}
            
            <Animated.View 
              style={[
                styles.inputsContainer,
                { opacity: fadeAnim }
              ]}
            >
              <Input
                label="البريد الإلكتروني"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="email"
                style={styles.input}
                placeholder="أدخل بريدك الإلكتروني"
              />
              
              <Input
                label="كلمة المرور"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon="lock"
                style={styles.input}
                placeholder="أدخل كلمة المرور"
              />
            </Animated.View>
            
            <View style={styles.optionsRow}>
              <View style={styles.rememberMeContainer}>
                <Checkbox
                  status={rememberMe ? 'checked' : 'unchecked'}
                  onPress={() => setRememberMe(!rememberMe)}
                  color="#083c70"
                />
                <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
                  <Text style={styles.rememberMeText}>تذكرني</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={showPasswordResetOptions}>
                <Text style={styles.forgotPassword}>نسيت كلمة المرور؟</Text>
              </TouchableOpacity>
            </View>
            
            <Animated.View style={{ transform: [{ scale: loginButtonAnim }] }}>
              <Button
                title={loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                onPress={() => {
                  animatePress(loginButtonAnim);
                  handleLogin();
                }}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                buttonColor="#083c70"
              />
            </Animated.View>
            
            <View style={styles.registerContainer}>
              <Text style={styles.noAccountText}>ليس لديك حساب؟</Text>
              <TouchableOpacity onPress={showRegisterOptions}>
                <Text style={styles.registerText}>إنشاء حساب</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.whatsappButton}
              onPress={() => openWhatsapp('help')}
            >
              <Icon name="whatsapp" size={20} color="#fff" />
              <Text style={styles.whatsappButtonText}>تواصل معنا للمساعدة</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
      
      {loading && (
        <Animated.View 
          style={[
            styles.loadingOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Surface style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#034078" />
            <Text style={styles.loadingText}>جاري تسجيل الدخول...</Text>
          </Surface>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#083c70',
  },
  topSection: {
    backgroundColor: '#083c70',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  circleOverlay: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -width * 0.75,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'absolute',
    width: '100%',
  },
  lottieContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    zIndex: 1,
  },
  lottieAnimation: {
    width: '100%',
    height: 200,
  },
  appName: {
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingBottom: 20,
    zIndex: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#083c70',
    textAlign: 'right',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 25,
  },
  inputsContainer: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    color: '#666',
    marginRight: 8,
    fontSize: 14,
  },
  forgotPassword: {
    color: '#083c70',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  noAccountText: {
    color: '#666',
    fontSize: 14,
    marginRight: 5,
  },
  registerText: {
    color: '#083c70',
    fontSize: 14,
    fontWeight: 'bold',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 15,
    marginHorizontal: 30,
  },
  whatsappButtonText: {
    color: '#ffffff',
    marginRight: 10,
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  loadingCard: {
    padding: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#0A1128',
    fontSize: 14,
  },
}); 
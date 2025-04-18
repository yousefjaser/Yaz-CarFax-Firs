// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  Platform, 
  Alert,
  Image,
  Animated,
  Easing,
  Dimensions,
  Linking,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Surface, Button, ActivityIndicator } from 'react-native-paper';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// تحقق إذا كان المستخدم يستخدم Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const { width } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

// تحميل المكتبة فقط إذا لم نكن في Expo Go
let NfcManager = null;
let NfcTech = null;
let Ndef = null;
let NfcEvents = null;
let isNfcAvailable = false;

// لا نحاول تحميل المكتبة إذا كنا في بيئة Expo Go
if (!isExpoGo && !isWeb) {
  try {
    // استيراد ديناميكي للمكتبة
    const nfcManagerLib = require('react-native-nfc-manager');
    NfcManager = nfcManagerLib.default;
    NfcTech = nfcManagerLib.NfcTech;
    Ndef = nfcManagerLib.Ndef;
    NfcEvents = nfcManagerLib.NfcEvents;
    isNfcAvailable = !!NfcManager;
  } catch (error) {
    console.error('فشل تحميل مكتبة react-native-nfc-manager:', error);
    isNfcAvailable = false;
  }
}

export default function NfcScreen() {
  const router = useRouter();
  const [isNfcSupported, setIsNfcSupported] = useState(null);
  const [isNfcEnabled, setIsNfcEnabled] = useState(false);
  const [hasStartedScan, setHasStartedScan] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tagId, setTagId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // تأثيرات الرسوم المتحركة
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const successAnimation = useRef(new Animated.Value(0)).current;
  const scanOpacity = useRef(new Animated.Value(1)).current;
  
  // تسجيل حالة الشاشة
  useEffect(() => {
    // التحقق من بيئة التشغيل
    if (isExpoGo) {
      setErrorMessage('لا يمكن استخدام NFC في بيئة Expo Go. يرجى استخدام development build أو الإصدار النهائي من التطبيق.');
      setIsNfcSupported(false);
      return;
    }
    
    // لا يمكن استخدام NFC على الويب
    if (isWeb) {
      setErrorMessage('متصفح الويب لا يدعم قراءة NFC، يرجى استخدام تطبيق الهاتف');
      setIsNfcSupported(false);
      return;
    }
    
    // التحقق أولاً من توفر المكتبة
    if (!isNfcAvailable) {
      setErrorMessage('لم يتم تثبيت مكتبة NFC بشكل صحيح أو غير متوفرة على هذا الجهاز');
      setIsNfcSupported(false);
      return;
    }
    
    // التحقق من دعم NFC
    checkNfcSupport();
    
    // تنظيف عند الخروج من الشاشة
    return () => {
      if (isNfcAvailable) {
        cleanupNfc();
      }
    };
  }, []);
  
  // تحريك دائرة المسح
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnimation, {
            toValue: 1,
            duration: 2000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnimation, {
            toValue: 0,
            duration: 2000,
            easing: Easing.ease,
            useNativeDriver: true,
          })
        ])
      ).start();
      
      // تأثير التلاشي للدوائر الإضافية
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scanOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      // إيقاف الرسوم المتحركة
      scanAnimation.stopAnimation();
      scanOpacity.stopAnimation();
    }
  }, [isScanning]);
  
  // تأثير النجاح
  useEffect(() => {
    if (showSuccess) {
      Animated.timing(successAnimation, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }).start();
      
      // تنقل تلقائي بعد النجاح
      const timer = setTimeout(() => {
        if (tagId) {
          router.replace(`/shop/public/car/${tagId}`);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      successAnimation.setValue(0);
    }
  }, [showSuccess]);
  
  const checkNfcSupport = async () => {
    if (!isNfcAvailable) {
      setIsNfcSupported(false);
      setErrorMessage('لم يتم تثبيت مكتبة NFC بشكل صحيح');
      return;
    }
    
    try {
      // التحقق من دعم NFC
      const supported = await NfcManager.isSupported();
      setIsNfcSupported(supported);
      
      if (supported) {
        // بدء المدير
        await NfcManager.start();
        
        // التحقق من تمكين NFC (فقط على أندرويد)
        if (Platform.OS === 'android') {
          const enabled = await NfcManager.isEnabled();
          setIsNfcEnabled(enabled);
        } else {
          // على iOS، لا يمكننا معرفة ما إذا كان NFC ممكّنًا، لذا نفترض أنه كذلك
          setIsNfcEnabled(true);
        }
      }
    } catch (ex) {
      console.warn('خطأ عند فحص دعم NFC:', ex);
      setIsNfcSupported(false);
      setErrorMessage('حدث خطأ أثناء التحقق من دعم NFC على جهازك');
    }
  };
  
  const enableNfc = async () => {
    if (!isNfcAvailable) return;
    
    try {
      if (Platform.OS === 'android') {
        await NfcManager.goToNfcSetting();
      } else {
        Alert.alert(
          'تفعيل NFC',
          'يرجى تفعيل NFC من إعدادات الجهاز',
          [{ text: 'حسناً' }]
        );
      }
    } catch (error) {
      console.log('خطأ في فتح إعدادات NFC:', error);
      setErrorMessage('لا يمكن فتح إعدادات NFC');
    }
  };
  
  const startNfcScan = async () => {
    if (!isNfcAvailable) {
      setErrorMessage('لم يتم تثبيت مكتبة NFC بشكل صحيح');
      return;
    }
    
    setErrorMessage('');
    setHasStartedScan(true);
    setIsScanning(true);
    setShowSuccess(false);
    setTagId(null);
    
    try {
      // تسجيل مستمع للحدث
      NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag) => {
        // على iOS، نحتاج إلى إلغاء السجل للسماح بالمسح التالي
        if (isIOS) {
          NfcManager.setAlertMessageIOS('تم قراءة بطاقة NFC بنجاح!');
          NfcManager.unregisterTagEvent();
        }
        
        handleTagDiscovered(tag);
      });
      
      // بدء مسح NFC
      if (isIOS) {
        // على iOS، نستخدم سجل الحدث
        await NfcManager.registerTagEvent();
      } else {
        // على أندرويد، يمكننا استخدام تقنية NfcA أو NfcV أو غيرها
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const tag = await NfcManager.getTag();
        handleTagDiscovered(tag);
        await NfcManager.cancelTechnologyRequest();
      }
    } catch (ex) {
      // إلغاء المسح إذا كان المستخدم قد ألغى العملية (طبيعي)
      if (ex.toString().includes('cancelled') || ex.toString().includes('Cancelled')) {
        setIsScanning(false);
        return;
      }
      
      console.warn('خطأ في مسح NFC:', ex);
      setErrorMessage('حدث خطأ أثناء محاولة مسح بطاقة NFC. يرجى المحاولة مرة أخرى.');
      
      // تنظيف
      cleanupNfc();
    }
  };
  
  const stopNfcScan = () => {
    if (!isNfcAvailable) return;
    cleanupNfc();
    setIsScanning(false);
  };
  
  const cleanupNfc = async () => {
    if (!isNfcAvailable) return;
    
    try {
      // إلغاء تسجيل المستمع
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      
      // إلغاء أي عمليات مسح جارية
      if (isIOS) {
        await NfcManager.unregisterTagEvent();
      } else {
        await NfcManager.cancelTechnologyRequest();
      }
    } catch (ex) {
      console.warn('خطأ في تنظيف NFC:', ex);
    }
  };
  
  const handleTagDiscovered = (tag) => {
    try {
      console.log('تم اكتشاف البطاقة:', tag);
      // معالجة معرّف البطاقة
      let id = '';
      
      if (tag?.id) {
        // استخدام المعرّف المضمن مباشرة إذا كان موجودًا
        id = tag.id;
      } else if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        // محاولة قراءة رسالة NDEF
        const ndefRecord = tag.ndefMessage[0];
        if (ndefRecord) {
          // فك ترميز السجل
          const payload = Ndef.text.decodePayload(ndefRecord.payload);
          id = payload;
        }
      } else if (tag?.techTypes?.includes('android.nfc.tech.NfcA')) {
        // استخدام معرّف NfcA إذا كان متاحًا
        id = tag.id;
      }
      
      if (id) {
        setTagId(id);
        setShowSuccess(true);
        setIsScanning(false);
      } else {
        setErrorMessage('لم يتم العثور على معرّف صالح في البطاقة. يرجى المحاولة مرة أخرى.');
        setIsScanning(false);
      }
    } catch (ex) {
      console.warn('خطأ في معالجة البطاقة:', ex);
      setErrorMessage('حدث خطأ أثناء قراءة بطاقة NFC. يرجى المحاولة مرة أخرى.');
      setIsScanning(false);
    }
  };
  
  // حجم دائرة المسح
  const innerCircleScale = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  const outerCircleScale = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6]
  });
  
  // حجم دائرة النجاح
  const successScale = successAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1]
  });
  
  // حالة الخطأ (غير مدعوم أو غير ممكّن)
  const renderErrorState = () => (
    <View style={styles.centerContent}>
      <Surface style={styles.errorCard}>
        <Icon name="nfc-variant-off" size={60} color={COLORS.error} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>
          {!isNfcSupported ? 'جهازك لا يدعم NFC' : 'NFC غير مفعّل'}
        </Text>
        <Text style={styles.errorMessage}>
          {errorMessage || (!isNfcSupported 
            ? 'يتطلب هذا التطبيق دعم NFC للعمل. يرجى استخدام جهاز يدعم تقنية NFC.' 
            : 'يرجى تمكين خاصية NFC في إعدادات الجهاز للاستمرار.')}
        </Text>
        
        {!isNfcSupported ? (
          <Button
            mode="contained"
            style={styles.actionButton}
            onPress={() => router.back()}
          >
            عودة
          </Button>
        ) : (
          <Button
            mode="contained"
            style={styles.actionButton}
            onPress={enableNfc}
          >
            تمكين NFC
          </Button>
        )}
      </Surface>
    </View>
  );
  
  // حالة المسح
  const renderScanningState = () => (
    <View style={styles.centerContent}>
      <View style={styles.nfcLogoContainer}>
        <Icon name="nfc" size={100} color={COLORS.primary} />
      </View>
      
      <View style={styles.scanningContainer}>
        <Animated.View 
          style={[
            styles.outerScanCircle,
            {
              opacity: scanOpacity,
              transform: [{ scale: outerCircleScale }]
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.innerScanCircle,
            {
              transform: [{ scale: innerCircleScale }]
            }
          ]} 
        />
        <View style={styles.phoneIconContainer}>
          <Icon name="cellphone-nfc" size={50} color={COLORS.white} />
        </View>
        
        <Text style={styles.scanTitle}>جارٍ البحث عن بطاقة NFC</Text>
        <Text style={styles.scanInstructions}>
          ضع هاتفك بالقرب من بطاقة NFC للسيارة
        </Text>
        
        {errorMessage && (
          <View style={styles.errorMessageContainer}>
            <Icon name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.scanError}>{errorMessage}</Text>
          </View>
        )}
        
        <Button
          mode="outlined"
          style={styles.cancelButton}
          textColor={COLORS.white}
          onPress={stopNfcScan}
        >
          إلغاء المسح
        </Button>
      </View>
    </View>
  );
  
  // حالة النجاح
  const renderSuccessState = () => (
    <View style={styles.centerContent}>
      <Animated.View 
        style={[
          styles.successContainer,
          {
            transform: [{ scale: successScale }]
          }
        ]}
      >
        <View style={styles.successCircle}>
          <Icon name="check" size={60} color={COLORS.white} />
        </View>
        
        <Text style={styles.successTitle}>تم مسح البطاقة بنجاح!</Text>
        <Text style={styles.successMessage}>
          جارٍ التوجيه إلى صفحة السيارة...
        </Text>
        
        <ActivityIndicator 
          animating={true}
          color={COLORS.primary}
          style={styles.successLoader} 
        />
      </Animated.View>
    </View>
  );
  
  // حالة البداية (قبل المسح)
  const renderStartState = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.startContainer}>
        <Icon name="nfc" size={120} color="#1976D2" />
        
        <Text style={styles.title}>مسح بطاقة NFC</Text>
        <Text style={styles.description}>
          استخدم هذه الميزة لمسح بطاقات NFC وربطها بالسيارات في نظامك.
          قرّب البطاقة من خلفية هاتفك للمسح.
        </Text>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Icon name="information-outline" size={24} color="#1976D2" />
            <Text style={styles.infoText}>
              تأكد من تفعيل خاصية NFC في إعدادات هاتفك
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="cellphone" size={24} color="#1976D2" />
            <Text style={styles.infoText}>
              موقع قارئ NFC يختلف حسب نوع الهاتف، عادةً يكون في الجزء الخلفي العلوي
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Icon name="shield-check" size={24} color="#1976D2" />
            <Text style={styles.infoText}>
              البيانات المقروءة من البطاقة آمنة ومشفرة
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={startNfcScan}
          disabled={!isNfcSupported || !isNfcEnabled}
        >
          <Text style={styles.startButtonText}>بدء المسح</Text>
        </TouchableOpacity>
        
        {Platform.OS === 'android' && isNfcSupported && !isNfcEnabled && (
          <TouchableOpacity style={styles.enableButton} onPress={enableNfc}>
            <Text style={styles.enableButtonText}>تفعيل NFC</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.helpButton} onPress={() => {
          Alert.alert(
            'مساعدة',
            'تقنية NFC تتيح قراءة البطاقات لاسلكياً عند تقريبها من هاتفك. تأكد من تفعيل الخاصية في إعدادات هاتفك وقرّب البطاقة من الجزء الخلفي للهاتف.',
            [{ text: 'حسناً' }]
          );
        }}>
          <Text style={styles.helpButtonText}>أحتاج مساعدة</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مسح بطاقة NFC</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* المحتوى الرئيسي */}
      <View style={styles.content}>
        {isWeb && (
          // لا يمكن استخدام NFC على الويب
          <View style={styles.centerContent}>
            <Surface style={styles.errorCard}>
              <Icon name="web-off" size={60} color={COLORS.error} style={styles.errorIcon} />
              <Text style={styles.errorTitle}>NFC غير مدعوم على الويب</Text>
              <Text style={styles.errorMessage}>
                لا يمكن استخدام تقنية NFC في متصفح الويب. يرجى استخدام تطبيق الهاتف المحمول.
              </Text>
              <Button
                mode="contained"
                style={styles.actionButton}
                onPress={() => router.back()}
              >
                عودة
              </Button>
            </Surface>
          </View>
        )}
        
        {!isWeb && !isNfcSupported && renderErrorState()}
        
        {!isWeb && isNfcSupported && !isNfcEnabled && renderErrorState()}
        
        {!isWeb && isNfcSupported && isNfcEnabled && (
          <>
            {!hasStartedScan && renderStartState()}
            {hasStartedScan && isScanning && renderScanningState()}
            {showSuccess && renderSuccessState()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  errorCard: {
    width: '90%',
    padding: SPACING.lg,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  errorIcon: {
    marginBottom: SPACING.md,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  actionButton: {
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  nfcLogo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    marginRight: 10,
    flex: 1,
    textAlign: 'right',
  },
  startButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  enableButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '90%',
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpButton: {
    paddingVertical: 10,
    width: '90%',
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#1976D2',
    fontSize: 16,
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outerScanCircle: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  innerScanCircle: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  phoneIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: SPACING.xl,
  },
  scanTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  scanInstructions: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  cancelButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: 30,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  scanError: {
    fontSize: 14,
    color: COLORS.error,
    marginRight: SPACING.xs,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: 20,
    width: '85%',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  successLoader: {
    marginTop: SPACING.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
}); 
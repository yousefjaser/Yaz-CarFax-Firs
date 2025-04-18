# إعداد Cloudinary في تطبيق YazCar

تم دمج خدمة Cloudinary في تطبيق YazCar لتحميل وإدارة الصور. يوفر Cloudinary حلاً سحابياً قوياً لإدارة الوسائط ويتيح تحويل الصور وتحسينها تلقائياً.

## بيانات الاعتماد

- **Cloud Name**: dnacv6pnj
- **API Key**: 946784763242121
- **API Secret**: NrJC4XptT_BVZ0yo20CtZ-3ULAM
- **API Environment Variable**: CLOUDINARY_URL=cloudinary://946784763242121:NrJC4XptT_BVZ0yo20CtZ-3ULAM@dnacv6pnj

## إعداد Upload Preset

لتمكين التحميل المباشر من التطبيق إلى Cloudinary، تحتاج إلى إنشاء "Upload Preset". اتبع الخطوات التالية:

1. سجل دخولك إلى [لوحة تحكم Cloudinary](https://console.cloudinary.com/)
2. انتقل إلى "Settings" ثم "Upload"
3. قم بالتمرير لأسفل إلى قسم "Upload presets"
4. انقر على "Add upload preset"
5. قم بإدخال المعلومات التالية:
   - **Preset name**: yazcar_preset
   - **Signing Mode**: اختر "Unsigned" للسماح بالتحميل المباشر من التطبيق
   - **Folder**: yazcar (اختياري - سيتم تخزين جميع الصور المرفوعة في هذا المجلد)
6. في قسم "Media Analysis", قم بتفعيل "Auto tagging" إذا كنت ترغب في تصنيف الصور تلقائياً
7. في قسم "Image Transformations", يمكنك إعداد تحويلات افتراضية مثل الضغط التلقائي
8. انقر على "Save" لحفظ الإعدادات

## المجلدات المستخدمة في التطبيق

نستخدم المجلدات التالية في Cloudinary لتنظيم الصور:

- **yazcar/profiles**: لصور الملفات الشخصية
- **yazcar/banners**: لصور أغلفة المحلات
- **yazcar/cars**: لصور السيارات
- **yazcar/services**: لصور الخدمات والصيانة

## استخدام خدمة Cloudinary في التطبيق

تم إضافة الخدمات التالية في `app/services/cloudinary.ts`:

1. **uploadToCloudinary**: لرفع الصور إلى Cloudinary
2. **pickImage**: لاختيار صورة من معرض الصور
3. **takePicture**: لالتقاط صورة باستخدام الكاميرا
4. **getTransformedImageUrl**: لتحسين عرض الصور وتعديل أحجامها

## تحويلات الصور

يمكنك استخدام دالة `getTransformedImageUrl` للحصول على صور بأحجام وجودة مختلفة:

```javascript
// الحصول على صورة بعرض 300 بكسل
const imageUrl = getTransformedImageUrl(originalUrl, 300);

// الحصول على صورة بعرض 300 وارتفاع 200 بكسل
const imageUrl = getTransformedImageUrl(originalUrl, 300, 200);

// تعديل جودة الصورة (1-100)
const imageUrl = getTransformedImageUrl(originalUrl, 300, 200, 90);
```

## استكشاف الأخطاء وإصلاحها

إذا واجهت مشاكل في تحميل الصور، تحقق من:

1. صحة بيانات الاعتماد في `app/services/cloudinary.ts`
2. إعداد Upload Preset في لوحة تحكم Cloudinary
3. الاتصال بالإنترنت في التطبيق
4. صلاحيات الوصول للكاميرا ومعرض الصور في التطبيق

## موارد مفيدة

- [وثائق Cloudinary](https://cloudinary.com/documentation)
- [وثائق React Native SDK](https://cloudinary.com/documentation/react_native_integration)
- [محول تحويلات الصور](https://cloudinary.com/documentation/transformation_reference) 
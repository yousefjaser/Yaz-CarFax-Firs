// استيراد مكتبات expo
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';

// تهيئة التطبيق
export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App); 
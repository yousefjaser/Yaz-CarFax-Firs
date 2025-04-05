// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';

export default function AuthLayoutWeb() {
  console.log('تحميل تخطيط المصادقة الخاص بالويب');
  
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
}); 
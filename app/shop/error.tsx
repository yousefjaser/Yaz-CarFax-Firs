import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ErrorScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Icon name="alert-circle" size={64} color={COLORS.error} />
      <Text style={styles.title}>حدث خطأ!</Text>
      <Text style={styles.message}>
        نعتذر، حدث خطأ غير متوقع. يرجى العودة والمحاولة مرة أخرى.
      </Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/shop/shop-dashboard')}
      >
        <Text style={styles.buttonText}>العودة للرئيسية</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: COLORS.error,
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#444',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
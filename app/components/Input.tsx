// @ts-nocheck
// app/components/Input.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, TextInputProps, Animated, Platform, I18nManager } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants';

// تفعيل RTL بشكل إجباري
I18nManager.forceRTL(true);

type Props = TextInputProps & {
  label?: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  style?: any;
};

const Input = ({ 
  label, 
  value = '', 
  onChangeText, 
  error, 
  icon, 
  placeholder = '',
  secureTextEntry = false, 
  keyboardType = 'default',
  style,
  maxLength,
  ...props 
}: Props) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedValue]);

  const labelPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const labelSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelPosition,
              fontSize: labelSize,
              color: error ? COLORS.error : isFocused ? COLORS.primary : COLORS.gray,
              backgroundColor: isFocused || value ? COLORS.white : 'transparent',
              paddingHorizontal: 5,
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
      <View 
        style={[
          styles.inputContainer,
          { 
            borderColor: error ? COLORS.error : isFocused ? COLORS.primary : COLORS.lightGray,
            borderWidth: isFocused || error ? 1.5 : 1,
          }
        ]}
      >
        {icon && (
          <MaterialCommunityIcons 
            name={icon} 
            size={22} 
            color={error ? COLORS.error : isFocused ? COLORS.primary : COLORS.gray} 
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          placeholderTextColor={COLORS.gray}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          keyboardType={keyboardType}
          maxLength={maxLength}
          textAlign="right"
          textAlignVertical="center"
          writingDirection="rtl"
          {...props}
        />
        {secureTextEntry && (
          <IconButton
            icon={isPasswordVisible ? 'eye-off' : 'eye'}
            iconColor={COLORS.gray}
            size={20}
            onPress={togglePasswordVisibility}
          />
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    position: 'relative',
    paddingTop: 15,
    width: '100%',
  },
  label: {
    position: 'absolute',
    right: 15,
    zIndex: 10,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'right',
    writingDirection: 'rtl',
    textAlignVertical: 'center',
  },
  icon: {
    marginLeft: 10,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 5,
    marginRight: 15,
    fontWeight: '500',
  },
});

export default Input;
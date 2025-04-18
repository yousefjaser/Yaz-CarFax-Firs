import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CarInfoCardProps {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  plateNumber?: string;
  vinNumber?: string;
  customerName?: string;
  customerPhone?: string;
}

export default function CarInfoCard({
  make,
  model,
  year,
  color,
  plateNumber,
  vinNumber,
  customerName,
  customerPhone,
}: CarInfoCardProps) {
  const carModel = [make, model, year].filter(Boolean).join(' ');

  return (
    <Card style={styles.card}>
      <Card.Title
        title="معلومات السيارة"
        left={(props) => <Ionicons name="car-outline" size={24} color="#2196F3" />}
      />
      <Card.Content style={styles.content}>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>الطراز</Text>
            <Text style={styles.value}>{carModel || 'غير محدد'}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>اللون</Text>
            <Text style={styles.value}>{color || 'غير محدد'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>رقم اللوحة</Text>
            <Text style={styles.value}>{plateNumber || 'غير محدد'}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>رقم الشاصي</Text>
            <Text style={styles.value}>{vinNumber || 'غير محدد'}</Text>
          </View>
        </View>

        {(customerName || customerPhone) && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              {customerName && (
                <View style={styles.item}>
                  <Text style={styles.label}>اسم العميل</Text>
                  <Text style={styles.value}>{customerName}</Text>
                </View>
              )}
              {customerPhone && (
                <View style={styles.item}>
                  <Text style={styles.label}>رقم الهاتف</Text>
                  <Text style={styles.value}>{customerPhone}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  content: {
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  item: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
}); 
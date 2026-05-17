import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SellScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={64} color="#e75480" />
        </View>
        <Text style={styles.title}>Become a Chef</Text>
        <Text style={styles.subtitle}>Share your culinary skills with your neighbors and start earning today.</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register Your Kitchen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FDF0F5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { backgroundColor: '#e75480', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

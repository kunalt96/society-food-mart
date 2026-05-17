import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../config/api';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [splashData, setSplashData] = useState({
    topText: "Welcome to",
    greetingTexts: ["Your premium cloud kitchen experience.", "Order fresh, chef-crafted meals directly to your door."]
  });
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    // Fetch dynamic text from the backend
    api.get('/splash')
      .then(res => {
        if (res.data) {
          setSplashData(res.data);
        }
      })
      .catch(err => console.log("Splash text fallback used"));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % splashData.greetingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [splashData.greetingTexts]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={40} color="#e75480" />
          </View>
          <Text style={styles.title}>Society{'\n'}Marketplace</Text>
          <Text style={styles.subtitle}>
            {splashData.greetingTexts[currentTextIndex]}
          </Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {splashData.greetingTexts.map((_, index) => (
            <View 
              key={index} 
              style={[styles.dot, index === currentTextIndex && styles.activeDot]} 
            />
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Terms of Service</Text>
          <Text style={styles.footerDot}> • </Text>
          <Text style={styles.footerText}>Privacy Policy</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoBox: {
    width: 100,
    height: 100,
    backgroundColor: '#FDF0F5',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FADDE8',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#e75480',
    width: 12,
  },
  actionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#e75480',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#e75480',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#999999',
    fontSize: 12,
  },
  footerDot: {
    color: '#999999',
    fontSize: 12,
    marginHorizontal: 8,
  },
});

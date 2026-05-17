import React from 'react';
import { Tabs } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: '#e75480',
        tabBarInactiveTintColor: '#999999',
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{ 
          title: 'Explore',
          tabBarIcon: ({ color }) => <Feather name="compass" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="cart" 
        options={{ 
          title: 'Cart',
          tabBarIcon: ({ color }) => <Feather name="shopping-cart" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="sell" 
        options={{ 
          title: 'Sell',
          tabBarIcon: ({ color }) => <Ionicons name="storefront-outline" size={24} color={color} />
        }} 
      />
      {/* Keep profile screen hidden from tab bar but still accessible as a route */}
      <Tabs.Screen 
        name="profile" 
        options={{ href: null }} 
      />
    </Tabs>
  );
}

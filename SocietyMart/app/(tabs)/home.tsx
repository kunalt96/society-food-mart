import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../store/AuthContext';

export default function BuyerHomeScreen() {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <Ionicons name="business" size={14} color="#e75480" />
              <Text style={styles.societyName}>PRESTIGE SHANTINIKETAN</Text>
            </View>
            <View style={styles.marketplaceRow}>
              <Text style={styles.marketplaceTitle}>Society Marketplace</Text>
              <Feather name="chevron-down" size={20} color="#1A1A1A" />
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarPlaceholder} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{getInitials(user?.full_name)}</Text>
              </View>
            )}
            <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
          </TouchableOpacity>
        </View>


        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search for food, groceries..." 
              placeholderTextColor="#999" 
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={20} color="#e75480" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <CategoryItem icon="food-drumstick" label="Meals" isActive />
          <CategoryItem icon="cupcake" label="Desserts" />
          <CategoryItem icon="basket" label="Groceries" />
          <CategoryItem icon="bread-slice" label="Bakery" />
        </View>

        {/* Order Again Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Again</Text>
          <TouchableOpacity><Text style={styles.viewHistoryText}>View History</Text></TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <View style={styles.reorderCard}>
            <View style={styles.reorderCardHeader}>
              <View style={styles.reorderImagePlaceholder} />
              <View style={styles.reorderInfo}>
                <Text style={styles.reorderTitle}>Chicken Dum Biryani</Text>
                <Text style={styles.reorderSubtitle}>Ayesha's Kitchen • Flat 402</Text>
                <View style={styles.reorderPriceRow}>
                  <Text style={styles.reorderPrice}>₹240</Text>
                  <Text style={styles.reorderRating}>⭐ 4.8</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.reorderButton}>
              <Feather name="refresh-cw" size={14} color="#e75480" style={{marginRight: 6}} />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          </View>

          {/* Placeholder for second card */}
          <View style={styles.reorderCard}>
            <View style={styles.reorderCardHeader}>
              <View style={styles.reorderImagePlaceholder} />
              <View style={styles.reorderInfo}>
                <Text style={styles.reorderTitle}>Fresh Banana Bread</Text>
                <Text style={styles.reorderSubtitle}>The Bakehouse • Flat...</Text>
                <View style={styles.reorderPriceRow}>
                  <Text style={styles.reorderPrice}>₹180</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.reorderButton}>
              <Feather name="refresh-cw" size={14} color="#e75480" style={{marginRight: 6}} />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Featured Neighbors Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Neighbors</Text>
          <View style={styles.navControls}>
            <TouchableOpacity style={styles.navCircle}><Feather name="chevron-left" size={16} color="#999" /></TouchableOpacity>
            <TouchableOpacity style={styles.navCircle}><Feather name="chevron-right" size={16} color="#999" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.featuredCard}>
          <View style={styles.featuredImagePlaceholder}>
            <View style={styles.tagOverlay}>
              <Feather name="clock" size={12} color="#e75480" />
              <Text style={styles.tagText}>Pre-order for Dinner</Text>
            </View>
            <TouchableOpacity style={styles.heartButton}>
              <Feather name="heart" size={18} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.featuredAvatarPlaceholder} />
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>Sharma's Authentic North...</Text>
            <Text style={styles.featuredSubtitle}>North Indian, Thalis, Beverages • Flat...</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

interface CategoryItemProps {
  icon: any;
  label: string;
  isActive?: boolean;
}

function CategoryItem({ icon, label, isActive = false }: CategoryItemProps) {
  return (
    <View style={styles.categoryWrapper}>
      <View style={[styles.categoryBox, isActive && styles.categoryBoxActive]}>
        <MaterialCommunityIcons name={icon} size={28} color={isActive ? "#e75480" : "#4A4A4A"} />
      </View>
      <Text style={styles.categoryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationContainer: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  societyName: { fontSize: 10, fontWeight: '700', color: '#e75480', marginLeft: 4, letterSpacing: 0.5 },
  marketplaceRow: { flexDirection: 'row', alignItems: 'center' },
  marketplaceTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginRight: 4 },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF0F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e75480' },
  avatarPlaceholderText: { color: '#e75480', fontSize: 14, fontWeight: '700' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#e75480', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 12, paddingHorizontal: 12, height: 48, marginRight: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },
  filterButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FDF0F5', justifyContent: 'center', alignItems: 'center' },

  // Categories
  categoriesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  categoryWrapper: { alignItems: 'center' },
  categoryBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F8F8F8', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#F8F8F8' },
  categoryBoxActive: { backgroundColor: '#FDF0F5', borderColor: '#FDF0F5' },
  categoryLabel: { fontSize: 12, color: '#4A4A4A', fontWeight: '500' },

  // Order Again Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  viewHistoryText: { fontSize: 14, color: '#e75480', fontWeight: '600' },
  horizontalScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 32 },
  
  reorderCard: { width: 280, backgroundColor: '#ffffff', borderRadius: 16, padding: 12, marginRight: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reorderCardHeader: { flexDirection: 'row', marginBottom: 12 },
  reorderImagePlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#E5E5E5', marginRight: 12 },
  reorderInfo: { flex: 1 },
  reorderTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  reorderSubtitle: { fontSize: 12, color: '#666', marginBottom: 8 },
  reorderPriceRow: { flexDirection: 'row', alignItems: 'center' },
  reorderPrice: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginRight: 8 },
  reorderRating: { fontSize: 12, color: '#e75480', fontWeight: '600' },
  reorderButton: { flexDirection: 'row', backgroundColor: '#FDF0F5', borderRadius: 8, height: 36, justifyContent: 'center', alignItems: 'center' },
  reorderButtonText: { color: '#e75480', fontSize: 14, fontWeight: '600' },

  // Featured Neighbors Section
  navControls: { flexDirection: 'row' },
  navCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  
  featuredCard: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 20 },
  featuredImagePlaceholder: { height: 180, backgroundColor: '#E5E5E5', position: 'relative' },
  tagOverlay: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  tagText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', marginLeft: 4 },
  heartButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  featuredAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D9D9D9', position: 'absolute', right: 20, top: 156, borderWidth: 3, borderColor: '#ffffff' },
  featuredContent: { padding: 16, paddingTop: 20 },
  featuredTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  featuredSubtitle: { fontSize: 14, color: '#666' },
});

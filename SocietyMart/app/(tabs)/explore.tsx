import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../store/AuthContext';

export default function ExploreScreen() {
  const { isRegistrationComplete, user } = useAuth();

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
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hello, {user?.full_name?.split(' ')[0] || 'there'} 👋</Text>
          <Text style={styles.headerTitle}>Explore Kitchens</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarButton}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{getInitials(user?.full_name)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>


      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search dishes, kitchens..." 
            placeholderTextColor="#999" 
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity style={[styles.filterChip, styles.sortChipActive]}>
            <Ionicons name="options-outline" size={16} color="#e75480" />
            <Text style={styles.sortChipTextActive}>Sort</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <View style={[styles.vegDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.filterChipText}>Veg</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <View style={[styles.vegDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.filterChipText}>Non-Veg</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Price</Text>
            <Feather name="chevron-down" size={16} color="#666" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </ScrollView>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
          <CategoryCircle label="North Indian" isActive />
          <CategoryCircle label="Biryani" />
          <CategoryCircle label="South Indian" />
          <CategoryCircle label="Desserts" />
        </ScrollView>

        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>12 Kitchens Found</Text>
          <Text style={styles.resultsSort}>Nearest first</Text>
        </View>

        {/* Kitchen Cards */}
        <KitchenCard 
          title="Sharma's Authentic North"
          subtitle="North Indian, Thalis, Beverages • Tower B"
          rating="4.9"
          reviews="120+"
          price="₹200 for one"
          discount="10% OFF"
          isVeg
        />

        <KitchenCard 
          title="Biryani By Kilo"
          subtitle="Biryani, Mughlai, Kebab • Flat 204"
          rating="4.5"
          reviews="85+"
          price="₹350 for one"
          discount="Free Delivery"
        />

      </ScrollView>
    </SafeAreaView>
  );
}

interface CategoryCircleProps {
  label: string;
  isActive?: boolean;
}

function CategoryCircle({ label, isActive = false }: CategoryCircleProps) {
  return (
    <View style={styles.categoryWrapper}>
      <View style={[styles.categoryCircle, isActive && styles.categoryCircleActive]}>
        <View style={styles.categoryImagePlaceholder} />
      </View>
      <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
        {label.replace(' ', '\n')}
      </Text>
    </View>
  );
}

interface KitchenCardProps {
  title: string;
  subtitle: string;
  rating: string;
  reviews: string;
  price: string;
  discount?: string;
  isVeg?: boolean;
}

function KitchenCard({ title, subtitle, rating, reviews, price, discount, isVeg }: KitchenCardProps) {
  return (
    <View style={styles.kitchenCard}>
      <View style={styles.kitchenImagePlaceholder}>
        <View style={styles.tagOverlay}>
          <View style={[styles.vegDotSmall, { backgroundColor: isVeg ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.tagText}>{isVeg ? 'Veg Only' : 'Non-Veg'}</Text>
        </View>
        <TouchableOpacity style={styles.heartButton}>
          <Feather name="heart" size={16} color="#e75480" />
        </TouchableOpacity>
        <View style={styles.timeOverlay}>
          <Text style={styles.timeText}>20-30 min</Text>
        </View>
        <View style={styles.kitchenAvatarPlaceholder} />
      </View>

      <View style={styles.kitchenContent}>
        <Text style={styles.kitchenTitle}>{title}</Text>
        <Text style={styles.kitchenSubtitle}>{subtitle}</Text>
        
        <View style={styles.kitchenMetaRow}>
          <Text style={styles.ratingText}>⭐ {rating} <Text style={styles.reviewsText}>({reviews})</Text></Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.priceText}>{price}</Text>
          {discount && (
            <>
              <Text style={styles.dotSeparator}>•</Text>
              <View style={styles.discountBadge}>
                <Ionicons name="pricetag" size={12} color="#e75480" />
                <Text style={styles.discountText}>{discount}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerGreeting: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  avatarButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FDF0F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e75480' },
  avatarFallbackText: { color: '#e75480', fontSize: 16, fontWeight: '700' },


  scrollContent: { paddingBottom: 40 },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 12, paddingHorizontal: 16, height: 50, marginHorizontal: 20, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A' },

  // Filters
  filterScroll: { flexGrow: 0, marginBottom: 24 },
  filterContent: { paddingHorizontal: 20, gap: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#ffffff' },
  sortChipActive: { backgroundColor: '#FDF0F5', borderColor: '#FDF0F5' },
  sortChipTextActive: { color: '#e75480', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  filterChipText: { color: '#4A4A4A', fontSize: 14, fontWeight: '500' },
  vegDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },

  // Categories
  categoryScroll: { flexGrow: 0, marginBottom: 32 },
  categoryContent: { paddingHorizontal: 20, gap: 20 },
  categoryWrapper: { alignItems: 'center', width: 72 },
  categoryCircle: { width: 64, height: 64, borderRadius: 32, padding: 3, borderWidth: 2, borderColor: 'transparent', marginBottom: 8 },
  categoryCircleActive: { borderColor: '#e75480' },
  categoryImagePlaceholder: { flex: 1, borderRadius: 30, backgroundColor: '#E5E5E5' },
  categoryLabel: { fontSize: 12, color: '#666', textAlign: 'center', fontWeight: '500', lineHeight: 16 },
  categoryLabelActive: { color: '#e75480', fontWeight: '600' },

  // Results Header
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  resultsSort: { fontSize: 14, color: '#999', fontWeight: '500' },

  // Kitchen Card
  kitchenCard: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0', marginHorizontal: 20, marginBottom: 24 },
  kitchenImagePlaceholder: { height: 180, backgroundColor: '#E5E5E5', position: 'relative' },
  tagOverlay: { position: 'absolute', top: 12, left: 12, backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  vegDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  heartButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  timeOverlay: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  kitchenAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D9D9D9', position: 'absolute', right: 20, bottom: -24, borderWidth: 3, borderColor: '#ffffff', zIndex: 10 },
  
  kitchenContent: { padding: 16, paddingTop: 20 },
  kitchenTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  kitchenSubtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  kitchenMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  reviewsText: { color: '#999', fontWeight: 'normal' },
  dotSeparator: { color: '#CCC', marginHorizontal: 8 },
  priceText: { fontSize: 13, color: '#666' },
  discountBadge: { flexDirection: 'row', alignItems: 'center' },
  discountText: { fontSize: 13, color: '#e75480', fontWeight: '600', marginLeft: 4 },
});

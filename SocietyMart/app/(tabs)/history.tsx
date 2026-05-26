import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../config/api';

interface OrderItem {
  id: string;
  user_id: string;
  kitchen_id: string;
  total_cost: number;
  status: string;
  dishes: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    imageUrl?: string;
  }>;
  created_at: string;
  kitchen?: {
    id: string;
    name: string;
  };
}

// Format date helper
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return dateString;
  }
};

// Memoized List Item Component
const HistoryCard = React.memo(({ item }: { item: OrderItem }) => {
  const firstDish = item.dishes?.[0];
  
  // Format dishes text
  const dishesSummary = item.dishes?.map(d => `${d.name} (x${d.quantity})`).join(', ') || 'No dishes';
  
  // Status style mapping
  const getStatusStyle = (status: string) => {
    const norm = status.toLowerCase();
    if (norm === 'completed' || norm === 'delivered') {
      return { container: styles.statusCompleted, text: styles.statusCompletedText };
    }
    if (norm === 'pending' || norm === 'preparing') {
      return { container: styles.statusPending, text: styles.statusPendingText };
    }
    return { container: styles.statusDefault, text: styles.statusDefaultText };
  };

  const statusStyle = getStatusStyle(item.status);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <View style={styles.kitchenInfo}>
          <Text style={styles.kitchenName}>{item.kitchen?.name || 'Local Kitchen'}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyle.container]}>
          <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        {firstDish?.image_url || firstDish?.imageUrl ? (
          <Image 
            source={{ uri: firstDish.image_url || firstDish.imageUrl }} 
            style={styles.dishImage} 
          />
        ) : (
          <View style={styles.dishImagePlaceholder}>
            <Feather name="coffee" size={20} color="#999" />
          </View>
        )}
        <View style={styles.orderDetail}>
          <Text style={styles.dishesText} numberOfLines={2}>{dishesSummary}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Bill</Text>
            <Text style={styles.totalPrice}>₹{item.total_cost}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.reorderButton} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={14} color="#e75480" style={{ marginRight: 6 }} />
          <Text style={styles.reorderButtonText}>Reorder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (showIndicator = true) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    if (showIndicator) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await api.get('/orders');
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error loading order history:', err);
      setError('Failed to load order history. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders(false);
  }, [fetchOrders]);

  const renderItem = useCallback(({ item }: { item: OrderItem }) => {
    return <HistoryCard item={item} />;
  }, []);

  const keyExtractor = useCallback((item: OrderItem) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.push('/(tabs)/home')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75480" />
          <Text style={styles.loadingText}>Fetching your orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={48} color="#e75480" style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No orders placed yet</Text>
          <Text style={styles.emptySubtext}>Your past orders will appear here.</Text>
          <TouchableOpacity 
            style={styles.exploreButton} 
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Text style={styles.exploreButtonText}>Browse Kitchens</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerRightPlaceholder: {
    width: 44,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // Card Styles
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  kitchenInfo: {
    flex: 1,
    marginRight: 8,
  },
  kitchenName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusCompletedText: {
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusPendingText: {
    color: '#EF6C00',
  },
  statusDefault: {
    backgroundColor: '#F5F5F5',
  },
  statusDefaultText: {
    color: '#616161',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  cardBody: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  dishImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#E5E5E5',
  },
  dishImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderDetail: {
    flex: 1,
  },
  dishesText: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#999999',
    marginRight: 6,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reorderButton: {
    flexDirection: 'row',
    backgroundColor: '#FDF0F5',
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#e75480',
    fontSize: 13,
    fontWeight: '600',
  },

  // Loading/Error/Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  errorText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#e75480',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#e75480',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

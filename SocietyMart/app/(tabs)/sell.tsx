import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../../config/api';
import { useAuth } from '../../store/AuthContext';

type Society = {
  id: string;
  name: string;
};

type Kitchen = {
  id: string;
  name: string;
  is_verified: boolean;
  is_active?: boolean;
};

type Dish = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: string;
  price: number;
  is_available: boolean;
};

const DISH_CATEGORIES = ['starters', 'main-course', 'desserts', 'bakery', 'miscellaneous'];

export default function SellerScreen() {
  const { sessionToken, user, refreshUser } = useAuth();

  const [kitchenName, setKitchenName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [isSocietyModalOpen, setIsSocietyModalOpen] = useState(false);
  const [isSubmittingKitchen, setIsSubmittingKitchen] = useState(false);

  const [kitchenDetails, setKitchenDetails] = useState<Kitchen | null>(null);
  const [checkingKitchen, setCheckingKitchen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isKitchenOpen, setIsKitchenOpen] = useState(true);

  const [activeView, setActiveView] = useState<'dashboard' | 'add' | 'list'>('dashboard');

  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState(DISH_CATEGORIES[0]);
  const [productPrice, setProductPrice] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [imageLocalPath, setImageLocalPath] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmittingDish, setIsSubmittingDish] = useState(false);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedSocietyName = useMemo(() => {
    return societies.find((society) => String(society.id) === String(societyId))?.name || '';
  }, [societies, societyId]);

  const fetchKitchenStatus = async (silent = false) => {
    if (!sessionToken) {
      setCheckingKitchen(false);
      return;
    }

    if (!user?.kitchen_id) {
      setKitchenDetails(null);
      setCheckingKitchen(false);
      return;
    }

    try {
      if (!silent) setCheckingKitchen(true);
      const response = await api.get(`/kitchens/${user.kitchen_id}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setKitchenDetails(response.data?.kitchen || null);
      setIsKitchenOpen(Boolean(response.data?.kitchen?.is_active));
    } catch (error) {
      setKitchenDetails(null);
    } finally {
      setCheckingKitchen(false);
    }
  };

  const fetchSocieties = async () => {
    if (!sessionToken) return;
    try {
      const response = await api.get('/societies', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setSocieties(response.data || []);
    } catch {
      setErrorMessage('Unable to load societies. Please try again.');
    } finally {
      setLoadingSocieties(false);
    }
  };

  const fetchMyDishes = async () => {
    if (!sessionToken) return;
    try {
      setLoadingDishes(true);
      const response = await api.get('/dishes/mine', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setDishes(response.data?.dishes || []);
    } catch (error: any) {
      const backendMessage = error?.response?.data?.error || '';
      if (String(backendMessage).toLowerCase().includes('forbidden')) {
        setErrorMessage('Unable to load dishes right now. Please refresh once.');
      } else {
        setErrorMessage(backendMessage || 'Failed to load dishes.');
      }
    } finally {
      setLoadingDishes(false);
    }
  };

  const onToggleKitchenStatus = async (nextValue: boolean) => {
    if (!sessionToken || !kitchenDetails?.id) return;

    const previous = isKitchenOpen;
    try {
      setIsKitchenOpen(nextValue);
      await api.patch(
        `/kitchens/${kitchenDetails.id}/status`,
        { isActive: nextValue },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      setKitchenDetails((prev) => (prev ? { ...prev, is_active: nextValue } : prev));
    } catch {
      setIsKitchenOpen(previous);
      setErrorMessage('Failed to update kitchen status. Please try again.');
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, [sessionToken]);

  useEffect(() => {
    fetchKitchenStatus();
  }, [user?.kitchen_id, sessionToken]);

  useEffect(() => {
    if (kitchenDetails?.is_verified && activeView === 'list') {
      fetchMyDishes();
    }
  }, [activeView, kitchenDetails?.is_verified]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setErrorMessage('');
      setSuccessMessage('');
      await refreshUser();
      await fetchKitchenStatus(true);
      if (activeView === 'list') {
        await fetchMyDishes();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const submitKitchenRequest = async () => {
    if (!kitchenName.trim() || !societyId) {
      setErrorMessage('Kitchen name and society are required.');
      return;
    }

    try {
      setIsSubmittingKitchen(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await api.post(
        '/kitchen',
        {
          name: kitchenName.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          societyId,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );

      setKitchenName('');
      setDescription('');
      setImageUrl('');
      setSocietyId('');
      setSuccessMessage(
        response?.data?.message ||
          'Verification is in progress and you will be assigned a kitchen id soon.'
      );

      await refreshUser();
      await fetchKitchenStatus(true);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Failed to submit kitchen details.');
    } finally {
      setIsSubmittingKitchen(false);
    }
  };

  const pickProductImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMessage('Media library permission is required to pick image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const pickedUri = result.assets[0].uri;
      const ext = pickedUri.split('.').pop() || 'jpg';
      const targetDir = `${FileSystem.documentDirectory}dish-images`;
      const targetPath = `${targetDir}/dish_${Date.now()}.${ext}`;

      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      await FileSystem.copyAsync({ from: pickedUri, to: targetPath });

      setSelectedImageUri(targetPath);
      setImageLocalPath(targetPath);
      setSuccessMessage('Image selected successfully.');
      setErrorMessage('');
    } catch {
      setErrorMessage('Failed to pick image. Please try again.');
    }
  };

  const submitDish = async () => {
    if (!productName.trim() || !productPrice.trim()) {
      setErrorMessage('Product name and price are required.');
      return;
    }

    const parsedPrice = Number(productPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage('Please enter a valid price greater than 0.');
      return;
    }

    try {
      setIsSubmittingDish(true);
      setErrorMessage('');
      setSuccessMessage('');

      await api.post(
        '/dishes',
        {
          name: productName.trim(),
          description: productDescription.trim(),
          category: productCategory,
          price: parsedPrice,
          imageUrl: imageLocalPath || null,
          isAvailable: false,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );

      setProductName('');
      setProductDescription('');
      setProductCategory(DISH_CATEGORIES[0]);
      setProductPrice('');
      setSelectedImageUri('');
      setImageLocalPath('');
      setSuccessMessage('Dish added successfully with availability set to OFF.');
      setActiveView('list');
      await fetchMyDishes();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Failed to add dish.');
    } finally {
      setIsSubmittingDish(false);
    }
  };

  const onToggleDishAvailability = async (dish: Dish, nextAvailability: boolean) => {
    try {
      const response = await api.patch(
        `/dishes/${dish.id}/availability`,
        { is_available: nextAvailability },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );

      const updatedDish = response.data?.dish;
      setDishes((prev) => prev.map((item) => (item.id === dish.id ? { ...item, ...updatedDish } : item)));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error || 'Failed to update availability.');
    }
  };

  if (checkingKitchen) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#e75480" />
      </SafeAreaView>
    );
  }

  if (kitchenDetails && !kitchenDetails.is_verified) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, styles.centerContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e75480']} />}>
          <View style={styles.statusCard}>
            <Ionicons name="time" size={42} color="#e67e22" />
            <Text style={styles.statusTitle}>Kitchen Pending Verification</Text>
            <Text style={styles.statusText}>
              Kitchen is created but verification is under process please wait for some time.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!kitchenDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconContainer}>
            <Ionicons name="storefront" size={42} color="#e75480" />
          </View>

          <Text style={styles.title}>Seller Registration</Text>
          <Text style={styles.subtitle}>Enter your kitchen details. Our team will verify and activate your kitchen.</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Kitchen Name</Text>
            <TextInput
              style={styles.input}
              value={kitchenName}
              onChangeText={setKitchenName}
              placeholder="e.g. Spice Home Kitchen"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell buyers about your kitchen"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/kitchen.jpg"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Society</Text>
            <TouchableOpacity
              style={styles.dropdown}
              disabled={loadingSocieties}
              onPress={() => setIsSocietyModalOpen(true)}>
              <Text style={selectedSocietyName ? styles.dropdownValue : styles.dropdownPlaceholder}>
                {loadingSocieties ? 'Loading societies...' : selectedSocietyName || 'Select your society'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            {!!successMessage && <Text style={styles.successText}>{successMessage}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, isSubmittingKitchen && styles.buttonDisabled]}
              onPress={submitKitchenRequest}
              disabled={isSubmittingKitchen}>
              {isSubmittingKitchen ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit For Verification</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={isSocietyModalOpen} transparent animationType="slide">
          <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setIsSocietyModalOpen(false)}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Choose Society</Text>
              <ScrollView>
                {societies.map((society) => (
                  <TouchableOpacity
                    key={society.id}
                    style={styles.modalRow}
                    onPress={() => {
                      setSocietyId(String(society.id));
                      setIsSocietyModalOpen(false);
                    }}>
                    <Text style={styles.modalRowText}>{society.name}</Text>
                    {String(society.id) === String(societyId) ? (
                      <Ionicons name="checkmark-circle" size={18} color="#e75480" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {activeView === 'dashboard' ? (
        <View style={styles.topHeader}>
          <View style={styles.headerLeftRow}>
            <View style={styles.dashboardIconBubble}>
              <Ionicons name="storefront" size={14} color="#e75480" />
            </View>
            <View>
              <Text style={styles.headerKitchenTitle}>{kitchenDetails.name}</Text>
              <Text style={styles.headerKitchenSubtitle}>Seller Dashboard</Text>
            </View>
          </View>
          <View style={styles.openWrap}>
            <Switch
              value={isKitchenOpen}
              onValueChange={onToggleKitchenStatus}
              trackColor={{ true: '#e75480', false: '#ddd' }}
              thumbColor="#fff"
            />
            <Text style={[styles.openText, !isKitchenOpen && styles.closedText]}>{isKitchenOpen ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.addScreenHeader}>
          <TouchableOpacity onPress={() => setActiveView('dashboard')} style={styles.backIconBtn}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.addScreenHeaderTitle}>{activeView === 'add' ? 'Add New Product' : 'Dishes Added'}</Text>
          <View style={{ width: 34 }} />
        </View>
      )}

      {!!errorMessage && <Text style={styles.errorTextInline}>{errorMessage}</Text>}
      {!!successMessage && <Text style={styles.successTextInline}>{successMessage}</Text>}

      {activeView === 'dashboard' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.earningsCardHero}>
            <View style={styles.earningsTopRow}>
              <Text style={styles.earningsLabel}>Today&apos;s Earnings</Text>
              <View style={styles.earningsBadgeIcon}><Ionicons name="stats-chart" size={14} color="#fff" /></View>
            </View>
            <Text style={styles.earningsAmount}>₹4,250</Text>
            <View style={styles.statsRowBottom}>
              <View>
                <Text style={styles.statMiniLabel}>Total Orders</Text>
                <Text style={styles.statMiniValue}>24</Text>
              </View>
              <View>
                <Text style={styles.statMiniLabel}>Avg. Value</Text>
                <Text style={styles.statMiniValue}>₹177</Text>
              </View>
              <View>
                <Text style={styles.statMiniLabel}>Completion</Text>
                <Text style={styles.statMiniValue}>98%</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.dashedActionBtn} onPress={() => setActiveView('add')}>
            <View style={styles.plusDot}><Ionicons name="add" size={16} color="#e75480" /></View>
            <Text style={styles.dashedActionText}>Add New Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashedActionBtn} onPress={() => setActiveView('list')}>
            <View style={styles.plusDot}><Ionicons name="restaurant" size={14} color="#e75480" /></View>
            <Text style={styles.dashedActionText}>Dishes Added</Text>
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsContainer}>
            <TouchableOpacity style={[styles.filterPill, styles.filterPillActive]}><Text style={[styles.filterPillText, styles.filterPillTextActive]}>New (3)</Text></TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}><Text style={styles.filterPillText}>Preparing (2)</Text></TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}><Text style={styles.filterPillText}>Ready (1)</Text></TouchableOpacity>
            <TouchableOpacity style={styles.filterPill}><Text style={styles.filterPillText}>Completed</Text></TouchableOpacity>
          </ScrollView>

          <View style={styles.orderCard}>
            <View style={styles.orderHeaderRow}>
              <View>
                <Text style={styles.orderId}>#ORD-84730</Text>
                <Text style={styles.orderTime}>Today, 01:15 PM</Text>
              </View>
              <Text style={styles.orderTotal}>₹320.00</Text>
            </View>
            <View style={styles.orderItemLine}><Text style={styles.orderItemName}>2x Chicken Biryani</Text><Text style={styles.orderItemPrice}>₹240</Text></View>
            <View style={styles.orderItemLine}><Text style={styles.orderItemName}>1x Raita</Text><Text style={styles.orderItemPrice}>₹80</Text></View>
            <Text style={styles.orderNote}>Note: Make it extra spicy please.</Text>
            <View style={styles.orderActionRow}>
              <TouchableOpacity style={styles.rejectBtn}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn}><Text style={styles.acceptBtnText}>Accept Order</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : activeView === 'add' ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.uploadCard}>
            <TouchableOpacity style={styles.uploadDashedBox} onPress={pickProductImage}>
              <View style={styles.uploadIconWrap}><Ionicons name="camera" size={18} color="#e75480" /></View>
              <Text style={styles.uploadTitle}>Upload Product Photo</Text>
              <Text style={styles.uploadSub}>PNG, JPG up to 5MB</Text>
            </TouchableOpacity>
            {!!selectedImageUri && <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Core Details</Text>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Paneer Tikka"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Short description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setIsCategoryModalOpen(true)}>
              <Text style={styles.dropdownValue}>{productCategory}</Text>
              <Ionicons name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>

            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              value={productPrice}
              onChangeText={setProductPrice}
              placeholder="e.g. 199"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />

            {!!imageLocalPath && <Text style={styles.localPathText}>Local Path: {imageLocalPath}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, isSubmittingDish && styles.buttonDisabled]}
              onPress={submitDish}
              disabled={isSubmittingDish}>
              {isSubmittingDish ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Product</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing || loadingDishes} onRefresh={onRefresh} colors={['#e75480']} />}>
          {loadingDishes ? <ActivityIndicator color="#e75480" style={{ marginTop: 32 }} /> : null}

          {!loadingDishes && dishes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No dishes added yet</Text>
              <Text style={styles.emptyStateText}>Use Add New Product to create your first dish.</Text>
            </View>
          ) : null}

          {dishes.map((dish) => (
            <View key={dish.id} style={styles.dishCard}>
              {dish.image_url ? (
                <Image source={{ uri: dish.image_url }} style={styles.dishImage} />
              ) : (
                <View style={[styles.dishImage, styles.dishImageFallback]}>
                  <Ionicons name="fast-food" size={22} color="#e75480" />
                </View>
              )}

              <View style={styles.dishDetails}>
                <Text style={styles.dishName} numberOfLines={1}>{dish.name}</Text>
                <Text style={styles.dishCategory}>{dish.category}</Text>
                <Text style={styles.dishPrice}>₹{Number(dish.price).toFixed(2)}</Text>
              </View>

              <View style={styles.availabilityBlock}>
                <Switch
                  value={dish.is_available}
                  onValueChange={(value) => onToggleDishAvailability(dish, value)}
                  trackColor={{ false: '#f4b9ca', true: '#e75480' }}
                  thumbColor="#ffffff"
                />
                <Text style={styles.availabilityText}>{dish.is_available ? 'Available' : 'Unavailable'}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={isCategoryModalOpen} transparent animationType="slide">
        <TouchableOpacity activeOpacity={1} style={styles.modalBackdrop} onPress={() => setIsCategoryModalOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose Category</Text>
            <ScrollView>
              {DISH_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.modalRow}
                  onPress={() => {
                    setProductCategory(category);
                    setIsCategoryModalOpen(false);
                  }}>
                  <Text style={styles.modalRowText}>{category}</Text>
                  {productCategory === category ? (
                    <Ionicons name="checkmark-circle" size={18} color="#e75480" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 36 },
  listContent: { padding: 16, paddingBottom: 30 },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  formCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: { color: '#222', fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1A1A1A',
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  textArea: { minHeight: 92, textAlignVertical: 'top' },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { color: '#1A1A1A', fontSize: 14 },
  dropdownPlaceholder: { color: '#999', fontSize: 14 },
  submitButton: {
    backgroundColor: '#e75480',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.65 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#d32f2f', marginTop: 12, fontSize: 13, textAlign: 'center' },
  successText: { color: '#2e7d32', marginTop: 12, fontSize: 13, textAlign: 'center' },
  errorTextInline: { color: '#d32f2f', marginHorizontal: 16, marginTop: 8, textAlign: 'center' },
  successTextInline: { color: '#2e7d32', marginHorizontal: 16, marginTop: 8, textAlign: 'center' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '60%',
    padding: 16,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  modalRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRowText: { color: '#222', fontSize: 15 },

  statusCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  statusTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  statusText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21 },

  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3dce5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
  dashboardIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerKitchenTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  headerKitchenSubtitle: { fontSize: 12, color: '#808080' },
  openWrap: { alignItems: 'center' },
  openText: { color: '#34a853', fontSize: 11, marginTop: 2 },
  closedText: { color: '#999' },

  addScreenHeader: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e0e6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  backIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addScreenHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  kitchenHeading: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  kitchenSubHeading: { fontSize: 14, color: '#777', marginTop: 2 },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f0c6d4',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonActive: {
    borderColor: '#e75480',
    backgroundColor: '#FDF0F5',
  },
  actionButtonText: { color: '#a45973', fontWeight: '600', fontSize: 14 },
  actionButtonTextActive: { color: '#e75480' },

  imagePickerButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f0c6d4',
    borderRadius: 12,
    backgroundColor: '#fff5f8',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  imagePickerButtonText: { color: '#e75480', fontWeight: '600' },
  previewImage: {
    marginTop: 12,
    width: '100%',
    height: 170,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  localPathText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },

  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptyStateText: { marginTop: 8, color: '#666', fontSize: 14 },

  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff6f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1d6df',
    padding: 10,
    marginBottom: 12,
  },
  dishImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#f2f2f2',
  },
  dishImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  dishName: { fontSize: 18, fontWeight: '700', color: '#1f1f1f' },
  dishCategory: { fontSize: 12, color: '#9a6073', marginTop: 4, textTransform: 'capitalize' },
  dishPrice: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginTop: 6 },
  availabilityBlock: {
    alignItems: 'center',
    minWidth: 92,
  },
  availabilityText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#7a4d5e' },

  earningsCardHero: {
    backgroundColor: '#e02d7e',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  earningsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsLabel: { color: '#ffd8e8', fontSize: 13, fontWeight: '600' },
  earningsBadgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsAmount: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 2 },
  statsRowBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statMiniLabel: { color: '#ffd8e8', fontSize: 11 },
  statMiniValue: { color: '#fff', fontSize: 20, fontWeight: '700' },

  dashedActionBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f1bfd2',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8fb',
  },
  plusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fce6ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dashedActionText: { color: '#e75480', fontSize: 15, fontWeight: '700' },

  filterPillsContainer: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  filterPill: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  filterPillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterPillText: { color: '#7b7b7b', fontSize: 12, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },

  orderCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
  },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  orderTime: { fontSize: 12, color: '#777', marginTop: 4 },
  orderTotal: { fontSize: 26, fontWeight: '800', color: '#e75480' },
  orderItemLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  orderItemName: { color: '#1A1A1A', fontSize: 14 },
  orderItemPrice: { color: '#6b6b6b', fontSize: 14, fontWeight: '600' },
  orderNote: { marginTop: 12, fontSize: 12, color: '#777', fontStyle: 'italic' },
  orderActionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rejectBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#e8e8e8', paddingVertical: 12, alignItems: 'center' },
  rejectBtnText: { color: '#333', fontWeight: '700' },
  acceptBtn: { flex: 1, borderRadius: 10, backgroundColor: '#e75480', paddingVertical: 12, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700' },

  uploadCard: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e790b0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  uploadIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fde8f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { marginTop: 10, color: '#e75480', fontWeight: '700' },
  uploadSub: { marginTop: 4, color: '#808080', fontSize: 12 },
  sectionTitle: { color: '#1A1A1A', fontWeight: '700', fontSize: 16, marginBottom: 4 },
});

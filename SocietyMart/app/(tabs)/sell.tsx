import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../config/api';
import { useAuth } from '../../store/AuthContext';

type Society = {
  id: string;
  name: string;
};

export default function SellerScreen() {
  const { sessionToken } = useAuth();
  const [kitchenName, setKitchenName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [societyId, setSocietyId] = useState('');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [isSocietyModalOpen, setIsSocietyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!sessionToken) {
      return;
    }

    const fetchSocieties = async () => {
      try {
        const response = await api.get('/societies', {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        setSocieties(response.data || []);
      } catch (error) {
        setErrorMessage('Unable to load societies. Please try again.');
      } finally {
        setLoadingSocieties(false);
      }
    };

    fetchSocieties();
  }, [sessionToken]);

  const selectedSocietyName = useMemo(() => {
    return societies.find((society) => String(society.id) === String(societyId))?.name || '';
  }, [societies, societyId]);

  const submitKitchenRequest = async () => {
    if (!kitchenName.trim() || !societyId) {
      setErrorMessage('Kitchen name and society are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await api.post('/kitchen', {
        name: kitchenName.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        societyId,
      });

      setSuccessMessage(
        response?.data?.message ||
          'Verification is in progress and you will be assigned a kitchen id soon.'
      );
      setKitchenName('');
      setDescription('');
      setImageUrl('');
      setSocietyId('');
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.error || 'Failed to submit kitchen details. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={42} color="#e75480" />
        </View>

        <Text style={styles.title}>Seller Registration</Text>
        <Text style={styles.subtitle}>
          Enter your kitchen details. Our team will verify and activate your kitchen.
        </Text>

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
              {loadingSocieties
                ? 'Loading societies...'
                : selectedSocietyName || 'Select your society'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#666" />
          </TouchableOpacity>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          {!!successMessage && <Text style={styles.successText}>{successMessage}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={submitKitchenRequest}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit For Verification</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isSocietyModalOpen} transparent animationType="slide">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setIsSocietyModalOpen(false)}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 36 },
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
  errorText: { color: '#d32f2f', marginTop: 12, fontSize: 13 },
  successText: { color: '#2e7d32', marginTop: 12, fontSize: 13 },
  submitButton: {
    backgroundColor: '#e75480',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.65 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
});

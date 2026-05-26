import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../config/api';
export default function ProfileScreen() {
  const { user, sessionToken, completeRegistration, isRegistrationComplete, logout } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [societyId, setSocietyId] = useState(user?.society_id || '');
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(false);
  const [isSocietyModalOpen, setIsSocietyModalOpen] = useState(false);
    // Fetch societies for dropdown (only if user is authenticated)
    useEffect(() => {
      if (!user || !sessionToken) return;
      const fetchSocieties = async () => {
        setSocietiesLoading(true);
        try {
          const response = await api.get('/societies', {
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
          if (Array.isArray(response.data)) {
            setSocieties(response.data);
          } else {
            setSocieties([]);
          }
        } catch (err) {
          setSocieties([]);
        } finally {
          setSocietiesLoading(false);
        }
      };
      fetchSocieties();
    }, [user, sessionToken]);

    const selectedSocietyName = useMemo(() => {
      return societies.find((soc) => String(soc.id) === String(societyId))?.name || '';
    }, [societies, societyId]);
  const [flatNumber, setFlatNumber] = useState(user?.flat_number || '');
  const [agreed, setAgreed] = useState(true); // Default to agreed for easier signup
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state if user context loads later
  React.useEffect(() => {
    if (user) {
      if (user.full_name) setFullName(user.full_name);
      if (user.phone) setPhone(user.phone);
      if (user.society_id) setSocietyId(user.society_id);
      if (user.flat_number) setFlatNumber(user.flat_number);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!fullName || !phone || !flatNumber || !societyId) {
      Alert.alert('Missing Info', 'Please fill in all details, including society.');
      return;
    }
    try {
      setLoading(true);
      await completeRegistration({ 
        fullName, 
        phone, 
        societyId, 
        flatNumber, 
        role: 'buyer' // Default role to buyer as role selection was removed
      });
      setIsEditing(false); // Close edit view on success
      Alert.alert('Success', 'Profile details updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      router.replace('/');
    } catch (error) {
      console.warn('[ProfileScreen] Local logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only show the edit form if they haven't finished setup, OR if they actively clicked "Modify Profile"
  const showForm = !isRegistrationComplete || isEditing;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={styles.smallLogo}>
              <Ionicons name="restaurant" size={16} color="#e75480" />
            </View>
          </View>

          {/* Success Toast Notification (Visible when completed and not editing) */}
          {isRegistrationComplete && !isEditing && (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.successToastText}>Profile is setup! Start ordering</Text>
            </View>
          )}

          {/* Titles: Only shown when configuring/modifying the profile */}
          {(!isRegistrationComplete || isEditing) && (
            <>
              <Text style={styles.title}>{isEditing ? 'Modify Profile' : 'Setup Account'}</Text>
              <Text style={styles.subtitle}>Join your society's marketplace</Text>
            </>
          )}

          {showForm ? (
            /* Form View: Shown when registering or modifying */
            <View style={{ flex: 1 }}>
              <View style={styles.formContainer}>
                
                <View style={styles.inputGroup}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Full Name" 
                    placeholderTextColor="#999" 
                    value={fullName}
                    onChangeText={setFullName}
                  />
                  <Feather name="user" size={20} color="#999" style={styles.inputIcon} />
                </View>

                <View style={[styles.inputGroup, styles.disabledInputGroup]}>
                  <TextInput 
                    style={[styles.input, { color: '#666' }]} 
                    placeholder="Phone Number" 
                    placeholderTextColor="#999" 
                    keyboardType="phone-pad" 
                    value={phone}
                    editable={false} // Phone is verified via Firebase OTP, always read-only
                  />
                  <View style={styles.verifyBadge}>
                    <Text style={styles.verifyText}>Verified</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Society</Text>
                <View style={styles.dropdownGroup}>
                  <TouchableOpacity
                    style={styles.dropdown}
                    disabled={societiesLoading}
                    onPress={() => setIsSocietyModalOpen(true)}>
                    <Text style={selectedSocietyName ? styles.dropdownValue : styles.dropdownPlaceholder}>
                      {societiesLoading
                        ? 'Loading societies...'
                        : selectedSocietyName || 'Select Society'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#666" />
                  </TouchableOpacity>
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
                </View>


                <View style={styles.inputGroup}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Flat / Villa Number" 
                    placeholderTextColor="#999" 
                    value={flatNumber}
                    onChangeText={setFlatNumber}
                  />
                  <Feather name="home" size={20} color="#999" style={styles.inputIcon} />
                </View>

              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity style={styles.termsContainer} onPress={() => setAgreed(!agreed)}>
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.pinkText}>Terms of Service</Text> and <Text style={styles.pinkText}>Privacy Policy</Text>, and confirm I am a resident of the selected society.
                </Text>
              </TouchableOpacity>

              {/* Submit Buttons for Form */}
              {!isRegistrationComplete ? (
                <TouchableOpacity 
                  style={[styles.primaryButton, (!agreed || loading) && styles.disabledButton]}
                  disabled={!agreed || loading}
                  onPress={handleSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Complete Profile</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.primaryButton, loading && styles.disabledButton]}
                    disabled={loading}
                    onPress={handleSubmit}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.outlineButton}
                    onPress={() => {
                      if (user) {
                        setFullName(user.full_name || '');
                        setFlatNumber(user.flat_number || '');
                        setSocietyId(user.society_id || '');
                      }
                      setIsEditing(false);
                    }}
                  >
                    <Text style={styles.outlineButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* Simple Aesthetic Text Details View: Shown when profile is complete and not modifying */
            <View style={{ flex: 1, marginTop: 12 }}>
              <View style={styles.textDetailsContainer}>
                <View style={styles.detailRow}>
                  <Feather name="user" size={20} color="#e75480" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{fullName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Feather name="phone" size={20} color="#e75480" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{phone}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Feather name="map-pin" size={20} color="#e75480" style={styles.detailIcon} />
                  <Text style={styles.detailText}>
                    {societies.find(s => s.id === societyId)?.name || 'Society not selected'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Feather name="home" size={20} color="#e75480" style={styles.detailIcon} />
                  <Text style={styles.detailText}>Flat / Villa {flatNumber}</Text>
                </View>
              </View>

              <View style={{ gap: 16, marginTop: 40, width: '100%' }}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.primaryButtonText}>Modify Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.outlineButton}
                  onPress={handleLogout}
                >
                  {loading ? (
                    <ActivityIndicator color="#e75480" />
                  ) : (
                    <Text style={styles.outlineButtonText}>Logout</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  smallLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FDF0F5', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  fieldLabel: { color: '#222', fontWeight: '600', marginBottom: 8, marginTop: 6 },
  dropdownGroup: { marginBottom: 16 },

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
  
  formContainer: { marginBottom: 24 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  inputIcon: { marginLeft: 12 },
  verifyBadge: { backgroundColor: '#FDF0F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  verifyText: { color: '#e75480', fontSize: 12, fontWeight: '600' },
  
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  
  termsContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E5E5E5', marginRight: 12, marginTop: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#e75480', borderColor: '#e75480' },
  termsText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 18 },
  pinkText: { color: '#e75480' },
  
  primaryButton: { backgroundColor: '#e75480', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 'auto', shadowColor: '#e75480', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  successToast: { backgroundColor: '#4CAF50', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 20, zIndex: 10 },
  successToastText: { color: '#ffffff', fontSize: 14, fontWeight: '600', flex: 1 },
  disabledInputGroup: { backgroundColor: '#F9F9F9', borderColor: '#E5E5E5' },
  outlineButton: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e75480', backgroundColor: '#ffffff' },
  outlineButtonText: { color: '#e75480', fontSize: 16, fontWeight: '600' },
  textDetailsContainer: { backgroundColor: '#FDF7F9', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: '#FADAE4', marginBottom: 24 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#FBE8EF' },
  detailIcon: { marginRight: 16 },
  detailText: { fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
});

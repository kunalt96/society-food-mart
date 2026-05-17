import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth } from '../config/firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp-verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Firebase usually sends 6 digits
  const [loading, setLoading] = useState(false);

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const otpInputs = useRef<Array<TextInput | null>>([]);

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length === 10) {
      setLoading(true);
      try {
        const phoneProvider = new PhoneAuthProvider(auth);
        const vid = await phoneProvider.verifyPhoneNumber(
          `+91${phoneNumber}`,
          recaptchaVerifier.current!
        );
        setVerificationId(vid);
        setStep('otp-verify');
      } catch (error: any) {
        console.error('Firebase OTP Send Error:', error);
        Alert.alert('Error', error.message || 'Failed to send OTP. Please check your number.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    const cleanValue = value.replace(/[^0-9]/g, '');
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanValue !== '' && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.every(digit => digit !== '')) {
      setLoading(true);
      try {
        const otpCode = otp.join('');
        const credential = PhoneAuthProvider.credential(verificationId, otpCode);
        const userCredential = await signInWithCredential(auth, credential);

        if (userCredential.user) {
          console.log('Firebase login successful');
          // AuthContext will handle navigation via onAuthStateChanged
        }
      } catch (error: any) {
        console.error('Firebase OTP Verify Error:', error);
        Alert.alert('Verification Failed', error.message || 'Invalid OTP code. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const vid = await phoneProvider.verifyPhoneNumber(
        `+91${phoneNumber}`,
        recaptchaVerifier.current!
      );
      setVerificationId(vid);
      Alert.alert('Code Resent', 'A new 6-digit code has been sent to your phone.');
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification={true}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => step === 'otp-verify' ? setStep('phone') : router.back()}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={styles.miniLogo}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#e75480" />
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Login to your Society Marketplace account</Text>
          </View>

          {step === 'phone' ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Feather name="phone" size={20} color="#999" style={styles.inputIcon} />
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, (phoneNumber.length < 10 || loading) && styles.disabledButton]}
                onPress={handlePhoneSubmit}
                disabled={phoneNumber.length < 10 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.otpInstruction}>Enter the 6-digit code sent to {'\n'}+91 {phoneNumber}</Text>
              
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={el => { otpInputs.current[index] = el; }}
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(val, index)}
                    editable={!loading}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && digit === '' && index > 0) {
                        otpInputs.current[index - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, (otp.some(d => d === '') || loading) && styles.disabledButton]}
                onPress={handleVerifyOtp}
                disabled={otp.some(d => d === '') || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={resendOtp}
                disabled={loading}
              >
                <Text style={styles.resendText}>Didn't receive code? <Text style={{ color: '#e75480', fontWeight: '700' }}>Resend</Text></Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDF0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  inputIcon: {
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '700',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#e75480',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e75480',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#FADDE8',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  otpInstruction: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
    paddingHorizontal: 5,
  },
  otpInput: {
    width: 45,
    height: 55,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    color: '#e75480',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
});

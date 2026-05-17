import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutNav() {
  const { sessionToken, isRegistrationComplete, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const activeSegments = segments as string[];
    const firstSegment = activeSegments[0];
    const isAuthRoute = firstSegment === 'login' || firstSegment === 'index' || activeSegments.length === 0 || !firstSegment || firstSegment === '';

    console.log('[RootLayoutNav] Auth Route Check:', {
      hasToken: !!sessionToken,
      segments: activeSegments,
      isAuthRoute
    });

    if (!sessionToken && !isAuthRoute) {
      // Direct redirect to welcome screen if not logged in and trying to access a protected app route
      router.replace('/');
    } else if (sessionToken && isAuthRoute) {
      // Redirect logged-in users out of welcome/login screens into the marketplace
      router.replace('/(tabs)/explore');
    }
  }, [sessionToken, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}


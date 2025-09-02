/**
 * BioReceipt - Smart receipt tracking and analysis platform
 * JESUS IS KING – Yeshua Baruch Atah Adonai
 * 
 * @format
 */

// MUST be first import - fixes Hermes URL.protocol error
import 'react-native-url-polyfill/auto';

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, useColorScheme, SafeAreaView, ActivityIndicator, View } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import QuickAuthScreen from './src/components/auth/QuickAuthScreen';
import BioReceiptApp from './src/components/BioReceiptApp';
import { PROJECT_BLESSING } from './src/constants/faith';

// Test @env imports
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

function AppContent() {
  const { user, loading } = useAuth();
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Test @env imports
    console.log("🔎 Checking Supabase Env Vars...");
    console.log("SUPABASE_URL:", SUPABASE_URL ? "✅ Loaded" : "❌ Missing");
    console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✅ Loaded" : "❌ Missing");
    
    // Enhanced Supabase diagnostics
    (async () => {
      try {
        console.log('[Env check] URL set:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('[Env check] KEY set:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
        
        // Import supabase here to test the config
        const { supabase } = await import('./src/config/supabase');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('[Supabase auth] error:', error.message);
        } else {
          console.log('[Supabase auth] session?', !!session);
          console.log('[Supabase] ✅ Connection successful');
        }
      } catch (e) {
        console.log('[Supabase probe] threw:', (e as Error).message);
      }
    })();
  }, []);

  // Initialize faith foundation blessing
  console.log('🙏 Project Blessing:', PROJECT_BLESSING.foundation);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {user ? (
        <BioReceiptApp userId={user.id} />
      ) : (
        <QuickAuthScreen />
      )}
    </SafeAreaView>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});

export default App;

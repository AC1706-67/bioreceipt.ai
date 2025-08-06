/**
 * BioPulse.AI - AI-powered health insights and predictive analytics platform
 * JESUS IS KING – Yeshua Baruch Atah Adonai
 * 
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, SafeAreaView } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthNavigator } from './src/components/navigation/AuthNavigator';
import { PROJECT_BLESSING } from './src/constants/faith';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Initialize faith foundation blessing
  console.log('🙏 Project Blessing:', PROJECT_BLESSING.foundation);

  return (
    <Provider store={store}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AuthNavigator />
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default App;

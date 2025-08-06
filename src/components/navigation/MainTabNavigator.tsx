/**
 * Main Tab Navigator
 * Bottom tab navigation for the main app screens
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { ErrorBoundary } from '../error/ErrorBoundary';
import { DailyTipsScreen } from '../../screens/tips/DailyTipsScreen';
import { ProgressScreen } from '../../screens/progress/ProgressScreen';
import { ProfileScreen } from '../../screens/profile/ProfileScreen';
import { SupportScreen } from '../../screens/support/SupportScreen';
import { FeedbackScreen } from '../../screens/feedback/FeedbackScreen';
import { FeedbackHistoryScreen } from '../../screens/feedback/FeedbackHistoryScreen';
import { NotificationSettingsScreen } from '../../screens/settings/NotificationSettingsScreen';
import { LogsScreen } from '../../screens/admin/LogsScreen';
import { ErrorTestComponent } from '../demo/ErrorTestComponent';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Support Stack Navigator (includes feedback screens)
const SupportStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#3498db',
      },
      headerTintColor: '#ffffff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="SupportMain" 
      component={SupportScreen}
      options={{ title: 'Help & Support' }}
    />
    <Stack.Screen 
      name="Feedback" 
      component={FeedbackScreen}
      options={{ title: 'Send Feedback' }}
    />
    <Stack.Screen 
      name="FeedbackHistory" 
      component={FeedbackHistoryScreen}
      options={{ title: 'Feedback History' }}
    />
  </Stack.Navigator>
);

// Profile Stack Navigator (includes settings)
const ProfileStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#3498db',
      },
      headerTintColor: '#ffffff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen 
      name="NotificationSettings" 
      component={NotificationSettingsScreen}
      options={{ title: 'Notification Settings' }}
    />
    {__DEV__ && (
      <>
        <Stack.Screen 
          name="Logs" 
          component={LogsScreen}
          options={{ title: 'Application Logs' }}
        />
        <Stack.Screen 
          name="ErrorTest" 
          component={ErrorTestComponent}
          options={{ title: 'Error Testing' }}
        />
      </>
    )}
  </Stack.Navigator>
);

export const MainTabNavigator: React.FC = () => {
  return (
    <ErrorBoundary>
      <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#6c757d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Tips"
        component={DailyTipsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💡</Text>
          ),
          title: 'Tips',
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
          title: 'Progress',
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🆘</Text>
          ),
          title: 'Support',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
    </ErrorBoundary>
  );
};
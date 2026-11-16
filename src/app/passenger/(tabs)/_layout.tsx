import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors, fonts } from '@/theme';

export default function PassengerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="rides" options={{ title: 'Rides', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color as string} size={size} /> }} />
    </Tabs>
  );
}

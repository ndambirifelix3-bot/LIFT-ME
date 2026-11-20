import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useTabBarOptions } from '@/components/tabBar';

export default function DriverTabs() {
  const screenOptions = useTabBarOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color as string} size={size} /> }} />
    </Tabs>
  );
}

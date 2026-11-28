import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ErrorMessage, Loading } from '@/components';
import { Map } from '@/components/Map';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBooking } from '@/features/booking/store';
import { useMyLocation } from '@/features/location';
import { useActiveRide } from '@/features/rides/hooks';
import { useUnpaidFee } from '@/features/rides/useUnpaidFee';
import { useMarket } from '@/features/markets';
import { formatMoney } from '@/lib/format';
import { colors, fonts, radius, space, type } from '@/theme';

// Map starts on central Nairobi until we know where the passenger is.
const NAIROBI = { lat: -1.2864, lng: 36.8172 };

export default function PassengerHome() {
  const { session, profile } = useAuth();
  const active = useActiveRide(session?.user.id, 'passenger');
  const loc = useMyLocation();
  const reset = useBooking((s) => s.reset);
  const unpaid = useUnpaidFee();
  const feeMarket = useMarket(unpaid.data?.market_code);

  if (active.isLoading) return <Loading />;
  // Reopened the app mid-ride → straight back to the live trip.
  if (active.data) return <Redirect href={`/passenger/trip/${active.data.id}`} />;

  const firstName = profile?.full_name.split(' ')[0] ?? '';
  const startBooking = () => {
    reset();
    router.push('/passenger/where-to');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={StyleSheet.absoluteFill}>
        <Map center={loc.position ?? NAIROBI} showsUserLocation={loc.permission === 'granted'} followKey={loc.position ? 'me' : 'nbo'} />
      </View>
      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.greeting}>
          <Text style={styles.hello}>Hello{firstName ? `, ${firstName}` : ''}</Text>
        </View>
        <View style={{ flex: 1 }} pointerEvents="none" />
        <View style={styles.sheet}>
          {loc.permission !== 'granted' ? (
            <Card style={{ backgroundColor: colors.brandBg, borderColor: colors.brandBg }}>
              <Text style={type.h3}>Use your location for pickup?</Text>
              <Text style={[type.small, { marginVertical: space.sm }]}>
                Lift Me uses your location only to set your pickup point and show nearby drivers. You can also type your pickup instead.
              </Text>
              {loc.permission === 'denied' ? (
                <Text style={[type.small, { color: colors.text }]}>Location is off. You can turn it on in your phone settings, or type your pickup address.</Text>
              ) : (
                <Button title="Allow location" variant="dark" small onPress={loc.request} />
              )}
            </Card>
          ) : null}
          <ErrorMessage error={loc.error} />
          {unpaid.data ? (
            <Card style={{ borderColor: colors.error, borderWidth: 2 }}>
              <Text style={type.h3}>Unpaid cancellation fee</Text>
              <Text style={[type.small, { marginVertical: space.sm }]}>
                Please pay {formatMoney(unpaid.data.cancellation_fee, unpaid.data.currency, feeMarket?.currency_decimals)} for a ride you cancelled late, then you can book again.
              </Text>
              <Button title="Pay now" variant="dark" small onPress={() => router.push(`/passenger/ride/${unpaid.data!.id}`)} />
            </Card>
          ) : null}
          <Pressable style={styles.whereTo} onPress={startBooking} accessibilityRole="button" accessibilityLabel="Where to?">
            <Ionicons name="search" size={20} color={colors.text} />
            <Text style={styles.whereText}>Where to?</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, padding: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  greeting: { backgroundColor: colors.black, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  hello: { fontFamily: fonts.semibold, fontSize: 15, color: colors.white },
  sheet: { gap: space.sm },
  whereTo: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.white, borderRadius: radius.lg,
    paddingHorizontal: space.lg, minHeight: 60, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  whereText: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
});

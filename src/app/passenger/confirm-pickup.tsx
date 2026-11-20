import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ErrorMessage, Header, Input } from '@/components';
import { Map } from '@/components/Map';
import type { LatLng } from '@/components/Map.types';
import { useBooking } from '@/features/booking/store';
import { useMyLocation } from '@/features/location';
import { getQuote, reverseGeocode } from '@/features/places/api';
import { goBack } from '@/lib/nav';
import { colors, space, type } from '@/theme';

const NAIROBI = { lat: -1.2864, lng: 36.8172 };

/** Drag the map under the pin to fine-tune the pickup, then add a landmark note. */
export default function ConfirmPickup() {
  const { pickOnMap } = useLocalSearchParams<{ pickOnMap?: string }>();
  const { pickup, dropoff, pickupNote, setPickup, setPickupNote, setQuote } = useBooking();
  const loc = useMyLocation();
  const [start] = useState<LatLng>(() => pickup ?? loc.position ?? NAIROBI);
  const [center, setCenter] = useState<LatLng>(start);
  const [address, setAddress] = useState(pickup?.address ?? '');
  const [looking, setLooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const moved = useRef(false);

  // Look up the address after the pin stops moving.
  useEffect(() => {
    if (!moved.current) return;
    setLooking(true);
    const t = setTimeout(() => {
      reverseGeocode(center)
        .then((a) => setAddress(a ?? `Pinned location (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})`))
        .catch(() => setAddress(`Pinned location (${center.lat.toFixed(5)}, ${center.lng.toFixed(5)})`))
        .finally(() => setLooking(false));
    }, 600);
    return () => clearTimeout(t);
  }, [center]);

  const confirm = async () => {
    const chosen = { ...center, address: address || pickup?.address || 'Pinned location' };
    setPickup(chosen);
    if (pickOnMap || !dropoff) {
      goBack('/passenger/where-to');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const quote = await getQuote({ pickup: { ...chosen, note: pickupNote }, dropoff });
      setQuote(quote);
      router.push('/passenger/options');
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      {Platform.OS !== 'web' ? (
        <View style={{ flex: 1 }}>
          <Map
            center={start}
            centerPin
            showsUserLocation={loc.permission === 'granted'}
            onCenterChange={(c) => {
              if (Math.abs(c.lat - center.lat) > 1e-6 || Math.abs(c.lng - center.lng) > 1e-6) {
                moved.current = true;
                setCenter(c);
              }
            }}
          />
          <SafeAreaView style={styles.top} edges={['top']}>
            <View style={styles.headerCard}>
              <Header title="Confirm pickup" subtitle="Move the map to put the pin on your exact spot." back />
            </View>
          </SafeAreaView>
        </View>
      ) : (
        <SafeAreaView edges={['top']} style={{ padding: space.lg }}>
          <Header title="Confirm pickup" back />
        </SafeAreaView>
      )}
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Text style={type.label}>Pickup</Text>
        <Text style={[type.h3, { marginBottom: space.md }]} numberOfLines={2}>
          {looking ? 'Finding address…' : address || pickup?.address || 'Move the map to choose'}
        </Text>
        <Input
          label="Note for your driver (optional)"
          placeholder="e.g. Near the Shell petrol station, blue gate"
          value={pickupNote}
          onChangeText={setPickupNote}
          maxLength={200}
        />
        <ErrorMessage error={error} />
        <Button title={pickOnMap || !dropoff ? 'Use this pickup' : 'Confirm pickup & see prices'} onPress={confirm} loading={loading} disabled={looking} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, padding: space.lg },
  headerCard: { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: space.lg, borderWidth: 1, borderColor: colors.border },
  sheet: { backgroundColor: colors.white, padding: space.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: '100%', maxWidth: 640, alignSelf: 'center' },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Button, ErrorMessage, Header, ListItem, Screen } from '@/components';
import { useBooking } from '@/features/booking/store';
import { useMyLocation } from '@/features/location';
import { newSessionToken, placeDetails, reverseGeocode, searchPlaces } from '@/features/places/api';
import { colors, fonts, radius, space, type } from '@/theme';

type Field = 'pickup' | 'dropoff';

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function WhereTo() {
  const { pickup, dropoff, setPickup, setDropoff } = useBooking();
  const loc = useMyLocation();
  const [focus, setFocus] = useState<Field>(pickup ? 'dropoff' : 'pickup');
  const [text, setText] = useState({ pickup: pickup?.address ?? '', dropoff: dropoff?.address ?? '' });
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const token = useRef(newSessionToken());
  const dropRef = useRef<TextInputInstance>(null);
  // The current location fills the pickup only once, and never after the passenger has typed or cleared it.
  const pickupTouched = useRef(!!pickup);

  // Default pickup = current location (address looked up on the server).
  useEffect(() => {
    if (pickup || !loc.position || pickupTouched.current) return;
    reverseGeocode(loc.position)
      .then((address) => {
        if (pickupTouched.current) return; // the passenger typed or cleared it meanwhile
        pickupTouched.current = true;
        const a = address ?? 'Current location';
        setPickup({ ...loc.position!, address: a });
        setText((t) => ({ ...t, pickup: a }));
        setFocus('dropoff');
      })
      .catch(() => undefined);
  }, [loc.position, pickup, setPickup]);

  const query = useDebounced(text[focus].trim());
  // Look for the destination around the pickup (and the pickup around the destination), else around the phone.
  const near = (focus === 'dropoff' ? pickup : dropoff) ?? loc.position;
  const committed = focus === 'pickup' ? pickup?.address : dropoff?.address;
  const suggestions = useQuery({
    queryKey: ['places', query, focus, near?.lat, near?.lng],
    enabled: query.length >= 2 && query !== committed,
    staleTime: 60_000,
    queryFn: () => searchPlaces(query, token.current, near),
  });

  const choose = async (placeId: string) => {
    setChoosing(true);
    setError(null);
    try {
      const place = await placeDetails(placeId, token.current);
      token.current = newSessionToken();
      const value = { lat: place.lat, lng: place.lng, address: place.name && !place.address.startsWith(place.name) ? `${place.name}, ${place.address}` : place.address };
      if (focus === 'pickup') {
        setPickup(value);
        setText((t) => ({ ...t, pickup: value.address }));
        setFocus('dropoff');
        dropRef.current?.focus();
      } else {
        setDropoff(value);
        setText((t) => ({ ...t, dropoff: value.address }));
      }
    } catch (e) {
      setError(e);
    } finally {
      setChoosing(false);
    }
  };

  const ready = !!pickup && !!dropoff;
  const fields = useMemo(
    () => [
      { key: 'pickup' as const, icon: 'ellipse' as const, placeholder: 'Pickup location' },
      { key: 'dropoff' as const, icon: 'flag' as const, placeholder: 'Where to?' },
    ],
    [],
  );

  return (
    <Screen footer={ready ? <Button title="Next: confirm pickup" onPress={() => router.push('/passenger/confirm-pickup')} /> : undefined}>
      <Header title="Plan your ride" back />
      <View style={styles.box}>
        {fields.map((f) => (
          <View key={f.key} style={[styles.field, focus === f.key && styles.fieldActive]}>
            <Ionicons name={f.icon} size={12} color={colors.black} />
            <TextInput
              ref={f.key === 'dropoff' ? dropRef : undefined}
              value={text[f.key]}
              onFocus={() => setFocus(f.key)}
              onChangeText={(v) => {
                setText((t) => ({ ...t, [f.key]: v }));
                if (f.key === 'pickup') {
                  pickupTouched.current = true;
                  setPickup(null);
                }
                else setDropoff(null);
              }}
              placeholder={f.placeholder}
              placeholderTextColor={colors.secondary}
              style={styles.input}
              accessibilityLabel={f.placeholder}
              autoFocus={f.key === focus}
            />
            {text[f.key] ? (
              <Pressable
                onPress={() => {
                  setText((t) => ({ ...t, [f.key]: '' }));
                  if (f.key === 'pickup') {
                    pickupTouched.current = true;
                    setPickup(null);
                    setFocus('pickup');
                  } else setDropoff(null);
                }}
                accessibilityLabel="Clear"
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={colors.secondary} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {focus === 'pickup' && loc.position ? (
        <ListItem
          icon="locate"
          title="Use my current location"
          onPress={async () => {
            const address = (await reverseGeocode(loc.position!).catch(() => null)) ?? 'Current location';
            setPickup({ ...loc.position!, address });
            setText((t) => ({ ...t, pickup: address }));
            setFocus('dropoff');
          }}
        />
      ) : null}
      {focus === 'pickup' ? (
        <ListItem
          icon="map-outline"
          title="Choose pickup on the map"
          subtitle="Useful if GPS is off or not accurate"
          onPress={() => router.push({ pathname: '/passenger/confirm-pickup', params: { pickOnMap: '1' } })}
        />
      ) : null}

      {suggestions.isFetching || choosing ? <ActivityIndicator color={colors.black} style={{ marginTop: space.lg }} /> : null}
      <ErrorMessage error={error ?? suggestions.error} />
      {(suggestions.data ?? []).map((s) => (
        <ListItem key={s.placeId} icon="location-outline" title={s.title} subtitle={s.subtitle} onPress={() => choose(s.placeId)} />
      ))}
      {query.length >= 2 && suggestions.isSuccess && suggestions.data.length === 0 ? (
        <Text style={[type.small, { marginTop: space.lg }]}>No places found. Try a nearby landmark, estate or road name.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.sm, gap: space.xs, marginBottom: space.md },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.ivory },
  fieldActive: { borderWidth: 2, borderColor: colors.black },
  input: { flex: 1, minWidth: 0, outlineWidth: 0, minHeight: 48, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
});

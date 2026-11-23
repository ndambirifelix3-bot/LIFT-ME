import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Card, Chip, ErrorMessage, Input, Loading, Notice, Pill, Row, SectionTitle, toneForStatus } from '@/components';
import { AdminPage } from '@/features/admin/AdminPage';
import { useMarkets } from '@/features/markets';
import { formatDateTime, formatMoney } from '@/lib/format';
import { flagEmoji, formatPhoneForDisplay } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space, type } from '@/theme';
import { confirm } from '@/lib/confirm';

async function openSigned(path: string) {
  // Open the tab straight away, while the click still counts: browsers (Safari especially) block
  // tabs opened after waiting for the network.
  const tab = Platform.OS === 'web' ? window.open('', '_blank') : null;
  try {
    // Short-lived signed link (60 s) to the PRIVATE bucket. Only admins and the driver can create one (RLS).
    const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(path, 60);
    if (error) throw error;
    if (Platform.OS !== 'web') await WebBrowser.openBrowserAsync(data.signedUrl);
    else if (tab) {
      tab.opener = null;
      tab.location.href = data.signedUrl;
    } else window.open(data.signedUrl, '_blank', 'noopener');
  } catch (e) {
    tab?.close();
    throw e;
  }
}

export default function AdminDriverDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [rideType, setRideType] = useState<string | null>(null);
  const [openError, setOpenError] = useState<unknown>(null);
  const markets = useMarkets();

  const q = useQuery({
    queryKey: ['admin-driver', id],
    queryFn: async () => {
      const [profile, driver, vehicle, docs, types, pricing, reviewer] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id!).single(),
        supabase.from('drivers').select('*').eq('id', id!).single(),
        supabase.from('vehicles').select('*').eq('driver_id', id!).maybeSingle(),
        supabase.from('driver_documents').select('*').eq('driver_id', id!),
        supabase.from('document_types').select('*').order('sort_order'),
        supabase.from('pricing').select('ride_type, display_name').order('sort_order'),
        supabase.from('admin_actions').select('*').eq('target_id', id!).order('created_at', { ascending: false }).limit(20),
      ]);
      for (const r of [profile, driver, vehicle, docs, types, pricing, reviewer]) if (r.error) throw r.error;
      return { profile: profile.data!, driver: driver.data!, vehicle: vehicle.data, docs: docs.data ?? [], types: types.data ?? [], pricing: pricing.data ?? [], history: reviewer.data ?? [] };
    },
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-driver', id] });
    qc.invalidateQueries({ queryKey: ['admin-drivers'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const review = useMutation({
    mutationFn: async (approve: boolean) => {
      const { error } = await supabase.rpc('admin_review_driver', {
        p_driver_id: id!, p_approve: approve, p_reason: approve ? undefined : reason, p_ride_type: approve ? rideType ?? undefined : undefined,
      });
      if (error) throw error;
    },
    onSuccess: done,
  });
  const moveMarket = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase.rpc('admin_set_driver_market', { p_driver_id: id!, p_market_code: code });
      if (error) throw error;
    },
    onSuccess: done,
  });
  const suspend = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.rpc('admin_set_driver_suspended', { p_driver_id: id!, p_suspended: on, p_reason: on ? reason || undefined : undefined });
      if (error) throw error;
    },
    onSuccess: done,
  });

  if (q.isLoading || markets.isLoading) return <Loading />;
  if (q.error || !q.data) return <AdminPage title="Driver"><ErrorMessage error={q.error} onRetry={() => q.refetch()} /></AdminPage>;
  const { profile, driver, vehicle, docs, types, pricing, history } = q.data;
  const chosenType = rideType ?? vehicle?.ride_type ?? 'lift';
  // Only this driver's country's documents (plus anything they uploaded anyway).
  const driverMarket = markets.data?.find((m) => m.code === driver.market_code);
  const country = driverMarket?.country_iso;
  const shownTypes = types.filter((t) => !t.country_iso || t.country_iso === country || docs.some((d) => d.doc_type === t.code));

  return (
    <AdminPage
      title={profile.full_name || 'Driver'}
      subtitle={formatPhoneForDisplay(profile.phone)}
      actions={<Button title="Back" small variant="outline" onPress={() => router.push('/admin/drivers')} />}
      onRefresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <Card>
        <Row label="Status" value={<Pill text={driver.status} tone={toneForStatus(driver.status)} />} />
        <Row label="Submitted" value={driver.submitted_at ? formatDateTime(driver.submitted_at) : 'Not submitted yet'} />
        <Row label="ID no." value={driver.id_number ?? '—'} />
        <Row label="Licence no." value={driver.licence_number ?? '—'} />
        <Row label="Email" value={driver.email ?? '—'} />
        {driver.reviewed_at ? <Row label="Last reviewed" value={formatDateTime(driver.reviewed_at)} /> : null}
        {driver.reject_reason ? <Row label="Reason" value={driver.reject_reason} /> : null}
      </Card>

      <SectionTitle>Market</SectionTitle>
      <Card>
        {!driver.market_code ? (
          <Notice tone="error" text="This driver's phone number doesn't match any market. Pick one before approving." />
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(markets.data ?? []).map((m) => (
            <Chip
              key={m.code}
              label={`${flagEmoji(m.country_iso)} ${m.name}`}
              selected={driver.market_code === m.code}
              onPress={() => m.code !== driver.market_code && moveMarket.mutate(m.code)}
            />
          ))}
        </View>
        <Text style={[type.small, { marginTop: space.sm }]}>The driver only gets ride requests in this market. Moving them takes them offline.</Text>
        <ErrorMessage error={moveMarket.error} />
      </Card>

      <SectionTitle>Vehicle</SectionTitle>
      <Card>
        {vehicle ? (
          <>
            <Row label="Vehicle" value={`${vehicle.colour} ${vehicle.make} ${vehicle.model} (${vehicle.year})`} />
            <Row label="Plate" value={vehicle.plate} />
            <Row label="Category" value={pricing.find((p) => p.ride_type === vehicle.ride_type)?.display_name ?? vehicle.ride_type} />
          </>
        ) : (
          <Text style={type.body}>No vehicle added.</Text>
        )}
      </Card>

      <SectionTitle>Photo & documents</SectionTitle>
      <Card>
        <ErrorMessage error={openError} />
        <Row label="Profile photo" value={driver.photo_path ? <Button small variant="outline" title="View" onPress={() => openSigned(driver.photo_path!).catch(setOpenError)} /> : 'Missing'} />
        {shownTypes.map((t) => {
          const doc = docs.find((d) => d.doc_type === t.code);
          return (
            <Row
              key={t.code}
              label={`${t.name}${doc ? ` · ${formatDateTime(doc.uploaded_at)}` : ''}`}
              value={doc ? <Button small variant="outline" title="View" onPress={() => openSigned(doc.file_path).catch(setOpenError)} /> : <Pill text="Missing" tone="bad" />}
            />
          );
        })}
      </Card>

      <SectionTitle>Money</SectionTitle>
      <Card>
        <Row label="Balance" value={driver.wallet_balance < 0 ? `Owes ${formatMoney(-driver.wallet_balance, driverMarket?.currency, driverMarket?.currency_decimals)}` : driver.wallet_balance > 0 ? `Owed ${formatMoney(driver.wallet_balance, driverMarket?.currency, driverMarket?.currency_decimals)}` : 'Settled'} />
        <Button title="Open driver money" variant="outline" small onPress={() => router.push(`/admin/money/${id}`)} />
      </Card>

      <SectionTitle>Decision</SectionTitle>
      <Card>
        {driver.status !== 'suspended' ? (
          <>
            <Text style={[type.label, { marginBottom: space.sm }]}>Approve for category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
              {pricing.map((p) => <Chip key={p.ride_type} label={p.display_name} selected={chosenType === p.ride_type} onPress={() => setRideType(p.ride_type)} />)}
            </View>
            {driver.status === 'approved' && vehicle && chosenType !== vehicle.ride_type ? (
              <Button title="Save category" variant="dark" onPress={() => review.mutate(true)} loading={review.isPending && review.variables} style={{ marginBottom: space.md }} />
            ) : null}
          </>
        ) : null}
        <Input label="Reason (required to reject or suspend; shown to the driver)" value={reason} onChangeText={setReason} multiline maxLength={300} />
        <ErrorMessage error={review.error ?? suspend.error} />
        {review.isSuccess || suspend.isSuccess ? <Notice tone="success" text="Saved and logged." /> : null}
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {driver.status !== 'approved' && driver.status !== 'suspended' ? (
            <Button title="Approve" onPress={() => review.mutate(true)} loading={review.isPending && review.variables} disabled={!driver.submitted_at} />
          ) : null}
          {driver.status !== 'rejected' && driver.status !== 'suspended' ? (
            <Button title="Reject" variant="danger" onPress={() => review.mutate(false)} loading={review.isPending && !review.variables} disabled={!reason.trim()} />
          ) : null}
          {driver.status === 'approved' ? <Button title="Suspend" variant="danger" onPress={() => confirm(`Suspend ${profile.full_name || 'this driver'}?`, 'They will be taken offline and cannot drive until you unsuspend them.', () => suspend.mutate(true))} loading={suspend.isPending} /> : null}
          {driver.status === 'suspended' ? <Button title="Unsuspend" variant="dark" onPress={() => suspend.mutate(false)} loading={suspend.isPending} /> : null}
        </View>
      </Card>

      <SectionTitle>History</SectionTitle>
      <Card>
        {history.length === 0 ? <Text style={type.small}>No admin actions yet.</Text> : null}
        {history.map((h) => (
          <Row key={h.id} label={formatDateTime(h.created_at)} value={`${h.action.replace(/_/g, ' ')}${(h.details as { reason?: string })?.reason ? ` — ${(h.details as { reason?: string }).reason}` : ''}`} />
        ))}
      </Card>
    </AdminPage>
  );
}

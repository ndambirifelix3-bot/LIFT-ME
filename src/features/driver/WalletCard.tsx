import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Notice } from '@/components';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { colors, fonts, space, type } from '@/theme';
import { MpesaPayCard } from './MpesaPayCard';
import { ledgerLabel, type LedgerEntry, type Wallet } from './wallet';

/** Balance at the top of Earnings: who owes whom, the limit, and how to pay. */
export function WalletCard({ wallet }: { wallet: Wallet }) {
  const money = (n: number) => formatMoney(n, wallet.currency, wallet.currency_decimals);
  const owes = wallet.balance < 0;
  const owed = wallet.balance > 0;
  return (
    <Card style={owes && wallet.over_limit ? { borderColor: colors.error, borderWidth: 2 } : undefined}>
      <Text style={type.label}>{owes ? 'You owe Lift Me' : owed ? 'Lift Me owes you' : 'Your balance'}</Text>
      <Text style={[styles.amount, owes && { color: colors.error }, owed && { color: colors.success }]}>
        {money(Math.abs(wallet.balance))}
      </Text>
      <Text style={type.small}>
        {owes
          ? 'Commission on cash trips (you kept the full fare).'
          : owed
            ? 'Your share of trips paid by M-Pesa. Lift Me sends it to you as a payout.'
            : 'All settled. Commission on cash trips and your share of M-Pesa trips show here.'}
      </Text>
      {owes && wallet.debt_limit != null ? (
        <View style={{ marginTop: space.md }}>
          {wallet.over_limit ? (
            <Notice tone="error" text={`You can't go online until you pay. You may owe up to ${money(wallet.debt_limit)}.`} />
          ) : (
            <Text style={type.small}>You can keep driving while you owe up to {money(wallet.debt_limit)}.</Text>
          )}
        </View>
      ) : null}
      {owes && wallet.can_pay_mpesa ? <MpesaPayCard wallet={wallet} /> : null}
      {owes && wallet.payment_instructions ? (
        <View style={styles.howTo}>
          <Text style={[type.label, { marginBottom: 4 }]}>{wallet.can_pay_mpesa ? 'Or pay another way' : 'How to pay'}</Text>
          <Text style={type.body}>{wallet.payment_instructions}</Text>
        </View>
      ) : null}
    </Card>
  );
}

/** "Launch offer: no commission until … / for N more trips." */
export function LaunchOfferNotice({ wallet }: { wallet: Wallet }) {
  const o = wallet.launch_offer;
  if (!o?.active) return null;
  const parts = [
    o.ends_at ? `until ${formatDate(o.ends_at)}` : '',
    o.trips_left != null ? `for your next ${o.trips_left} ${o.trips_left === 1 ? 'trip' : 'trips'}` : '',
  ].filter(Boolean);
  return (
    <Notice
      tone="success"
      text={`Welcome offer: Lift Me takes no commission ${parts.join(' or ')}${parts.length > 1 ? ', whichever comes first' : ''}. You keep the whole fare.`}
    />
  );
}

/** Short warning on the driver Home screen when they owe too much to go online. */
export function BalanceDueCard({ wallet }: { wallet: Wallet }) {
  if (!wallet.over_limit) return null;
  return (
    <Card style={{ borderColor: colors.error, borderWidth: 2 }}>
      <Text style={type.h3}>Please pay your balance</Text>
      <Text style={[type.body, { marginVertical: space.sm }]}>
        You owe Lift Me {formatMoney(-wallet.balance, wallet.currency, wallet.currency_decimals)} in commission. Pay it to go online again.
      </Text>
      <Button title={wallet.can_pay_mpesa ? 'Pay now' : 'How to pay'} variant="dark" small onPress={() => router.push('/driver/earnings')} />
    </Card>
  );
}

/** One line of money history. */
export function LedgerRow({ entry, decimals, admin = false }: { entry: LedgerEntry; decimals: number; admin?: boolean }) {
  const plus = entry.amount > 0;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={type.body}>{ledgerLabel(entry.kind, admin)}</Text>
        <Text style={type.small}>
          {formatDateTime(entry.created_at)}
          {entry.reference ? ` · Ref ${entry.reference}` : ''}
          {entry.kind === 'adjustment' && entry.note ? ` · ${entry.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.delta, { color: plus ? colors.success : colors.error }]}>
        {plus ? '+' : '−'}{formatMoney(Math.abs(entry.amount), entry.currency, decimals)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontFamily: fonts.bold, fontSize: 30, color: colors.text, marginVertical: 4 },
  howTo: { marginTop: space.md, padding: space.md, borderRadius: 12, backgroundColor: colors.ivory },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  delta: { fontFamily: fonts.semibold, fontSize: 15 },
});

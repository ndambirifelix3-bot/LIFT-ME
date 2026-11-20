import { View } from 'react-native';
import { create } from 'zustand';
import { Chip } from '@/components';
import { type Market, useMarkets } from '@/features/markets';
import { flagEmoji } from '@/lib/phone';
import { space } from '@/theme';

/** Which market the admin is looking at (shared by Overview, Pricing, …). */
const useAdminMarketStore = create<{ code: string | null; setCode: (c: string) => void }>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));

/** The market selected in the admin dashboard (defaults to the first one). */
export function useAdminMarket(): Market | undefined {
  const markets = useMarkets().data ?? [];
  const code = useAdminMarketStore((s) => s.code);
  return markets.find((m) => m.code === code) ?? markets[0];
}

/** Row of market chips. Hidden when there is only one market. */
export function AdminMarketSwitcher() {
  const markets = useMarkets().data ?? [];
  const selected = useAdminMarket();
  const setCode = useAdminMarketStore((s) => s.setCode);
  if (markets.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
      {markets.map((m) => (
        <Chip
          key={m.code}
          label={`${flagEmoji(m.country_iso)} ${m.name}${m.is_active ? '' : ' (off)'}`}
          selected={m.code === selected?.code}
          onPress={() => setCode(m.code)}
        />
      ))}
    </View>
  );
}

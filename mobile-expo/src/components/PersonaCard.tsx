import { Pressable, Text, View } from 'react-native';

import type { PersonaId } from '@/src/storage/persona';
import { colors } from '@/src/theme/colors';

type PersonaCardProps = {
  id: PersonaId;
  title: string;
  description: string;
  /** Short label shown in the tint box (no remote icon fonts). */
  iconLabel: string;
  tintBg: string;
  tintIcon: string;
  isLastUsed?: boolean;
  onPress: () => void;
};

export function PersonaCard({
  title,
  description,
  iconLabel,
  tintBg,
  tintIcon,
  isLastUsed,
  onPress,
}: PersonaCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`mb-3 min-h-20 flex-row items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm active:opacity-90 ${
        isLastUsed ? 'border-navy' : 'border-slate-200'
      }`}
      style={isLastUsed ? { borderWidth: 1.5 } : undefined}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: tintBg }}
      >
        <Text style={{ color: tintIcon, fontSize: 18, fontWeight: '700' }}>{iconLabel}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-base font-semibold text-slate-900">{title}</Text>
          {isLastUsed ? (
            <View className="rounded-full bg-navy/10 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-navy">Last used</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-sm leading-5 text-slate-500">{description}</Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 22, fontWeight: '300' }}>›</Text>
    </Pressable>
  );
}

import { Pressable, Text, View } from 'react-native';

type RoleCardProps = {
  title: string;
  description: string;
  emoji: string;
  onPress: () => void;
};

export function RoleCard({ title, description, emoji, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 active:opacity-90"
    >
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-navy/10">
        <Text className="text-2xl">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-navy">{title}</Text>
        <Text className="mt-0.5 text-sm leading-5 text-slate-500">{description}</Text>
      </View>
    </Pressable>
  );
}

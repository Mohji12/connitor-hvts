import { Pressable, Text, type PressableProps } from 'react-native';

type PrimaryButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function PrimaryButton({
  label,
  variant = 'primary',
  disabled,
  className,
  ...rest
}: PrimaryButtonProps & { className?: string }) {
  const base = 'items-center justify-center rounded-2xl px-5 py-4';
  const styles =
    variant === 'primary'
      ? 'bg-accent'
      : variant === 'secondary'
        ? 'border border-navy/20 bg-white'
        : 'bg-transparent';
  const text =
    variant === 'primary'
      ? 'text-white font-semibold text-base'
      : variant === 'secondary'
        ? 'text-navy font-semibold text-base'
        : 'text-accent font-semibold text-base';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`${base} ${styles} ${disabled ? 'opacity-50' : 'active:opacity-90'} ${className ?? ''}`}
      {...rest}
    >
      <Text className={text}>{label}</Text>
    </Pressable>
  );
}

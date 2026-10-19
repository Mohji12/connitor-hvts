import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors } from '@/src/theme/colors';
import { openWebApp } from '@/src/lib/openWebApp';

type AuthShellProps = {
  title: string;
  subtitle: string;
  mode: 'login' | 'register';
  webLoginPath: string;
  webRegisterPath: string;
  identifierLabel?: string;
  identifierPlaceholder?: string;
};

export function AuthShell({
  title,
  subtitle,
  mode,
  webLoginPath,
  webRegisterPath,
  identifierLabel = 'Email or phone',
  identifierPlaceholder = 'you@example.com',
}: AuthShellProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const openPrimary = () => {
    openWebApp(mode === 'login' ? webLoginPath : webRegisterPath);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.replace('/roles')} className="mb-6 self-start py-2">
            <Text className="text-sm font-medium text-accent">Back to roles</Text>
          </Pressable>

          <Text className="text-2xl font-bold text-navy">{title}</Text>
          <Text className="mt-2 text-base text-slate-600">{subtitle}</Text>
          <Text className="mt-3 text-sm leading-5 text-slate-500">
            Continues inside this app with the full Conninter experience (booking, wallet, gate,
            delivery, and more).
          </Text>

          <View className="mt-8 gap-4">
            {mode === 'register' ? (
              <View>
                <Text className="mb-2 text-sm font-medium text-navy">Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-navy"
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            <View>
              <Text className="mb-2 text-sm font-medium text-navy">{identifierLabel}</Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={identifierPlaceholder}
                placeholderTextColor={colors.muted}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-navy"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-navy">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-navy"
                secureTextEntry
              />
            </View>
          </View>

          <View className="mt-8 gap-3">
            <PrimaryButton
              label={mode === 'login' ? 'Continue to Conninter' : 'Create profile on Conninter'}
              onPress={openPrimary}
            />

            {mode === 'login' ? (
              <Pressable className="items-center py-3" onPress={() => openWebApp(webRegisterPath)}>
                <Text className="text-base font-semibold text-accent">Create profile</Text>
              </Pressable>
            ) : (
              <Pressable className="items-center py-3" onPress={() => openWebApp(webLoginPath)}>
                <Text className="text-base text-slate-600">
                  Already have an account?{' '}
                  <Text className="font-semibold text-accent">Sign in</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

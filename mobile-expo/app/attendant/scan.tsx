import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { parseAttendantQr } from '@/src/scanning/parseAttendantQr';
import { setLastPersona } from '@/src/storage/persona';
import { colors } from '@/src/theme/colors';

export default function AttendantScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualSlug, setManualSlug] = useState('');
  const locked = useRef(false);
  const errorClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goWelcome = useCallback(() => {
    void setLastPersona('attendant');
    router.replace('/roles');
  }, []);

  const openApply = useCallback((slug: string) => {
    locked.current = true;
    setError(null);
    void setLastPersona('attendant');
    router.replace(`/attendant/apply/${encodeURIComponent(slug)}`);
  }, []);

  const flashInvalid = useCallback((message: string) => {
    setError(message);
    if (errorClearTimer.current) clearTimeout(errorClearTimer.current);
    // Allow scanning again after a short pause so the same bad QR does not spam.
    locked.current = true;
    errorClearTimer.current = setTimeout(() => {
      locked.current = false;
    }, 1600);
  }, []);

  const onBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (locked.current) return;
      const raw = result.data?.trim();
      if (!raw) return;

      const slug = parseAttendantQr(raw);
      if (!slug) {
        flashInvalid(
          'Not a Conninter attendant QR. Use the hospital link at reception or the gate, or enter the branch code below.',
        );
        setShowManual(true);
        return;
      }

      openApply(slug);
    },
    [flashInvalid, openApply],
  );

  const submitManual = () => {
    const cleaned = manualSlug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    if (!cleaned || cleaned.includes(' ')) {
      setError('Enter the branch slug from the hospital (letters, numbers, hyphens).');
      return;
    }
    // Accept raw slug or a pasted attendant-pass URL/path.
    const fromPaste = parseAttendantQr(cleaned) ?? parseAttendantQr(`/${cleaned}`);
    const slug =
      fromPaste ??
      (cleaned.includes('/') ? parseAttendantQr(cleaned) : cleaned.replace(/[^a-z0-9-_]/g, ''));
    if (!slug) {
      setError('Could not read that branch code. Check with reception.');
      return;
    }
    openApply(slug);
  };

  if (!permission) {
    return <View className="flex-1 bg-navy" />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-canvas px-6">
        <Text className="mb-3 text-2xl font-bold text-navy">Camera access</Text>
        <Text className="mb-8 text-base leading-6 text-slate-600">
          Conninter needs the camera to scan the hospital attendant QR at reception or the security
          gate. No login is required for this flow.
        </Text>
        <PrimaryButton label="Allow camera" onPress={() => void requestPermission()} />
        <Pressable onPress={goWelcome} className="mt-4 items-center py-3">
          <Text className="font-semibold text-accent">Back to Welcome</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcode}
      />

      <SafeAreaView className="absolute inset-0 justify-between" pointerEvents="box-none">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable onPress={goWelcome} className="rounded-full bg-black/50 px-4 py-2">
            <Text className="font-semibold text-white">Welcome</Text>
          </Pressable>
          <Pressable
            onPress={() => setTorch((v) => !v)}
            className="rounded-full bg-black/50 px-4 py-2"
          >
            <Text className="font-semibold text-white">{torch ? 'Torch off' : 'Torch on'}</Text>
          </Pressable>
        </View>

        <View className="items-center px-6">
          <View
            className="h-56 w-56 rounded-3xl border-2"
            style={{ borderColor: colors.accent }}
          />
          <Text className="mt-6 text-center text-base font-medium text-white">
            Scan the hospital QR at reception or the gate
          </Text>
          {error ? (
            <Text className="mt-3 text-center text-sm text-red-300">{error}</Text>
          ) : null}

          <Pressable
            onPress={() => setShowManual((v) => !v)}
            className="mt-4 rounded-full bg-black/50 px-4 py-2"
          >
            <Text className="text-sm font-semibold text-white">
              {showManual ? 'Hide branch code' : 'Can’t scan? Enter branch code'}
            </Text>
          </Pressable>

          {showManual ? (
            <View className="mt-3 w-full rounded-2xl bg-white/95 p-4">
              <Text className="mb-2 text-sm font-medium text-navy">Branch code or paste QR link</Text>
              <TextInput
                value={manualSlug}
                onChangeText={setManualSlug}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. kauvery-alwarpet"
                placeholderTextColor="#94a3b8"
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base text-navy"
              />
              <View className="mt-3">
                <PrimaryButton label="Continue" onPress={submitManual} />
              </View>
            </View>
          ) : null}
        </View>

        <View className="h-10" />
      </SafeAreaView>
    </View>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/src/components/LogoMark';
import { PersonaCard } from '@/src/components/PersonaCard';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { webPaths } from '@/src/config/webApp';
import { openPersonaWebApp, openWebApp } from '@/src/lib/openWebApp';
import { getLastPersona, setLastPersona, type PersonaId } from '@/src/storage/persona';
import { colors } from '@/src/theme/colors';

type Persona = {
  id: PersonaId;
  title: string;
  description: string;
  iconLabel: string;
  tintBg: string;
  tintIcon: string;
  onSelect: (opts?: { resume?: boolean }) => void | Promise<void>;
};

const PERSONA_LABELS: Record<PersonaId, string> = {
  staff: 'Hospital staff',
  visitor: 'Visitor',
  attendant: 'Family / attendant',
  distributor: 'Distributor',
};

const PERSONAS: Persona[] = [
  {
    id: 'staff',
    title: 'Hospital staff',
    description: 'Doctors, reception, admins and security',
    iconLabel: 'HS',
    tintBg: 'rgba(0, 27, 113, 0.10)',
    tintIcon: colors.navy,
    onSelect: (opts) => openPersonaWebApp('staff', opts),
  },
  {
    id: 'visitor',
    title: 'Visitor',
    description: 'Book a meeting with a doctor and show your pass at the gate',
    iconLabel: 'V',
    tintBg: 'rgba(74, 144, 226, 0.12)',
    tintIcon: '#1d5fae',
    onSelect: (opts) => openPersonaWebApp('visitor', opts),
  },
  {
    id: 'attendant',
    title: 'Family / attendant',
    description: 'Get a visit pass for an admitted patient',
    iconLabel: 'FA',
    tintBg: 'rgba(16, 185, 129, 0.12)',
    tintIcon: '#047857',
    onSelect: () => {
      router.replace('/attendant/scan');
    },
  },
  {
    id: 'distributor',
    title: 'Distributor',
    description: 'Book delivery windows and manage drivers',
    iconLabel: 'D',
    tintBg: 'rgba(245, 158, 11, 0.15)',
    tintIcon: '#92400e',
    onSelect: (opts) => openPersonaWebApp('distributor', opts),
  },
];

export default function RoleSelectionScreen() {
  const [lastPersona, setLast] = useState<PersonaId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getLastPersona();
      if (!cancelled) {
        setLast(saved);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(() => {
    if (!lastPersona) return PERSONAS;
    return [...PERSONAS].sort((a, b) => {
      if (a.id === lastPersona) return -1;
      if (b.id === lastPersona) return 1;
      return 0;
    });
  }, [lastPersona]);

  const choose = async (persona: Persona, opts?: { resume?: boolean }) => {
    await setLastPersona(persona.id);
    setLast(persona.id);
    await persona.onSelect(opts);
  };

  const continueLast = async () => {
    if (!lastPersona) return;
    const persona = PERSONAS.find((p) => p.id === lastPersona);
    if (!persona) return;
    await choose(persona, { resume: true });
  };

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 28,
          paddingTop: 24,
          flexGrow: 1,
        }}
      >
        <View className="mb-2 items-center">
          <LogoMark variant="dark" size="lg" />
          <Text className="mt-6 text-center text-2xl font-bold tracking-tight text-navy">
            Welcome
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500">
            Choose how you use Conninter.
          </Text>
        </View>

        {lastPersona ? (
          <View className="mt-5">
            <PrimaryButton
              label={`Continue as ${PERSONA_LABELS[lastPersona]}`}
              onPress={() => void continueLast()}
            />
            <Text className="mt-2 text-center text-xs text-slate-400">
              Opens your last screen when available
            </Text>
          </View>
        ) : null}

        <View className="mt-5">
          {ordered.map((persona) => (
            <PersonaCard
              key={persona.id}
              id={persona.id}
              title={persona.title}
              description={persona.description}
              iconLabel={persona.iconLabel}
              tintBg={persona.tintBg}
              tintIcon={persona.tintIcon}
              isLastUsed={persona.id === lastPersona}
              onPress={() => void choose(persona, { resume: true })}
            />
          ))}
        </View>

        <View className="mt-auto items-center pt-8">
          <Pressable
            onPress={() => {
              void setLastPersona('staff');
              openWebApp(webPaths.securityLogin, { persona: 'staff' });
            }}
            accessibilityRole="link"
          >
            <Text className="text-center text-sm font-medium text-navy">
              Security guard? Sign in at the gate
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

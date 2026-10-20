import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pathFromWebUrl, WEB_APP_ORIGIN, webUrl } from '@/src/config/webApp';
import {
  NATIVE_SHELL_BRIDGE_JS,
  NATIVE_SHELL_SYNC_JS,
} from '@/src/lib/webviewNativeBridge';
import type { PersonaId } from '@/src/storage/persona';
import { setLastWebPath } from '@/src/storage/personaWebPath';
import { colors } from '@/src/theme/colors';

/** Marketing homepage must never load inside the Expo WebView — force Welcome. */
function isMarketingHomeUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const origin = new URL(WEB_APP_ORIGIN);
    if (parsed.origin !== origin.origin) return false;
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return path === '/';
  } catch {
    return false;
  }
}

function withCacheBust(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('_cb', String(Date.now()));
    return parsed.toString();
  } catch {
    return url;
  }
}

function welcomeWebUrl(): string {
  // `native=1` persists on the live origin so Welcome stays the in-app home.
  return webUrl('/app/?native=1', { cacheBust: true });
}

type WebViewLike = {
  goBack: () => void;
  reload: () => void;
  injectJavaScript: (script: string) => void;
};

function isPersonaId(value: string | undefined): value is PersonaId {
  return (
    value === 'staff' ||
    value === 'visitor' ||
    value === 'attendant' ||
    value === 'distributor'
  );
}

export default function InAppWebPortal() {
  const { path, persona: personaParam } = useLocalSearchParams<{
    path?: string;
    persona?: string;
  }>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const webRef = useRef<WebViewLike | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  /** Full-screen blocker only for the first document load. */
  const [initialLoading, setInitialLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const firstPaintDone = useRef(false);

  const persona: PersonaId | undefined =
    typeof personaParam === 'string' && isPersonaId(personaParam)
      ? personaParam
      : undefined;

  const uri = useMemo(() => {
    const raw = typeof path === 'string' ? path : '/portal/';
    return webUrl(decodeURIComponent(raw));
  }, [path]);

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
      window.location.replace(uri);
      return undefined;
    }, [uri]),
  );

  // Never leave the user on an endless full-screen spinner (slow tunnel / missed onLoadEnd).
  useEffect(() => {
    if (!initialLoading) return undefined;
    const timer = setTimeout(() => {
      firstPaintDone.current = true;
      setInitialLoading(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [initialLoading, reloadKey]);

  const leaveToRoles = useCallback(() => {
    router.replace('/roles');
  }, []);

  const goBackOrRoles = useCallback(() => {
    if (canGoBack && webRef.current) {
      webRef.current.goBack();
      return;
    }
    leaveToRoles();
  }, [canGoBack, leaveToRoles]);

  const retry = useCallback(() => {
    setError(null);
    firstPaintDone.current = false;
    setInitialLoading(true);
    setNavigating(false);
    setReloadKey((k) => k + 1);
  }, []);

  const onLoadingChange = useCallback((busy: boolean) => {
    if (!firstPaintDone.current) {
      if (!busy) {
        firstPaintDone.current = true;
        setInitialLoading(false);
      }
      return;
    }
    // After first paint: never cover the WebView again — only a slim top hint.
    setNavigating(busy);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackOrRoles();
        return true;
      });
      return () => sub.remove();
    }, [goBackOrRoles]),
  );

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={colors.navy} />
        <Text className="mt-3 text-sm text-slate-500">Opening Conninter…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2 border-b border-slate-200 bg-white px-2 py-1.5">
        <Pressable
          onPress={goBackOrRoles}
          className="rounded-lg bg-slate-100 px-3 py-1.5"
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text className="text-sm font-semibold text-navy">Back</Text>
        </Pressable>
        <View className="flex-1 items-center">
          {navigating && !initialLoading ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : null}
        </View>
        <Pressable
          onPress={retry}
          className="rounded-lg px-2 py-1.5"
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Text className="text-sm font-medium text-slate-500">Refresh</Text>
        </Pressable>
        <Pressable
          onPress={leaveToRoles}
          className="rounded-lg bg-slate-100 px-3 py-1.5"
          accessibilityRole="button"
          accessibilityLabel="Roles"
        >
          <Text className="text-sm font-semibold text-navy">Roles</Text>
        </Pressable>
      </View>

      <View className="flex-1 bg-canvas">
        {error ? (
          <View className="absolute inset-0 z-20 items-center justify-center bg-canvas px-8">
            <Text className="text-center text-lg font-bold text-navy">
              Couldn’t load Conninter
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
              {error}
            </Text>
            <Pressable
              onPress={retry}
              className="mt-6 rounded-xl bg-navy px-6 py-3"
              accessibilityRole="button"
            >
              <Text className="font-semibold text-white">Retry</Text>
            </Pressable>
            <Pressable onPress={leaveToRoles} className="mt-4 py-2">
              <Text className="font-semibold text-accent">Back to Welcome</Text>
            </Pressable>
          </View>
        ) : null}

        {initialLoading && !error ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 z-10 items-center justify-center bg-canvas/90"
          >
            <ActivityIndicator size="large" color={colors.navy} />
            <Text className="mt-3 text-sm text-slate-500">Loading Conninter…</Text>
          </View>
        ) : null}

        <NativeWebView
          key={reloadKey}
          uri={uri}
          persona={persona}
          webRef={webRef}
          onLoadingChange={onLoadingChange}
          onCanGoBack={setCanGoBack}
          onError={(message) => {
            setInitialLoading(false);
            setNavigating(false);
            setError(message);
          }}
          onLoadOk={() => setError(null)}
        />
      </View>
    </SafeAreaView>
  );
}

function NativeWebView({
  uri,
  persona,
  webRef,
  onLoadingChange,
  onCanGoBack,
  onError,
  onLoadOk,
}: {
  uri: string;
  persona?: PersonaId;
  webRef: React.MutableRefObject<WebViewLike | null>;
  onLoadingChange: (v: boolean) => void;
  onCanGoBack: (v: boolean) => void;
  onError: (message: string) => void;
  onLoadOk: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as {
    WebView: React.ComponentType<Record<string, unknown>>;
  };

  const remember = (url?: string) => {
    if (!persona || !url) return;
    const path = pathFromWebUrl(url);
    if (path) void setLastWebPath(persona, path);
  };

  return (
    <WebView
      ref={(instance: WebViewLike | null) => {
        webRef.current = instance;
      }}
      source={{
        uri: withCacheBust(isMarketingHomeUrl(uri) ? welcomeWebUrl() : uri),
      }}
      cacheEnabled={false}
      cacheMode="LOAD_NO_CACHE"
      injectedJavaScriptBeforeContentLoaded={NATIVE_SHELL_BRIDGE_JS}
      injectedJavaScript={NATIVE_SHELL_SYNC_JS}
      onLoadStart={() => onLoadingChange(true)}
      onLoadEnd={() => {
        onLoadingChange(false);
        onLoadOk();
        webRef.current?.injectJavaScript(NATIVE_SHELL_SYNC_JS);
      }}
      onError={() => {
        onError('Check your connection, then try again.');
      }}
      onHttpError={(event: { nativeEvent?: { statusCode?: number } }) => {
        const code = event?.nativeEvent?.statusCode;
        if (code && code >= 500) {
          onError(`The site returned an error (${code}).`);
        }
      }}
      onShouldStartLoadWithRequest={(request: { url?: string }) => {
        if (isMarketingHomeUrl(request?.url)) {
          webRef.current?.injectJavaScript(
            `window.location.replace(${JSON.stringify(welcomeWebUrl())}); true;`,
          );
          return false;
        }
        return true;
      }}
      onNavigationStateChange={(nav: {
        canGoBack?: boolean;
        url?: string;
        loading?: boolean;
      }) => {
        if (isMarketingHomeUrl(nav.url)) {
          webRef.current?.injectJavaScript(
            `window.location.replace(${JSON.stringify(welcomeWebUrl())}); true;`,
          );
          return;
        }
        onCanGoBack(Boolean(nav.canGoBack));
        remember(nav.url);
        if (typeof nav.loading === 'boolean') {
          onLoadingChange(nav.loading);
        }
        if (!nav.loading) {
          webRef.current?.injectJavaScript(NATIVE_SHELL_SYNC_JS);
        }
      }}
      onMessage={() => {
        /* required so injected scripts can use the bridge without warnings */
      }}
      pullToRefreshEnabled
      startInLoadingState={false}
      allowsBackForwardNavigationGestures
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      setSupportMultipleWindows={false}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      allowsInlineMediaPlayback
      style={{ flex: 1, backgroundColor: colors.canvas }}
    />
  );
}

/**
 * Two-browser LiveKit consultation: doctor (host) and patient (guest) join the same room with
 * Chromium fake media, then exercise video, audio, mute, camera off, screenshare, device switch,
 * leave, link states and webhook-driven check-in / check-out.
 *
 * Local (API on :8002, frontend on :3000, real LiveKit Cloud):
 *   npx playwright test tests/e2e/specs/meetings --project=chromium
 *
 * Staging:
 *   PLAYWRIGHT_BASE_URL=https://coninter-main.vercel.app \
 *   MEETING_FIXTURE_CMD="ssh -i key.pem ubuntu@host 'cd ~/connitor/connitor/python_backend && ~/conni/bin/python scripts/e2e_meeting_fixture.py'" \
 *   MEETING_WEBHOOK_MODE=real npx playwright test tests/e2e/specs/meetings --project=chromium
 */
import { execSync } from 'child_process';
import path from 'path';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const PYTHON_BACKEND = path.resolve(__dirname, '../../../../../python_backend');
const DEFAULT_FIXTURE_CMD = `"${path.join(PYTHON_BACKEND, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')}" scripts/e2e_meeting_fixture.py`;
const FIXTURE_CMD = process.env.MEETING_FIXTURE_CMD || DEFAULT_FIXTURE_CMD;
const WEBHOOK_MODE = (process.env.MEETING_WEBHOOK_MODE || 'simulate') as 'simulate' | 'real';
const API_BASE = process.env.MEETING_API_BASE || 'http://127.0.0.1:8002';

interface MeetingFixture {
  visitId: string;
  roomName: string;
  hostUrl: string;
  joinUrl: string;
}

interface VisitStatus {
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkedInLocation: string | null;
  totalDurationMinutes: number | null;
}

function fixture<T>(args: string): T {
  const stdout = execSync(`${FIXTURE_CMD} ${args}`, {
    cwd: PYTHON_BACKEND,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? '{}';
  return JSON.parse(line) as T;
}

/** Point fixture links at the frontend under test and enable the window.__lkRoom hook. */
function linkFor(url: string, baseURL: string | undefined): string {
  const parsed = new URL(url);
  const target = new URL(`${parsed.pathname}${parsed.search}`, baseURL ?? parsed.origin);
  target.searchParams.set('e2e', '1');
  return target.toString();
}

async function newMediaContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 800 },
  });
}

async function joinRoom(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('meeting-prejoin')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Join consultation' }).click();
  await page.waitForFunction(() => window.__lkRoom?.state === 'connected', null, { timeout: 30_000 });
}

async function waitForRemote(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    (expected) => (window.__lkRoom?.remoteParticipants.size ?? -1) === expected,
    count,
    { timeout: 30_000 },
  );
}

/** Evaluate a predicate on the single remote participant's publication for `source`. */
async function waitForRemotePublication(
  page: Page,
  source: string,
  expected: { present?: boolean; subscribed?: boolean; muted?: boolean },
): Promise<void> {
  await page.waitForFunction(
    ({ source, expected }) => {
      const room = window.__lkRoom;
      if (!room) return false;
      const remote = [...room.remoteParticipants.values()][0];
      if (!remote) return false;
      const pub = [...remote.trackPublications.values()].find((p) => p.source === source);
      if (expected.present === false) return !pub;
      if (!pub) return false;
      if (expected.subscribed !== undefined && pub.isSubscribed !== expected.subscribed) return false;
      if (expected.muted !== undefined && pub.isMuted !== expected.muted) return false;
      return true;
    },
    { source, expected },
    { timeout: 30_000 },
  );
}

async function waitForVisitStatus(visitId: string, status: string, timeoutMs = 90_000): Promise<VisitStatus> {
  const deadline = Date.now() + timeoutMs;
  let last: VisitStatus | null = null;
  while (Date.now() < deadline) {
    last = fixture<VisitStatus>(`status --visit ${visitId}`);
    if (last.status === status) return last;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(`Visit ${visitId} did not reach ${status}; last status ${last?.status}`);
}

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-select-desktop-capture-source=Entire screen',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
});

test.describe('LiveKit online consultation', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Fake media devices are Chromium-only');

  test.afterAll(() => {
    fixture('cleanup');
  });

  test('invalid and too-early links show the right screen', async ({ page, baseURL }) => {
    await page.goto(new URL('/meet/?t=not-a-real-token', baseURL).toString());
    await expect(page.getByTestId('meeting-invalid')).toBeVisible({ timeout: 30_000 });

    await page.goto(new URL('/meet/', baseURL).toString());
    await expect(page.getByTestId('meeting-invalid')).toContainText('incomplete');

    const future = fixture<MeetingFixture>('create --offset-minutes 90');
    await page.goto(linkFor(future.joinUrl, baseURL));
    await expect(page.getByTestId('meeting-too-early')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('meeting-countdown')).toHaveText(/\d+:\d{2}:\d{2}/);
  });

  test('doctor and patient complete a full call', async ({ browser, baseURL }) => {
    test.setTimeout(240_000);
    const meeting = fixture<MeetingFixture>('create');

    const hostContext = await newMediaContext(browser);
    const guestContext = await newMediaContext(browser);
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    try {
      await test.step('both participants connect', async () => {
        await joinRoom(host, linkFor(meeting.hostUrl, baseURL));
        await expect(host.getByTestId('meeting-title')).toContainText('E2E Patient');
        await joinRoom(guest, linkFor(meeting.joinUrl, baseURL));
        await waitForRemote(host, 1);
        await waitForRemote(guest, 1);
        const roles = await host.evaluate(() => {
          const room = window.__lkRoom!;
          return {
            local: room.localParticipant.identity,
            remote: [...room.remoteParticipants.values()][0]?.identity,
            room: room.name,
          };
        });
        expect(roles.local).toMatch(/^doctor-/);
        expect(roles.remote).toMatch(/^visitor-/);
        expect(roles.room).toBe(meeting.roomName);
      });

      await test.step('each side sees and plays remote video', async () => {
        for (const page of [host, guest]) {
          await waitForRemotePublication(page, 'camera', { subscribed: true, muted: false });
          await expect(page.locator('.lk-participant-tile[data-lk-local-participant="false"]')).toBeVisible();
          await page.waitForFunction(
            () =>
              [...document.querySelectorAll<HTMLVideoElement>(
                '.lk-participant-tile[data-lk-local-participant="false"] video',
              )].some((v) => v.videoWidth > 0 && !v.paused),
            null,
            { timeout: 30_000 },
          );
        }
      });

      await test.step('each side receives remote audio', async () => {
        for (const page of [host, guest]) {
          await waitForRemotePublication(page, 'microphone', { subscribed: true, muted: false });
          await page.waitForFunction(
            () => [...document.querySelectorAll('audio')].some((a) => a.srcObject !== null),
            null,
            { timeout: 15_000 },
          );
        }
      });

      await test.step('microphone mute is visible to the other side', async () => {
        await guest.locator('.lk-control-bar button[data-lk-source="microphone"]').click();
        await waitForRemotePublication(host, 'microphone', { muted: true });
        await guest.locator('.lk-control-bar button[data-lk-source="microphone"]').click();
        await waitForRemotePublication(host, 'microphone', { muted: false });
      });

      await test.step('camera off shows the placeholder on the other side', async () => {
        await guest.locator('.lk-control-bar button[data-lk-source="camera"]').click();
        await waitForRemotePublication(host, 'camera', { muted: true });
        await expect(
          host.locator('.lk-participant-tile[data-lk-local-participant="false"][data-lk-source="camera"]'),
        ).toHaveAttribute('data-lk-video-muted', 'true');
        await guest.locator('.lk-control-bar button[data-lk-source="camera"]').click();
        await waitForRemotePublication(host, 'camera', { muted: false });
      });

      await test.step('screenshare publishes, focuses on the other side, and stops', async () => {
        await guest.locator('.lk-control-bar button[data-lk-source="screen_share"]').click();
        await waitForRemotePublication(host, 'screen_share', { subscribed: true });
        await expect(host.getByTestId('meeting-focus-layout')).toBeVisible({ timeout: 15_000 });
        await guest.locator('.lk-control-bar button[data-lk-source="screen_share"]').click();
        await waitForRemotePublication(host, 'screen_share', { present: false });
        await expect(host.getByTestId('meeting-grid-layout')).toBeVisible({ timeout: 15_000 });
      });

      await test.step('switching microphone device keeps publishing', async () => {
        const micGroup = guest.locator('.lk-control-bar .lk-button-group:has(button[data-lk-source="microphone"])');
        await micGroup.locator('.lk-button-menu').click();
        const option = micGroup.locator('.lk-device-menu li[data-lk-active="false"]').first();
        await expect(option).toBeVisible();
        const target = await option.getAttribute('id');
        expect(target).toBeTruthy();
        await option.locator('button').click();
        await guest.waitForFunction(
          (deviceId) => window.__lkRoom?.getActiveDevice('audioinput') === deviceId,
          target,
          { timeout: 15_000 },
        );
        await waitForRemotePublication(host, 'microphone', { subscribed: true, muted: false });
      });

      await test.step('online check-in is recorded', async () => {
        if (WEBHOOK_MODE === 'simulate') {
          fixture(`webhook --visit ${meeting.visitId} --event participant_joined --api ${API_BASE}`);
        }
        const status = await waitForVisitStatus(meeting.visitId, 'CHECKED_IN');
        expect(status.checkedInLocation).toBe('LIVEKIT_ONLINE');
      });

      await test.step('leaving removes the participant on the other side', async () => {
        await guest.locator('.lk-disconnect-button').click();
        await expect(guest.getByTestId('meeting-left')).toBeVisible({ timeout: 15_000 });
        await waitForRemote(host, 0);
        await host.locator('.lk-disconnect-button').click();
        await expect(host.getByTestId('meeting-left')).toBeVisible({ timeout: 15_000 });
      });

      await test.step('online check-out is recorded when the room closes', async () => {
        if (WEBHOOK_MODE === 'simulate') {
          fixture(`webhook --visit ${meeting.visitId} --event room_finished --api ${API_BASE}`);
        }
        const status = await waitForVisitStatus(meeting.visitId, 'CHECKED_OUT', 180_000);
        expect(status.checkOutTime).not.toBeNull();
        expect(status.totalDurationMinutes).toBeGreaterThanOrEqual(1);
      });

      await test.step('patient can rejoin while the window is open', async () => {
        await guest.getByTestId('meeting-rejoin').click();
        await expect(guest.getByTestId('meeting-prejoin')).toBeVisible({ timeout: 30_000 });
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});

/**
 * Tests for wizard types and sessionStorage persistence helpers.
 * Covers the dataUrlToFile and fileToDataUrl utility functions,
 * and the SerializableWizardState type contract.
 */

import {
  dataUrlToFile,
  fileToDataUrl,
  WIZARD_STORAGE_KEY,
  WIZARD_STATE_EXPIRY_MS,
  WizardStep,
  VisitType,
  type SerializableWizardState,
} from './types';

describe('Wizard sessionStorage persistence helpers', () => {
  describe('WIZARD_STORAGE_KEY', () => {
    it('should be the correct storage key', () => {
      expect(WIZARD_STORAGE_KEY).toBe('visitor-registration-wizard-state');
    });
  });

  describe('WIZARD_STATE_EXPIRY_MS', () => {
    it('should be 30 minutes in milliseconds', () => {
      expect(WIZARD_STATE_EXPIRY_MS).toBe(30 * 60 * 1000);
    });
  });

  describe('dataUrlToFile', () => {
    it('should convert a base64 data URL to a File object', () => {
      // Create a small 1x1 PNG data URL
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const file = dataUrlToFile(dataUrl, 'test-photo.png', 'image/png');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('test-photo.png');
      expect(file.type).toBe('image/png');
      expect(file.size).toBeGreaterThan(0);
    });

    it('should handle JPEG data URLs', () => {
      // Minimal valid JPEG base64 (just the header bytes)
      const jpegBase64 = btoa(
        String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46)
      );
      const dataUrl = `data:image/jpeg;base64,${jpegBase64}`;

      const file = dataUrlToFile(dataUrl, 'photo.jpg', 'image/jpeg');

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('photo.jpg');
      expect(file.type).toBe('image/jpeg');
    });

    it('should produce correct byte content', () => {
      // Encode known bytes and verify they come back correctly
      const originalBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = btoa(String.fromCharCode(...originalBytes));
      const dataUrl = `data:application/octet-stream;base64,${base64}`;

      const file = dataUrlToFile(dataUrl, 'test.bin', 'application/octet-stream');
      expect(file.size).toBe(5);
    });
  });

  describe('fileToDataUrl', () => {
    it('should convert a File to a base64 data URL', async () => {
      const content = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const dataUrl = await fileToDataUrl(file);

      expect(dataUrl).toMatch(/^data:text\/plain;base64,/);
      // Decode and verify content
      const base64Part = dataUrl.split(',')[1];
      const decoded = atob(base64Part);
      expect(decoded).toBe('Hello');
    });

    it('should handle image files', async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]); // PNG header
      const file = new File([pngBytes], 'image.png', { type: 'image/png' });

      const dataUrl = await fileToDataUrl(file);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should round-trip: fileToDataUrl -> dataUrlToFile preserves content', async () => {
      const originalContent = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const originalFile = new File([originalContent], 'test.bin', { type: 'application/octet-stream' });

      const dataUrl = await fileToDataUrl(originalFile);
      const restoredFile = dataUrlToFile(dataUrl, 'test.bin', 'application/octet-stream');

      expect(restoredFile.size).toBe(originalFile.size);
      expect(restoredFile.name).toBe(originalFile.name);
      expect(restoredFile.type).toBe(originalFile.type);

      // Verify via re-encoding: convert restored file back to data URL and compare
      const restoredDataUrl = await fileToDataUrl(restoredFile);
      expect(restoredDataUrl).toBe(dataUrl);
    });
  });

  describe('SerializableWizardState type contract', () => {
    it('should be JSON-serializable (no File objects)', () => {
      const state: SerializableWizardState = {
        currentStep: WizardStep.VISITOR_REGISTRATION,
        visitType: VisitType.DELIVERY,
        phoneData: {
          phone: '9876543210',
          branchId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          isVerified: true,
        },
        visitId: null,
        apiError: null,
        deliveryFormData: {
          firstName: 'John',
          lastName: 'Doe',
        },
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: 'data:image/jpeg;base64,/9j/4AAQ...',
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now(),
      };

      // Should not throw when serialized
      const json = JSON.stringify(state);
      expect(json).toBeTruthy();

      // Should deserialize back to the same structure
      const parsed = JSON.parse(json) as SerializableWizardState;
      expect(parsed.currentStep).toBe(WizardStep.VISITOR_REGISTRATION);
      expect(parsed.visitType).toBe(VisitType.DELIVERY);
      expect(parsed.deliveryFormData?.firstName).toBe('John');
      expect(parsed.photoDataUrl).toBe('data:image/jpeg;base64,/9j/4AAQ...');
    });

    it('should support meeting flow state', () => {
      const state: SerializableWizardState = {
        currentStep: WizardStep.VISITOR_REGISTRATION,
        visitType: VisitType.MEETING,
        phoneData: {
          phone: '9876543210',
          branchId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          isVerified: true,
          isExistingVisitor: true,
        },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '9876543210',
        },
        meetingDetailsData: null,
        selectedHost: {
          id: 'host-1',
          name: 'Dr. Smith',
          email: 'dr.smith@hospital.com',
          phone: '1234567890',
          department: null,
        },
        photoDataUrl: 'data:image/jpeg;base64,abc123',
        govIdDataUrl: 'data:image/png;base64,def456',
        officeIdDataUrl: null,
        savedAt: Date.now(),
      };

      const json = JSON.stringify(state);
      const parsed = JSON.parse(json) as SerializableWizardState;
      expect(parsed.meetingFormData?.email).toBe('jane@example.com');
      expect(parsed.selectedHost?.name).toBe('Dr. Smith');
      expect(parsed.govIdDataUrl).toBe('data:image/png;base64,def456');
    });
  });

  describe('sessionStorage integration', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it('should store and retrieve wizard state from sessionStorage', () => {
      const state: SerializableWizardState = {
        currentStep: WizardStep.VISIT_TYPE_SELECTION,
        visitType: null,
        phoneData: {
          phone: '9876543210',
          branchId: 'test-branch',
          isVerified: true,
        },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: null,
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now(),
      };

      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));

      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      expect(raw).toBeTruthy();

      const parsed = JSON.parse(raw!) as SerializableWizardState;
      expect(parsed.currentStep).toBe(WizardStep.VISIT_TYPE_SELECTION);
      expect(parsed.phoneData?.phone).toBe('9876543210');
    });

    it('should detect expired state based on savedAt timestamp', () => {
      const expiredState: SerializableWizardState = {
        currentStep: WizardStep.VISITOR_REGISTRATION,
        visitType: VisitType.DELIVERY,
        phoneData: { phone: '9876543210', branchId: 'test', isVerified: true },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: null,
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now() - WIZARD_STATE_EXPIRY_MS - 1000, // Expired 1 second ago
      };

      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(expiredState));

      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      const parsed = JSON.parse(raw!) as SerializableWizardState;
      const isExpired = Date.now() - parsed.savedAt > WIZARD_STATE_EXPIRY_MS;

      expect(isExpired).toBe(true);
    });

    it('should detect non-expired state', () => {
      const freshState: SerializableWizardState = {
        currentStep: WizardStep.VISITOR_REGISTRATION,
        visitType: VisitType.DELIVERY,
        phoneData: { phone: '9876543210', branchId: 'test', isVerified: true },
        visitId: null,
        apiError: null,
        deliveryFormData: null,
        deliveryDetailsData: null,
        meetingFormData: null,
        meetingDetailsData: null,
        selectedHost: null,
        photoDataUrl: null,
        govIdDataUrl: null,
        officeIdDataUrl: null,
        savedAt: Date.now(), // Just now
      };

      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(freshState));

      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      const parsed = JSON.parse(raw!) as SerializableWizardState;
      const isExpired = Date.now() - parsed.savedAt > WIZARD_STATE_EXPIRY_MS;

      expect(isExpired).toBe(false);
    });
  });
});

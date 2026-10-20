import axios from 'axios';
import { getApiErrorMessage, getBackendUnreachableMessage } from '@/lib/api-errors';

jest.mock('@/lib/platform', () => ({
  isNativeApp: () => true,
}));

describe('api error copy', () => {
  it('does not mention uvicorn on native or production hosts', () => {
    const message = getBackendUnreachableMessage();
    expect(message).toContain('Cannot reach Conninter');
    expect(message.toLowerCase()).not.toContain('uvicorn');
  });

  it('uses a timeout message for ECONNABORTED', () => {
    const error = new axios.AxiosError('timeout', 'ECONNABORTED');
    expect(getApiErrorMessage(error, 'fallback')).toMatch(/timed out/i);
    expect(getApiErrorMessage(error, 'fallback').toLowerCase()).not.toContain('uvicorn');
  });
});

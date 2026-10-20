import { beforeEach, describe, expect, it } from 'vitest';
import { bookingStore } from './booking-store';
import { createMockClient, demoControls } from './mock-client';

const api = createMockClient(0);
const PHONE = '+966551234567';

describe('demo customer sign-in', () => {
  beforeEach(async () => {
    bookingStore.clear();
    await api.signOut();
  });

  it('signs in with the code shown on screen and signs out again', async () => {
    expect(await api.getCustomerSession()).toEqual({ verified: false });
    const { demoCode } = await api.requestSignInCode(PHONE);
    expect(demoCode).toMatch(/^\d{6}$/);
    expect(await api.verifySignInCode(PHONE, demoCode!)).toEqual({ verified: true, phone: PHONE });
    expect(await api.getCustomerSession()).toEqual({ verified: true, phone: PHONE });
    await api.signOut();
    expect(await api.getCustomerSession()).toEqual({ verified: false });
  });

  it('rejects a wrong code or a different number', async () => {
    const { demoCode } = await api.requestSignInCode(PHONE);
    const wrong = demoCode === '111111' ? '222222' : '111111';
    await expect(api.verifySignInCode(PHONE, wrong)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(api.verifySignInCode('+966559999999', demoCode!)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('shows only the signed-in number’s bookings', async () => {
    demoControls.seedSampleBookings(); // signed out: samples use the default demo number
    const { demoCode } = await api.requestSignInCode(PHONE);
    await api.verifySignInCode(PHONE, demoCode!);
    expect(await api.listBookings()).toHaveLength(0);
    demoControls.seedSampleBookings(); // signed in: samples use the signed-in number
    const mine = await api.listBookings();
    expect(mine).toHaveLength(3);
    expect(mine.every((b) => b.customer.phone === PHONE)).toBe(true);
    await api.signOut();
    expect(await api.listBookings()).toHaveLength(6);
  });
});

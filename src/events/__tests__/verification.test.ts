import { VerificationInput, verificationService } from '../../services/verification.service';
import { MockProxy } from 'jest-mock-extended';
import { handleUserEmailVerificationEvent } from '../verification';
import { randomUUID } from 'crypto';

jest.mock('../../services/verification.service');

const verificationServiceMock = verificationService as MockProxy<typeof verificationService>;

describe('Send email verification event', () => {
  test('handler calls verification service operation', async () => {
    const input: VerificationInput = { email: 'some@email.com', id: randomUUID() };
    verificationServiceMock.sendVerificationEmail.mockResolvedValue();

    await handleUserEmailVerificationEvent(input);

    expect(verificationServiceMock.sendVerificationEmail).toHaveBeenCalledWith(input);
  });

  test(`handler catches errors and doesn't fail`, async () => {
    const input: VerificationInput = { email: 'some@email.com', id: randomUUID() };
    verificationServiceMock.sendVerificationEmail.mockRejectedValue(new Error());

    await handleUserEmailVerificationEvent(input);

    expect(verificationServiceMock.sendVerificationEmail).toHaveBeenCalledWith(input);
  });
});

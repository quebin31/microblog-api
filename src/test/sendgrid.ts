import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import sendGridMail, { MailService } from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: mockDeep<MailService>(),
}));

beforeEach(() => {
  mockReset(sendGridMailMock);
});

export const sendGridMailMock = sendGridMail as unknown as DeepMockProxy<MailService>;

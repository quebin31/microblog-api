import { sendGridMailMock } from '../../test/mocks/sendgrid';
import { MailDataRequired } from '@sendgrid/mail';
import { captor } from 'jest-mock-extended';
import { emailService } from '../email.service';
import { faker } from '@faker-js/faker';

describe('Send verification code email', () => {
  test('sends email via SendGrid API', async () => {
    const email = faker.internet.email();
    const verificationCode = '1A2B3C';

    await emailService.sendVerificationCode(email, verificationCode);

    expect(sendGridMailMock.send).toHaveBeenCalledTimes(1);
    const emailDataCaptor = captor<MailDataRequired>();
    expect(sendGridMailMock.send).toHaveBeenCalledWith(emailDataCaptor);
    expect(emailDataCaptor.value).toMatchObject({
      from: 'kevindelcastillo@ravn.co',
      to: email,
      subject: 'Confirm your Microblog account',
    });

    const emailData = emailDataCaptor.value;
    const text = emailData.text?.replace(verificationCode, '$CODE$');
    const html = emailData.html?.replace(verificationCode, '$CODE$');
    expect(text).toMatchInlineSnapshot(`"Confirmation code: $CODE$"`);
    expect(html).toMatchInlineSnapshot(`"Confirmation code: <strong>$CODE$</strong>"`);
  });
});

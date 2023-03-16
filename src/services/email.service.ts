import sendGridMail from '@sendgrid/mail';
import config from '../config';

sendGridMail.setApiKey(config.emailApiKey);

export const emailService = {
  async sendVerificationCode(email: string, verificationCode: string) {
    return sendGridMail.send({
      to: email,
      from: 'kevindelcastillo@ravn.co',
      subject: 'Confirm your Microblog account',
      text: `Confirmation code: ${verificationCode}`,
      html: `Confirmation code: <strong>${verificationCode}</strong>`,
    });
  }
};

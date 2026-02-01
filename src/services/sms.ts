import twilio from 'twilio';

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  /**
   * Send chore assignment SMS
   */
  async sendAssignment(
    to: string,
    memberName: string,
    choreName: string,
    choreDescription: string,
    confirmUrl: string,
    historyUrl: string
  ): Promise<string> {
    const message = await this.client.messages.create({
      body:
        `Hi ${memberName}! Your chore this week is: ${choreName}\n\n` +
        `${choreDescription}\n\n` +
        `Confirm completion: ${confirmUrl}\n` +
        `View history: ${historyUrl}`,
      from: this.fromNumber,
      to,
    });
    return message.sid;
  }

  /**
   * Send reminder SMS
   */
  async sendReminder(
    to: string,
    memberName: string,
    choreName: string,
    confirmUrl: string
  ): Promise<string> {
    const message = await this.client.messages.create({
      body:
        `Reminder: Hi ${memberName}, your chore "${choreName}" ` +
        `hasn't been confirmed yet. Please complete and confirm: ${confirmUrl}`,
      from: this.fromNumber,
      to,
    });
    return message.sid;
  }

  /**
   * Send weekly summary to admin
   */
  async sendAdminSummary(to: string, adminName: string, summary: string): Promise<string> {
    const message = await this.client.messages.create({
      body: `Weekly Chore Summary for ${adminName}:\n\n${summary}`,
      from: this.fromNumber,
      to,
    });
    return message.sid;
  }
}

/**
 * Create SMS service from environment variables
 */
export function createSMSService(): SMSService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Missing Twilio environment variables. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER'
    );
  }

  return new SMSService({
    accountSid,
    authToken,
    fromNumber,
  });
}

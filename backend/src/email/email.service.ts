import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private readonly BRAND = {
    primary: '#0052CC',
    secondary: '#6366F1',
    gold: '#F59E0B',
    success: '#10B981',
    dark: '#0F172A',
    bg: '#F8FAFC',
  };

  constructor(private config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('email.host');
    const user = this.config.get<string>('email.user');
    if (!host || !user || user === 'your-email@gmail.com') {
      this.logger.warn('SMTP not configured — emails will be logged to console only');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('email.port') || 587,
      secure: false,
      auth: { user, pass: this.config.get<string>('email.pass') },
    });
  }

  private baseTemplate(title: string, bodyHtml: string): string {
    const { primary, secondary, gold, bg, dark } = this.BRAND;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${bg}; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #334155; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); padding: 36px 40px; text-align: center; position: relative; }
    .header::before { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
    .logo { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; position: relative; }
    .logo span { color: ${gold}; }
    .tagline { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 6px; position: relative; }
    .body { padding: 40px; }
    .greeting { font-size: 22px; font-weight: 700; color: ${dark}; margin-bottom: 12px; }
    .text { color: #475569; line-height: 1.7; font-size: 15px; margin-bottom: 20px; }
    .info-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 24px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-label { color: #64748B; }
    .info-value { color: ${dark}; font-weight: 600; text-align: right; max-width: 60%; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${primary}, ${secondary}); color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 16px rgba(0,82,204,0.3); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; }
    .badge-green { background: #DCFCE7; color: #166534; }
    .badge-blue { background: #DBEAFE; color: #1E40AF; }
    .badge-amber { background: #FEF9C3; color: #854D0E; }
    .badge-red { background: #FEE2E2; color: #991B1B; }
    .divider { border: none; border-top: 1px solid #E2E8F0; margin: 28px 0; }
    .highlight-box { background: linear-gradient(135deg, rgba(0,82,204,0.05), rgba(99,102,241,0.05)); border: 1px solid rgba(0,82,204,0.15); border-radius: 14px; padding: 20px 24px; margin: 20px 0; }
    .footer { background: #F1F5F9; padding: 24px 40px; text-align: center; }
    .footer-text { color: #94A3B8; font-size: 12px; line-height: 1.8; }
    .footer-links { margin-top: 12px; }
    .footer-links a { color: ${primary}; text-decoration: none; font-size: 12px; margin: 0 8px; }
    .qr-container { text-align: center; margin: 24px 0; }
    .qr-container img { border: 4px solid #E2E8F0; border-radius: 12px; padding: 8px; background: white; }
    .amount-large { font-size: 32px; font-weight: 800; color: ${primary}; text-align: center; margin: 16px 0; }
    .achievement-icon { font-size: 48px; text-align: center; margin: 16px 0; }
    .campus-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(0,82,204,0.1); border: 1px solid rgba(0,82,204,0.2); border-radius: 999px; font-size: 12px; font-weight: 600; color: ${primary}; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">VIT<span>Verse</span></div>
      <div class="tagline">4 Campuses · 1 Smart Ecosystem</div>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      <div class="footer-text">
        VITVerse Campus Events Platform · events@vitverse.in<br>
        VIT University · Vellore, Chennai, AP, Bhopal
      </div>
      <div class="footer-links">
        <a href="#">Unsubscribe</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Help Center</a>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`📧 [EMAIL NOT SENT - SMTP unconfigured]\n   To: ${to}\n   Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"VITVerse" <${this.config.get('email.from')}>`,
        to, subject, html,
      });
      this.logger.log(`📧 Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`📧 Email failed to ${to}:`, err.message);
    }
  }

  // ── Booking Confirmation ──────────────────────────────────────

  async sendBookingConfirmation(
    user: { name: string; email: string },
    booking: { bookingRef: string; amountPaid: number; paymentStatus: string },
    event: { title: string; campus: string; sessionDate: any; startTime: string; endTime: string; venueName: string },
    qrDataUrl?: string,
  ) {
    const isPaid = booking.amountPaid > 0;
    const dateStr = new Date(event.sessionDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const body = `
      <div class="greeting">🎟️ You're In, ${user.name.split(' ')[0]}!</div>
      <p class="text">Your booking for <strong>${event.title}</strong> has been confirmed. We can't wait to see you there!</p>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Event</span><span class="info-value">${event.title}</span></div>
        <div class="info-row"><span class="info-label">Booking Ref</span><span class="info-value" style="font-family:monospace;color:#0052CC">${booking.bookingRef}</span></div>
        <div class="info-row"><span class="info-label">Campus</span><span class="info-value"><span class="campus-badge">📍 ${event.campus}</span></span></div>
        <div class="info-row"><span class="info-label">Date</span><span class="info-value">${dateStr}</span></div>
        <div class="info-row"><span class="info-label">Time</span><span class="info-value">${event.startTime} – ${event.endTime}</span></div>
        <div class="info-row"><span class="info-label">Venue</span><span class="info-value">${event.venueName}</span></div>
        <div class="info-row"><span class="info-label">Payment</span><span class="info-value"><span class="badge badge-green">✅ ${isPaid ? `₹${booking.amountPaid} Paid` : 'Free Entry'}</span></span></div>
      </div>

      ${qrDataUrl ? `
      <p class="text" style="text-align:center;color:#64748B;font-size:13px">Show this QR code at the venue entrance</p>
      <div class="qr-container">
        <img src="${qrDataUrl}" width="180" height="180" alt="Your Entry QR Code" />
        <div style="font-size:12px;color:#94A3B8;margin-top:8px">Scan at venue · ${booking.bookingRef}</div>
      </div>
      ` : ''}

      <div class="highlight-box">
        <strong style="color:#0052CC">📌 What to bring:</strong>
        <ul style="margin-top:8px;padding-left:20px;color:#475569;font-size:14px;line-height:2">
          <li>Valid VIT ID card</li>
          <li>This booking confirmation (digital or print)</li>
          <li>QR code for entry (if applicable)</li>
        </ul>
      </div>
    `;

    await this.send(user.email, `✅ Booking Confirmed — ${event.title}`, this.baseTemplate('Booking Confirmed', body));
  }

  // ── Payment Receipt ───────────────────────────────────────────

  async sendPaymentReceipt(
    user: { name: string; email: string },
    booking: { bookingRef: string; amountPaid: number; gstAmount: number; processingFee: number; razorpayPaymentId: string },
    event: { title: string },
  ) {
    const base = booking.amountPaid - booking.gstAmount - booking.processingFee;
    const body = `
      <div class="greeting">💳 Payment Successful!</div>
      <p class="text">Your payment for <strong>${event.title}</strong> has been processed. Here's your receipt.</p>

      <div class="amount-large">₹${booking.amountPaid.toFixed(2)}</div>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Event</span><span class="info-value">${event.title}</span></div>
        <div class="info-row"><span class="info-label">Booking Ref</span><span class="info-value" style="font-family:monospace">${booking.bookingRef}</span></div>
        <div class="info-row"><span class="info-label">Payment ID</span><span class="info-value" style="font-family:monospace;font-size:12px">${booking.razorpayPaymentId}</span></div>
        <div class="info-row"><span class="info-label">Base Amount</span><span class="info-value">₹${base.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">GST (18%)</span><span class="info-value">₹${booking.gstAmount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Processing Fee</span><span class="info-value">₹${booking.processingFee.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Total Paid</span><span class="info-value" style="color:#0052CC;font-size:18px">₹${booking.amountPaid.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-green">✅ Paid</span></span></div>
      </div>

      <p class="text" style="font-size:13px;color:#94A3B8">This is your official payment receipt. Keep it for your records.</p>
    `;
    await this.send(user.email, `💳 Payment Receipt — ${booking.bookingRef}`, this.baseTemplate('Payment Receipt', body));
  }

  // ── Waitlist Promotion ────────────────────────────────────────

  async sendWaitlistPromotion(
    user: { name: string; email: string },
    event: { title: string; campus: string },
    timeoutMinutes = 15,
  ) {
    const body = `
      <div class="greeting">🎊 Great News, ${user.name.split(' ')[0]}!</div>
      <p class="text">A spot just opened up for <strong>${event.title}</strong> at VIT ${event.campus}. You were next on the waitlist!</p>

      <div class="highlight-box" style="text-align:center">
        <div style="font-size:40px;margin-bottom:8px">⏱️</div>
        <strong style="font-size:20px;color:#0052CC">You have ${timeoutMinutes} minutes</strong>
        <p style="color:#64748B;margin-top:8px;font-size:14px">Log in to VITVerse and confirm your booking before the spot goes to the next person.</p>
      </div>

      <div style="text-align:center">
        <a href="${this.config.get('frontend.url')}/events" class="btn">🎟️ Claim My Spot Now</a>
      </div>

      <p class="text" style="font-size:13px;color:#94A3B8;text-align:center">
        If you no longer want this spot, simply ignore this email and it will automatically go to the next person on the waitlist.
      </p>
    `;
    await this.send(user.email, `🎊 Spot Available — ${event.title} (${timeoutMinutes} min to claim!)`, this.baseTemplate('Spot Available!', body));
  }

  // ── Booking Cancellation ─────────────────────────────────────

  async sendBookingCancellation(
    user: { name: string; email: string },
    booking: { bookingRef: string; cancellationReason?: string },
    event: { title: string },
    refundAmount?: number,
  ) {
    const body = `
      <div class="greeting">❌ Booking Cancelled</div>
      <p class="text">Your booking for <strong>${event.title}</strong> has been cancelled.</p>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Booking Ref</span><span class="info-value" style="font-family:monospace">${booking.bookingRef}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-red">❌ Cancelled</span></span></div>
        ${booking.cancellationReason ? `<div class="info-row"><span class="info-label">Reason</span><span class="info-value">${booking.cancellationReason}</span></div>` : ''}
        ${refundAmount ? `<div class="info-row"><span class="info-label">Refund</span><span class="info-value" style="color:#10B981">₹${refundAmount.toFixed(2)} (3–5 business days)</span></div>` : ''}
      </div>

      <div style="text-align:center">
        <a href="${this.config.get('frontend.url')}/events" class="btn">Browse Other Events</a>
      </div>
    `;
    await this.send(user.email, `Booking Cancelled — ${event.title}`, this.baseTemplate('Booking Cancelled', body));
  }

  // ── Refund Confirmation ───────────────────────────────────────

  async sendRefundConfirmation(
    user: { name: string; email: string },
    booking: { bookingRef: string },
    refundId: string,
    refundAmount: number,
  ) {
    const body = `
      <div class="greeting">💚 Refund Initiated, ${user.name.split(' ')[0]}!</div>
      <p class="text">Your refund has been successfully initiated and will appear in your bank account within 3–5 business days.</p>

      <div class="amount-large" style="color:#10B981">₹${refundAmount.toFixed(2)}</div>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Booking Ref</span><span class="info-value" style="font-family:monospace">${booking.bookingRef}</span></div>
        <div class="info-row"><span class="info-label">Refund ID</span><span class="info-value" style="font-family:monospace;font-size:12px">${refundId}</span></div>
        <div class="info-row"><span class="info-label">Refund Amount</span><span class="info-value" style="color:#10B981">₹${refundAmount.toFixed(2)}</span></div>
        <div class="info-row"><span class="info-label">Timeline</span><span class="info-value">3–5 business days</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-green">✅ Initiated</span></span></div>
      </div>

      <p class="text" style="font-size:13px;color:#94A3B8">Refunds may take up to 7 days depending on your bank. Contact support if not received after 7 days.</p>
    `;
    await this.send(user.email, `💚 Refund of ₹${refundAmount} Initiated`, this.baseTemplate('Refund Initiated', body));
  }

  // ── Achievement Unlocked ──────────────────────────────────────

  async sendAchievementUnlocked(
    user: { name: string; email: string },
    achievement: { name: string; description: string; icon: string; points: number },
  ) {
    const body = `
      <div class="greeting">🏆 Achievement Unlocked!</div>
      <p class="text">Congratulations ${user.name.split(' ')[0]}! You just earned a new achievement on VITVerse.</p>

      <div class="highlight-box" style="text-align:center">
        <div class="achievement-icon">${achievement.icon}</div>
        <strong style="font-size:22px;color:#0052CC">${achievement.name}</strong>
        <p style="color:#64748B;margin-top:8px">${achievement.description}</p>
        <div style="margin-top:16px">
          <span class="badge badge-amber" style="font-size:16px">+${achievement.points} Points</span>
        </div>
      </div>

      <p class="text" style="text-align:center">Keep exploring events, joining clubs, and attending activities to unlock more achievements and climb the leaderboard!</p>

      <div style="text-align:center">
        <a href="${this.config.get('frontend.url')}/portfolio" class="btn">View My Profile</a>
      </div>
    `;
    await this.send(user.email, `🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name}`, this.baseTemplate('Achievement Unlocked!', body));
  }

  // ── OTP Email ─────────────────────────────────────────────────

  async sendOtp(user: { name: string; email: string }, otp: string) {
    const body = `
      <div class="greeting">Hello, ${user.name.split(' ')[0]}!</div>
      <p class="text">Use the verification code below to confirm your VITVerse account. This code expires in 10 minutes.</p>

      <div style="text-align:center;margin:32px 0">
        <div style="display:inline-block;background:#F8FAFC;border:2px dashed #CBD5E1;border-radius:16px;padding:24px 48px">
          <div style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0052CC;font-family:monospace">${otp}</div>
        </div>
      </div>

      <p class="text" style="font-size:13px;color:#94A3B8;text-align:center">
        If you didn't create a VITVerse account, you can safely ignore this email.
      </p>
    `;
    await this.send(user.email, `${otp} — Your VITVerse Verification Code`, this.baseTemplate('Verify Your Email', body));
  }

  // ── Event Reminder ────────────────────────────────────────────

  async sendEventReminder(
    user: { name: string; email: string },
    event: { title: string; campus: string; startTime: string; venueName: string },
    hoursUntil: number,
  ) {
    const body = `
      <div class="greeting">⏰ Event Reminder, ${user.name.split(' ')[0]}!</div>
      <p class="text">Your upcoming event starts in <strong>${hoursUntil} hours</strong>. Don't forget!</p>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Event</span><span class="info-value">${event.title}</span></div>
        <div class="info-row"><span class="info-label">Campus</span><span class="info-value"><span class="campus-badge">📍 ${event.campus}</span></span></div>
        <div class="info-row"><span class="info-label">Time</span><span class="info-value">${event.startTime}</span></div>
        <div class="info-row"><span class="info-label">Venue</span><span class="info-value">${event.venueName}</span></div>
      </div>

      <div style="text-align:center">
        <a href="${this.config.get('frontend.url')}/events" class="btn">View My Booking</a>
      </div>
    `;
    await this.send(user.email, `⏰ Reminder: ${event.title} starts in ${hoursUntil}h`, this.baseTemplate('Event Reminder', body));
  }
}

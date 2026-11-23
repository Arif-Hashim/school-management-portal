import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { User } from '@/lib/models';
import { CommunicationConsent } from '@/lib/phase3-models';

export const runtime = 'nodejs';

const consentSchema = z.object({ phone: z.string().trim().max(30).optional(), emailOptIn: z.boolean(), whatsappOptIn: z.boolean() });
const noticeSchema = z.object({ title: z.string().trim().min(2).max(120), message: z.string().trim().min(2).max(4000), audience: z.enum(['all', 'parent', 'student', 'teacher']) });

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const parsed = consentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide valid communication preferences.' }, { status: 400 });
  try {
    await connectDB();
    await CommunicationConsent.findOneAndUpdate(
      { userId: user.id },
      { $set: { ...parsed.data, consentedAt: new Date() } },
      { upsert: true, new: true, runValidators: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Communication preference error:', error);
    return NextResponse.json({ error: 'Unable to save communication preferences.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getSession();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const parsed = noticeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the notice details.' }, { status: 400 });

  try {
    await connectDB();
    const audience = parsed.data.audience === 'all' ? { $in: ['admin', 'teacher', 'student', 'parent'] } : parsed.data.audience;
    const consents = await CommunicationConsent.find({ $or: [{ emailOptIn: true }, { whatsappOptIn: true }] }).limit(500).lean();
    const recipients = await User.find({ _id: { $in: consents.map(consent => consent.userId) }, active: true, role: audience }).select('email').lean();
    const recipientsById = new Map(recipients.map(recipient => [String(recipient._id), recipient]));
    const report = { emailSent: 0, whatsappSent: 0, skipped: 0, failed: 0 };
    const sendgridReady = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
    const twilioReady = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
    let sendgrid: typeof import('@sendgrid/mail') | undefined;
    if (sendgridReady) {
      sendgrid = await import('@sendgrid/mail');
      sendgrid.default.setApiKey(process.env.SENDGRID_API_KEY!);
    }

    for (const consent of consents) {
      const recipient = recipientsById.get(String(consent.userId));
      if (!recipient) { report.skipped++; continue; }
      let delivered = false;
      if (consent.emailOptIn && sendgrid && recipient.email) {
        try {
          await sendgrid.default.send({ to: recipient.email, from: process.env.SENDGRID_FROM_EMAIL!, subject: parsed.data.title, text: parsed.data.message });
          report.emailSent++;
          delivered = true;
        } catch (error) { console.error('SendGrid delivery failed:', error); report.failed++; }
      }
      if (consent.whatsappOptIn && twilioReady && consent.phone) {
        try {
          const { default: twilio } = await import('twilio');
          const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
          await client.messages.create({ to: `whatsapp:${consent.phone}`, from: process.env.TWILIO_WHATSAPP_FROM!, body: `${parsed.data.title}: ${parsed.data.message}` });
          report.whatsappSent++;
          delivered = true;
        } catch (error) { console.error('Twilio WhatsApp delivery failed:', error); report.failed++; }
      }
      if (!delivered) report.skipped++;
    }
    return NextResponse.json({ ok: true, ...report, providerConfigured: { sendgrid: sendgridReady, twilio: twilioReady } });
  } catch (error) {
    console.error('Communication delivery error:', error);
    return NextResponse.json({ error: 'Unable to process communication request.' }, { status: 500 });
  }
}

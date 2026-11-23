import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Payroll } from '@/lib/phase2-models';
import { WiseDisbursement } from '@/lib/phase3-models';

export const runtime = 'nodejs';

const requestSchema = z.object({
  recipientId: z.string().regex(/^\d+$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getSession();
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !/^[a-f\d]{24}$/i.test(params.id)) return NextResponse.json({ error: 'Provide a valid payroll record, Wise recipient, and currency.' }, { status: 400 });
  if (process.env.WISE_ENVIRONMENT !== 'sandbox' || !process.env.WISE_API_TOKEN || !process.env.WISE_PROFILE_ID) {
    return NextResponse.json({ error: 'Wise disbursements are available only when sandbox credentials are configured.' }, { status: 503 });
  }

  try {
    await connectDB();
    const payroll = await Payroll.findById(params.id).lean();
    if (!payroll || payroll.status !== 'draft') return NextResponse.json({ error: 'Only draft payroll records can be disbursed.' }, { status: 409 });

    let disbursement;
    try {
      disbursement = await WiseDisbursement.create({ payrollId: payroll._id, createdBy: admin.id, status: 'pending' });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'A Wise transfer has already been attempted for this payroll record.' }, { status: 409 });
      throw error;
    }

    const headers = { Authorization: `Bearer ${process.env.WISE_API_TOKEN}`, 'Content-Type': 'application/json' };
    const profileId = encodeURIComponent(process.env.WISE_PROFILE_ID);
    const quoteResponse = await fetch(`https://api.wise-sandbox.com/v3/profiles/${profileId}/quotes`, {
      method: 'POST', headers,
      body: JSON.stringify({ sourceCurrency: parsed.data.currency, targetCurrency: parsed.data.currency, sourceAmount: payroll.amount, payOut: 'BANK_TRANSFER', preferredPayIn: 'BALANCE' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!quoteResponse.ok) throw new Error(`Wise quote rejected (${quoteResponse.status}).`);
    const quote = await quoteResponse.json() as { id?: string };
    if (!quote.id) throw new Error('Wise did not return a quote ID.');

    const transferResponse = await fetch('https://api.wise-sandbox.com/v1/transfers', {
      method: 'POST', headers,
      body: JSON.stringify({
        targetAccount: Number(parsed.data.recipientId),
        quoteUuid: quote.id,
        customerTransactionId: `payroll-${String(payroll._id)}`,
        details: { reference: `Payroll ${payroll.month}` },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!transferResponse.ok) throw new Error(`Wise transfer rejected (${transferResponse.status}).`);
    const transfer = await transferResponse.json() as { id?: number | string };
    if (!transfer.id) throw new Error('Wise did not return a transfer ID.');

    await WiseDisbursement.updateOne({ _id: disbursement._id }, { $set: { status: 'created', wiseTransferId: String(transfer.id) } });
    return NextResponse.json({ ok: true, transferId: String(transfer.id), status: 'created', funded: false }, { status: 201 });
  } catch (error) {
    console.error('Wise sandbox disbursement error:', error);
    await WiseDisbursement.updateOne({ payrollId: params.id, status: 'pending' }, { $set: { status: 'failed', errorCode: 'provider_error' } }).catch(() => undefined);
    return NextResponse.json({ error: 'Sandbox transfer could not be created. Check Wise sandbox credentials and recipient details.' }, { status: 502 });
  }
}

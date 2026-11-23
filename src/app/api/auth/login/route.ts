import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { createSession } from '@/lib/auth';

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
    await connectDB();
    const user = await User.findOne({ email: parsed.data.email.toLowerCase(), active: true }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    await createSession({ id: String(user._id), name: user.name, email: user.email, role: user.role, studentId: user.studentId?.toString(), childStudentId: user.childStudentId?.toString() });
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Check your connection and try again.' }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Attendance, SchoolClass, Student } from '@/lib/models';
import { getSession } from '@/lib/auth';

const schema = z.object({ classId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), records: z.array(z.object({ studentId: z.string().min(1), status: z.enum(['present','absent','late']) })).min(1).max(100) });
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !['admin','teacher'].includes(user.role)) return NextResponse.json({ error: 'You are not allowed to mark attendance.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Check the attendance details and try again.' }, { status: 400 });
  try {
    await connectDB();
    const classroom = await SchoolClass.findById(parsed.data.classId);
    if (!classroom || (user.role === 'teacher' && classroom.teacherId?.toString() !== user.id)) return NextResponse.json({ error: 'This class is not assigned to you.' }, { status: 403 });
    const studentIds = parsed.data.records.map(row => row.studentId);
    const validCount = await Student.countDocuments({ _id: { $in: studentIds }, classId: classroom._id, active: true });
    if (validCount !== studentIds.length) return NextResponse.json({ error: 'One or more students are not in this class.' }, { status: 400 });
    await Attendance.bulkWrite(parsed.data.records.map(row => ({ updateOne: { filter: { studentId: row.studentId, date: parsed.data.date }, update: { $set: { classId: classroom._id, status: row.status, markedBy: user.id } }, upsert: true } })));
    return NextResponse.json({ ok: true, count: parsed.data.records.length });
  } catch (error) { console.error('Attendance save error:', error); return NextResponse.json({ error: 'Unable to save attendance right now.' }, { status: 500 }); }
}

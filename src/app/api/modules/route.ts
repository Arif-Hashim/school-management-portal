import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Fee, Homework, Notice, Notification, Payroll, SchoolClass, Student, TimetableEntry, User } from '@/lib/phase2-models';
import { SchoolClass as ClassModel, Student as StudentModel, User as UserModel } from '@/lib/models';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const schemas = {
  fee: z.object({ studentId: id, title: z.string().trim().min(2).max(100), amount: z.number().positive().max(10000000), dueDate: z.string().datetime() }),
  payroll: z.object({ userId: id, month: z.string().regex(/^\d{4}-\d{2}$/), amount: z.number().positive().max(100000000) }),
  timetable: z.object({ classId: id, day: z.enum(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), subject: z.string().trim().min(2).max(80), room: z.string().max(40).optional() }),
  homework: z.object({ classId: id, title: z.string().trim().min(2).max(120), subject: z.string().trim().min(2).max(80), description: z.string().max(3000).optional(), dueDate: z.string().datetime() }),
  notice: z.object({ title: z.string().trim().min(2).max(120), message: z.string().trim().min(2).max(4000), audience: z.enum(['all','parents','students','teachers']) }),
};
const adminOnly = ['admin'];
const teaching = ['admin','teacher'];

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    await connectDB();
    const kind = new URL(request.url).searchParams.get('kind');
    const linkedStudent = user.role === 'student' ? user.studentId : user.role === 'parent' ? user.childStudentId : null;
    if (kind === 'fees') {
      if (user.role === 'admin') return NextResponse.json(await Fee.find().populate('studentId', 'name admissionNo').sort({ dueDate: -1 }).limit(300).lean());
      if (linkedStudent) return NextResponse.json(await Fee.find({ studentId: linkedStudent }).sort({ dueDate: -1 }).limit(100).lean());
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    }
    if (kind === 'payroll') {
      if (user.role === 'admin') return NextResponse.json(await Payroll.find().populate('userId', 'name email role').sort({ month: -1 }).limit(300).lean());
      if (user.role === 'teacher') return NextResponse.json(await Payroll.find({ userId: user.id }).sort({ month: -1 }).limit(100).lean());
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    }
    if (kind === 'timetable' || kind === 'homework') {
      let classIds: unknown[] | undefined;
      if (user.role === 'teacher') classIds = (await ClassModel.find({ teacherId: user.id }).select('_id').lean()).map(c => c._id);
      if (linkedStudent) {
        const student = await StudentModel.findById(linkedStudent).select('classId').lean();
        classIds = student ? [student.classId] : [];
      }
      if (!['admin','teacher','student','parent'].includes(user.role)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
      const filter = classIds ? { classId: { $in: classIds } } : {};
      const Model = kind === 'timetable' ? TimetableEntry : Homework;
      const rows = await Model.find(filter).populate('classId', 'name section').sort(kind === 'timetable' ? { day: 1, startTime: 1 } : { dueDate: 1 }).limit(300).lean();
      return NextResponse.json(rows);
    }
    if (kind === 'notices') {
      const audience = user.role === 'parent' ? 'parents' : user.role === 'student' ? 'students' : user.role === 'teacher' ? 'teachers' : '';
      return NextResponse.json(await Notice.find(audience ? { audience: { $in: ['all', audience] } } : {}).populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100).lean());
    }
    if (kind === 'notifications') return NextResponse.json(await Notification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(100).lean());
    if (kind === 'options') {
      if (user.role !== 'admin') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
      const [students, staff, classes] = await Promise.all([Student.find({ active: true }).select('name admissionNo').sort({ name: 1 }).lean(), UserModel.find({ role: { $in: ['teacher','admin'] }, active: true }).select('name email role').sort({ name: 1 }).lean(), ClassModel.find().select('name section').sort({ name: 1 }).lean()]);
      return NextResponse.json({ students, staff, classes });
    }
    return NextResponse.json({ error: 'Unknown module.' }, { status: 400 });
  } catch (error) { console.error('Phase 2 read error:', error); return NextResponse.json({ error: 'Unable to load records.' }, { status: 500 }); }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    const body = await request.json();
    const kind = body?.kind as keyof typeof schemas;
    if (kind === 'notification-read') {
      const parsed = id.safeParse(body.notificationId);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
      await connectDB();
      await Notification.updateOne({ _id: parsed.data, userId: user.id }, { $set: { readAt: new Date() } });
      return NextResponse.json({ ok: true });
    }
    if (!(kind in schemas)) return NextResponse.json({ error: 'Unknown module.' }, { status: 400 });
    if (kind === 'fee' && !adminOnly.includes(user.role)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    if (kind === 'payroll' && !adminOnly.includes(user.role)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    if (['timetable','homework'].includes(kind) && !teaching.includes(user.role)) return NextResponse.json({ error: 'Teacher or administrator access required.' }, { status: 403 });
    if (kind === 'notice' && !adminOnly.includes(user.role)) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    const parsed = schemas[kind].safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: 'Check the submitted fields and try again.' }, { status: 400 });
    await connectDB();
    const data = parsed.data;
    let record;
    if (kind === 'fee') {
      const payload = data as z.infer<typeof schemas.fee>;
      if (!await Student.findById(payload.studentId)) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
      record = await Fee.create({ ...payload, dueDate: new Date(payload.dueDate), createdBy: user.id });
    } else if (kind === 'payroll') {
      const payload = data as z.infer<typeof schemas.payroll>;
      const staff = await UserModel.findOne({ _id: payload.userId, role: { $in: ['admin','teacher'] }, active: true });
      if (!staff) return NextResponse.json({ error: 'Active staff member not found.' }, { status: 404 });
      record = await Payroll.findOneAndUpdate({ userId: payload.userId, month: payload.month }, { $set: { amount: payload.amount, createdBy: user.id } , $setOnInsert: { status: 'draft' } }, { upsert: true, new: true, runValidators: true });
    } else if (kind === 'timetable') {
      const payload = data as z.infer<typeof schemas.timetable>;
      const classroom = await ClassModel.findById(payload.classId);
      if (!classroom || (user.role === 'teacher' && classroom.teacherId?.toString() !== user.id)) return NextResponse.json({ error: 'This class is not assigned to you.' }, { status: 403 });
      if (payload.endTime <= payload.startTime) return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
      record = await TimetableEntry.create({ ...payload, teacherId: classroom.teacherId ?? user.id });
    } else if (kind === 'homework') {
      const payload = data as z.infer<typeof schemas.homework>;
      const classroom = await ClassModel.findById(payload.classId);
      if (!classroom || (user.role === 'teacher' && classroom.teacherId?.toString() !== user.id)) return NextResponse.json({ error: 'This class is not assigned to you.' }, { status: 403 });
      record = await Homework.create({ ...payload, dueDate: new Date(payload.dueDate), createdBy: user.id });
    } else {
      const payload = data as z.infer<typeof schemas.notice>;
      record = await Notice.create({ ...payload, createdBy: user.id });
      const recipients = await UserModel.find({ active: true, ...(payload.audience === 'all' ? {} : { role: payload.audience === 'parents' ? 'parent' : payload.audience === 'students' ? 'student' : 'teacher' }) }).select('_id').lean();
      if (recipients.length) await Notification.insertMany(recipients.map(recipient => ({ userId: recipient._id, title: payload.title, message: payload.message })));
    }
    return NextResponse.json({ ok: true, id: record?._id?.toString() }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'A record already exists for that user and month.' }, { status: 409 });
    console.error('Phase 2 write error:', error);
    return NextResponse.json({ error: 'Unable to save this record.' }, { status: 500 });
  }
}

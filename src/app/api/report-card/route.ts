import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Attendance, Mark, Student } from '@/lib/models';

export const runtime = 'nodejs';
export async function GET() {
  const user = await getSession();
  if (!user || !['admin','student','parent'].includes(user.role)) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const studentId = user.role === 'student' ? user.studentId : user.role === 'parent' ? user.childStudentId : undefined;
  if (!studentId) return NextResponse.json({ error: 'No linked student record.' }, { status: 404 });
  try {
    await connectDB();
    const student = await Student.findById(studentId).populate('classId', 'name section').lean();
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    const marks = await Mark.find({ studentId }).populate('examId', 'title subject maxMarks date').sort({ createdAt: -1 }).limit(100).lean();
    const attendance = await Attendance.find({ studentId }).sort({ date: -1 }).limit(100).lean();
    const doc = new PDFDocument({ size: 'A4', margin: 52, info: { Title: `Report card - ${student.name}`, Author: 'Northstar School' } });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)));
    const completed = new Promise<Buffer>((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
    doc.fontSize(22).fillColor('#1e3a8a').text('Northstar School', { align: 'center' });
    doc.moveDown(0.3).fontSize(16).fillColor('#0f172a').text('Student report card', { align: 'center' });
    doc.moveDown().fontSize(11).text(`Student: ${student.name}`).text(`Admission number: ${student.admissionNo}`).text(`Class: ${student.classId ? `${student.classId.name} ${student.classId.section ?? ''}` : '—'}`).text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown().fontSize(14).fillColor('#1e3a8a').text('Assessment results');
    doc.moveDown(0.4).fontSize(10).fillColor('#0f172a');
    if (!marks.length) doc.text('No assessment results have been recorded.');
    for (const mark of marks) { const exam = mark.examId as unknown as { title?: string; subject?: string; maxMarks?: number; date?: Date } | null; doc.text(`${exam?.title ?? 'Assessment'} | ${exam?.subject ?? ''} | ${mark.marks}/${exam?.maxMarks ?? 100} | ${mark.grade ?? 'Grade pending'}`); }
    doc.moveDown().fontSize(14).fillColor('#1e3a8a').text('Attendance summary');
    const present = attendance.filter(item => item.status === 'present').length;
    const total = attendance.length;
    doc.moveDown(0.4).fontSize(10).fillColor('#0f172a').text(`Recorded days: ${total}    Present: ${present}    Absent: ${attendance.filter(item => item.status === 'absent').length}    Late: ${attendance.filter(item => item.status === 'late').length}`);
    doc.text(`Attendance rate: ${total ? Math.round((present / total) * 100) : 0}%`);
    doc.moveDown(2).fontSize(9).fillColor('#64748b').text('This report reflects records available in the school portal at the time of generation.');
    doc.end();
    const pdf = await completed;
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-card-${student.admissionNo}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Report card generation error:', error); return NextResponse.json({ error: 'Unable to generate report card.' }, { status: 500 }); }
}

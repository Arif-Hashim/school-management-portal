import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attendance, Exam, Mark, SchoolClass, Student, User } from '@/lib/models';
import { PortalShell } from '@/components/portal-shell';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await requireUser();
  await connectDB();
  let classList: any[] = [];
  let students: any[] = [];
  let recentAttendance: any[] = [];
  let exams: any[] = [];
  let attendanceRate = 0;
  let studentRecord: any = null;
  try {
    if (user.role === 'admin') {
      classList = await SchoolClass.find().sort({ name: 1 }).lean();
      students = await Student.find({ active: true }).populate('classId').sort({ name: 1 }).lean();
      recentAttendance = await Attendance.find({ date: new Date().toISOString().slice(0,10) }).populate('studentId').lean();
      exams = await Exam.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(5).populate('classId').lean();
      const total = await Student.countDocuments({ active: true });
      const present = await Attendance.countDocuments({ date: new Date().toISOString().slice(0,10), status: 'present' });
      attendanceRate = total ? Math.round((present / total) * 100) : 0;
    } else if (user.role === 'teacher') {
      classList = await SchoolClass.find({ teacherId: user.id }).lean();
      const ids = classList.map(row => row._id);
      students = await Student.find({ classId: { $in: ids }, active: true }).populate('classId').lean();
      exams = await Exam.find({ classId: { $in: ids }, date: { $gte: new Date() } }).sort({ date: 1 }).limit(5).lean();
      recentAttendance = await Attendance.find({ classId: { $in: ids }, date: new Date().toISOString().slice(0,10) }).populate('studentId').lean();
    } else {
      const linkedId = user.role === 'student' ? user.studentId : user.childStudentId;
      studentRecord = linkedId ? await Student.findById(linkedId).populate('classId').lean() : null;
      if (studentRecord) {
        recentAttendance = await Attendance.find({ studentId: studentRecord._id }).sort({ date: -1 }).limit(10).lean();
        exams = await Exam.find({ classId: studentRecord.classId?._id, date: { $gte: new Date() } }).sort({ date: 1 }).limit(5).lean();
      }
    }
  } catch (error) { console.error('Dashboard data error:', error); }
  const stats = user.role === 'admin'
    ? [{ label: 'Enrolled students', value: students.length.toLocaleString(), detail: 'Active student records' }, { label: 'Classes', value: classList.length.toString(), detail: 'School-wide sections' }, { label: 'Today present', value: `${attendanceRate}%`, detail: 'Of enrolled students' }, { label: 'Teachers', value: (await User.countDocuments({ role: 'teacher', active: true })).toString(), detail: 'Active teaching staff' }]
    : user.role === 'teacher'
    ? [{ label: 'My classes', value: classList.length.toString(), detail: 'Assigned sections' }, { label: 'My students', value: students.length.toString(), detail: 'Across assigned classes' }, { label: 'Attendance marked', value: recentAttendance.length.toString(), detail: 'Records for today' }, { label: 'Upcoming exams', value: exams.length.toString(), detail: 'For your classes' }]
    : [{ label: 'Attendance records', value: recentAttendance.length.toString(), detail: 'Recent school days' }, { label: 'Upcoming exams', value: exams.length.toString(), detail: 'Your class schedule' }, { label: 'Class', value: studentRecord?.classId?.name ?? 'Not linked', detail: 'Current enrollment' }, { label: 'School updates', value: '—', detail: 'Coming soon' }];
  return <PortalShell user={user} stats={stats} classes={classList.map(c=>({id:String(c._id),name:`${c.name}${c.section ? ` · ${c.section}` : ''}`}))} students={students.map(s=>({id:String(s._id),name:s.name,admissionNo:s.admissionNo,className:s.classId?.name ?? ''}))} attendance={recentAttendance.map(a=>({name:a.studentId?.name ?? 'Student',date:a.date,status:a.status}))} exams={exams.map(e=>({title:e.title,subject:e.subject,date:new Date(e.date).toLocaleDateString()}))} studentName={studentRecord?.name ?? user.name} role={user.role} />;
}

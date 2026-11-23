import { requireUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { SchoolClass, Student, User } from '@/lib/models';
import { Payroll } from '@/lib/phase2-models';
import { ModulesWorkspace } from '@/components/modules-workspace';

export const dynamic = 'force-dynamic';
export default async function ModulesPage() {
  const user = await requireUser();
  await connectDB();
  const [classes, students, staff, ownPayroll] = await Promise.all([
    SchoolClass.find(user.role === 'teacher' ? { teacherId: user.id } : {}).select('name section').sort({ name: 1 }).lean(),
    user.role === 'admin' ? Student.find({ active: true }).select('name admissionNo').sort({ name: 1 }).lean() : Promise.resolve([]),
    user.role === 'admin' ? User.find({ role: { $in: ['admin','teacher'] }, active: true }).select('name email role').sort({ name: 1 }).lean() : Promise.resolve([]),
    user.role === 'teacher' ? Payroll.find({ userId: user.id }).sort({ month: -1 }).limit(100).lean() : Promise.resolve([]),
  ]);
  return <ModulesWorkspace role={user.role} userId={user.id} classes={classes.map(row => ({ id: String(row._id), name: `${row.name}${row.section ? ` · ${row.section}` : ''}` }))} students={students.map(row => ({ id: String(row._id), name: row.name, admissionNo: row.admissionNo }))} staff={staff.map(row => ({ id: String(row._id), name: row.name, email: row.email, role: row.role }))} initialPayroll={ownPayroll.map(row => ({ id: String(row._id), month: row.month, amount: row.amount, status: row.status }))} />;
}

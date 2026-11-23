import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { User, SchoolClass, Student, Exam } from '../src/lib/models';

async function seed() {
  await connectDB();
  await Promise.all([User.deleteMany({}), SchoolClass.deleteMany({}), Student.deleteMany({}), Exam.deleteMany({})]);
  const passwordHash = await bcrypt.hash('School123!', 12);
  const admin = await User.create({ name: 'Alex Morgan', email: 'admin@northstar.edu', passwordHash, role: 'admin' });
  const teacher = await User.create({ name: 'Jordan Lee', email: 'teacher@northstar.edu', passwordHash, role: 'teacher' });
  const classroom = await SchoolClass.create({ name: 'Grade 7', section: 'A', teacherId: teacher._id, subjects: ['Mathematics','Science','English'] });
  const student = await Student.create({ admissionNo: 'NS-2026-001', name: 'Taylor Morgan', classId: classroom._id, guardianName: 'Casey Morgan', guardianEmail: 'parent@northstar.edu' });
  await User.create({ name: 'Taylor Morgan', email: 'student@northstar.edu', passwordHash, role: 'student', studentId: student._id });
  await User.create({ name: 'Casey Morgan', email: 'parent@northstar.edu', passwordHash, role: 'parent', childStudentId: student._id });
  await Exam.create({ title: 'Term 1 Assessment', subject: 'Mathematics', classId: classroom._id, date: new Date(Date.now()+14*86400000), maxMarks: 100, syllabus: 'Units 1–4' });
  console.log(`Seeded demo school. Admin ${admin.email}; all demo passwords: School123!`);
  await mongoose.disconnect();
}
seed().catch(async error => { console.error(error); await mongoose.disconnect(); process.exit(1); });

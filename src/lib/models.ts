import mongoose, { Schema, models, model } from 'mongoose';

const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ['admin','teacher','student','parent'], required: true }, studentId: { type: Schema.Types.ObjectId, ref: 'Student' }, childStudentId: { type: Schema.Types.ObjectId, ref: 'Student' }, active: { type: Boolean, default: true } }, { timestamps: true });
const classSchema = new Schema({ name: { type: String, required: true }, section: { type: String, default: 'A' }, teacherId: { type: Schema.Types.ObjectId, ref: 'User' }, subjects: [String] }, { timestamps: true });
const studentSchema = new Schema({ admissionNo: { type: String, required: true, unique: true }, name: { type: String, required: true }, classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true }, guardianName: String, guardianEmail: String, active: { type: Boolean, default: true } }, { timestamps: true });
const attendanceSchema = new Schema({ studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true }, date: { type: String, required: true }, status: { type: String, enum: ['present','absent','late'], required: true }, markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
const examSchema = new Schema({ title: { type: String, required: true }, subject: { type: String, required: true }, classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true }, date: { type: Date, required: true }, maxMarks: { type: Number, default: 100 }, syllabus: String }, { timestamps: true });
const markSchema = new Schema({ examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true }, studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, marks: { type: Number, required: true }, grade: String, result: String, enteredBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });

export const User = models.User || model('User', userSchema);
export const SchoolClass = models.SchoolClass || model('SchoolClass', classSchema);
export const Student = models.Student || model('Student', studentSchema);
export const Attendance = models.Attendance || model('Attendance', attendanceSchema);
export const Exam = models.Exam || model('Exam', examSchema);
export const Mark = models.Mark || model('Mark', markSchema);
export type Role = 'admin' | 'teacher' | 'student' | 'parent';
export type SessionUser = { id: string; name: string; email: string; role: Role; studentId?: string; childStudentId?: string };

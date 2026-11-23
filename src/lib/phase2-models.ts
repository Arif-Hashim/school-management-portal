import { Schema, models, model } from 'mongoose';

const feeSchema = new Schema({ studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, title: { type: String, required: true }, amount: { type: Number, required: true, min: 0 }, dueDate: { type: Date, required: true }, status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }, paidAt: Date, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
feeSchema.index({ studentId: 1, dueDate: 1 });
const payrollSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, amount: { type: Number, required: true, min: 0 }, status: { type: String, enum: ['draft', 'paid'], default: 'draft' }, paidAt: Date, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
payrollSchema.index({ userId: 1, month: 1 }, { unique: true });
const timetableSchema = new Schema({ classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true }, day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true }, startTime: { type: String, required: true }, endTime: { type: String, required: true }, subject: { type: String, required: true }, room: String, teacherId: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
const homeworkSchema = new Schema({ classId: { type: Schema.Types.ObjectId, ref: 'SchoolClass', required: true }, title: { type: String, required: true }, subject: { type: String, required: true }, description: { type: String, default: '' }, dueDate: { type: Date, required: true }, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
const noticeSchema = new Schema({ title: { type: String, required: true }, message: { type: String, required: true }, audience: { type: String, enum: ['all', 'parents', 'students', 'teachers'], default: 'all' }, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
const notificationSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true }, message: { type: String, required: true }, readAt: Date }, { timestamps: true });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Fee = models.Fee || model('Fee', feeSchema);
export const Payroll = models.Payroll || model('Payroll', payrollSchema);
export const TimetableEntry = models.TimetableEntry || model('TimetableEntry', timetableSchema);
export const Homework = models.Homework || model('Homework', homeworkSchema);
export const Notice = models.Notice || model('Notice', noticeSchema);
export const Notification = models.Notification || model('Notification', notificationSchema);

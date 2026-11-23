import { Schema, model, models } from 'mongoose';

const consentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: { type: String, default: '' },
  emailOptIn: { type: Boolean, default: false },
  whatsappOptIn: { type: Boolean, default: false },
  consentedAt: Date,
}, { timestamps: true });

const disbursementSchema = new Schema({
  payrollId: { type: Schema.Types.ObjectId, ref: 'Payroll', required: true, unique: true },
  wiseTransferId: String,
  status: { type: String, enum: ['pending', 'created', 'failed'], default: 'pending' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  errorCode: String,
}, { timestamps: true });

disbursementSchema.index({ status: 1, createdAt: -1 });

export const CommunicationConsent = models.CommunicationConsent || model('CommunicationConsent', consentSchema);
export const WiseDisbursement = models.WiseDisbursement || model('WiseDisbursement', disbursementSchema);

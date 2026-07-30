import { Document, model, Schema } from 'mongoose'

export interface IUser extends Document {
  userId: string
  email: string
  name: string
  projectedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    projectedAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: true }
)

UserSchema.index({ userId: 1 }, { unique: true })

export const UserView = model<IUser>('UserView', UserSchema)

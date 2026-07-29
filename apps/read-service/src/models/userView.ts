import { Document, model, Schema } from 'mongoose'

export interface IUser extends Document {
  userId: string
  email: string
  name: string
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { versionKey: false, _id: false }
)

export const UserView = model<IUser>('UserView', UserSchema)

import { Schema, model } from 'mongoose';

interface IWeight {
    userId: number;
    weight: number;
    date: Date;
}

const weightSchema = new Schema<IWeight>({
    userId: { type: Number, required: true },
    weight: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

export const Weight = model<IWeight>('Weight', weightSchema);
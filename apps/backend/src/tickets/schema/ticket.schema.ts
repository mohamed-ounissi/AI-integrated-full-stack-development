import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, unique: true })
  id: number;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  vehicleVin: string;

  @Prop({ required: true })
  issue: string;

  @Prop({ required: true, enum: ['open', 'in_progress', 'resolved'] })
  status: string;

  @Prop({ required: true })
  assignedTo: string;

  @Prop({ required: true })
  createdAt: string;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

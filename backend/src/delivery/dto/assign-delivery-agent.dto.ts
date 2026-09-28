import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDeliveryAgentDto {
  @IsString()
  @IsNotEmpty()
  deliveryAgentId!: string;
}

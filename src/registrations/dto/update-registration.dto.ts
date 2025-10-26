import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class UpdateRegistrationDto {
  @ApiProperty({
    enum: RegistrationStatus,
    example: RegistrationStatus.CONFIRMED,
  })
  @IsEnum(RegistrationStatus)
  @IsNotEmpty()
  status: RegistrationStatus;
}

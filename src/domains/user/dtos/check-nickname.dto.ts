import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CheckNicknameDto {
  @ApiProperty({
    description: '닉네임',
    default: '김수정',
  })
  @IsString()
  @MaxLength(32)
  nickname: string;
}

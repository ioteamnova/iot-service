import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SwaggerTag } from 'src/core/swagger/api-tags';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import { User } from './entities/user.entity';
import { AuthService } from '../auth/auth.service';
import UseAuthGuards from '../auth/auth-guards/use-auth';
import AuthUser from 'src/core/decorators/auth-user.decorator';
import HttpResponse from 'src/core/http/http-response';
import DeleteUserDto from './dtos/delete-user.dto';
import { CheckNicknameDto } from './dtos/check-nickname.dto';
import { UpdatePasswordDto } from './dtos/update-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags(SwaggerTag.USER)
@Controller('/users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private authService: AuthService,
  ) {}

  @ApiOperation({
    summary: '회원가입',
    description: '회원가입은 유저를 생성하는 것이므로 POST 응답인 201 리턴함.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: '유저를 생성한다.' })
  // todo: ErrorResponse
  @Post()
  async createUser(@Res() res, @Body() dto: CreateUserDto) {
    const user = await this.userService.createUser(dto);
    return HttpResponse.created(res, { body: { idx: user.idx } });
    // return res.status(201).send(user);
  }

  @ApiOperation({
    summary: '가입 인증 이메일 전송',
    description: '회원가입시 이메일 인증을 한다.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiCreatedResponse({ description: '이메일 인증' })
  @Post('/email-verify')
  async verifyEmail(@Res() res, @Body() dto: VerifyEmailDto) {
    const signupVerifyToken = await this.userService.sendMemberJoinEmail(
      dto.email,
    );
    console.log('signupVerifyToken:::', signupVerifyToken);
    return HttpResponse.ok(res, signupVerifyToken);
    // return res.status(201).send(signupVerifyToken);
  }

  @ApiOperation({
    summary: '회원 정보 조회',
    description: '현재 로그인 중인 회원의 정보를 조회한다.',
  })
  @UseAuthGuards()
  @Get('/me')
  async getUserInfo(@Res() res, @AuthUser() user: User) {
    const userInfo = await this.userService.getUserInfo(user.idx);
    return HttpResponse.ok(res, userInfo);
    // return res.status(200).send(userInfo);
  }

  @ApiOperation({
    summary: '회원 정보 수정',
    description: '현재 로그인 중인 회원의 정보를 수정한다.',
  })
  @UseAuthGuards()
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({ type: UpdateUserDto })
  @Patch()
  async update(
    @Res() res,
    @Body() dto: UpdateUserDto,
    @AuthUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userInfo = await this.userService.update(file, dto, user.idx);
    return HttpResponse.ok(res, userInfo);
  }

  // @Patch('upload')
  // @UseAuthGuards()
  // @UseInterceptors(FileInterceptor('file'))
  // async upload(
  //   @Res() res,
  //   @Body() dto: UpdateUserDto,
  //   @AuthUser() user: User,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   const result = await this.userService.upload(file, dto, user.idx);
  //   return HttpResponse.ok(res, result);
  // }

  @ApiOperation({
    summary: '닉네임 중복 확인',
    description: '회원 정보 수정 화면에서 닉네임 중복 확인을한다.',
  })
  @UseAuthGuards()
  @ApiBody({ type: CheckNicknameDto })
  @Patch('/nickname')
  async existNickname(@Res() res, @Body() dto: CheckNicknameDto) {
    const isExist = await this.userService.checkExistNickname(dto.nickname);
    return HttpResponse.ok(res, isExist);
  }

  @ApiOperation({
    summary: '비밀번호 수정',
    description: '현재 비밀번호 입력 후 비밀번호를 변경한다.',
  })
  @UseAuthGuards()
  @ApiBody({ type: UpdatePasswordDto })
  @Patch('/password')
  async updatePassword(
    @Res() res,
    @Body() dto: UpdatePasswordDto,
    @AuthUser() user: User,
  ) {
    const result = await this.userService.updatePassword(user.idx, dto);
    return HttpResponse.ok(res);
  }

  @ApiOperation({
    summary: '회원 탈퇴',
    description: '비밀번호를 입력하여 회원 탈퇴한다. ',
  })
  @UseAuthGuards()
  @ApiBody({ type: DeleteUserDto })
  @Delete()
  async remove(@Res() res, @Body() dto: DeleteUserDto, @AuthUser() user: User) {
    await this.userService.removeByPassword(dto, user.idx);
    return HttpResponse.ok(res);
  }
}

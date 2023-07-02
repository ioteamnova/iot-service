import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCreatedResponseTemplate } from 'src/core/swagger/api-created-response';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/api-error-common-response';
import { SwaggerTag } from 'src/core/swagger/swagger-tags';
import UseAuthGuards from '../auth/auth-guards/use-auth';
import AuthUser from 'src/core/decorators/auth-user.decorator';
import { User } from 'src/domains/user/entities/user.entity';
import HttpResponse from 'src/core/http/http-response';
import { BoardService } from './board.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiErrorResponseTemplate } from 'src/core/swagger/apt-error-response';
import { StatusCodes } from 'http-status-codes';
import { HttpErrorConstants } from 'src/core/http/http-error-objects';
import { ApiOkPaginationResponseTemplate } from 'src/core/swagger/api-ok-pagination-response';
import { BoardListDto } from './dtos/board-list.dto';
import { PageRequest } from 'src/core/page';
import { ApiOkResponseTemplate } from 'src/core/swagger/api-ok-response';
import { BoardDetailDto } from './dtos/board-detail-dto';
import { UpdateBoardDto } from './dtos/update-board.dto';
import { CommentDto, ReplyDto } from './dtos/board-comment.dto';
import { createBoardDto } from './dtos/create-board.dto';
import Boardcomment from './entities/board-comment.entity';
import { S3 } from 'aws-sdk'; // 필요한 경우 aws-sdk를 임포트합니다.
import * as fs from 'fs-extra'; // Import fs-extra instead of fs
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';

@ApiTags(SwaggerTag.BOARD)
@ApiCommonErrorResponseTemplate()
@Controller('/board')
export class Boardcontroller {
  constructor(private readonly boardService: BoardService) {}

  @ApiOperation({
    summary: '게시판 등록',
    description: '각 게시판 별로 등록한다.',
  })
  @ApiCreatedResponseTemplate({ type: createBoardDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @ApiBody({ type: createBoardDto })
  @UseAuthGuards()
  @Post('/')
  async createBoard(
    @Res() res,
    @Body() dto: createBoardDto,
    @AuthUser() user: User,
  ) {
    const result = await this.boardService.createBoard(dto, user.idx);
    return HttpResponse.created(res, { body: result });
  }
  @ApiOperation({
    summary: '게시판 조회',
    description: '게시판 카테고리에 따라 최신 정보를 조회합니다.',
  })
  @ApiOkPaginationResponseTemplate({ type: BoardListDto })
  @Get('')
  async getBoard(
    @Res() res,
    @Query() pageRequest: PageRequest,
    @Query('category') category: string,
  ) {
    const boards = await this.boardService.findAllBoard(pageRequest, category);
    return HttpResponse.ok(res, boards);
  }
  @ApiOperation({
    summary: '게시판 상세조회',
    description: '게시판을 상세 조회 기능입니다.',
  })
  @ApiOkResponseTemplate({ type: BoardDetailDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [
        HttpErrorConstants.CANNOT_FIND_PET,
        HttpErrorConstants.CANNOT_FIND_DIARY,
      ],
    },
  ])
  @UseAuthGuards()
  @Get('/:boardIdx')
  async findBoard(@Res() res, @Param('boardIdx') boardIdx: number) {
    const board = await this.boardService.findBoard(boardIdx);
    return HttpResponse.ok(res, board);
  }
  @ApiOperation({
    summary: '게시글 삭제',
    description: '게시글을 삭제한다.',
  })
  @ApiOkResponseTemplate()
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_BOARD],
    },
  ])
  @UseAuthGuards()
  @Delete('/:boardIdx')
  async removeBoard(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @AuthUser() user: User,
  ) {
    await this.boardService.removeBoard(boardIdx, user.idx);
    return HttpResponse.ok(res);
  }
  @ApiOperation({
    summary: '게시글 수정',
    description: '게시글을 수정한다.',
  })
  @ApiOkResponseTemplate({ type: BoardDetailDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_BOARD],
    },
  ])
  @UseAuthGuards()
  @Patch('/:boardIdx')
  async updateBoard(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @AuthUser() user: User,
    @Body() dto: UpdateBoardDto,
  ) {
    const board = await this.boardService.updateBoard(boardIdx, dto, user);
    return HttpResponse.ok(res, board);
  }
  @ApiOperation({
    summary: '댓글 등록',
    description: '댓글을 등록한다.',
  })
  @ApiCreatedResponseTemplate({ type: CommentDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @ApiBody({ type: CommentDto })
  @UseInterceptors(FileInterceptor('file'))
  @UseAuthGuards()
  @Post('/:boardIdx/comment')
  async createcomment(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @Body() dto: CommentDto,
    @AuthUser() user: User,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const result = await this.boardService.createComment(dto, user.idx, file);
    return HttpResponse.created(res, { body: result });
  }
  @UseAuthGuards()
  @Delete('/comment/:commentIdx')
  async removecomment(
    @Res() res,
    @Query('boardIdx') boardIdx: number,
    @Param('commentIdx') commentIdx: number,
    @AuthUser() user: User,
  ) {
    const result = await this.boardService.removeComment(
      commentIdx,
      boardIdx,
      user.idx,
    );
    return HttpResponse.ok(res, { body: result });
  }
  @ApiOperation({
    summary: '댓글 조회',
    description: '게시글에 달린 댓글 정보를 최신순에 최대 20개씩 조회합니다.',
  })
  @ApiOkPaginationResponseTemplate({ type: Boardcomment })
  @Get('/:boardIdx/comment')
  async getcomment(
    @Res() res,
    @Query() pageRequest: PageRequest,
    @Param('boardIdx') boardIdx: number,
  ) {
    const comments = await this.boardService.findBoardComment(
      pageRequest,
      boardIdx,
    );
    return HttpResponse.ok(res, comments);
  }
  @ApiOperation({
    summary: '댓글 수정',
    description: '댓글을 수정한다.',
  })
  @ApiCreatedResponseTemplate({ type: CommentDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @ApiBody({ type: CommentDto })
  @UseAuthGuards()
  @UseInterceptors(FileInterceptor('file'))
  @Patch('/comment/:commentIdx')
  async updatecomment(
    @Res() res,
    @Param('commentIdx') commentIdx: number,
    @AuthUser() user: User,
    @Body() dto: CommentDto,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const result = await this.boardService.updateComment(
      dto,
      commentIdx,
      user.idx,
      file,
    );
    return HttpResponse.created(res, { body: result });
  }
  @ApiOperation({
    summary: '대댓글 등록',
    description: '대댓글을 등록한다.',
  })
  @ApiCreatedResponseTemplate({ type: ReplyDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @ApiBody({ type: ReplyDto })
  @UseInterceptors(FileInterceptor('file'))
  @UseAuthGuards()
  @Post('/:boardIdx/reply')
  async createReply(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @Body() dto: ReplyDto,
    @AuthUser() user: User,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const result = await this.boardService.createReply(dto, user.idx, file);
    return HttpResponse.created(res, { body: result });
  }
  @UseAuthGuards()
  @Delete('/reply/:replyIdx')
  async removeReply(
    @Res() res,
    @Query('boardIdx') boardIdx: number,
    @Param('replyIdx') replyIdx: number,
    @AuthUser() user: User,
  ) {
    const result = await this.boardService.removeReply(
      replyIdx,
      boardIdx,
      user.idx,
    );
    return HttpResponse.ok(res, { body: result });
  }
  @ApiOperation({
    summary: '대댓글 수정',
    description: '대댓글을 수정한다.',
  })
  @ApiCreatedResponseTemplate({ type: CommentDto })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @ApiBody({ type: CommentDto })
  @UseAuthGuards()
  @UseInterceptors(FileInterceptor('file'))
  @Patch('/reply/:replyIdx')
  async updateReply(
    @Res() res,
    @Param('replyIdx') replyIdx: number,
    @AuthUser() user: User,
    @Body() dto: ReplyDto,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const result = await this.boardService.updateReply(
      dto,
      replyIdx,
      user.idx,
      file,
    );
    return HttpResponse.created(res, { body: result });
  }
  @ApiOperation({
    summary: '대댓글 조회',
    description: '댓글에 달린 대댓글 정보를 최신순에 최대 8개씩 조회합니다.',
  })
  @ApiOkPaginationResponseTemplate({ type: Boardcomment })
  @Get('/:commentIdx/reply')
  async getReply(
    @Res() res,
    @Query() pageRequest: PageRequest,
    @Param('commentIdx') commentIdx: number,
  ) {
    const replys = await this.boardService.findBoardReply(
      pageRequest,
      commentIdx,
    );
    return HttpResponse.ok(res, replys);
  }
  @ApiOperation({
    summary: '게시글 북마크 등록 등록',
    description: '게시글에 대한 북마크를 합니다.',
  })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.CANNOT_FIND_USER],
    },
  ])
  @UseAuthGuards()
  @Post('/:boardIdx/Bookmark')
  async boardBookmark(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @AuthUser() user: User,
  ) {
    const result = await this.boardService.RegisterBoardBookmark(
      boardIdx,
      user.idx,
    );
    return HttpResponse.created(res, { body: result });
  }
  @ApiOperation({
    summary: '북마크 취소',
    description: '게시글에 대한 북마크를 취소합니다.',
  })
  @ApiErrorResponseTemplate([
    {
      status: StatusCodes.NOT_FOUND,
      errorFormatList: [HttpErrorConstants.BOOKMAEK_NOT_EXIST],
    },
  ])
  @UseAuthGuards()
  @Delete('/:boardIdx/Bookmark')
  async updateBookmark(
    @Res() res,
    @Param('boardIdx') boardIdx: number,
    @AuthUser() user: User,
  ) {
    const board = await this.boardService.boardBookmarkRemove(
      boardIdx,
      user.idx,
    );
    return HttpResponse.ok(res, board);
  }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(@UploadedFile() videoFile: Express.Multer.File) {
    try {
      const videoBuffer = videoFile.buffer; //비디오 파일 버퍼
      const videoFileName = videoFile.originalname;
      const outputDir = '/Users/munjunho/Desktop/video'; //비디오 저장 폴더 경로
      const videoFolder = `${outputDir}/${videoFileName.replace(
        /\.[^/.]+$/,
        '',
      )}`; //비디오가 저장될 폴더
      const videoBaseName = path.basename(
        videoFileName,
        path.extname(videoFileName),
      );
      const videoPath = `${videoFolder}/${videoFileName}`;
      const outputPath = `${videoFolder}/${videoBaseName}.m3u8`;
      //1. 영상 저장할 폴더 생성
      await fs.mkdirSync(videoFolder);
      //2. 원본 영상 저장
      await fs.promises.writeFile(videoPath, videoBuffer);

      //3. .m3u8 파일 변환
      const executeFfmpeg = promisify(exec);

      await executeFfmpeg(
        `ffmpeg -i ${videoPath} -hls_time 10 -hls_list_size 0 ${outputPath}`,
      );

      const s3 = new S3({
        accessKeyId: process.env.AWS_ACECSS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_BUCKET_REGION,
      });
      const bucket = process.env.AWS_BUCKET_NAME;
      const files = fs.readdirSync(videoFolder);
      //4. s3에 저장
      for (const fileName of files) {
        if (path.extname(fileName) === '.mp4') {
          continue; // Skip uploading MP4 files
        }
        const filePath = path.join(videoFolder, fileName);
        const fileStream = fs.createReadStream(filePath);
        const uploadParams = {
          Bucket: bucket,
          Key: `test/${fileName}`,
          Body: fileStream,
        };
        await s3.upload(uploadParams).promise();
      }

      return { message: 'Video uploaded and converted successfully' };
    } catch (err) {
      console.error('Error during video upload:', err);
      throw err;
    }
  }
}

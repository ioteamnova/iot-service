import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCommonErrorResponseTemplate } from 'src/core/swagger/api-error-common-response';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCreatedResponseTemplate } from './../../core/swagger/api-created-response';
import { LiveStreamService } from './live_stream.service';
import { SwaggerTag } from 'src/core/swagger/swagger-tags';
import { StreamKeyDto } from './dtos/steam-key.dto';
import HttpResponse from 'src/core/http/http-response';

@ApiTags(SwaggerTag.LIVE)
@ApiCommonErrorResponseTemplate()
@Controller('livestream')
export class LiveStreamController {
  constructor(private liveStreamService: LiveStreamService) {}

  @ApiOperation({
    summary: '라이브 스트리밍 시작 전 경매방에 스트림키가 존재하는지 체크',
    description: `스트림 키가 경매 방에 있는 키일 경우에 송신을 허락한다.`,
  })
  @ApiBody({
    type: StreamKeyDto,
  })
  @ApiCreatedResponseTemplate()
  @Post('/live_start')
  async authLiveStreaming(@Res() res, @Body() dto: StreamKeyDto) {
    console.log('live_start');
    // console.log(res);
    // console.log(dto);
    console.log(dto.name);
    // const result = true;
    const result = await this.liveStreamService.createLiveStreamInfo(dto);
    return HttpResponse.created(res, { body: result });
  }

  @ApiOperation({
    summary: '라이브 스트리밍 종료',
    description: `라이브 종료 시간을 수정`,
  })
  @ApiBody({
    type: StreamKeyDto,
  })
  @ApiCreatedResponseTemplate()
  @Post('/live_end')
  async endLiveStreaming(@Res() res, @Body() dto: StreamKeyDto) {
    console.log('liveEnd');
    console.log(res);
    console.log(dto);
    console.log(dto.name);
    // const result = true;
    const result = await this.liveStreamService.modifyLiveStreamInfo(dto);
    return HttpResponse.created(res, { body: result });
  }
}

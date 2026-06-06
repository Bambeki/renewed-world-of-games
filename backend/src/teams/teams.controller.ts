import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('my-team')
  @UseGuards(JwtAuthGuard)
  getMyTeam(
    @Req() req: Request & { user: { userId: string; email: string } },
  ) {
    return this.teamsService.getMyTeam(req.user.userId);
  }

  @Patch('my-team')
  @UseGuards(JwtAuthGuard)
  updateMyTeam(
    @Req() req: Request & { user: { userId: string; email: string } },
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.updateMyTeam(req.user.userId, dto);
  }
}

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyPlayers(
    @Req() req: Request & { user: { userId: string; email: string } },
  ) {
    return this.playersService.getMyPlayers(req.user.userId);
  }
}

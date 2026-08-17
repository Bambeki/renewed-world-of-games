import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayersService } from './players.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
  };
};

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  getMyPlayers(@Req() req: AuthenticatedRequest) {
    return this.playersService.getMyPlayers(req.user.userId);
  }

  @Get(':id')
  getMyPlayer(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.playersService.getMyPlayer(req.user.userId, id);
  }
}

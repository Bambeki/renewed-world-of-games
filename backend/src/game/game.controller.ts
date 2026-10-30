import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GameService } from "./game.service";
import { LineupDto, RevisionDto, TransferDto } from "./game.dto";
type AuthRequest = { user: { userId: string } };
@Controller("game")
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly game: GameService) {}
  @Get() view(@Req() req: AuthRequest) {
    return this.game.execute(req.user.userId);
  }
  @Put("lineup") lineup(@Req() req: AuthRequest, @Body() dto: LineupDto) {
    return this.game.execute(req.user.userId, "lineup", dto.revision, dto);
  }
  @Post("play") play(@Req() req: AuthRequest, @Body() dto: RevisionDto) {
    return this.game.execute(req.user.userId, "play", dto.revision);
  }
  @Post("buy") buy(@Req() req: AuthRequest, @Body() dto: TransferDto) {
    return this.game.execute(req.user.userId, "buy", dto.revision, dto);
  }
  @Post("sell") sell(@Req() req: AuthRequest, @Body() dto: TransferDto) {
    return this.game.execute(req.user.userId, "sell", dto.revision, dto);
  }
}

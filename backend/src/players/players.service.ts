import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const playerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  age: true,
  nationality: true,
  position: true,
  pace: true,
  shooting: true,
  passing: true,
  defending: true,
  physical: true,
  overall: true,
  fitness: true,
  morale: true,
  salary: true,
  contractUntil: true,
  isStarter: true,
  createdAt: true,
} as const;

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyPlayers(userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.player.findMany({
      where: { teamId: team.id },
      select: playerSelect,
      orderBy: { overall: 'desc' },
    });
  }

  async getMyPlayer(userId: string, playerId: string) {
    if (!UUID_PATTERN.test(playerId)) {
      throw new NotFoundException('Player not found');
    }

    const player = await this.prisma.player.findFirst({
      where: {
        id: playerId,
        team: {
          ownerId: userId,
        },
      },
      select: playerSelect,
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }
}

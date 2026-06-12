import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const playerListSelect = {
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
      select: playerListSelect,
      orderBy: { overall: 'desc' },
    });
  }
}

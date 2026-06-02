import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyTeam(userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        shortName: true,
        budget: true,
        createdAt: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }
}

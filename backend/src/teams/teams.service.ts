import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateTeamDto } from './dto/update-team.dto';

const teamResponseSelect = {
  id: true,
  name: true,
  shortName: true,
  primaryColor: true,
  secondaryColor: true,
  budget: true,
  createdAt: true,
} as const;

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

  async updateMyTeam(userId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.team.update({
      where: { ownerId: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName }),
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && {
          secondaryColor: dto.secondaryColor,
        }),
      },
      select: teamResponseSelect,
    });
  }
}

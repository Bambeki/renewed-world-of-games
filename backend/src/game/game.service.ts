import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Season } from "@rwog/shared";
import { PrismaService } from "../database/prisma.service";
import { newSeason, playRound, standings, validLineup } from "./engine";
import { LineupDto, TransferDto } from "./game.dto";

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}
  async execute(
    userId: string,
    action = "view",
    revision?: number,
    dto?: LineupDto | TransferDto,
  ) {
    // Existing seasons are read from a consistent snapshot without a write lock.
    if (action === "view") {
      const view = await this.prisma.$transaction(
        async (tx) => {
          const team = await tx.team.findUnique({
            where: { ownerId: userId },
            include: { players: true, gameState: true },
          });
          if (!team) throw new NotFoundException("Team not found");
          if (!team.gameState) return null;
          const season = team.gameState.payload as unknown as Season;
          season.clubs[0].name = team.name;
          return {
            team: {
              id: team.id,
              name: team.name,
              shortName: team.shortName,
              budget: team.budget,
            },
            players: team.players,
            season,
            standings: standings(season),
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      if (view) return view;
    }
    return this.prisma.$transaction(async (tx) => {
      // Serializes all game mutations, including initial creation, across API instances.
      await tx.$queryRaw`SELECT id FROM teams WHERE owner_id = ${userId}::uuid FOR UPDATE`;
      let team = await tx.team.findUnique({
        where: { ownerId: userId },
        include: { players: true, gameState: true },
      });
      if (!team) throw new NotFoundException("Team not found");
      const season = team.gameState
        ? (team.gameState.payload as unknown as Season)
        : newSeason(team, team.players);
      if (action !== "view" && season.revision !== revision)
        throw new ConflictException(
          "Your club changed. Refresh and try again.",
        );
      season.clubs[0].name = team.name;
      if (action === "lineup") {
        const lineup = dto as LineupDto;
        if (!validLineup(team.players, lineup.playerIds, lineup.formation))
          throw new BadRequestException(
            "Choose exactly 11 owned players matching the formation, including one goalkeeper.",
          );
        season.formation = lineup.formation;
        season.lineup = lineup.playerIds;
        await tx.player.updateMany({
          where: { teamId: team.id },
          data: { isStarter: false },
        });
        await tx.player.updateMany({
          where: { teamId: team.id, id: { in: season.lineup } },
          data: { isStarter: true },
        });
      }
      if (action === "play") {
        try {
          playRound(season, team.id, team.players);
        } catch (e) {
          throw new BadRequestException((e as Error).message);
        }
      }
      if (action === "buy") {
        const target = season.market.find(
          (p) => p.id === (dto as TransferDto).playerId,
        );
        if (!target)
          throw new BadRequestException("Player is no longer available.");
        if (team.budget < target.price)
          throw new BadRequestException("Insufficient transfer budget.");
        if (team.players.length >= 25)
          throw new BadRequestException("Squad limit is 25 players.");
        const { price, ...player } = target;
        await tx.player.create({
          data: {
            ...player,
            position: player.position as "GK" | "DEF" | "MID" | "FWD",
            teamId: team.id,
            pace: player.overall,
            shooting: player.overall,
            passing: player.overall,
            defending: player.overall,
            physical: player.overall,
            salary: 10000,
          },
        });
        await tx.team.update({
          where: { id: team.id },
          data: { budget: { decrement: price } },
        });
        season.market = season.market.filter((p) => p.id !== target.id);
        season.transfers.unshift(
          `Signed ${target.firstName} ${target.lastName} for €${price.toLocaleString("en-US")}`,
        );
      }
      if (action === "sell") {
        const player = team.players.find(
          (p) => p.id === (dto as TransferDto).playerId,
        );
        if (!player) throw new NotFoundException("Player not found");
        if (season.lineup.includes(player.id))
          throw new BadRequestException(
            "Remove this player from your starting XI first.",
          );
        const minimum = { GK: 1, DEF: 4, MID: 5, FWD: 3 };
        if (
          team.players.filter((p) => p.position === player.position).length <=
          minimum[player.position]
        )
          throw new BadRequestException(
            "Keep enough players to use every available formation.",
          );
        const price = player.overall * 2000;
        await tx.player.update({
          where: { id: player.id },
          data: { teamId: null, isStarter: false },
        });
        await tx.team.update({
          where: { id: team.id },
          data: { budget: { increment: price } },
        });
        season.transfers.unshift(
          `Sold ${player.firstName} ${player.lastName} for €${price.toLocaleString("en-US")}`,
        );
      }
      if (!team.gameState) {
        await tx.player.updateMany({
          where: { teamId: team.id },
          data: { isStarter: false },
        });
        await tx.player.updateMany({
          where: { teamId: team.id, id: { in: season.lineup } },
          data: { isStarter: true },
        });
      }
      if (action !== "view") season.revision++;
      await tx.gameState.upsert({
        where: { teamId: team.id },
        create: {
          teamId: team.id,
          payload: season as unknown as Prisma.InputJsonValue,
        },
        update: { payload: season as unknown as Prisma.InputJsonValue },
      });
      team = await tx.team.findUniqueOrThrow({
        where: { id: team.id },
        include: { players: true, gameState: true },
      });
      return {
        team: {
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          budget: team.budget,
        },
        players: team.players,
        season,
        standings: standings(season),
      };
    });
  }
}

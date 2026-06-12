import { PlayerPosition, Prisma } from '@prisma/client';

const MIN_STAT = 50;
const MAX_STAT = 85;
const MIN_AGE = 18;
const MAX_AGE = 34;
const MIN_SALARY = 5000;
const MAX_SALARY = 30000;

const SQUAD_COMPOSITION: PlayerPosition[] = [
  PlayerPosition.GK,
  PlayerPosition.GK,
  PlayerPosition.DEF,
  PlayerPosition.DEF,
  PlayerPosition.DEF,
  PlayerPosition.DEF,
  PlayerPosition.DEF,
  PlayerPosition.DEF,
  PlayerPosition.MID,
  PlayerPosition.MID,
  PlayerPosition.MID,
  PlayerPosition.MID,
  PlayerPosition.MID,
  PlayerPosition.MID,
  PlayerPosition.FWD,
  PlayerPosition.FWD,
  PlayerPosition.FWD,
  PlayerPosition.FWD,
];

const FIRST_NAMES = [
  'James',
  'Lucas',
  'Marco',
  'Diego',
  'Ahmed',
  'Yuki',
  'Oliver',
  'Noah',
  'Ethan',
  'Mateo',
  'Liam',
  'Carlos',
  'Andre',
  'Victor',
  'Hassan',
  'Kenji',
  'Leo',
  'Samuel',
  'Bruno',
  'Felix',
];

const LAST_NAMES = [
  'Silva',
  'Garcia',
  'Smith',
  'Muller',
  'Rossi',
  'Kim',
  'Brown',
  'Martinez',
  'Johnson',
  'Santos',
  'Patel',
  'Nguyen',
  'Cohen',
  'Dubois',
  'Hansen',
  'Ali',
  'Costa',
  'Wilson',
  'Lopez',
  'Taylor',
];

const NATIONALITIES = [
  'England',
  'Spain',
  'Brazil',
  'Germany',
  'Italy',
  'France',
  'Argentina',
  'Portugal',
  'Netherlands',
  'Japan',
  'USA',
  'Mexico',
  'Nigeria',
  'South Korea',
  'Morocco',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function generateStats() {
  const pace = randomInt(MIN_STAT, MAX_STAT);
  const shooting = randomInt(MIN_STAT, MAX_STAT);
  const passing = randomInt(MIN_STAT, MAX_STAT);
  const defending = randomInt(MIN_STAT, MAX_STAT);
  const physical = randomInt(MIN_STAT, MAX_STAT);
  const overall = Math.round(
    (pace + shooting + passing + defending + physical) / 5,
  );

  return { pace, shooting, passing, defending, physical, overall };
}

function buildPlayer(
  teamId: string,
  position: PlayerPosition,
): Prisma.PlayerCreateManyInput {
  const stats = generateStats();

  return {
    teamId,
    firstName: randomItem(FIRST_NAMES),
    lastName: randomItem(LAST_NAMES),
    age: randomInt(MIN_AGE, MAX_AGE),
    nationality: randomItem(NATIONALITIES),
    position,
    pace: stats.pace,
    shooting: stats.shooting,
    passing: stats.passing,
    defending: stats.defending,
    physical: stats.physical,
    overall: stats.overall,
    fitness: 100,
    morale: 75,
    salary: randomInt(MIN_SALARY, MAX_SALARY),
    contractUntil: null,
    isStarter: false,
  };
}

/** Builds 18 starter squad players (2 GK, 6 DEF, 6 MID, 4 FWD) for a team. */
export function generateStarterSquad(
  teamId: string,
): Prisma.PlayerCreateManyInput[] {
  return SQUAD_COMPOSITION.map((position) => buildPlayer(teamId, position));
}

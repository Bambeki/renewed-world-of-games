export const formations = {
  "4-4-2": [1, 4, 4, 2],
  "4-3-3": [1, 4, 3, 3],
  "3-5-2": [1, 3, 5, 2],
} as const;
export type Formation = keyof typeof formations;
export interface GamePlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  overall: number;
  age: number;
}
export interface MarketPlayer extends GamePlayer {
  price: number;
}
export interface Fixture {
  id: number;
  round: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  events: string[];
}
export interface Club {
  id: string;
  name: string;
  rating: number;
}
export interface Season {
  revision: number;
  formation: Formation;
  lineup: string[];
  clubs: Club[];
  fixtures: Fixture[];
  market: MarketPlayer[];
  transfers: string[];
}
export interface Standing {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}
export interface GameView {
  team: { id: string; name: string; shortName: string; budget: number };
  players: GamePlayer[];
  season: Season;
  standings: Standing[];
}

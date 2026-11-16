import { randomUUID } from "node:crypto";
import {
  formations,
  Formation,
  GamePlayer,
  Season,
  Standing,
} from "@rwog/shared";

export function validLineup(
  players: GamePlayer[],
  ids: string[],
  formation: Formation,
): boolean {
  if (
    !(formation in formations) ||
    ids.length !== 11 ||
    new Set(ids).size !== 11
  )
    return false;
  const selected = players.filter((p) => ids.includes(p.id));
  return ["GK", "DEF", "MID", "FWD"].every(
    (pos, i) =>
      selected.filter((p) => p.position === pos).length ===
      formations[formation][i],
  );
}
export function autoLineup(
  players: GamePlayer[],
  formation: Formation,
): string[] {
  return ["GK", "DEF", "MID", "FWD"].flatMap((pos, i) =>
    players
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall - a.overall)
      .slice(0, formations[formation][i])
      .map((p) => p.id),
  );
}
export function newSeason(
  team: { id: string; name: string },
  players: GamePlayer[],
): Season {
  const clubs = [
    { ...team, rating: 68 },
    ...[
      "Kigali United",
      "Marburg Athletic",
      "Riverside FC",
      "Atlas City",
      "Northstar Rovers",
    ].map((name, i) => ({ id: `club-${i}`, name, rating: 62 + i * 3 })),
  ];
  const fixtures: Season["fixtures"] = [];
  const rotating = clubs.map((c) => c.id);
  for (let round = 1; round < clubs.length; round++) {
    for (let i = 0; i < clubs.length / 2; i++) {
      const pair = [rotating[i], rotating[clubs.length - 1 - i]];
      if (round % 2 === 0) pair.reverse();
      fixtures.push({
        id: fixtures.length + 1,
        round,
        home: pair[0],
        away: pair[1],
        homeGoals: null,
        awayGoals: null,
        events: [],
      });
    }
    rotating.splice(1, 0, rotating.pop()!);
  }
  fixtures.push(
    ...fixtures.map((f) => ({
      ...f,
      id: f.id + 15,
      round: f.round + 5,
      home: f.away,
      away: f.home,
      events: [],
    })),
  );
  const market = ["GK", "DEF", "MID", "FWD", "DEF", "MID", "FWD", "FWD"].map(
    (position, i) => ({
      id: randomUUID(),
      firstName: [
        "Amari",
        "Leon",
        "Yuki",
        "Samuel",
        "Noah",
        "Diego",
        "Marco",
        "Eric",
      ][i],
      lastName: [
        "Silva",
        "Weber",
        "Tanaka",
        "Mensah",
        "Martin",
        "Costa",
        "Rossi",
        "Niyonzima",
      ][i],
      age: 20 + i,
      position,
      overall: 66 + i * 2,
      price: 120000 + i * 60000,
    }),
  );
  return {
    revision: 0,
    formation: "4-4-2",
    lineup: autoLineup(players, "4-4-2"),
    clubs,
    fixtures,
    market,
    transfers: [],
  };
}
export function standings(season: Season): Standing[] {
  const rows = season.clubs.map((c) => ({
    id: c.id,
    name: c.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
  for (const f of season.fixtures) {
    if (f.homeGoals === null || f.awayGoals === null) continue;
    const h = rows.find((c) => c.id === f.home)!,
      a = rows.find((c) => c.id === f.away)!;
    h.played++;
    a.played++;
    h.gf += f.homeGoals;
    h.ga += f.awayGoals;
    a.gf += f.awayGoals;
    a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (f.homeGoals < f.awayGoals) {
      a.won++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}
export function playRound(
  season: Season,
  teamId: string,
  players: GamePlayer[],
  rng = Math.random,
): number {
  if (!validLineup(players, season.lineup, season.formation))
    throw new Error("Select a valid starting XI before playing.");
  const next = season.fixtures.find((f) => f.homeGoals === null);
  if (!next) throw new Error("Season complete.");
  const rating =
    players
      .filter((p) => season.lineup.includes(p.id))
      .reduce((s, p) => s + p.overall, 0) / 11;
  const strength = (id: string) =>
    id === teamId ? rating : season.clubs.find((c) => c.id === id)!.rating;
  for (const f of season.fixtures.filter((f) => f.round === next.round)) {
    const h = strength(f.home),
      a = strength(f.away);
    f.homeGoals = 0;
    f.awayGoals = 0;
    for (let minute = 5; minute <= 90; minute += 5) {
      if (
        rng() < Math.max(0.035, Math.min(0.2, 0.085 + (h - a) / 500 + 0.015))
      ) {
        f.homeGoals++;
        f.events.push(
          `${minute}′ Goal — ${season.clubs.find((c) => c.id === f.home)!.name}`,
        );
      }
      if (rng() < Math.max(0.035, Math.min(0.2, 0.085 + (a - h) / 500))) {
        f.awayGoals++;
        f.events.push(
          `${minute}′ Goal — ${season.clubs.find((c) => c.id === f.away)!.name}`,
        );
      }
    }
    if (!f.events.length) f.events.push("90′ A hard-fought goalless draw.");
  }
  return next.round;
}

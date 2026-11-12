CREATE TABLE "game_states" (
  "team_id" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  CONSTRAINT "game_states_pkey" PRIMARY KEY ("team_id"),
  CONSTRAINT "game_states_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

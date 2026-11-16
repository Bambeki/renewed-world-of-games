import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Formation } from "@rwog/shared";
export class RevisionDto {
  @IsInt() @Min(0) revision!: number;
}
export class LineupDto extends RevisionDto {
  @IsIn(["4-4-2", "4-3-3", "3-5-2"]) formation!: Formation;
  @IsArray()
  @ArrayMinSize(11)
  @ArrayMaxSize(11)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  playerIds!: string[];
}
export class TransferDto extends RevisionDto {
  @IsUUID() playerId!: string;
}

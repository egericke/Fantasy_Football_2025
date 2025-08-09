/**
 * Defines the types of roster positions available in the league.
 */
export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'FLEX'
  | 'SUPERFLEX'
  | 'TE'
  | 'DST'
  | 'K'
  | 'BENCH'
  | '?'; // Represents an empty or unknown position

// Alias to maintain backwards compatibility for older code
export type IPlayer = Player;

/**
 * The primary interface for a single player.
 * This combines the raw stats from the data pipeline (like passing yards)
 * with the new advanced metrics (like VORP) calculated by our script.
 */
export interface Player {
  // Core Identifying Info
  id: string;         // A unique, stable identifier for the player.
  Rank: number;       // Overall rank, now based on VORP
  Player: string;
  Pos: 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';
  Team: string;
  bye?: number;

  // Advanced Analytical Metrics
  VORP: number;       // Value Over Replacement Player
  Tier: number;       // Positional Tier
  Volatility: number; // Risk/disagreement metric
  ADP: number;        // Average Draft Position

  // Raw Stat Projections
  Pass_Yds: number;
  Pass_TD: number;
  Int: number;
  Rush_Yds: number;
  Rush_TD: number;
  Rec: number;
  Rec_Yds: number;
  Rec_TD: number;

  // Optional client-side fields
  href?: string;      // Link to player profile
  tableName?: string; // Shortened name for display

  /**
   * Additional legacy fields used by the reducers and components.
   * These mirror or derive from the above fields and are optional,
   * because they may be computed client-side.
   */
  name?: string;      // alias for Player
  pos?: Position;     // alias for Pos
  adp?: number;       // alias for ADP
  vor?: number;       // alias for VORP
  forecast?: number;  // projected fantasy points
  key?: string;       // alias for id, useful for React list rendering
}

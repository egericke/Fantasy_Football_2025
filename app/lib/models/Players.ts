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

/**
 * Maps wildcard positions (like FLEX) to the standard positions they can hold.
 * This is used to determine which players can fill which roster spots.
 */
export const wildCardPositions: { [key: string]: Set<string> } = {
  QB: new Set([]),
  RB: new Set([]),
  WR: new Set([]),
  FLEX: new Set(['WR', 'RB', 'TE']),
  SUPERFLEX: new Set(['QB', 'WR', 'RB', 'TE']),
  TE: new Set([]),
  DST: new Set([]),
  K: new Set([]),
  BENCH: new Set([]),
  '?': new Set([]),
};

/**
 * The primary interface for a single player.
 * This combines the raw stats from the data pipeline (like passing yards)
 * with the new advanced metrics (like VORP) calculated by our script.
 */
export interface Player {
  // Core Identifying Info
  Rank: number;       // Overall rank, now based on VORP
  Player: string;
  Pos: 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';
  Team: string;
  bye?: number;

  // Advanced Analytical Metrics
  VORP: number;       // Value Over Replacement Player - The most important value!
  Tier: number;       // Positional Tier, for spotting talent drop-offs
  Volatility: number; // Risk/disagreement metric (1-10 scale)
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

  /**
   * Additional scoring statistic fields.  These mirror the keys in
   * ``IScoring`` so that reducers can calculate forecasts on any
   * player type (QB/RB/WR/TE/K/DST).  They are marked optional
   * because many offensive players won't have kicking or defensive stats.
   */
  passYds?: number;
  passTds?: number;
  passInts?: number;
  rushYds?: number;
  rushTds?: number;
  receptions?: number;
  receptionYds?: number;
  receptionTds?: number;
  fumbles?: number;
  twoPts?: number;
  kickExtraPoints?: number;
  kick019?: number;
  kick2029?: number;
  kick3039?: number;
  kick4049?: number;
  kick50?: number;
  dfInts?: number;
  dfTds?: number;
  dfSacks?: number;
  dfPointsAllowedPerGame?: number;
  dfFumbles?: number;
  dfSafeties?: number;

  // Optional client-side fields
  href?: string;       // Link to player profile
  tableName?: string;  // Shortened name for display, e.g., "P. Mahomes"

  /**
   * Backwards compatibility and UI convenience fields.
   *
   * The original frontend code references lower‑cased keys and additional
   * properties such as `name`, `pos`, `adp`, `vor`, `forecast`, and `key`.
   * These optional aliases mirror their upper‑cased counterparts defined
   * above (e.g., `name` → `Player`, `pos` → `Pos`, `adp` → `ADP`).
   * They are intentionally optional because they may be computed on the
   * client at runtime (e.g., `vor` and `forecast` are derived values in
   * reducers) or populated during data loading.  Including them here
   * prevents TypeScript compilation errors when legacy code accesses
   * these properties.
   */
  name?: string;
  pos?: Position;
  adp?: number;
  vor?: number;
  forecast?: number;
  key?: string;
}

/**
 * Temporary alias preserved for backward compatibility.
 *
 * The original codebase referenced an `IPlayer` type.  During the
 * integration of advanced metrics we renamed the primary interface
 * to simply `Player`.  To avoid breaking existing imports (e.g. in
 * Team.ts, Card.tsx and other components) we provide this alias.
 * Consumers can continue to import `IPlayer` from this module and
 * will receive the same structure as `Player`.
 */
export type IPlayer = Player;

/**
 * Utility functions used to colourise advanced player metrics in the UI.  These
 * helpers live in a separate module so they can be reused across components
 * without re‑defining the same colour logic.  Each function returns a CSS
 * colour string based on the provided numeric value.
 */

/**
 * Return a colour for the provided value over replacement (VORP).  Higher
 * VORP values are tinted green, moderate values are light green and
 * mediocre scores are grey.  Negative scores are coloured red.
 *
 * @param vorp The value over replacement to evaluate.
 */
export function getVorpColor(vorp: number): string {
  if (vorp > 60) return '#2ca02c'; // Strong green
  if (vorp > 30) return '#98df8a'; // Light green
  if (vorp > 0) return '#6f6f6f';  // Neutral grey
  return '#d62728'; // Red for negative
}

/**
 * Determine a colour for the positional tier.  The tier should be a positive
 * integer; if undefined or zero then a neutral colour is returned.  Colours
 * wrap after ten tiers.
 *
 * @param tier The positional tier (1‑based).
 */
export function getTierColor(tier: number | null | undefined): string {
  // Define a palette of distinguishable colours.  These are taken from the
  // D3 category10 palette and will wrap when there are more than ten tiers.
  const colours = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  ];
  if (!tier || tier < 1) return '#ccc';
  return colours[(tier - 1) % colours.length];
}

/**
 * Return a colour representing the risk or volatility of a player.  Low
 * volatility values are coloured green, medium values orange and high
 * volatility values red.
 *
 * @param volatility Risk metric (larger is riskier).
 */
export function getVolatilityColor(volatility: number): string {
  if (volatility > 7) return '#d62728'; // High risk (red)
  if (volatility > 4) return '#ff7f0e'; // Medium risk (orange)
  return '#2ca02c'; // Low risk (green)
}
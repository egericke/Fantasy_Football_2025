import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import os
import sys
import logging

# Create a module-level logger.  When used in conjunction with data/main.py,
# this will inherit the root logging configuration.
LOGGER = logging.getLogger(__name__)

def aggregate_data(year):
    """
    Main function to orchestrate the data aggregation, cleaning, and feature engineering.
    """
    # --- 1. Load and Clean Data ---
    projections = load_projections(year)
    adp = load_adp(year)

    # Merge dataframes
    df = pd.merge(projections, adp, on='Player', how='left')

    # --- 2. Feature Engineering: VORP, Tiers, Volatility ---

    # Calculate VORP (Value Over Replacement Player)
    df = calculate_vorp(df)

    # Calculate Volatility based on rank disagreement
    rank_cols = [col for col in df.columns if 'Rank' in col]
    df['Volatility'] = df[rank_cols].std(axis=1)
    # Normalize volatility to a 1-10 scale for easier interpretation
    df['Volatility'] = 1 + 9 * (df['Volatility'] - df['Volatility'].min()) / (df['Volatility'].max() - df['Volatility'].min())
    df['Volatility'] = df['Volatility'].fillna(5) # Fill NaN with average volatility

    # Calculate Tiers using K-Means Clustering
    df = calculate_tiers(df)

    # --- 3. Final Cleaning and Export ---
    # Select columns for the final output.  Capture all per‑source rank columns as
    # well as the core statistics and advanced metrics.  The order of the
    # columns in the final output matters for downstream consumers, so we
    # construct it explicitly.
    base_cols = ['Player', 'Team', 'Pos', 'VORP', 'Tier', 'Volatility', 'ADP']
    # Include any per‑source rank columns (e.g. CBS_Rank, ESPN_Rank, NFL_Rank)
    rank_columns = [col for col in df.columns if col.endswith('_Rank')]
    # Core stat columns available after merging
    stat_columns = [
        'Pass_Yds', 'Pass_TD', 'Int', 'Rush_Yds', 'Rush_TD', 'Rec', 'Rec_Yds', 'Rec_TD'
    ]
    selected_columns = base_cols + rank_columns + stat_columns
    # Keep only columns that exist in the DataFrame
    selected_columns = [c for c in selected_columns if c in df.columns]
    df_final = df[selected_columns].copy()

    # Sort by VORP for a more meaningful default order
    df_final = df_final.sort_values(by='VORP', ascending=False).reset_index(drop=True)
    # Add a new overall rank based on VORP
    df_final.insert(3, 'Rank', df_final.index + 1)

    # Persist to both CSV and JSON for convenience
    # Ensure the processed output directory exists relative to this module
    base_dir = os.path.dirname(__file__)
    processed_dir = os.path.join(base_dir, 'processed')
    os.makedirs(processed_dir, exist_ok=True)
    csv_path = os.path.join(processed_dir, f'Projections-{year}.csv')
    json_path = os.path.join(processed_dir, f'Projections-{year}.json')
    df_final.to_csv(csv_path, index=False)
    df_final.to_json(json_path, orient='records', indent=2)
    print(f"Successfully created aggregated projections at: {json_path}")

def load_projections(year: int) -> pd.DataFrame:
    """
    Load and merge player projection data from multiple sources for the requested
    season.  The projection files in ``raw/projections`` follow the naming
    convention ``<Source>-Projections-<year>.csv`` and contain per‑player
    statistics such as passing yards, rushing touchdowns and receptions.  Since
    different data providers may use slightly different column names (for example
    ``name`` vs ``Player``, ``team`` vs ``Team``), this function normalises
    them to a common schema and computes a consensus projection.

    Each source's contribution is kept separate long enough to derive its own
    projected points and ranking; afterwards, the numeric statistics are
    averaged across sources.  If only a subset of providers have data for a
    given player, the averaging logic will still work, thanks to pandas' NA
    handling.

    Parameters
    ----------
    year : int
        The NFL season to load projections for.

    Returns
    -------
    pandas.DataFrame
        A dataframe with one row per player, containing the averaged
        projections across all available sources, per‑source projected points
        and ranks, the player's team and position, and a calculated
        ``Projected_Points`` column used for value‑over‑replacement and tier
        calculation downstream.
    """
    import glob

    # Resolve the projections directory relative to this file so that the
    # function works correctly regardless of the current working directory
    base_dir = os.path.dirname(__file__)
    projections_dir = os.path.join(base_dir, 'raw', 'projections')
    pattern = os.path.join(projections_dir, f"*-Projections-{year}.csv")
    files = glob.glob(pattern)
    if not files:
        raise FileNotFoundError(f"No projection files found for {year} in {projections_dir}")

    per_source_dfs = []
    # Load fantasy scoring weights.  Users can override the defaults by
    # creating a ``scoring.json`` file in the same directory as this
    # script.  The file should be a JSON object mapping stat names (e.g.,
    # "pass_yds", "pass_tds") to numeric weights.  Missing keys will fall
    # back to the defaults below.
    scoring_weights = {
        'pass_yds': 0.04,      # 1 point per 25 passing yards
        'pass_tds': 4.0,
        'pass_ints': -2.0,
        'rush_yds': 0.1,       # 1 point per 10 rushing yards
        'rush_tds': 6.0,
        'receptions': 0.5,     # half‑point PPR
        'reception_yds': 0.1,  # 1 point per 10 receiving yards
        'reception_tds': 6.0,
    }
    # Attempt to read custom scoring weights
    scoring_path = os.path.join(base_dir, 'scoring.json')
    if os.path.exists(scoring_path):
        try:
            import json
            with open(scoring_path, 'r') as fh:
                user_weights = json.load(fh)
            # Merge user weights, falling back to defaults for missing stats
            if isinstance(user_weights, dict):
                scoring_weights.update({k: float(v) for k, v in user_weights.items()})
        except Exception:
            LOGGER.warning("scoring.json found but could not be parsed; using default scoring weights")
    # Column mappings to unify provider nomenclature
    col_map = {
        'name': 'Player',
        'player': 'Player',
        'team': 'Team',
        'pos': 'Pos',
        'pass_yds': 'Pass_Yds',
        'pass_tds': 'Pass_TD',
        'pass_ints': 'Int',
        'rush_yds': 'Rush_Yds',
        'rush_tds': 'Rush_TD',
        'receptions': 'Rec',
        'reception_yds': 'Rec_Yds',
        'reception_tds': 'Rec_TD',
    }

    for filepath in files:
        filename = os.path.basename(filepath)
        # Extract provider name from the file name (everything before the first hyphen)
        source = filename.split('-')[0]
        df_raw = pd.read_csv(filepath)
        # Normalise column names: copy to avoid SettingWithCopyWarning
        df = df_raw.copy()
        lower_cols = {c.lower(): c for c in df.columns}
        for original, new_name in col_map.items():
            # Only map if the lower‑cased column exists in the dataframe
            if original in lower_cols:
                df[new_name] = df[lower_cols[original]]
        # If the dataset contains a composite 'key', extract team and position from it
        # as a fallback.  Keys are of the form 'lastname_POS_TEAM'.
        if 'Team' not in df.columns or df['Team'].isnull().all():
            if 'key' in df.columns:
                team_parts = df['key'].astype(str).str.split('_').str
                df['Team'] = team_parts[2]
                df['Pos'] = team_parts[1].str.upper()
        # Derive per‑source projected points using the scoring weights
        # Start with zeros to avoid KeyErrors
        points = pd.Series(0, index=df.index, dtype=float)
        for stat, weight in scoring_weights.items():
            # Use the original lower‑case column name if present, else the normalised name
            col_name = lower_cols.get(stat, col_map.get(stat))
            if col_name in df.columns:
                points += df[col_name].fillna(0) * weight
        df[f'{source}_Projected_Points'] = points.round(2)
        # Compute per‑source rank based on projected points
        df[f'{source}_Rank'] = df[f'{source}_Projected_Points'].rank(method='min', ascending=False).astype(int)
        # Keep only essential columns to reduce memory footprint when merging
        keep_cols = ['Player', 'Team', 'Pos', f'{source}_Projected_Points', f'{source}_Rank',
                     'Pass_Yds', 'Pass_TD', 'Int', 'Rush_Yds', 'Rush_TD', 'Rec', 'Rec_Yds', 'Rec_TD']
        # Some of the keep_cols may not exist if the provider didn't supply a stat; retain the intersection
        keep_cols = [c for c in keep_cols if c in df.columns]
        per_source_dfs.append(df[keep_cols])

    # Merge the per‑source dataframes on Player/Team/Pos.  We use outer joins to
    # ensure no player is lost even if only one provider has data for them.
    merged = per_source_dfs[0]
    for df_next in per_source_dfs[1:]:
        merged = pd.merge(merged, df_next, on=['Player', 'Team', 'Pos'], how='outer')

    # Compute the mean of available numeric stats across sources.  First, identify
    # all columns corresponding to per‑source projections.  We'll need these for
    # volatility calculations later on.
    proj_cols = [c for c in merged.columns if c.endswith('_Projected_Points')]
    # Averaging per‑stat columns: only use those columns that are present
    numeric_stat_cols = ['Pass_Yds', 'Pass_TD', 'Int', 'Rush_Yds', 'Rush_TD', 'Rec', 'Rec_Yds', 'Rec_TD']
    for stat in numeric_stat_cols:
        stat_cols = [c for c in merged.columns if c.split('_')[-1] == stat]
        if stat_cols:
            merged[stat] = merged[stat_cols].mean(axis=1)
    # Calculate consensus projected points by averaging per‑source projected points
    if proj_cols:
        merged['Projected_Points'] = merged[proj_cols].mean(axis=1).round(2)
    else:
        merged['Projected_Points'] = 0
    # Drop the intermediate per‑stat columns to avoid confusion later
    cols_to_drop = []
    for stat in numeric_stat_cols:
        cols_to_drop += [c for c in merged.columns if c.split('_')[-1] == stat and c not in numeric_stat_cols]
    merged = merged.drop(columns=list(set(cols_to_drop)), errors='ignore')
    return merged

def load_adp(year: int) -> pd.DataFrame:
    """
    Load and clean average draft position (ADP) data for the given season.
    FantasyPros occasionally changes the naming convention of its exported
    datasets (for example, ``FantasyPros-{year}.csv`` vs
    ``FantasyPros_Overall_ADP_Rankings_{year}.csv``).  This loader will
    attempt to locate an ADP file for the requested year in the ``raw/adp``
    directory by trying several common patterns.  Once loaded, the function
    standardises player names and returns a DataFrame with just the player
    name and their ADP.

    Parameters
    ----------
    year : int
        The NFL season to load ADP for.

    Returns
    -------
    pandas.DataFrame
        A dataframe containing ``Player`` and ``ADP`` columns.
    """
    import glob

    # Resolve directories relative to this file
    base_dir = os.path.dirname(__file__)
    adp_dir = os.path.join(base_dir, 'raw', 'adp')
    # Patterns to try in order of preference.  We insert a scoring‑specific
    # filename at the front based on the configured reception weight.  If
    # ``scoring.json`` defines a high reception weight (>=1) we look for
    # ``FantasyPros-<year>-PPR.csv``; if it defines a half‑point PPR weight
    # (0.25 <= weight < 1) we look for ``FantasyPros-<year>-HalfPPR.csv``;
    # otherwise we assume standard scoring and look for
    # ``FantasyPros-<year>-Standard.csv``.  This allows the ADP list to
    # align with your league's scoring system when multiple variants are
    # available.
    # Read reception weight from scoring.json if present
    scoring_weight = 0.5  # default half‑point PPR
    scoring_path = os.path.join(base_dir, 'scoring.json')
    if os.path.exists(scoring_path):
        try:
            import json
            with open(scoring_path, 'r') as fh:
                custom = json.load(fh)
            # look for 'receptions' weight or fallback to 'rec'
            if isinstance(custom, dict):
                receptions_key = next((k for k in custom.keys() if k.lower() in ['receptions', 'rec']), None)
                if receptions_key:
                    scoring_weight = float(custom[receptions_key])
        except Exception:
            # fall back to default scoring weight
            pass
    # Determine scoring type for ADP selection
    if scoring_weight >= 1.0:
        scoring_type = 'PPR'
    elif scoring_weight >= 0.25:
        scoring_type = 'HalfPPR'
    else:
        scoring_type = 'Standard'
    # Compose patterns with the scoring‑specific file first
    patterns = [
        os.path.join(adp_dir, f"FantasyPros-{year}-{scoring_type}.csv"),
        os.path.join(adp_dir, f"FantasyPros-{year}.csv"),
        os.path.join(adp_dir, f"FantasyPros-ADP-{year}.csv"),
        os.path.join(adp_dir, f"FantasyPros_{year}_Overall_ADP_Rankings.csv"),
        os.path.join(base_dir, 'raw', f"FantasyPros_{year}_Overall_ADP_Rankings.csv"),
    ]
    adp_path = None
    for p in patterns:
        matches = glob.glob(p)
        if matches:
            adp_path = matches[0]
            break
    if not adp_path or not os.path.exists(adp_path):
        raise FileNotFoundError(f"No ADP file found for {year} in {adp_dir}")

    df_adp = pd.read_csv(adp_path)
    # Determine which column holds the ADP value.  Commonly this is ``ADP`` or
    # ``AVG``.  We'll search for a numeric column that isn't Rank or a team
    # name.
    adp_column = None
    for candidate in ['ADP', 'Avg', 'AVG', 'Overall']:
        if candidate in df_adp.columns:
            adp_column = candidate
            break
    # Fallback: use the first numeric column excluding 'Rank'
    if adp_column is None:
        numeric_cols = df_adp.select_dtypes(include=np.number).columns.tolist()
        numeric_cols = [col for col in numeric_cols if col.lower() not in ['rank', 'bye']]
        if numeric_cols:
            adp_column = numeric_cols[0]
        else:
            raise ValueError(f"Could not determine ADP column in {adp_path}")

    # Standardise the player name column.  Some exports use ``Player`` and others
    # use ``player`` or embed team info.  We'll drop any suffixes and keep the
    # first two parts of the name, similar to the old behaviour.
    name_col = 'Player'
    for candidate in ['Player', 'player', 'Name', 'name']:
        if candidate in df_adp.columns:
            name_col = candidate
            break
    df_adp['Player'] = df_adp[name_col].apply(standardize_player_name)
    df_adp = df_adp[['Player', adp_column]].rename(columns={adp_column: 'ADP'})
    # Convert ADP to numeric and drop rows without a valid ADP
    df_adp['ADP'] = pd.to_numeric(df_adp['ADP'], errors='coerce')
    df_adp = df_adp.dropna(subset=['ADP'])
    return df_adp[['Player', 'ADP']]

def standardize_player_name(name):
    """
    Remove suffixes like 'Jr.', 'Sr.', 'II', etc. from a player's name and
    return only the first two components (typically first and last name).  If
    the input is missing or not a string, it is coerced to a string first.  A
    defensive implementation like this ensures we don't encounter attribute
    errors when the data contains NaN values.
    """
    if pd.isna(name):
        return ''
    # Coerce to string in case of non‑string values
    name_str = str(name)
    cleaned = name_str.replace('.', '').strip()
    parts = cleaned.split()
    return ' '.join(parts[:2])

def calculate_vorp(df):
    """Calculates Value Over Replacement Player."""
    df_sorted = df.sort_values(by='Projected_Points', ascending=False)
    positions = df_sorted['Pos'].unique()
    vorp_baselines = {}

    # Define replacement levels (e.g., QB20, RB40, etc.)
    replacement_levels = {'QB': 20, 'RB': 40, 'WR': 40, 'TE': 15}

    for pos in positions:
        if pos in replacement_levels:
            pos_df = df_sorted[df_sorted['Pos'] == pos]
            replacement_player_index = replacement_levels[pos]
            if len(pos_df) > replacement_player_index:
                baseline_score = pos_df.iloc[replacement_player_index]['Projected_Points']
                vorp_baselines[pos] = baseline_score
            else:
                vorp_baselines[pos] = 0 # Fallback if not enough players

    df['VORP'] = df.apply(
        lambda row: round(row['Projected_Points'] - vorp_baselines.get(row['Pos'], 0), 2),
        axis=1
    )
    return df

def calculate_tiers(df):
    """Calculates positional tiers using K-Means clustering."""
    df['Tier'] = 0
    positions = df['Pos'].unique()

    # Define number of tiers per position
    tier_counts = {'QB': 8, 'RB': 10, 'WR': 10, 'TE': 7}

    for pos in positions:
        if pos in tier_counts:
            pos_df = df[df['Pos'] == pos].copy()
            if len(pos_df) < tier_counts[pos]: continue

            # Features for clustering: VORP and ADP
            features = pos_df[['VORP', 'ADP']].fillna(pos_df[['VORP', 'ADP']].mean())
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)

            kmeans = KMeans(n_clusters=tier_counts[pos], random_state=42, n_init=10)
            pos_df['cluster'] = kmeans.fit_predict(features_scaled)

            # Order clusters by VORP to create tiers
            cluster_order = pos_df.groupby('cluster')['VORP'].mean().sort_values(ascending=False).index
            tier_map = {cluster_id: i + 1 for i, cluster_id in enumerate(cluster_order)}
            pos_df['Tier'] = pos_df['cluster'].map(tier_map)

            # Update the main dataframe
            df.update(pos_df['Tier'])

    return df

if __name__ == '__main__':
    if len(sys.argv) > 1:
        year = sys.argv[1]
        aggregate_data(year)
    else:
        print("Error: Please provide a year. Usage: python aggregate.py 2025")

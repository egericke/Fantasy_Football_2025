"""
Utility functions to retrieve projection data from external sources when no local
files exist.  These functions are intentionally lightweight wrappers around
third‑party APIs.  You will need to supply API tokens or other credentials
through environment variables for them to work.  If you don't have access to
these data services, you can skip this module and place CSV files directly in
``data/raw/projections``.

Example usage:

```
from fetch_external import fetch_espn_projections

# Fetch ESPN projections for 2025 and save them to raw/projections
df = fetch_espn_projections(2025)
df.to_csv('data/raw/projections/ESPN-Projections-2025.csv', index=False)
```

"""

import os
import logging
import pandas as pd
import requests

LOGGER = logging.getLogger(__name__)

def fetch_espn_projections(year: int) -> pd.DataFrame:
    """
    Fetch NFL player projections from ESPN's public player API.

    ESPN exposes a JSON feed at
    ``https://sports.core.api.espn.com/v3/games/nfl/seasons/{year}/players``
    which contains season‑long statistical projections for many players.  This
    function queries that endpoint, normalises the response into a DataFrame
    with columns consistent with the rest of the pipeline and returns it.  If
    the request fails (for example, if ESPN changes its API or rate‑limits
    unauthenticated requests), an empty DataFrame is returned instead.

    Parameters
    ----------
    year : int
        The NFL season year to fetch projections for.

    Returns
    -------
    pandas.DataFrame
        A DataFrame with columns ``name``, ``team``, ``pos``, ``pass_yds``,
        ``pass_tds``, ``pass_ints``, ``rush_yds``, ``rush_tds``,
        ``receptions``, ``reception_yds``, and ``reception_tds``.  Missing
        columns will be filled with zeroes.
    """
    url = f"https://sports.core.api.espn.com/v3/games/nfl/seasons/{year}/players?limit=3000&regions=us&lang=en&contentorigin=espn"
    LOGGER.info(f"Attempting to fetch ESPN projections from {url}")
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        LOGGER.error(f"Failed to fetch ESPN projections: {e}")
        return pd.DataFrame()
    try:
        data = resp.json()
    except Exception as e:
        LOGGER.error(f"Failed to parse ESPN response JSON: {e}")
        return pd.DataFrame()
    players = data.get('items') or []
    rows = []
    for player in players:
        info = player.get('athlete', {})
        team = info.get('team', {}).get('abbreviation')
        pos = info.get('position', {}).get('abbreviation')
        name = info.get('displayName')
        stats = player.get('stats', {})
        projections = stats.get('season', {}).get('projections') or {}
        row = {
            'name': name,
            'team': team,
            'pos': pos,
            'pass_yds': projections.get('passYards', 0),
            'pass_tds': projections.get('passTouchdowns', 0),
            'pass_ints': projections.get('passInterceptions', 0),
            'rush_yds': projections.get('rushYards', 0),
            'rush_tds': projections.get('rushTouchdowns', 0),
            'receptions': projections.get('receptions', 0),
            'reception_yds': projections.get('receivingYards', 0),
            'reception_tds': projections.get('receivingTouchdowns', 0),
        }
        # Only include players with a name, position and team
        if name and pos and team:
            rows.append(row)
    if not rows:
        LOGGER.warning("ESPN projections returned no player data")
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    LOGGER.info(f"Fetched {len(df)} player projections from ESPN")
    return df

def fetch_github_projections(repo_owner: str, repo_name: str, file_path: str) -> pd.DataFrame:
    """
    Download a projection CSV file from a public GitHub repository.

    This helper constructs a raw GitHub URL from the repository owner,
    repository name and file path and uses ``requests`` to download it.

    Parameters
    ----------
    repo_owner : str
        The GitHub username or organisation that owns the repository.
    repo_name : str
        The name of the repository.
    file_path : str
        The path within the repository to the CSV file, e.g.,
        ``data/Projections-2025.csv``.

    Returns
    -------
    pandas.DataFrame
        A dataframe parsed from the CSV file, or an empty DataFrame on
        failure.
    """
    raw_url = f"https://raw.githubusercontent.com/{repo_owner}/{repo_name}/main/{file_path}"
    LOGGER.info(f"Attempting to download projections from {raw_url}")
    try:
        resp = requests.get(raw_url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        LOGGER.error(f"Failed to fetch file from GitHub: {e}")
        return pd.DataFrame()
    try:
        from io import StringIO
        return pd.read_csv(StringIO(resp.text))
    except Exception as e:
        LOGGER.error(f"Failed to parse CSV from GitHub content: {e}")
        return pd.DataFrame()
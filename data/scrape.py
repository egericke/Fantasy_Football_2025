# data/scrape.py

"""Projections and ADP scrapers, refactored for robustness and best practices."""

import logging
import os
import re
import time
import pandas as pd
import numpy as np
from bs4 import BeautifulSoup, NavigableString
import requests
# Import Selenium-related classes lazily within setup_driver to avoid a hard
# dependency when only HTTP scraping is required.  Selenium will be optional
# and only needed for functions that explicitly call setup_driver.

# --- Configuration and Constants ---

LOGGER = logging.getLogger(__name__)
DIR = os.path.dirname(__file__)
RAW_PROJECTIONS = os.path.join(DIR, "raw", "projections")
RAW_ADP = os.path.join(DIR, "raw", "adp")

TEAM_TO_ABRV_MAP = {
    "Cardinals": "ARI", "Falcons": "ATL", "Ravens": "BAL", "Bills": "BUF",
    "Panthers": "CAR", "Bears": "CHI", "Bengals": "CIN", "Browns": "CLE",
    "Cowboys": "DAL", "Broncos": "DEN", "Lions": "DET", "Packers": "GB",
    "Texans": "HOU", "Colts": "IND", "Jaguars": "JAX", "Chiefs": "KC",
    "Las Vegas": "LV", "Raiders": "LV", "Dolphins": "MIA", "Vikings": "MIN",
    "Patriots": "NE", "Saints": "NO", "Giants": "NYG", "N.Y. Giants": "NYG",
    "Jets": "NYJ", "N.Y. Jets": "NYJ", "Eagles": "PHI", "Steelers": "PIT",
    "Chargers": "LAC", "L.A. Chargers": "LAC", "49ers": "SF", "Seahawks": "SEA",
    "Rams": "LAR", "L.A. Rams": "LAR", "Buccaneers": "TB", "Titans": "TEN",
    "Commanders": "WSH", "Team": "WSH",
}
ABRV_TO_TEAM_MAP = {v: k for k, v in TEAM_TO_ABRV_MAP.items()}

# --- WebDriver Management ---

def setup_driver():
    """
    Lazily import and initialise a Selenium WebDriver for headless scraping.

    If Selenium or Chrome are not available, this function will raise an
    informative error.  Since most scraping now occurs via HTTP, this
    function is only needed for other scrapers that explicitly require a
    browser.  To avoid forcing users to install Selenium unnecessarily, the
    imports are performed inside the function body.
    """
    try:
        from selenium import webdriver  # type: ignore
        from selenium.webdriver.chrome.options import Options  # type: ignore
        from selenium.webdriver.chrome.service import Service  # type: ignore
        from webdriver_manager.chrome import ChromeDriverManager  # type: ignore
    except ImportError as e:
        raise ImportError(
            "Selenium is required for browser-based scraping but is not installed. "
            "Install it via `pip install selenium webdriver-manager` if needed."
        ) from e

    LOGGER.info("Setting up new Chrome WebDriver instance.")
    options = Options()
    arguments = [
        "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--start-maximized",
        "--enable-automation", "--window-size=1200x900", "--disable-browser-side-navigation",
        "--disable-gpu",
    ]
    for arg in arguments:
        options.add_argument(arg)

    # Do not set binary_location unless you know where Chrome is installed.  Let
    # webdriver-manager pick an appropriate ChromeDriver binary.  If Chrome is
    # missing entirely, this will still raise an exception.
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    LOGGER.info("WebDriver setup complete.")
    return driver

# --- Helper Functions ---

def _scroll(driver):
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

def _add_player_key(df):
    name_regex = re.compile(r"[^a-z ]+")
    def create_key(row):
        name_text = str(row.get("name", "")).lower().replace("sr", "").replace("st.", "").strip()
        name_text = name_regex.sub("", name_text).strip().replace("  ", " ").split(" ")
        last_name = name_text[1] if len(name_text) > 1 else name_text[0]
        pos = row.get('pos', 'NA')
        team = row.get('team', 'NA')
        return f'{last_name}_{pos}_{team}'

    df["key"] = df.apply(create_key, axis=1)
    return df.drop_duplicates(subset=["key"])

# --- Scraper Functions ---

def scrape_fantasy_pros_adp(year: int) -> None:
    """
    Retrieve Average Draft Position (ADP) data from FantasyPros without
    requiring a Selenium browser.  This function uses ``requests`` to fetch
    the ADP pages directly and ``pandas.read_html`` to parse the tables.

    The resulting CSV will be saved in ``RAW_ADP`` as ``FantasyPros-<year>.csv``
    containing ``Player``, ``Team``, ``Pos`` and ``ADP`` columns.
    """
    LOGGER.info(f"Scraping FantasyPros ADP for {year}")
    urls = {
        'std': f"https://www.fantasypros.com/nfl/adp/overall.php?year={year}",
        'half_ppr': f"https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php?year={year}",
        'ppr': f"https://www.fantasypros.com/nfl/adp/ppr-overall.php?year={year}",
    }
    merged_df: pd.DataFrame | None = None
    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    }
    for ppr_type, url in urls.items():
        LOGGER.info(f"Fetching {ppr_type} ADP from {url}")
        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            dfs = pd.read_html(response.text)
            if not dfs:
                LOGGER.error(f"No tables found at {url}")
                continue
            df = dfs[0]
            df = df.rename(columns={
                'Player Team (Bye)': 'Player',
                'AVG': ppr_type,
                'Pos': 'pos'
            })
            # Data cleaning
            df['pos'] = df['pos'].str.extract(r'([A-Z]+)')[0]
            df['team'] = df['Player'].apply(lambda x: x.split()[-1] if isinstance(x, str) else None)
            df['name'] = df['Player'].apply(lambda x: ' '.join(x.split()[:-1]) if isinstance(x, str) else None)
            current_df = df[['name', 'team', 'pos', ppr_type]].copy()
            current_df = _add_player_key(current_df)
            if merged_df is None:
                merged_df = current_df
            else:
                merged_df = pd.merge(merged_df, current_df[['key', ppr_type]], on='key', how='outer')
        except Exception as e:
            LOGGER.error(f"Error retrieving {ppr_type} ADP from {url}: {e}")
            continue

    if merged_df is not None and not merged_df.empty:
        # Calculate mean ADP across available scoring formats
        numeric_cols = [col for col in ['std', 'half_ppr', 'ppr'] if col in merged_df.columns]
        merged_df['ADP'] = merged_df[numeric_cols].mean(axis=1).round(1)
        # Standardise column names
        merged_df = merged_df.rename(columns={
            'name': 'Player',
            'team': 'Team',
            'pos': 'Pos'
        })
        output_path = os.path.join(RAW_ADP, f"FantasyPros-{year}.csv")
        try:
            merged_df[['Player', 'Team', 'Pos', 'ADP']].to_csv(output_path, index=False)
            LOGGER.info(f"Successfully saved merged FantasyPros ADP data to {output_path}")
        except Exception as e:
            LOGGER.error(f"Failed to write ADP file to {output_path}: {e}")

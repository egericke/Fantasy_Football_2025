# data/main.py

import sys
import logging
import os
import scrape  # Your refactored scrape.py
from aggregate import aggregate_data  # Import aggregator to run after scraping

# When no local projection CSVs exist for the requested year, we can
# optionally fetch projections from external sources.  ESPN exposes an
# undocumented JSON feed with season‑long projections, and you can also
# retrieve a custom CSV from a public GitHub repository.  These helper
# functions live in fetch_external.py.  Import lazily below to avoid
# unnecessary dependencies when local data are present.
try:
    from fetch_external import fetch_espn_projections, fetch_github_projections
except Exception:
    # If the module isn't present or fails to import (e.g. missing
    # requests), fall back gracefully.  External fetching will simply
    # be skipped and the pipeline will rely on local CSVs.
    fetch_espn_projections = None
    fetch_github_projections = None

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
LOGGER = logging.getLogger(__name__)

# Create output directories if they don't exist
try:
    os.makedirs(scrape.RAW_PROJECTIONS, exist_ok=True)
    os.makedirs(scrape.RAW_ADP, exist_ok=True)
    LOGGER.info("Output directories ensured.")
except Exception as e:
    LOGGER.critical(f"Could not create directories: {e}")
    sys.exit(1)

# --- Main Execution Logic ---

def main(year: int):
    """
    Orchestrates the entire scraping process.
    """
    LOGGER.info(f"--- Starting Fantasy Football Data Scrape for {year} ---")
    driver = None  # WebDriver is unused for ADP scraping
    try:
        # Run the HTTP‑based ADP scraper (no Selenium required)
        scrape.scrape_fantasy_pros_adp(year)

        # If no local projection CSVs exist for the requested year, attempt
        # to retrieve them from external sources.  This helps keep the
        # pipeline running when new seasons roll around and raw files
        # haven't been downloaded yet.  ESPN projections are public
        # (albeit unofficial) and GitHub can host custom projections.
        import glob
        # Discover any existing projection files matching the year
        pattern = os.path.join(scrape.RAW_PROJECTIONS, f"*-Projections-{year}.csv")
        existing = glob.glob(pattern)
        if not existing:
            LOGGER.info(f"No local projection files found for {year}; attempting external fetches.")
            # Fetch ESPN projections if the helper is available
            if fetch_espn_projections:
                try:
                    df_espn = fetch_espn_projections(year)
                except Exception as e:
                    LOGGER.error(f"Error fetching ESPN projections: {e}")
                    df_espn = None
                if df_espn is not None and not df_espn.empty:
                    out_path = os.path.join(scrape.RAW_PROJECTIONS, f"ESPN-Projections-{year}.csv")
                    df_espn.to_csv(out_path, index=False)
                    LOGGER.info(f"Saved ESPN projections to {out_path}")
            # Fetch custom GitHub projections if environment variables are set
            if fetch_github_projections:
                repo_owner = os.environ.get("PROJECTIONS_REPO_OWNER")
                repo_name = os.environ.get("PROJECTIONS_REPO_NAME")
                file_path = os.environ.get("PROJECTIONS_FILE_PATH")
                if repo_owner and repo_name and file_path:
                    try:
                        df_git = fetch_github_projections(repo_owner, repo_name, file_path)
                    except Exception as e:
                        LOGGER.error(f"Error fetching GitHub projections: {e}")
                        df_git = None
                    if df_git is not None and not df_git.empty:
                        # Derive a friendly provider name from the repository details
                        provider_name = f"{repo_owner}_{repo_name}".replace('/', '_')
                        out_path = os.path.join(scrape.RAW_PROJECTIONS, f"{provider_name}-Projections-{year}.csv")
                        df_git.to_csv(out_path, index=False)
                        LOGGER.info(f"Saved GitHub projections to {out_path}")
        # After scraping and any external fetching, attempt to aggregate
        # projection and ADP data into a unified dataset.  This step will
        # compute VORP, tiers and volatility scores.  Wrapping in its own
        # try/except allows the scraping to succeed even if aggregation
        # fails, which can be helpful during development.
        try:
            aggregate_data(year)
        except Exception as e:
            LOGGER.error(f"Failed to aggregate data for {year}: {e}", exc_info=True)

    except Exception as e:
        LOGGER.critical(f"A critical error occurred: {e}", exc_info=True)
    finally:
        # No browser to clean up.  Log completion of the scrape.
        LOGGER.info(f"--- Scraping process for {year} has finished. ---")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        LOGGER.error("Usage: python data/main.py <year>")
        sys.exit(1)

    try:
        target_year = int(sys.argv[1])
        if not 2000 < target_year < 2030:
             LOGGER.error(f"Invalid year: {target_year}. Please provide a realistic year.")
             sys.exit(1)
        main(target_year)
    except ValueError:
        LOGGER.error(f"Invalid argument: '{sys.argv[1]}'. Year must be an integer.")
        sys.exit(1)

# data/main.py

import sys
import logging
import os
import scrape  # Your refactored scrape.py
from aggregate import aggregate_data  # Import aggregator to run after scraping

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
        # Run the HTTP-based ADP scraper (no Selenium required)
        scrape.scrape_fantasy_pros_adp(year)

        # After scraping, attempt to aggregate projection and ADP data into a
        # unified dataset.  This step will also compute VORP, tiers and
        # volatility scores.  Wrapping in its own try/except allows the
        # scraping to succeed even if aggregation fails, which can be helpful
        # during development.
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

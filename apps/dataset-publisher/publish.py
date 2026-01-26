#!/usr/bin/env python3
"""
Qafiyah Dataset Publisher

Publishes the Qafiyah classical Arabic poetry dataset to Hugging Face Hub.
"""

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from datasets import Dataset
from dotenv import load_dotenv
from huggingface_hub import HfApi
from sqlalchemy import create_engine

# Load environment variables from .env file
load_dotenv()

# Default configuration
DEFAULT_REPO = "qafiyah/classical-arabic-poetry"
DEFAULT_DB_URL = "postgresql+psycopg2:///qafiyah"

# SQL query to extract all poem data with metadata
QUERY = """
SELECT
    p.id AS poem_id,
    p.slug AS poem_slug,
    p.title,
    p.content,
    po.name AS poet_name,
    po.slug AS poet_slug,
    po.bio AS poet_bio,
    e.name AS era_name,
    e.slug AS era_slug,
    m.name AS meter_name,
    m.slug AS meter_slug,
    th.name AS theme_name,
    th.slug AS theme_slug,
    r.pattern AS rhyme_pattern
FROM poems p
JOIN poets po ON p.poet_id = po.id
JOIN eras e ON po.era_id = e.id
JOIN meters m ON p.meter_id = m.id
JOIN themes th ON p.theme_id = th.id
LEFT JOIN rhymes r ON p.rhyme_id = r.id;
"""


def extract_verses(content: str) -> list[str]:
    """
    Extract verses (بيوت) from poem content.
    
    The content uses '*' as a separator between hemistichs (شطرات).
    Each verse consists of two hemistichs.
    
    Args:
        content: Raw poem content with '*' separators
        
    Returns:
        List of verses, each combining two hemistichs
    """
    hemistichs = [h.strip() for h in str(content).split("*") if h.strip()]
    # Combine pairs of hemistichs into verses
    verse_count = len(hemistichs) - len(hemistichs) % 2
    verses = [
        " ".join(hemistichs[i : i + 2]) for i in range(0, verse_count, 2)
    ]
    return verses


def fetch_dataset(database_url: str) -> pd.DataFrame:
    """
    Fetch the complete dataset from PostgreSQL.
    
    Args:
        database_url: SQLAlchemy database connection URL
        
    Returns:
        DataFrame with all poem data and metadata
    """
    print(f"Connecting to database...")
    engine = create_engine(database_url)
    
    print("Fetching poems from database...")
    df = pd.read_sql(QUERY, engine)
    print(f"  Found {len(df):,} poems")
    
    # Convert UUID columns to string for PyArrow compatibility
    df["poem_slug"] = df["poem_slug"].astype(str)
    df["theme_slug"] = df["theme_slug"].astype(str)
    
    # Extract verses and create formatted text
    print("Processing verses...")
    df["verses"] = df["content"].apply(extract_verses)
    df["text"] = df["verses"].apply(lambda v: "\n".join(v))
    
    return df


def get_dataset_stats(df: pd.DataFrame) -> dict:
    """Calculate and return dataset statistics."""
    return {
        "total_poems": len(df),
        "total_poets": df["poet_name"].nunique(),
        "total_eras": df["era_name"].nunique(),
        "total_meters": df["meter_name"].nunique(),
        "total_themes": df["theme_name"].nunique(),
        "total_rhymes": df["rhyme_pattern"].nunique(),
    }


def print_stats(stats: dict) -> None:
    """Print dataset statistics in a formatted way."""
    print("\nDataset Statistics:")
    print(f"  Poems:   {stats['total_poems']:,}")
    print(f"  Poets:   {stats['total_poets']:,}")
    print(f"  Eras:    {stats['total_eras']:,}")
    print(f"  Meters:  {stats['total_meters']:,}")
    print(f"  Themes:  {stats['total_themes']:,}")
    print(f"  Rhymes:  {stats['total_rhymes']:,}")


def get_dataset_card_path() -> Path | None:
    """Get the path to the dataset card if it exists."""
    script_dir = Path(__file__).parent
    card_path = script_dir / "dataset_card.md"
    return card_path if card_path.exists() else None


def publish_dataset(
    df: pd.DataFrame,
    repo_id: str,
    token: str,
    dry_run: bool = False,
) -> None:
    """
    Publish the dataset to Hugging Face Hub.
    
    Args:
        df: DataFrame containing the dataset
        repo_id: Target Hugging Face repository (e.g., "qafiyah/classical-arabic-poetry")
        token: Hugging Face API token with write access
        dry_run: If True, skip the actual upload
    """
    print(f"\nPreparing dataset for upload...")
    ds = Dataset.from_pandas(df, preserve_index=False)
    
    # Check for dataset card
    card_path = get_dataset_card_path()
    
    if dry_run:
        print(f"\n[DRY RUN] Would upload to: {repo_id}")
        print(f"[DRY RUN] Dataset has {len(ds):,} examples")
        if card_path:
            print(f"[DRY RUN] Would upload dataset card from: {card_path}")
        print("\nSample entry:")
        sample = ds[0]
        for key, value in sample.items():
            if isinstance(value, str) and len(value) > 100:
                value = value[:100] + "..."
            elif isinstance(value, list) and len(value) > 3:
                value = value[:3] + ["..."]
            print(f"  {key}: {value}")
        return
    
    print(f"Uploading to Hugging Face Hub: {repo_id}")
    ds.push_to_hub(repo_id, token=token)
    
    # Upload dataset card as README.md
    if card_path:
        print("Uploading dataset card...")
        api = HfApi(token=token)
        api.upload_file(
            path_or_fileobj=str(card_path),
            path_in_repo="README.md",
            repo_id=repo_id,
            repo_type="dataset",
        )
    
    print(f"\nSuccess! Dataset published to: https://huggingface.co/datasets/{repo_id}")


def main():
    parser = argparse.ArgumentParser(
        description="Publish Qafiyah dataset to Hugging Face Hub"
    )
    parser.add_argument(
        "--repo",
        default=DEFAULT_REPO,
        help=f"Target Hugging Face repository (default: {DEFAULT_REPO})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the dataset without uploading",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", DEFAULT_DB_URL),
        help="PostgreSQL connection URL",
    )
    args = parser.parse_args()
    
    # Get Hugging Face token
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token and not args.dry_run:
        print("Error: HF_TOKEN environment variable is required.")
        print("Set it in .env file or export it in your shell.")
        print("\nTo get a token, visit: https://huggingface.co/settings/tokens")
        sys.exit(1)
    
    try:
        # Fetch and process data
        df = fetch_dataset(args.database_url)
        
        # Print statistics
        stats = get_dataset_stats(df)
        print_stats(stats)
        
        # Publish
        publish_dataset(df, args.repo, hf_token, dry_run=args.dry_run)
        
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

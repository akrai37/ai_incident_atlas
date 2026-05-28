"""
Stratified sample of 200 AIID incidents across 5 sectors.

Sector assignment uses keyword heuristics on title + description.
Each incident is assigned to the FIRST matching sector in priority order;
this is acknowledged in the writeup as a known imperfection. The LLM
extraction pass later re-confirms deployment_context independently.

Output: data/sample/sampled_incidents.json
"""
import json
import re
import random
from pathlib import Path
import pandas as pd

random.seed(42)
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "mongodump_full_snapshot"
OUT_DIR = ROOT / "data" / "sample"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PER_SECTOR = 100
SECTORS = [
    ("public_safety",  r"\bpolice|criminal|arrest|facial recognition|predictive policing|surveillance|prison|incarcer|sentencing|compas|\bcourt|parole"),
    ("healthcare",     r"medical|patient|hospital|diagnos|health|disease|cancer|epic systems|surgery|clinical"),
    ("finance",        r"credit|\bloan|\bbank|insurance|\bfraud|trading|mortgage|fintech|underwrit"),
    ("transportation", r"self.?driving|autonomous vehicle|autonomous driving|driverless|tesla|uber|waymo|cruise|robotaxi|car crash|aviation|drone|traffic|highway"),
    ("media_content",  r"deepfake|chatbot|content moderation|youtube|facebook|tiktok|twitter|misinformation|fake news|generated image|generative|chatgpt|\bgpt|image generator|hallucinat|recommendation|recommender|llm"),
]


def assign_sector(text: str) -> str | None:
    t = text.lower()
    for name, pat in SECTORS:
        if re.search(pat, t):
            return name
    return None


def main():
    inc = pd.read_csv(RAW / "incidents.csv")
    reports = pd.read_csv(RAW / "reports.csv")
    # Build report_number -> text map
    reports = reports.dropna(subset=["report_number"])
    reports["report_number"] = reports["report_number"].astype(int)
    rep_text = dict(zip(reports["report_number"], reports["text"].fillna("")))
    rep_title = dict(zip(reports["report_number"], reports["title"].fillna("")))
    rep_url = dict(zip(reports["report_number"], reports["url"].fillna("")))

    # Assign sector
    inc["_text"] = (inc["title"].fillna("") + " " + inc["description"].fillna(""))
    inc["sector"] = inc["_text"].apply(assign_sector)
    print("Sector distribution (assigned):")
    print(inc["sector"].value_counts(dropna=False))

    # Preserve any existing sample's incident_ids so we don't waste prior extractions
    out_path = OUT_DIR / "sampled_incidents.json"
    existing_ids = set()
    if out_path.exists():
        try:
            existing_ids = {x["incident_id"] for x in json.loads(out_path.read_text())}
        except Exception:
            existing_ids = set()

    selected = []
    for sector_name, _ in SECTORS:
        candidates = inc[inc["sector"] == sector_name]
        # Anchor any existing picks for this sector first, then top up randomly
        anchor = candidates[candidates["incident_id"].isin(existing_ids)]
        need = PER_SECTOR - len(anchor)
        if need <= 0:
            picks = anchor.head(PER_SECTOR)
        else:
            pool = candidates[~candidates["incident_id"].isin(existing_ids)]
            if len(pool) <= need:
                picks = pd.concat([anchor, pool])
            else:
                picks = pd.concat([anchor, pool.sample(n=need, random_state=42)])
        if len(picks) < PER_SECTOR:
            print(f"WARN: sector {sector_name} has only {len(picks)} candidates (target {PER_SECTOR})")
        for _, row in picks.iterrows():
            # Pull first report text as primary narrative (length-capped to ~4000 chars)
            report_ids = []
            try:
                report_ids = json.loads(row["reports"]) if isinstance(row["reports"], str) else []
            except Exception:
                report_ids = []
            primary_text = ""
            primary_url = ""
            primary_title = ""
            for rid in report_ids:
                if rid in rep_text and rep_text[rid].strip():
                    primary_text = rep_text[rid][:4000]
                    primary_url = rep_url.get(rid, "")
                    primary_title = rep_title.get(rid, "")
                    break
            selected.append({
                "incident_id": int(row["incident_id"]),
                "title": row["title"],
                "date": row["date"],
                "sector_heuristic": sector_name,
                "short_description": row["description"],
                "primary_report_title": primary_title,
                "primary_report_url": primary_url,
                "primary_report_text": primary_text,
            })

    print(f"\nTotal sampled: {len(selected)}")
    out = OUT_DIR / "sampled_incidents.json"
    out.write_text(json.dumps(selected, indent=2, default=str))
    print(f"Wrote: {out}")


if __name__ == "__main__":
    main()

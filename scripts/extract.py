"""
LLM-based pathway extraction for AIID incidents.

Usage:
    python scripts/extract.py --limit 20            # pilot
    python scripts/extract.py                       # full sample
    python scripts/extract.py --resume              # skip already-extracted

Output: data/extracted/pathways.json  (list of {incident_id, ...stages..., _meta})
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from anthropic import Anthropic

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

SAMPLE = ROOT / "data" / "sample" / "sampled_incidents.json"
OUT_DIR = ROOT / "data" / "extracted"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "pathways.json"

MODEL = "claude-sonnet-4-6"

FAILURE_MODES = ["data_bias", "model_error", "spec_gap", "oversight_failure", "misuse"]
HARMS = ["physical", "economic", "discriminatory", "psychological", "reputational", "informational"]
SITUATIONAL_FACTORS = [
    "vulnerable_population",
    "high_stakes_decision",
    "public_facing",
    "safety_critical",
    "automated_at_scale",
    "low_oversight",
]
INTERVENTION_STAGES = ["warning_signal", "failure_mode", "deployment_context"]

SYSTEM_PROMPT = f"""You are extracting a structured escalation pathway from an AI incident report.

Output ONLY valid JSON matching this exact schema:
{{
  "warning_signal": <string or null>,
  "failure_mode": <one of: {FAILURE_MODES}>,
  "deployment_context": {{
    "sector": <string, e.g. "transportation", "healthcare", "media_content", "public_safety", "finance">,
    "situational_factor": <one of: {SITUATIONAL_FACTORS}>
  }},
  "harm": <one of: {HARMS}>,
  "missed_intervention_stage": <one of: {INTERVENTION_STAGES} OR null>,
  "rationale": <one-sentence justification>
}}

Definitions:
- warning_signal: prior near-miss, flagged test issue, known weakness, or user complaint BEFORE the incident. Free-form short string. Use null if NOT present in the text.
- failure_mode: the proximate breakdown.
  - data_bias: training data unrepresentative, biased, or mislabeled
  - model_error: model produced wrong/unsafe output despite reasonable input
  - spec_gap: deployed model used outside its designed purpose
  - oversight_failure: humans-in-the-loop failed to catch/intervene
  - misuse: bad actors weaponized the system
- deployment_context.situational_factor: pick the single dominant factor.
  - vulnerable_population: affects children, elderly, marginalized groups
  - high_stakes_decision: medical, legal, financial, employment outcome
  - safety_critical: physical safety at risk
  - public_facing: consumer-grade, broad public exposure
  - automated_at_scale: ran without per-case review on many cases
  - low_oversight: minimal human review even though stakes warranted it
- harm: the dominant harm type.
- missed_intervention_stage: ONLY non-null if the text documents a specific point where intervention WAS possible but didn't happen (a prior complaint ignored, a test flag overruled, an oversight step skipped). If no such documented opportunity, use null. Do NOT speculate.

Return ONLY the JSON. No prose, no markdown fences.
"""

USER_TEMPLATE = """Incident title: {title}

Short description: {short_description}

Primary report (truncated):
{report_text}
"""


def extract_one(client: Anthropic, incident: dict) -> dict:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": USER_TEMPLATE.format(
                title=incident["title"],
                short_description=incident.get("short_description", ""),
                report_text=incident.get("primary_report_text", "")[:3500],
            ),
        }],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip().rstrip("`").strip()
    return json.loads(text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="Process first N (pilot)")
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY not set in environment or .env")

    incidents = json.loads(SAMPLE.read_text())
    if args.limit:
        incidents = incidents[: args.limit]

    existing = {}
    if args.resume and OUT.exists():
        for row in json.loads(OUT.read_text()):
            existing[row["incident_id"]] = row

    client = Anthropic()
    out = list(existing.values())
    done_ids = set(existing.keys())

    for i, inc in enumerate(incidents, 1):
        if inc["incident_id"] in done_ids:
            continue
        try:
            t0 = time.time()
            pathway = extract_one(client, inc)
            elapsed = time.time() - t0
            row = {
                "incident_id": inc["incident_id"],
                "title": inc["title"],
                "sector_heuristic": inc["sector_heuristic"],
                **pathway,
                "_meta": {"model": MODEL, "elapsed_s": round(elapsed, 2)},
            }
            out.append(row)
            print(f"[{i}/{len(incidents)}] id={inc['incident_id']:>4}  "
                  f"failure={pathway['failure_mode']:<18}  harm={pathway['harm']:<14}  "
                  f"missed={pathway['missed_intervention_stage']}")
        except Exception as e:
            print(f"[{i}] FAILED id={inc['incident_id']}: {e}")
            out.append({
                "incident_id": inc["incident_id"],
                "title": inc["title"],
                "sector_heuristic": inc["sector_heuristic"],
                "_error": str(e),
            })
        # checkpoint every 10
        if i % 10 == 0:
            OUT.write_text(json.dumps(out, indent=2))

    OUT.write_text(json.dumps(out, indent=2))
    n_ok = sum(1 for r in out if "_error" not in r)
    print(f"\nDone. {n_ok}/{len(out)} successful. Wrote {OUT}")


if __name__ == "__main__":
    main()

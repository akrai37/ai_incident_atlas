"""
Per-stage validation of LLM extractions against a blindly hand-coded sample.

Workflow:
  1. Run `python scripts/validate.py --pick`     to choose 30 random incidents and
     emit a blank template at data/extracted/handcoded_template.json.
  2. You (the human author) fill in the template WITHOUT looking at
     data/extracted/pathways.json. Save your answers as data/extracted/handcoded.json.
  3. Run `python scripts/validate.py --report`   to compare and print per-stage
     accuracy plus a confusion-matrix summary for the categorical fields.

Honest framing: this is "blind self-validation," not inter-rater agreement
(true inter-rater would require a second coder). It removes the rubber-stamp
failure mode but is still one person validating their own schema.
"""
import argparse
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "data" / "sample" / "sampled_incidents.json"
PATHWAYS = ROOT / "data" / "extracted" / "pathways.json"
TEMPLATE = ROOT / "data" / "extracted" / "handcoded_template.json"
HANDCODED = ROOT / "data" / "extracted" / "handcoded.json"

N_VALIDATION = 30
SEED = 42

CATEGORICAL_FIELDS = [
    ("failure_mode", "failure_mode"),
    ("sector", "deployment_context.sector"),
    ("situational_factor", "deployment_context.situational_factor"),
    ("harm", "harm"),
    ("missed_intervention_stage", "missed_intervention_stage"),
]


def get(d, path):
    cur = d
    for p in path.split("."):
        if cur is None:
            return None
        cur = cur.get(p) if isinstance(cur, dict) else None
    return cur


def pick():
    sample = json.loads(SAMPLE.read_text())
    random.seed(SEED)
    chosen = random.sample(sample, N_VALIDATION)
    template = []
    for inc in chosen:
        template.append({
            "incident_id": inc["incident_id"],
            "title": inc["title"],
            "short_description": inc["short_description"],
            "primary_report_text_excerpt": inc["primary_report_text"][:1500],
            "your_codes": {
                "warning_signal": "<short string or null>",
                "failure_mode": "<one of: data_bias|model_error|spec_gap|oversight_failure|misuse>",
                "deployment_context": {
                    "sector": "<string e.g. healthcare|transportation|finance|public_safety|media_content>",
                    "situational_factor": "<one of: vulnerable_population|high_stakes_decision|public_facing|safety_critical|automated_at_scale|low_oversight>",
                },
                "harm": "<one of: physical|economic|discriminatory|psychological|reputational|informational>",
                "missed_intervention_stage": "<null OR one of: warning_signal|failure_mode|deployment_context>",
            },
        })
    TEMPLATE.write_text(json.dumps(template, indent=2))
    print(f"Wrote {N_VALIDATION}-incident template to {TEMPLATE}")
    print(f"Hand-code WITHOUT looking at {PATHWAYS}, then save as {HANDCODED}")


def report():
    llm = {r["incident_id"]: r for r in json.loads(PATHWAYS.read_text())}
    if not HANDCODED.exists():
        print(f"No {HANDCODED}. fill in the template first.")
        return
    coded = json.loads(HANDCODED.read_text())

    print(f"Comparing {len(coded)} hand-coded incidents vs LLM extractions.\n")
    field_results = defaultdict(lambda: {"correct": 0, "total": 0, "confusion": Counter()})
    for entry in coded:
        iid = entry["incident_id"]
        if iid not in llm:
            continue
        h = entry["your_codes"]
        # Flatten hand-coded
        h_flat = {
            "failure_mode": h.get("failure_mode"),
            "deployment_context.sector": h.get("deployment_context", {}).get("sector"),
            "deployment_context.situational_factor": h.get("deployment_context", {}).get("situational_factor"),
            "harm": h.get("harm"),
            "missed_intervention_stage": h.get("missed_intervention_stage"),
        }
        for field_name, path in CATEGORICAL_FIELDS:
            h_val = h_flat[path]
            l_val = get(llm[iid], path)
            field_results[field_name]["total"] += 1
            if h_val == l_val:
                field_results[field_name]["correct"] += 1
            else:
                field_results[field_name]["confusion"][f"{h_val} → {l_val}"] += 1

    print(f"{'Stage':<28} {'Accuracy':>10}   {'N':>5}")
    print("-" * 50)
    for field_name, _ in CATEGORICAL_FIELDS:
        r = field_results[field_name]
        if r["total"] == 0:
            continue
        acc = r["correct"] / r["total"]
        print(f"{field_name:<28} {acc*100:>9.1f}%  {r['total']:>5}")
    print()
    print("Confusion (hand → LLM), top mismatches per stage:")
    for field_name, _ in CATEGORICAL_FIELDS:
        c = field_results[field_name]["confusion"]
        if not c:
            continue
        print(f"  {field_name}:")
        for k, v in c.most_common(5):
            print(f"    {v}× {k}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pick", action="store_true")
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()
    if args.pick:
        pick()
    elif args.report:
        report()
    else:
        ap.print_help()


if __name__ == "__main__":
    main()

"""
Enrich data/extracted/pathways.json with a `country` field, extracted by regex
matching country names and major cities in each incident's title + short
description. This is a heuristic, openly documented as such in the writeup.
Country = "unspecified" when no match.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATHWAYS = ROOT / "data" / "extracted" / "pathways.json"
SAMPLE = ROOT / "data" / "sample" / "sampled_incidents.json"

# Mapping of regex pattern -> canonical country name.
# Patterns match country names and major cities. Longer/more specific patterns first.
COUNTRY_PATTERNS = [
    (r"\b(United States|U\.?S\.?A?|America(n)?|Washington|California|New York|Texas|Florida|Chicago|Los Angeles|Detroit|Boston|Houston|Seattle|Sacramento|Las Vegas|Colorado|Arizona|Michigan|Illinois|Pennsylvania|North Carolina|New Jersey|Massachusetts|San Francisco|Silicon Valley|Maine|Minnesota|Ohio|Georgia|Virginia|Kentucky|Wisconsin|Maryland|New Orleans|Atlanta|Phoenix|Indiana|Tennessee|Oklahoma)\b", "USA"),
    (r"\b(United Kingdom|Britain|British|England|English|UK|London|Manchester|Birmingham|Glasgow|Edinburgh|Scotland|Wales|Northern Ireland)\b", "UK"),
    (r"\b(China|Chinese|Beijing|Shanghai|Hangzhou|Shenzhen|Guangzhou|Sichuan|Hong Kong)\b", "China"),
    (r"\b(India|Indian|Mumbai|Delhi|Bangalore|Bengaluru|Hyderabad|Kolkata|Chennai|Pune|Indore|Kerala|Maharashtra|Karnataka)\b", "India"),
    (r"\b(Canada|Canadian|Toronto|Vancouver|Montreal|Ottawa|Calgary|Quebec)\b", "Canada"),
    (r"\b(Australia|Australian|Sydney|Melbourne|Brisbane|Perth|Adelaide|Queensland)\b", "Australia"),
    (r"\b(Germany|German|Berlin|Munich|Hamburg|Frankfurt|Cologne)\b", "Germany"),
    (r"\b(France|French|Paris|Lyon|Marseille)\b", "France"),
    (r"\b(Japan(ese)?|Tokyo|Osaka|Kyoto|Yokohama)\b", "Japan"),
    (r"\b(South Korea|Korean|Seoul|Busan|Republic of Korea)\b", "South Korea"),
    (r"\b(Russia(n)?|Moscow|St\.? Petersburg|Kremlin)\b", "Russia"),
    (r"\b(Brazil(ian)?|Bahia|São Paulo|Sao Paulo|Rio de Janeiro|Brasilia)\b", "Brazil"),
    (r"\b(Israel(i)?|Tel Aviv|Jerusalem)\b", "Israel"),
    (r"\b(Italy|Italian|Rome|Milan|Florence|Naples)\b", "Italy"),
    (r"\b(Spain|Spanish|Madrid|Barcelona|Seville)\b", "Spain"),
    (r"\b(Netherlands|Dutch|Amsterdam|Rotterdam|The Hague)\b", "Netherlands"),
    (r"\b(Norway|Norwegian|Oslo|Bergen)\b", "Norway"),
    (r"\b(Sweden|Swedish|Stockholm|Gothenburg)\b", "Sweden"),
    (r"\b(Finland|Finnish|Helsinki|Pirkkala|Tampere)\b", "Finland"),
    (r"\b(Denmark|Danish|Copenhagen)\b", "Denmark"),
    (r"\b(Singapore(an)?)\b", "Singapore"),
    (r"\b(Malaysia(n)?|Kuala Lumpur|Johor|Penang)\b", "Malaysia"),
    (r"\b(Indonesia(n)?|Jakarta|Bali)\b", "Indonesia"),
    (r"\b(Philippines|Filipino|Manila|Marcos)\b", "Philippines"),
    (r"\b(Thailand|Thai|Bangkok)\b", "Thailand"),
    (r"\b(Vietnam(ese)?|Hanoi|Ho Chi Minh)\b", "Vietnam"),
    (r"\b(Taiwan(ese)?|Taipei)\b", "Taiwan"),
    (r"\b(Pakistan(i)?|Karachi|Islamabad|Lahore)\b", "Pakistan"),
    (r"\b(Bangladesh(i)?|Dhaka)\b", "Bangladesh"),
    (r"\b(Mexico|Mexican|Mexico City|Tijuana)\b", "Mexico"),
    (r"\b(Argentin(a|e|ian)|Buenos Aires)\b", "Argentina"),
    (r"\b(Chile(an)?|Santiago)\b", "Chile"),
    (r"\b(Colombia(n)?|Bogot[áa])\b", "Colombia"),
    (r"\b(South Africa(n)?|Johannesburg|Cape Town|Durban)\b", "South Africa"),
    (r"\b(Nigeria(n)?|Lagos|Abuja|Tinubu)\b", "Nigeria"),
    (r"\b(Kenya(n)?|Nairobi)\b", "Kenya"),
    (r"\b(Egypt(ian)?|Cairo)\b", "Egypt"),
    (r"\b(Turkey|Turkish|Istanbul|Ankara)\b", "Turkey"),
    (r"\b(Iran(ian)?|Tehran)\b", "Iran"),
    (r"\b(Saudi Arabia(n)?|Riyadh|Jeddah)\b", "Saudi Arabia"),
    (r"\b(United Arab Emirates|UAE|Dubai|Abu Dhabi)\b", "UAE"),
    (r"\b(Switzerland|Swiss|Zurich|Geneva)\b", "Switzerland"),
    (r"\b(Belgium|Belgian|Brussels)\b", "Belgium"),
    (r"\b(Ireland|Irish|Dublin)\b", "Ireland"),
    (r"\b(Poland|Polish|Warsaw|Krakow)\b", "Poland"),
    (r"\b(Greece|Greek|Athens|Thessaloniki)\b", "Greece"),
    (r"\b(Portugal|Portuguese|Lisbon|Porto)\b", "Portugal"),
    (r"\b(Austria(n)?|Vienna|Salzburg)\b", "Austria"),
    (r"\b(Ukraine|Ukrainian|Kyiv|Kiev|Zelensk)\b", "Ukraine"),
    (r"\b(New Zealand|Auckland|Wellington)\b", "New Zealand"),
    (r"\b(Malta|Maltese|Valletta)\b", "Malta"),
    (r"\b(Singapore)\b", "Singapore"),
    (r"\b(Montenegro)\b", "Montenegro"),
    (r"\b(Bosnia|Herzegovina|Sarajevo)\b", "Bosnia and Herzegovina"),
]


def detect_country(text: str) -> str:
    if not text:
        return "unspecified"
    for pattern, country in COUNTRY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return country
    return "unspecified"


def main():
    pathways = json.loads(PATHWAYS.read_text())
    sample = {x["incident_id"]: x for x in json.loads(SAMPLE.read_text())}

    counts = {}
    for r in pathways:
        if "_error" in r:
            continue
        inc = sample.get(r["incident_id"], {})
        # Use title + short_description + report excerpt for richer matching
        text = " ".join([
            inc.get("title", ""),
            inc.get("short_description", "") or "",
            (inc.get("primary_report_text", "") or "")[:600],
        ])
        country = detect_country(text)
        r["country"] = country
        # Also pull in the date so the front-end can filter by year
        r["date"] = inc.get("date")
        counts[country] = counts.get(country, 0) + 1

    PATHWAYS.write_text(json.dumps(pathways, indent=2))
    print(f"Tagged {len(pathways)} incidents with country + date.")
    print()
    print("Top countries:")
    for c, n in sorted(counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {c:<20} {n}")


if __name__ == "__main__":
    main()

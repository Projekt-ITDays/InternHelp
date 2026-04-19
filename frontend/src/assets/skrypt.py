import json

with open('frontend/src/assets/umiejetnosci_twarde.json', 'r', encoding='utf-8') as plik:
    dane = json.load(plik)

for element in dane:
    if "nr" in element:
        element["id"] = element.pop("nr")

    if "umiejetnosc" in element:
        element["name"] = element.pop("umiejetnosc")

    if "grupa" in element:
        element["group"] = element.pop("grupa")

    if "popularnosc_ogolna" in element:
        element["general_popularity"] = element.pop("popularnosc_ogolna")

    if "popularnosc_w_grupie" in element:
        element["popularity_in_group"] = element.pop("popularnosc_w_grupie")

    if "popularnosc_grupy" in element:
        element["group_popularity"] = element.pop("popularnosc_grupy")

with open('frontend/src/assets/hard-skills.json', 'w', encoding='utf-8') as plik:
    json.dump(dane, plik, indent=4, ensure_ascii=False)
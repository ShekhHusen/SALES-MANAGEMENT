import json

with open('firebase-blueprint.json', 'r') as f:
    data = json.load(f)

data['firestore']['sale_other_details'] = {
    "schema": "OtherDetail",
    "description": "Additional details like battery and price"
}

with open('firebase-blueprint.json', 'w') as f:
    json.dump(data, f, indent=2)


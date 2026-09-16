import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# Update New Form DialogContent
content = content.replace(
    '<DialogContent className="max-w-6xl rounded-2xl max-h-[90vh] overflow-y-auto">',
    '<DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] rounded-2xl overflow-y-auto">'
)

# Update View Form DialogContent
content = content.replace(
    '<DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">',
    '<DialogContent className="w-[95vw] max-w-[1400px] h-[95vh] rounded-2xl overflow-y-auto">'
)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)
print("Sizes updated")

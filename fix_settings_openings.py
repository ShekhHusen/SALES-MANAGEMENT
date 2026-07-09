import re

with open('src/pages/settings.tsx', 'r') as f:
    c = f.read()

# Match the div starting with {/* Clear Internal Openings */} until the end of its button
c = re.sub(r"\{\/\* Clear Internal Openings \*\/.*?\}\}\n\s*>\n\s*Clear Openings\n\s*<\/Button>\n\s*<\/div>", "", c, flags=re.DOTALL)

# Match the div starting with {/* Clear Internal Transactions */} until the end of its button
c = re.sub(r"\{\/\* Clear Internal Transactions \*\/.*?\}\}\n\s*>\n\s*Clear Transactions\n\s*<\/Button>\n\s*<\/div>", "", c, flags=re.DOTALL)

with open('src/pages/settings.tsx', 'w') as f:
    f.write(c)


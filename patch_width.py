import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

content = content.replace('PopoverContent className="w-[--anchor-width] p-0"', 'PopoverContent className="w-[400px] p-0"')

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)
print("Width patched")

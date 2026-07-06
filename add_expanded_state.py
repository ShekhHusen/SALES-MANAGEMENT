import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace("const [activePopover, setActivePopover] = useState<string | null>(null);", "const [activePopover, setActivePopover] = useState<string | null>(null);\n  const [isInvoiceExpanded, setIsInvoiceExpanded] = useState(true);")

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)


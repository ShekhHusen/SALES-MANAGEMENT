import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# I will find the useEffect block starting at "useEffect(() => {\n    if (selectedSale) {"
# up to "setSerialNumbers([]);\n      setImages({});\n    }\n  }, [selectedSale]);"

pattern = re.compile(r'  useEffect\(\(\) => \{\n    if \(selectedSale\) \{.*?setImages\(\{\}\);\n    \}\n  \}, \[selectedSale\]\);\n', re.DOTALL)
content = re.sub(pattern, '', content)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)


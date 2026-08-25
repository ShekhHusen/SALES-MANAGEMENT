import re

with open('src/components/QuickAdd.tsx', 'r') as f:
    content = f.read()

# Fix the duplicate definition
bad_str = "  const [contactNumber,\n        alternateNumber, setContactNumber] = useState('');\n  const [alternateNumber, setAlternateNumber] = useState('');"
good_str = "  const [contactNumber, setContactNumber] = useState('');\n  const [alternateNumber, setAlternateNumber] = useState('');"

content = content.replace(bad_str, good_str)

with open('src/components/QuickAdd.tsx', 'w') as f:
    f.write(content)

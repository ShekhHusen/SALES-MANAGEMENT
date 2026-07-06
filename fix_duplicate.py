with open('src/pages/purchases.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
count = 0
for line in lines:
    if line.startswith('  const cancelEdit = () => {'):
        count += 1
        if count == 2:
            skip = True
    
    if not skip:
        new_lines.append(line)
        
    if skip and line.startswith('  };'):
        skip = False

with open('src/pages/purchases.tsx', 'w') as f:
    f.writelines(new_lines)


import re
with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    c = f.read()

# Replace loading logic
c = re.sub(r'const checkLoading = \(\) => \{[\s\S]*?\};', 'const checkLoading = () => { setData(prev => ({...prev, loading: false})) };', c)

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(c)


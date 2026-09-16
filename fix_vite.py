with open('vite.config.ts', 'r') as f:
    content = f.read()

content = content.replace("server: {", "build: {\n      chunkSizeWarningLimit: 5000,\n    },\n    server: {")

with open('vite.config.ts', 'w') as f:
    f.write(content)

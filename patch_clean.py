import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

target = """                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-[10px] rounded-lg px-3"
                              onClick={() => setViewQuotation(q)}
                            >
                              <FileSignature className="w-3 h-3 mr-1" /> VIEW
                            </Button>"""

content = content.replace(target, "")

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)
print("Cleaned up duplicate button")

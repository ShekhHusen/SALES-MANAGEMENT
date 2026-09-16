import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# Let's add a console log before the guard to see if it's returning early
target = "if (!quotationTemplateRef.current?.printRef1.current) return;"
replacement = """if (!quotationTemplateRef.current?.printRef1.current) {
      toast.error('Print template not ready yet. Please try again.');
      console.log("Ref is missing:", quotationTemplateRef.current);
      return;
    }"""

content = content.replace(target, replacement)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Patched with toast")

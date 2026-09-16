import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# Instead of relying on a hidden div that might be unmounted or not ref'd properly, let's force render it when the modal is open.
# The hidden div is already there: `{viewQuotation && ( ... )}`
# Let's make sure it's not unmounting unexpectedly.
# We will just delay the PDF generation slightly to ensure the DOM is ready.
# We also change to let html-to-image handle hidden elements better by using a style instead of className absolute left.

target_div = 'className="absolute left-[-9999px] top-0"'
replacement_div = 'style={{ position: "absolute", left: "-9999px", top: 0 }}'
content = content.replace(target_div, replacement_div)

target_print = """  const handlePrintQuotation = async () => {
    if (!quotationTemplateRef.current?.printRef1.current) {
      toast.error('Print template not ready yet. Please try again.');
      console.log("Ref is missing:", quotationTemplateRef.current);
      return;
    }
    setIsGeneratingPdf(true);"""

replacement_print = """  const handlePrintQuotation = async () => {
    // Wait for a tiny bit to ensure the React ref is attached if it was just mounted
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!quotationTemplateRef.current?.printRef1.current) {
      toast.error('Print template not ready yet. Please try again.');
      console.log("Ref is missing:", quotationTemplateRef.current);
      return;
    }
    setIsGeneratingPdf(true);"""

content = content.replace(target_print, replacement_print)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Delayed print and styled div")

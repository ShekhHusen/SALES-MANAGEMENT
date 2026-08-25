import re

with open('src/components/PdfTemplates.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded terms with dynamic ones
old_warranty_and_terms = """              <div className="font-medium mt-[20px]">
                <h4 className="font-bold underline mb-2 text-base">Warranty:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Motor: 6 Months Warranty against manufacturing defects.</li>
                  <li>Battery: Lead-Acid-6 Months, Lithium-ion or Lithium Iron Phosphate 2.5-Years Warranty against manufacturing defects. And other parts of Lithium Battery like BMS and Charger have 1-Year Warranty.</li>
                  <li>Warranty will not cover physical damage, water damage, or misuse.</li>
                </ul>
              </div>

              <div className="mt-[10px] font-medium">
                <h4 className="font-bold underline mb-2 text-base">Terms and Conditions:</h4>
                <ul className="list-disc pl-5">
                  <li>Insurance: On account of purchaser.</li>
                </ul>
              </div>"""

new_warranty_and_terms = """              <div className="font-medium mt-[20px]">
                <h4 className="font-bold underline mb-2 text-base">Warranty:</h4>
                {model?.warrantyInfo ? (
                  <div className="whitespace-pre-line leading-relaxed">{model.warrantyInfo}</div>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Motor: 6 Months Warranty against manufacturing defects.</li>
                    <li>Battery: Lead-Acid-6 Months, Lithium-ion or Lithium Iron Phosphate 2.5-Years Warranty against manufacturing defects. And other parts of Lithium Battery like BMS and Charger have 1-Year Warranty.</li>
                    <li>Warranty will not cover physical damage, water damage, or misuse.</li>
                  </ul>
                )}
              </div>

              <div className="mt-[10px] font-medium">
                <h4 className="font-bold underline mb-2 text-base">Terms and Conditions:</h4>
                {model?.termsAndConditions ? (
                  <div className="whitespace-pre-line leading-relaxed">{model.termsAndConditions}</div>
                ) : (
                  <ul className="list-disc pl-5">
                    <li>Insurance: On account of purchaser.</li>
                  </ul>
                )}
              </div>"""

content = content.replace(old_warranty_and_terms, new_warranty_and_terms)

with open('src/components/PdfTemplates.tsx', 'w') as f:
    f.write(content)

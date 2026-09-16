import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

# Replace the direct access of viewQuotation properties with safe access
target = """<div className="absolute left-[-9999px] top-0">
                <PdfTemplates
                  ref={quotationTemplateRef}
                  sale={{
                    id: viewQuotation.id,
                    customerId: viewQuotation.customerId,
                    chassisNumber: viewQuotation.chassisNumber,
                    saleDate: viewQuotation.date,
                    saleAmount: 0,
                    downPayment: 0,
                    financeAmount: 0,
                    isFinanced: false,
                    status: 'pending',
                    createdAt: viewQuotation.createdAt,
                    otherDetails: {
                      vehiclePrice: 0,
                      noOfBattery: viewQuotation.batteryDetails?.numberOfBattery || 0,
                      serialNumbers: viewQuotation.batteryDetails?.serialNumbers || [],
                    }
                  } as any}
                  vehicle={vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)}
                  customer={parties.find(p => p.id === viewQuotation.customerId)}
                  company={companies.find(comp => comp.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.companyId)}
                  model={models.find(m => m.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.modelId)}
                  docType="quotation"
                />
              </div>"""

replacement = """{viewQuotation && (
              <div className="absolute left-[-9999px] top-0">
                <PdfTemplates
                  ref={quotationTemplateRef}
                  sale={{
                    id: viewQuotation.id,
                    customerId: viewQuotation.customerId,
                    chassisNumber: viewQuotation.chassisNumber,
                    saleDate: viewQuotation.date,
                    saleAmount: 0,
                    downPayment: 0,
                    financeAmount: 0,
                    isFinanced: false,
                    status: 'pending',
                    createdAt: viewQuotation.createdAt,
                    otherDetails: {
                      vehiclePrice: 0,
                      noOfBattery: viewQuotation.batteryDetails?.numberOfBattery || 0,
                      serialNumbers: viewQuotation.batteryDetails?.serialNumbers || [],
                    }
                  } as any}
                  vehicle={vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)}
                  customer={parties.find(p => p.id === viewQuotation.customerId)}
                  company={companies.find(comp => comp.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.companyId)}
                  model={models.find(m => m.id === vehicles.find(vh => vh.chassisNumber === viewQuotation.chassisNumber)?.modelId)}
                  docType="quotation"
                />
              </div>
            )}"""

content = content.replace(target, replacement)

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Null check added")

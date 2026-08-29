import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# Ref
old_refs = """  const quotationTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const trafficTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);"""

new_refs = """  const quotationTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const trafficTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);
  const bikrinamaTemplateRef = useRef<{ printRef1: React.RefObject<HTMLDivElement>, printRef2: React.RefObject<HTMLDivElement> }>(null);"""

content = content.replace(old_refs, new_refs)

# Selection in handleDownloadPDF
old_handle_sel = """    const templateRef = docType === 'quotation' 
      ? quotationTemplateRef 
      : trafficTemplateRef;"""

new_handle_sel = """    const templateRef = docType === 'quotation' 
      ? quotationTemplateRef 
      : docType === 'traffic'
        ? trafficTemplateRef
        : bikrinamaTemplateRef;"""

content = content.replace(old_handle_sel, new_handle_sel)

# Hidden div
old_hidden_templates = """            <PdfTemplates
              ref={trafficTemplateRef}
              sale={selectedSale}
              vehicle={vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)}
              customer={customers.find(c => c.id === selectedSale.customerId)}
              company={companies.find(c => c.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.companyId)}
              model={models.find(m => m.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.modelId)}
              docType="traffic"
              tempDetails={{
                vehiclePrice, paidAmount, duesAmount, fathersName, grandFathersName, customerAltNumber,
                engineNumber, vehicleNumber, citizenshipNumber, batteryType, batteryBrand, bluetoothId,
                productId, notes, noOfBattery, serialNumbers
              }}
            />
          </>"""

new_hidden_templates = """            <PdfTemplates
              ref={trafficTemplateRef}
              sale={selectedSale}
              vehicle={vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)}
              customer={customers.find(c => c.id === selectedSale.customerId)}
              company={companies.find(c => c.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.companyId)}
              model={models.find(m => m.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.modelId)}
              docType="traffic"
              tempDetails={{
                vehiclePrice, paidAmount, duesAmount, fathersName, grandFathersName, customerAltNumber,
                engineNumber, vehicleNumber, citizenshipNumber, batteryType, batteryBrand, bluetoothId,
                productId, notes, noOfBattery, serialNumbers
              }}
            />
            <PdfTemplates
              ref={bikrinamaTemplateRef}
              sale={selectedSale}
              vehicle={vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)}
              customer={customers.find(c => c.id === selectedSale.customerId)}
              company={companies.find(c => c.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.companyId)}
              model={models.find(m => m.id === vehicles.find(v => v.chassisNumber === selectedSale.chassisNumber)?.modelId)}
              docType="bikrinama"
              tempDetails={{
                ...bikrinamaForm,
                vehiclePrice, paidAmount, duesAmount, fathersName, grandFathersName, customerAltNumber,
                engineNumber, vehicleNumber, citizenshipNumber, batteryType, batteryBrand, bluetoothId,
                productId, notes, noOfBattery, serialNumbers
              }}
            />
          </>"""

content = content.replace(old_hidden_templates, new_hidden_templates)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

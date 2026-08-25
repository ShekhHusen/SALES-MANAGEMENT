import re

with open('src/components/PdfTemplates.tsx', 'r') as f:
    content = f.read()

old_battery_section = """              <div className="bg-red-50 p-[10px] border-l-4 border-[#e11d48] mt-[10px]">
                <h4 className="font-bold underline mb-[5px]">BATTERY SERIAL NUMBER DETAIL:</h4>
                <div className="flex flex-col gap-[5px] font-medium">
                  <div className="grid grid-cols-2 gap-4">
                    <div>CATEGORY : <span className="text-[#e11d48] font-bold uppercase">{details.batteryType || ''}</span></div>
                    <div>COMPANY : <span className="text-[#e11d48] font-bold uppercase">{details.batteryBrand || ''}</span></div>
                  </div>
                  <div className="flex justify-between gap-[5px] whitespace-nowrap">
                    <div>MODEL : <span className="text-[#e11d48] font-bold uppercase">{details.batteryBrand || ''}</span></div>
                    <div>PRODUCT ID : <span className="text-[#e11d48] font-bold uppercase">{details.productId || ''}</span></div>
                    <div>BLUETOOTH ID : <span className="text-[#e11d48] font-bold uppercase">{details.bluetoothId || ''}</span></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-y-[5px] mt-[5px] font-medium">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      SN{i+1} : <span className="text-[#e11d48] font-bold uppercase">{serials[i] || ''}</span>
                    </div>
                  ))}
                </div>
              </div>"""

new_battery_section = """              {model?.showBatteryDetails && (
                <div className="bg-red-50 p-[10px] border-l-4 border-[#e11d48] mt-[10px]">
                  <h4 className="font-bold underline mb-[5px]">BATTERY SERIAL NUMBER DETAIL:</h4>
                  <div className="flex flex-col gap-[5px] font-medium">
                    <div className="grid grid-cols-2 gap-4">
                      <div>CATEGORY : <span className="text-[#e11d48] font-bold uppercase">{details.batteryType || ''}</span></div>
                      <div>COMPANY : <span className="text-[#e11d48] font-bold uppercase">{details.batteryBrand || ''}</span></div>
                    </div>
                    <div className="flex justify-between gap-[5px] whitespace-nowrap">
                      <div>MODEL : <span className="text-[#e11d48] font-bold uppercase">{details.batteryBrand || ''}</span></div>
                      <div>PRODUCT ID : <span className="text-[#e11d48] font-bold uppercase">{details.productId || ''}</span></div>
                      <div>BLUETOOTH ID : <span className="text-[#e11d48] font-bold uppercase">{details.bluetoothId || ''}</span></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-y-[5px] mt-[5px] font-medium">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i}>
                        SN{i+1} : <span className="text-[#e11d48] font-bold uppercase">{serials[i] || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}"""

content = content.replace(old_battery_section, new_battery_section)

with open('src/components/PdfTemplates.tsx', 'w') as f:
    f.write(content)

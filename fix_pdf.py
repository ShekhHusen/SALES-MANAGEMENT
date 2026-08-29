import re

with open('src/components/PdfTemplates.tsx', 'r') as f:
    content = f.read()

# Update PdfTemplateProps
content = content.replace("docType: 'quotation' | 'traffic';", "docType: 'quotation' | 'traffic' | 'bikrinama';")

# Restructure the return statement
# From: {docType === 'quotation' ? ( ... ) : ( ... )}
# To: {docType === 'quotation' && ( ... )} {docType === 'traffic' && ( ... )} {docType === 'bikrinama' && ( ... )}

# We need to replace the `? (` and `) : (` carefully.
# The template has:
# return (
#    <>
#      {docType === 'quotation' ? (
#        <>
#          <div 
#            ref={printRef1}

old_return_start = """  return (
    <>
      {docType === 'quotation' ? (
        <>
          <div """

new_return_start = """  return (
    <>
      {docType === 'quotation' && (
        <>
          <div """

content = content.replace(old_return_start, new_return_start)

old_mid = """          </div>
        </>
      ) : (
        <div 
          ref={printRef1}"""

new_mid = """          </div>
        </>
      )}
      
      {docType === 'traffic' && (
        <div 
          ref={printRef1}"""

content = content.replace(old_mid, new_mid)

old_end = """          </div>
        </div>
      )}
    </>
  );"""

new_end = """          </div>
        </div>
      )}

      {docType === 'bikrinama' && (
        <div 
          ref={printRef1}
          className="bg-white w-[210mm] min-w-[210mm] h-[297mm] min-h-[297mm] shrink-0 relative outline-none flex flex-col page-break-after overflow-hidden"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {/* Image Header */}
          <div className="w-full pt-[20px]">
            <img src="/header.png" alt="Header" className="w-full" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
            <div className="hidden w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400 border-b-2 border-slate-200">
                [Missing header.png]
            </div>
          </div>
          
          {/* Background Watermark */}
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 pointer-events-none mt-20">
            <img src="/logo-won.png" alt="Watermark" className="w-[400px] object-contain opacity-60" />
          </div>

          {/* Content Body */}
          <div className="px-12 flex-1 relative z-10 text-base leading-relaxed flex flex-col justify-start pt-[10px] pb-0 font-medium text-black">
              <h3 className="text-center font-bold text-xl underline mb-8">लिखितम बिक्रीनामा</h3>
              
              <p className="text-justify leading-[2.2]">
                लिखितम बिक्रीनामा गरी दिनेको नाम जिल्ला रौतहट गरुडा नगरपालिका वडा नं. ४ मा संचालन रहेकाे <span className="font-bold">श्री जय बौधीमाई ट्रेडर्स गरुडा न.पा. ४ रौतहट</span>का संचालक श्री अनुज साह आगे बिक्रीनामा गराई लिने खरिदकर्ताको नाम जिल्ला <span className="font-bold underline">{details.customerDistrict || '................................'}</span> न.पा / गा.पा <span className="font-bold underline">{details.customerMunicipality || '................................'}</span> वडा नं <span className="font-bold underline">{details.customerWard || '........'}</span> मा बस्ने <span className="font-bold underline">{details.grandFathersName || '...................................................'}</span> को नाति <span className="font-bold underline">{details.fathersName || '...................................................'}</span> को छोरा बर्ष <span className="font-bold underline">{details.customerAge || '........'}</span> को <span className="font-bold underline text-[#e11d48]">{customer?.name || '...................................................'}</span> आगे <span className="font-bold">श्री जय बौधीमाई ट्रेडर्स गरुडा न.पा. ४ रौतहट</span>ले (ON TEST) <span className="font-bold underline text-[#e11d48]">{company?.name || '................'} - {model?.name || '................'}</span> गाडीको चेचिस नं <span className="font-bold underline text-[#e11d48]">{vehicle?.chassisNumber || '................................'}</span> ईन्जिन नं <span className="font-bold underline text-[#e11d48]">{details?.engineNumber || details.productId || '................................'}</span> रंग <span className="font-bold underline text-[#e11d48]">{vehicle?.color || '................................'}</span> भएको गाडी आजको मितिमा खरिदकर्ता <span className="font-bold underline text-[#e11d48]">{customer?.name || '...................................................'}</span> संग रु <span className="font-bold underline text-[#e11d48]">{price.toLocaleString() || '.......................'}</span> अक्षरेपी <span className="font-bold underline text-[#e11d48]">{numberToWords(price)}</span> मात्र मा बिक्री गरिएको ठिक सांचो हो। 
              </p>
              <p className="text-justify leading-[2.2] mt-4">
                यो गाडी बाट आजको मिति देखी हुने कुनै किसिमको हानि नोक्सानी क्षतीपुर्ति दुर्घटना तथा कानुन बिपरितको समाग्री समेत ओसार पसार गरेमा सो समेतको जिम्मेवार म खरिदकर्ताले ब्यहोर्ने छु भनि हामिहरुले आ–आफ्नो मनोमानी राजि खुसि संग श्री जय बौधीमाई ट्रेडस गरुडामा बसी यो खरिद बिक्रीको कागज लेखी लेखाई सही छाप गरी १/१ प्रति लियौ दियौ किनारामा लेखिएको साक्षी सदर पछि कुनै किसिमको उजुर बाजुर गर्ने छैन गरेमा यसै कागजको अधार मानी कानुन बमोजिमको सहुला बुझाउला ईति सम्बत <span className="font-bold underline">{details.nepaliYear || '२०........'}</span> साल <span className="font-bold underline">{details.nepaliMonth || '....................'}</span> महिना <span className="font-bold underline">{details.nepaliDay || '........'}</span> गते रोज <span className="font-bold underline">{details.nepaliDayOfWeek || '....................'}</span> मा शुभम।
              </p>
              
              <div className="flex justify-between mt-24 px-8">
                  <div className="flex flex-col items-center">
                      <div className="h-[2px] w-40 bg-black mb-2"></div>
                      <div className="font-bold">साक्षी १</div>
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="h-[2px] w-40 bg-black mb-2"></div>
                      <div className="font-bold">साक्षी २</div>
                  </div>
                  <div className="flex flex-col items-center">
                      <div className="h-[2px] w-40 bg-black mb-2"></div>
                      <div className="font-bold">खरिदकर्ताको सही छाप</div>
                  </div>
              </div>
          </div>
          
          {/* Image Footer */}
          <div className="absolute bottom-0 left-0 w-full">
            <img src="/footer.png" alt="Footer" className="w-full" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
            <div className="hidden w-full h-16 bg-slate-100 flex items-center justify-center text-slate-400 border-t-2 border-slate-200">
                [Missing footer.png]
            </div>
          </div>
        </div>
      )}
    </>
  );"""

content = content.replace(old_end, new_end)

with open('src/components/PdfTemplates.tsx', 'w') as f:
    f.write(content)

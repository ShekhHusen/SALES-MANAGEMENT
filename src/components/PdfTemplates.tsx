import React, { ForwardedRef } from 'react';
import { format } from 'date-fns';
import { Sale, Vehicle, Party, Company, Model } from '@/types';

// Helper function to convert number to words
export function numberToWords(num: number): string {
  if (!num) return '';
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  if (num === 0) return "Zero";

  const numWords = (n: number): string => {
    if (n === 0) return "";
    let str = "";
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  };

  let wordResult = '';
  let scaleIdx = 0;
  
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      const scale = scales[scaleIdx];
      const chunkStr = numWords(chunk);
      wordResult = chunkStr + (scale ? " " + scale : "") + " " + wordResult;
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }
  
  return wordResult.trim() + " Rupees";
}

interface PdfTemplateProps {
  sale: Sale;
  vehicle?: Vehicle;
  customer?: Party;
  company?: Company;
  model?: Model;
  docType: 'quotation' | 'traffic' | 'bikrinama_ev' | 'bikrinama_petrol';
  // These props allow overriding the saved values with unsaved ones from the form
  tempDetails?: any; 
}

export const PdfTemplates = React.forwardRef(({ sale, vehicle, customer, company, model, docType, tempDetails }: PdfTemplateProps, ref: ForwardedRef<{ printRef1: React.RefObject<HTMLDivElement>; printRef2: React.RefObject<HTMLDivElement> }>) => {
  const printRef1 = React.useRef<HTMLDivElement>(null);
  const printRef2 = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => ({
    printRef1,
    printRef2
  }));

  const details = tempDetails || sale.otherDetails || {};
  const price = Number(details.vehiclePrice || 0);
  const serials = details.serialNumbers || [];

  const renderBikrinama = (type: 'ev' | 'petrol') => (
    <div 
      ref={printRef1}
      className="bg-white w-[210mm] min-w-[210mm] h-[297mm] min-h-[297mm] shrink-0 relative outline-none flex flex-col page-break-after overflow-hidden p-16 pt-24"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '20px', lineHeight: '2' }}
    >
        <div className="text-justify whitespace-pre-wrap">
          लिखितम बिक्रीनामा गरी दिनेको नाम जिल्ला रौतहट गरुडा नगरपालिका वडा नं. ४ मा सञ्चालन रहेको श्री जय बौधीमाई टेड्रर्स गरुडा न.पा.४ रौतहटको सञ्चालक श्री अनुज शाह आगे बिक्रीनामा गराई लिने खरिदकर्ताको नाम जिल्ला <span className="font-bold border-b border-black md:px-2">........................................</span> न.पा. <span className="font-bold border-b border-black md:px-2">........................................</span> वडा नं. <span className="font-bold border-b border-black md:px-2">........</span> मा बस्ने <span className="font-bold border-b border-black md:px-2">{details.grandFathersName || '...................................................'}</span> को नाति <span className="font-bold border-b border-black md:px-2">{details.fathersName || '...................................................'}</span> को छोरा बर्ष <span className="font-bold border-b border-black md:px-2">..........</span> को <span className="font-bold border-b border-black md:px-2">{customer?.name || '...................................................'}</span> आगे जय बौधीमाई टेडर्स गरुडा न.पा.४ रौतहटले (ON TEST) तिन पांग्रे {type === 'ev' ? 'बैट्री बाट चल्ने' : 'बजाज री'} गाडीको चेचिस नं. <span className="font-bold border-b border-black md:px-2">{vehicle?.chassisNumber || '...................................................'}</span> {type === 'petrol' ? <span>इनजिन नं. <span className="font-bold border-b border-black md:px-2">{details.engineNumber || '...................................................'}</span></span> : ''} रंग <span className="font-bold border-b border-black md:px-2">{vehicle?.color || '...................................................'}</span> भएको गाडी आजको मितिमा खरिदकर्ता <span className="font-bold border-b border-black md:px-2">{customer?.name || '...................................................'}</span> सँग रु. <span className="font-bold border-b border-black md:px-2">{price.toLocaleString()}</span> अक्षरेपी <span className="font-bold border-b border-black md:px-2">{numberToWords(price)}</span> मा विक्रि गरिएको ठिक साँचोहो यो गाडी बाट आजको मिति देखी हुने कुनै किसिमको हानि नोक्शानी क्षतीपुर्ति दुर्घटना तथा कानुन बिपरितको समाग्री समेत ओसार पसार गरेमा सो समेतको जिम्मेवार म खरिदकर्ताले व्यहोर्ने छु भनि हामिहरुले आ-आफ्नो मनोमानी राजि खुशि सँग श्री जय बौधीमाई टेड्स गरुडामा बसी यो खरिद बिक्रिको कागज लेखी लेखाई सही छाप गरी १/१ प्रति लियौ दियौ किनारामा लेखिएको साक्षी सदर पछि कुनै किसिमको उजुर बाजुर गर्ने छैन गरेमा यसैकागजको अधारमानी कानुन बमोजिमको सहुला बुझाउला ईति सम्वत २०८२ साल <span className="font-bold border-b border-black md:px-2">............</span> महिना <span className="font-bold border-b border-black md:px-2">..........</span> गते रोज <span className="font-bold border-b border-black md:px-2">..........</span> मा शुभम <span className="font-bold border-b border-black md:px-2">.....................</span>
        </div>

        <div className="mt-28 flex justify-between px-4">
           <div className="w-[60%] font-bold">
               <p className="mb-6 underline underline-offset-4 decoration-2">साक्षी</p>
               <p className="mb-6 whitespace-nowrap">जि. रौतहट ....................न.पा. वडा नं.......मा बस्ने ..........................१</p>
               <p className="whitespace-nowrap">जि. रौतहट ....................न.पा. वडा नं.......मा बस्ने ..........................१</p>
           </div>
           
           <div className="w-[30%] pt-20 border-t-2 border-dashed border-slate-600 text-center font-bold self-end relative">
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2">सहीलेछाप</span>
           </div>
        </div>
    </div>
  );

  return (
    <>
      {docType === 'bikrinama_ev' && renderBikrinama('ev')}
      {docType === 'bikrinama_petrol' && renderBikrinama('petrol')}
      {docType === 'quotation' ? (
        <>
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
            <div className="px-12 flex-1 relative z-10 text-sm leading-relaxed flex flex-col justify-start pt-[10px] pb-0">
              <h2 className="text-base font-bold text-center underline uppercase mt-[10px] mb-[10px] tracking-widest">Quotation</h2>

              <div className="space-y-[5px]">
                <h3 className="text-base font-bold uppercase underline">Jay Baudhimai Traders</h3>
                <p className="font-bold">Dear Sir/Madam,</p>
                <p className="font-medium">We are pleased to furnish estimate of {company?.name ? `${company.name} vehicle` : 'E-rickshaw'} as per following details:</p>
              </div>

              <div className="grid grid-cols-2 mt-[10px] font-medium">
                <div>Model: <span className="text-[#e11d48] font-bold">{model?.name || ''}</span></div>
                <div>Company: <span className="text-[#e11d48] font-bold">{company?.name || ''}</span></div>
              </div>

              <div className="mt-[5px] font-medium">
                Price: Rs. <span className="text-[#e11d48] font-bold">{price.toLocaleString()}</span> /-. 
                (In word Rs. <span className="text-[#e11d48] font-bold">{numberToWords(price)}</span> Only)
              </div>

              <div className="grid grid-cols-3 mt-[10px] font-medium">
                <div>Chassis No: <span className="text-[#e11d48] font-bold">{vehicle?.chassisNumber || ''}</span></div>
                <div>Color: <span className="text-[#e11d48] font-bold">{vehicle?.color || ''}</span></div>
                <div>No. of Battery: <span className="text-[#e11d48] font-bold">{details.noOfBattery || ''}</span></div>
              </div>

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

              <div className="font-medium mt-[20px]">
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
              </div>
              
              <div className="mt-[20px] relative w-full flex justify-between gap-4">
                <div className="w-[70%]">
                  <h4 className="font-bold underline mb-3 uppercase text-base">Customer Details :</h4>
                  <div className="space-y-1 font-medium text-sm mb-6">
                    <div className="grid grid-cols-[140px_1fr] whitespace-nowrap"><span>Customer Name</span><span>: <span className="text-[#e11d48] font-bold uppercase">{customer?.name || ''}</span></span></div>
                    <div className="grid grid-cols-[140px_1fr] whitespace-nowrap"><span>Address</span><span>: <span className="text-[#e11d48] font-bold uppercase">{customer?.address || ''}</span></span></div>
                    <div className="grid grid-cols-[140px_1fr] whitespace-nowrap"><span>Current Address</span><span>: <span className="text-[#e11d48] font-bold uppercase">{customer?.address || ''}</span></span></div>
                    <div className="grid grid-cols-[140px_1fr] whitespace-nowrap"><span>Contact No</span><span>: <span className="text-[#e11d48] font-bold uppercase">{customer?.contactNumber || ''}</span></span></div>
                    <div className="grid grid-cols-[140px_1fr] whitespace-nowrap"><span>Date</span><span>: <span className="text-[#e11d48] font-bold uppercase">{sale.date ? format(sale.date.toDate(), 'dd/MM/yyyy') : ''}</span></span></div>
                  </div>
                  <div className="inline-block mt-4">
                      <h4 className="font-bold capitalize text-sm pt-1 border-t border-black px-8">Customer Sign.</h4>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col items-end justify-end pr-4 pb-2">
                  <div className="flex flex-col items-center">
                      <div className="text-2xl mb-1" style={{ fontFamily: 'Brush Script MT, cursive' }}>Authorized Signiture</div>
                      <div className="text-sm font-bold">Jay Baudhimai Traders</div>
                      <div className="text-xs font-medium">Garuda, Rautahat</div>
                  </div>
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

          <div 
            ref={printRef2}
            className="bg-white w-[210mm] min-w-[210mm] h-[297mm] min-h-[297mm] shrink-0 relative flex flex-col overflow-hidden"
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

            <div className="px-12 flex-1 relative z-10 text-sm leading-relaxed flex flex-col justify-start pt-[10px] pb-8">
               <h4 className="font-bold underline mb-4 uppercase text-base">Details</h4>
               <div className="space-y-4 font-medium mb-10">
                 <div>Father Name: <span className="text-[#e11d48] font-bold uppercase">{details.fathersName || ''}</span></div>
                 <div>Grand Father Name: <span className="text-[#e11d48] font-bold uppercase">{details.grandFathersName || ''}</span></div>
               </div>

               <h4 className="font-bold underline mb-4 capitalize text-base">Note:</h4>
               <div className="min-h-32 mb-10 whitespace-pre-line font-medium text-black">
                 {details.notes || ''}
               </div>

               <h4 className="font-bold underline mb-16 capitalize text-base">Sign. & Chhap</h4>
            </div>

            {/* Image Footer */}
            <div className="absolute bottom-0 left-0 w-full">
              <img src="/footer.png" alt="Footer" className="w-full" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
              <div className="hidden w-full h-16 bg-slate-100 flex items-center justify-center text-slate-400 border-t-2 border-slate-200">
                  [Missing footer.png]
              </div>
            </div>
          </div>
        </>
      ) : (
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
          <div className="px-12 flex-1 relative z-10 text-base leading-relaxed flex flex-col justify-start pt-[10px] pb-0">
            <div className="flex justify-between items-start mb-6 font-medium mt-[10px]">
              <div>
                <p>To,</p>
                <p>Traffic Police Administration</p>
                <p>Garuda, Rautahat</p>
              </div>
              <div>
                <p>Date: <span className="text-[#e11d48] font-bold underline">{sale.date ? format(sale.date.toDate(), 'dd/MM/yyyy') : ''}</span></p>
              </div>
            </div>

            <h4 className="font-bold underline text-center tracking-widest text-lg mb-8">Subject: Regarding the Documents of Vehicle.</h4>

            <div className="space-y-2 mb-10 font-medium">
                <p className="font-bold">Dear Sir,</p>
                <p className="text-justify leading-relaxed">
                  With due respect, <span className="font-bold">Jay Baudhimai Traders</span> has sold the vehicle to the customer on stated date, and the documentation process is on progress. Therefore, kindly cooperate for the operation of vehicle and the documentation will be completed to the earliest.
                </p>
            </div>

            <h4 className="font-bold underline mb-6 text-lg">Vehicle Specification is as follow:</h4>
            
            <div className="space-y-[5px] font-medium mb-12">
                <div className="grid grid-cols-[200px_1fr]"><span>Name of customer</span><span>: <span className="text-[#e11d48] font-bold uppercase">{customer?.name || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Model of vehicle</span><span>: <span className="text-[#e11d48] font-bold uppercase">{model?.name || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Registration No</span><span>: <span className="text-[#e11d48] font-bold uppercase">{vehicle?.registrationNumber || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Color</span><span>: <span className="text-[#e11d48] font-bold uppercase">{vehicle?.color || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Chassis No</span><span>: <span className="text-[#e11d48] font-bold uppercase">{vehicle?.chassisNumber || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Engine No</span><span>: <span className="text-[#e11d48] font-bold uppercase">{details?.engineNumber || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Vehicle Number</span><span>: <span className="text-[#e11d48] font-bold uppercase">{details?.vehicleNumber || ''}</span></span></div>
                <div className="grid grid-cols-[200px_1fr]"><span>Citizenship Certificate no.</span><span>- <span className="text-[#e11d48] font-bold uppercase">{details?.citizenshipNumber || ''}</span></span></div>
            </div>
            
            <div className="mt-auto mb-[130px] font-medium leading-relaxed">
              <p className="font-bold underline text-lg mb-1">Thanks, and Regard's</p>
              <p className="font-bold">Jay Baudhimai Traders</p>
              <p>Garuda-4, Rautahat, Nepal</p>
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
  );
});

PdfTemplates.displayName = 'PdfTemplates';

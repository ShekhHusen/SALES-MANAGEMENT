import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Sale, Vehicle, Company, Model, Party, OtherDetails, DocumentUpload } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowRight, FileImage, CheckCircle, Upload } from 'lucide-react';

export function DocumentProcess() {
  const [activeTab, setActiveTab] = useState<'sales' | 'others' | 'upload' | 'completed'>('sales');
  
  const [sales, setSales] = useState<(Sale & { id: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);

  const [selectedSale, setSelectedSale] = useState<(Sale & { id: string }) | null>(null);

  // Other Details Form State
  const [price, setPrice] = useState<number | ''>('');
  const [numberOfBattery, setNumberOfBattery] = useState<number>(0);
  const [batteryCategory, setBatteryCategory] = useState('');
  const [batteryModel, setBatteryModel] = useState('');
  const [batteryProductId, setBatteryProductId] = useState('');
  const [batteryBluetoothId, setBatteryBluetoothId] = useState('');
  const [batterySerialNumbers, setBatterySerialNumbers] = useState<string[]>([]);

  // Document Upload State
  const [files, setFiles] = useState<{
    selfie?: File;
    citizenshipFront?: File;
    citizenshipBack?: File;
    passportSizePhoto?: File;
    cheque?: File;
    bikrinama?: File;
  }>({});
  
  const [imagePreviews, setImagePreviews] = useState<{
    selfie?: string;
    citizenshipFront?: string;
    citizenshipBack?: string;
    passportSizePhoto?: string;
    cheque?: string;
    bikrinama?: string;
  }>({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), snapshot => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale & { id: string }));
      setSales(salesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sales'));

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), snapshot => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'vehicles'));

    const unsubCompanies = onSnapshot(collection(db, 'companies'), snapshot => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'companies'));

    const unsubModels = onSnapshot(collection(db, 'models'), snapshot => {
      setModels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Model)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'models'));

    const unsubParties = onSnapshot(collection(db, 'parties'), snapshot => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Party)).filter(p => p.type === 'customer'));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'parties'));

    return () => {
      unsubSales();
      unsubVehicles();
      unsubCompanies();
      unsubModels();
      unsubParties();
    };
  }, []);

  const pendingSales = sales.filter(s => !s.documentationCompleted);

  const handleNextToOthers = (sale: Sale & { id: string }) => {
    setSelectedSale(sale);
    setActiveTab('others');
  };

  const handleNextToUpload = () => {
    if (!price) {
      toast.error('Please enter the price.');
      return;
    }
    setActiveTab('upload');
  };

  const handleFileChange = (field: keyof typeof files, file: File | undefined) => {
    if (!file) return;
    setFiles(prev => ({ ...prev, [field]: file }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviews(prev => ({ ...prev, [field]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndComplete = async () => {
    if (!selectedSale) return;
    
    setLoading(true);
    try {
      // 1. We already have base64 data URIs in imagePreviews. Use them instead of Firebase Storage
      // to avoid 'Storage not provisioned' or permission errors.
      const uploadedUrls = { ...imagePreviews };

      const batch = writeBatch(db);

      // 2. Save Other Details
      const otherDetailsRef = doc(collection(db, 'other_details'));
      const otherDetails = {
        chassisNumber: selectedSale.chassisNumber,
        saleId: selectedSale.id,
        price: Number(price),
        batteryDetails: {
          numberOfBattery,
          category: batteryCategory,
          model: batteryModel,
          productId: batteryProductId,
          bluetoothId: batteryBluetoothId,
          serialNumbers: batterySerialNumbers
        },
        createdAt: Timestamp.now()
      };
      batch.set(otherDetailsRef, otherDetails);

      // 3. Save Document Uploads
      const docUploadRef = doc(collection(db, 'document_uploads'));
      const documentData = {
        chassisNumber: selectedSale.chassisNumber,
        saleId: selectedSale.id,
        selfieUrl: uploadedUrls.selfie || null,
        citizenshipFrontUrl: uploadedUrls.citizenshipFront || null,
        citizenshipBackUrl: uploadedUrls.citizenshipBack || null,
        passportSizePhotoUrl: uploadedUrls.passportSizePhoto || null,
        chequeUrl: uploadedUrls.cheque || null,
        bikrinamaUrl: uploadedUrls.bikrinama || null,
        createdAt: Timestamp.now()
      };
      batch.set(docUploadRef, documentData);

      // 4. Update Sale
      const saleRef = doc(db, 'sales', selectedSale.id);
      batch.update(saleRef, { documentationCompleted: true });

      await batch.commit();

      toast.success('Documentation completed successfully!');
      setActiveTab('completed');
      
      // Reset form
      setPrice('');
      setNumberOfBattery(0);
      setBatteryCategory('');
      setBatteryModel('');
      setBatteryProductId('');
      setBatteryBluetoothId('');
      setBatterySerialNumbers([]);
      setFiles({});
      setImagePreviews({});
      
    } catch (error) {
      console.error(error);
      toast.error('Error completing documentation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Document Process</h1>
        <p className="text-sm text-slate-500 font-medium">Manage other details and document uploads for sales.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="sales" disabled={activeTab !== 'sales' && !selectedSale}>1. Sales</TabsTrigger>
          <TabsTrigger value="others" disabled={activeTab === 'sales' || !selectedSale}>2. Others Details</TabsTrigger>
          <TabsTrigger value="upload" disabled={activeTab === 'sales' || activeTab === 'others'}>3. Document Upload</TabsTrigger>
          <TabsTrigger value="completed" disabled={activeTab !== 'completed'}>4. Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Documentation</CardTitle>
              <CardDescription>Select a sale to process its documentation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Chassis</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        No pending sales for documentation.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingSales.map(sale => {
                      const customer = customers.find(c => c.id === sale.customerId);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-bold">#{sale.fileNumber}</TableCell>
                          <TableCell>
                            {sale.date instanceof Timestamp ? sale.date.toDate().toLocaleDateString('en-GB') : ''}
                          </TableCell>
                          <TableCell>{customer?.name}</TableCell>
                          <TableCell className="font-mono">{sale.chassisNumber}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleNextToOthers(sale)}>
                              Process
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="others" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Other Details</CardTitle>
              <CardDescription>Enter pricing and battery information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">Price</label>
                <Input 
                  type="number" 
                  value={price} 
                  onChange={e => setPrice(Number(e.target.value) || '')} 
                  placeholder="Enter price..."
                />
              </div>

              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <h4 className="font-bold text-slate-800">Battery Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Category</label>
                    <Input value={batteryCategory} onChange={e => setBatteryCategory(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Model</label>
                    <Input value={batteryModel} onChange={e => setBatteryModel(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Product ID</label>
                    <Input value={batteryProductId} onChange={e => setBatteryProductId(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Bluetooth ID</label>
                    <Input value={batteryBluetoothId} onChange={e => setBatteryBluetoothId(e.target.value)} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-semibold text-slate-500">No. of Battery</label>
                    <Input 
                      type="number" 
                      min="0"
                      value={numberOfBattery} 
                      onChange={e => {
                        const count = Number(e.target.value) || 0;
                        setNumberOfBattery(count);
                        setBatterySerialNumbers(prev => {
                          const newArr = [...prev];
                          if (count > newArr.length) {
                            return [...newArr, ...Array(count - newArr.length).fill('')];
                          } else {
                            return newArr.slice(0, count);
                          }
                        });
                      }} 
                    />
                  </div>
                </div>

                {numberOfBattery > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500">Serial Numbers</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: numberOfBattery }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 w-4">{idx + 1}.</span>
                          <Input 
                            placeholder={`Serial Number ${idx + 1}`}
                            value={batterySerialNumbers[idx] || ''}
                            onChange={(e) => {
                              const newSerials = [...batterySerialNumbers];
                              newSerials[idx] = e.target.value;
                              setBatterySerialNumbers(newSerials);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab('sales')}>Back</Button>
                <Button onClick={handleNextToUpload}>Save and Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>Upload necessary documentation files.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'selfie', label: 'Selfie' },
                  { id: 'citizenshipFront', label: 'Citizenship Front' },
                  { id: 'citizenshipBack', label: 'Citizenship Back' },
                  { id: 'passportSizePhoto', label: 'Passport Size Photo' },
                  { id: 'cheque', label: 'Cheque' },
                  { id: 'bikrinama', label: 'Bikrinama' }
                ].map(docField => {
                  const previewUrl = imagePreviews[docField.id as keyof typeof imagePreviews];
                  
                  return (
                    <div key={docField.id} className="space-y-2">
                      <label className="text-sm font-semibold">{docField.label}</label>
                      <div 
                        className="relative border-2 border-dashed border-slate-300 hover:border-[#3B82F6] rounded-xl flex flex-col items-center justify-center overflow-hidden group cursor-pointer transition-colors bg-slate-50"
                        style={{ aspectRatio: '4/3' }}
                      >
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={e => handleFileChange(docField.id as any, e.target.files?.[0])}
                        />
                        {previewUrl ? (
                          <img src={previewUrl} alt={docField.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-[#3B82F6]">
                            <FileImage className="w-8 h-8" />
                            <span className="text-xs font-medium">Click to upload</span>
                          </div>
                        )}
                        {previewUrl && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-medium text-sm flex items-center gap-1"><Upload className="w-4 h-4" /> Change</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between pt-8">
                <Button variant="outline" onClick={() => setActiveTab('others')} disabled={loading}>Back</Button>
                <Button 
                  onClick={handleSaveAndComplete} 
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? 'Saving...' : 'Save and Complete'} <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Completed Documentation</CardTitle>
                <CardDescription>Sales that have completed the document process.</CardDescription>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedSale(null);
                  setActiveTab('sales');
                }}
              >
                Process Another Sale
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Chassis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.filter(s => s.documentationCompleted).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        No completed sales found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.filter(s => s.documentationCompleted).map(sale => {
                      const customer = customers.find(c => c.id === sale.customerId);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-bold">#{sale.fileNumber}</TableCell>
                          <TableCell>
                            {sale.date instanceof Timestamp ? sale.date.toDate().toLocaleDateString('en-GB') : ''}
                          </TableCell>
                          <TableCell>{customer?.name}</TableCell>
                          <TableCell className="font-mono">{sale.chassisNumber}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5" /> Completed
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

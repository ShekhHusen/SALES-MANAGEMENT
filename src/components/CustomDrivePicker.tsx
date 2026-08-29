import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, Search, ChevronRight, Loader2, Check, LayoutGrid, List } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime?: string;
}

interface CustomDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderUrl: string) => void;
  accessToken: string | null;
}

export function CustomDrivePicker({ isOpen, onClose, onSelect, accessToken }: CustomDrivePickerProps) {
  const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([{ id: 'root', name: 'My Drive' }]);
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<DriveFile | null>(null);
  
  // View & Sort State
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'modifiedTime'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const currentFolder = folderStack[folderStack.length - 1];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch folders
  useEffect(() => {
    if (isOpen && accessToken) {
      fetchFolders();
      setSelectedFolder(null);
    }
  }, [isOpen, currentFolder.id, accessToken, debouncedSearch, sortBy, sortDir]);

  const fetchFolders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      let q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
      if (debouncedSearch.trim()) {
        q += ` and name contains '${debouncedSearch.trim()}'`;
      } else {
        q += ` and '${currentFolder.id}' in parents`;
      }
      
      let orderString = '';
      if (sortBy === 'name') {
        orderString = sortDir === 'asc' ? 'folder,name' : 'folder,name desc';
      } else {
        orderString = sortDir === 'asc' ? 'folder,modifiedTime' : 'folder,modifiedTime desc';
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=${encodeURIComponent(orderString)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.files) {
        setFolders(data.files);
      }
    } catch (error) {
      console.error("Error fetching drive folders:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-lg font-black text-slate-800 dark:text-slate-100">
            {/* Google Drive Logo SVG */}
            <svg width="24" height="24" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m58.3 64.9-29.1 0 14.5-25.2 29.1 0-14.5 25.2z" fill="#0066da"/>
              <path d="m43.8 39.7 14.5-25.2-29.1 0-14.5 25.2 29.1 0z" fill="#00ac47"/>
              <path d="m72.8 39.7-14.5 25.2-14.5-25.2 14.5-25.2 14.5 25.2z" fill="#ea4335"/>
              <path d="m14.6 39.7 14.5-25.2-14.5-25.2-14.5 25.2 14.5 25.2z" fill="#00832d"/>
              <path d="m72.8 39.7-14.5-25.2 14.5-25.2 14.5 25.2-14.5 25.2z" fill="#ffba00"/>
              <path d="m29.1 64.9-14.5-25.2-14.5 25.2 14.5 25.2 14.5-25.2z" fill="#2684fc"/>
            </svg>
            Select Google Drive Folder
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar: Breadcrumbs & Search & View Options */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm z-10 gap-3">
          <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 pr-4">
            {debouncedSearch ? (
              <span className="text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">Search Results for "{debouncedSearch}"</span>
            ) : (
              folderStack.map((f, i) => (
                <React.Fragment key={f.id}>
                  <button
                    className={`hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors ${i === folderStack.length - 1 ? 'text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => setFolderStack(folderStack.slice(0, i + 1))}
                  >
                    {f.name}
                  </button>
                  {i < folderStack.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                </React.Fragment>
              ))
            )}
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
             <div className="relative w-56 shrink-0">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <Input
                 placeholder="Search folders..."
                 className="pl-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 transition-all font-medium text-sm shadow-inner"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
             
             <select 
                className="h-9 px-2 rounded-lg bg-slate-100 dark:bg-slate-900 border-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [s, d] = e.target.value.split('-');
                  setSortBy(s as 'name' | 'modifiedTime');
                  setSortDir(d as 'asc' | 'desc');
                }}
             >
               <option value="name-asc">Name (A-Z)</option>
               <option value="name-desc">Name (Z-A)</option>
               <option value="modifiedTime-desc">Newest First</option>
               <option value="modifiedTime-asc">Oldest First</option>
             </select>

             <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
               <button 
                  onClick={() => setViewType('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewType === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  title="Grid View"
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewType('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewType === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  title="List View"
               >
                 <List className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

        {/* Folder Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium animate-pulse">Loading folders...</p>
             </div>
          ) : folders.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                <Folder className="w-16 h-16 mb-2 text-slate-300 dark:text-slate-700" strokeWidth={1} />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No folders found</p>
                <p className="text-sm">Try navigating to a different location or adjusting your search.</p>             </div>          ) : (
             <>
               {viewType === 'grid' ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolder(folder)}
                        onDoubleClick={() => {
                           setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
                           setSearchQuery('');
                           setDebouncedSearch('');
                        }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all duration-200 group ${
                          selectedFolder?.id === folder.id 
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 shadow-md transform scale-[1.02]'                             : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-sm'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                          selectedFolder?.id === folder.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
                        }`}>
                          <Folder className={`w-6 h-6 ${
                            selectedFolder?.id === folder.id ? 'fill-blue-500 text-blue-600 dark:text-blue-400 dark:fill-blue-600' : 'fill-slate-300 text-slate-400 dark:fill-slate-700 dark:text-slate-500 group-hover:fill-blue-200 group-hover:text-blue-400'
                          }`} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-sm font-bold truncate ${selectedFolder?.id === folder.id ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200'}`}>
                            {folder.name}
                          </span>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="flex flex-col gap-2">
                    <div className="flex px-4 py-2 text-xs font-bold text-slate-500 uppercase">
                       <div className="flex-1">Name</div>
                       <div className="w-40 text-right">Last Modified</div>
                    </div>
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolder(folder)}
                        onDoubleClick={() => {
                           setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
                           setSearchQuery('');
                           setDebouncedSearch('');
                        }}
                        className={`flex items-center px-4 py-3 rounded-xl border cursor-pointer select-none transition-all duration-200 group ${
                          selectedFolder?.id === folder.id 
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 shadow-md' 
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <Folder className={`w-5 h-5 mr-3 shrink-0 ${
                            selectedFolder?.id === folder.id ? 'fill-blue-500 text-blue-600' : 'fill-slate-300 text-slate-400'
                        }`} />
                        <span className={`flex-1 font-bold text-sm truncate ${selectedFolder?.id === folder.id ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200'}`}>
                          {folder.name}
                        </span>
                        <span className={`text-xs w-40 text-right ${selectedFolder?.id === folder.id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>
                          {folder.modifiedTime ? new Date(folder.modifiedTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '--'}
                        </span>
                      </div>
                    ))}
                 </div>
               )}
             </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
            {selectedFolder ? (
              <>
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </div>
                <span>Selected: <strong className="text-slate-800 dark:text-slate-200 ml-1">{selectedFolder.name}</strong></span>
              </>
            ) : (
              "Double-click a folder to open, click to select"
            )}
          </div>
          <div className="flex gap-3">
             <Button variant="outline" onClick={onClose} className="rounded-xl px-6 h-11 font-bold border-slate-200 dark:border-slate-800">Cancel</Button>
             <Button
               className="rounded-xl px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 transition-all"
               disabled={!selectedFolder}
               onClick={() => {
                 if (selectedFolder) {
                   onSelect(selectedFolder.webViewLink);
                   onClose();
                 }
               }}
             >
               Select Folder
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

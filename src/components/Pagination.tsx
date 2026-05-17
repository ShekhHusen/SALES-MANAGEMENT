import React from 'react';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number | 'all';
  setItemsPerPage?: (val: number | 'all') => void;
  totalItems: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, setItemsPerPage, totalItems }: PaginationProps) {
  if (totalPages <= 1 && itemsPerPage === 'all') {
    // We still want to show the pagination if totalItems > 5 so they can switch back from 'all'
    if (totalItems <= 5) return null;
  }

  const startItem = itemsPerPage === 'all' ? 1 : Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = itemsPerPage === 'all' ? totalItems : Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 dark:border-slate-800">
      <div className="flex-1 flex items-center space-x-4">
        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
          {totalItems === 0 ? 'No entries' : `Showing ${startItem} to ${endItem} of ${totalItems} entries`}
        </div>
        {setItemsPerPage && totalItems > 0 && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rows per page</p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(value === 'all' ? 'all' : Number(value));
                onPageChange(1);
              }}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 border-slate-200 dark:border-slate-800 dark:bg-slate-900"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 border-slate-200 dark:border-slate-800 dark:bg-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-4">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 border-slate-200 dark:border-slate-800 dark:bg-slate-900"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 border-slate-200 dark:border-slate-800 dark:bg-slate-900"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

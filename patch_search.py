import sys

with open("src/pages/quotations.tsx", "r") as f:
    content = f.read()

searchable_select_code = """
function SearchableSelect({
  value,
  onValueChange,
  items,
  placeholder,
  searchPlaceholder = "Search...",
  className = ""
}: {
  value: string;
  onValueChange: (val: string) => void;
  items: { value: string; label: string; subLabel?: string }[];
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.subLabel && item.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between text-left h-10 ${!value ? "text-muted-foreground font-normal" : "font-bold"} ${className}`}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate flex items-center gap-2">
          {value ? (
            <>
              {items.find(item => item.value === value)?.label}
              {items.find(item => item.value === value)?.subLabel && (
                <span className="text-slate-400 font-sans text-xs font-normal">({items.find(item => item.value === value)?.subLabel})</span>
              )}
            </>
          ) : placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
      </Button>
      
      {open && (
        <div className="absolute top-full mt-1 z-[100] w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.value}
                  className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${item.value === value ? "bg-accent/50 font-medium" : ""}`}
                  onClick={() => {
                    onValueChange(item.value);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {item.value === value && <CheckCircle className="h-4 w-4" />}
                  </span>
                  {item.label}
                  {item.subLabel && <span className="text-slate-400 font-sans text-xs ml-2">({item.subLabel})</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Quotations() {
"""

content = content.replace("export function Quotations() {", searchable_select_code)

target_customer = """<Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="font-bold">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-bold uppercase">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>"""

replacement_customer = """<SearchableSelect
                  value={selectedCustomer}
                  onValueChange={setSelectedCustomer}
                  placeholder="Select Customer"
                  searchPlaceholder="Search customer..."
                  items={customers.map(c => ({ value: c.id, label: c.name.toUpperCase() }))}
                  className="font-bold uppercase"
                />"""

target_chassis = """<Select value={selectedChassis} onValueChange={setSelectedChassis}>
                  <SelectTrigger className="font-bold font-mono">
                    <SelectValue placeholder="Select Chassis" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map(v => {
                       const co = companies.find(c => c.id === v.companyId);
                       const mo = models.find(m => m.id === v.modelId);
                       return (
                         <SelectItem key={v.chassisNumber} value={v.chassisNumber} className="font-mono font-bold">
                           {v.chassisNumber} <span className="text-slate-400 font-sans text-xs ml-2">({co?.name} - {mo?.name})</span>
                         </SelectItem>
                       )
                    })}
                  </SelectContent>
                </Select>"""

replacement_chassis = """<SearchableSelect
                  value={selectedChassis}
                  onValueChange={setSelectedChassis}
                  placeholder="Select Chassis"
                  searchPlaceholder="Search chassis or model..."
                  items={availableVehicles.map(v => {
                    const co = companies.find(c => c.id === v.companyId);
                    const mo = models.find(m => m.id === v.modelId);
                    return {
                      value: v.chassisNumber,
                      label: v.chassisNumber,
                      subLabel: `${co?.name || ''} - ${mo?.name || ''}`
                    };
                  })}
                  className="font-bold font-mono"
                />"""

if target_customer in content:
    content = content.replace(target_customer, replacement_customer)
else:
    print("Failed to find target customer block")

if target_chassis in content:
    content = content.replace(target_chassis, replacement_chassis)
else:
    print("Failed to find target chassis block")

with open("src/pages/quotations.tsx", "w") as f:
    f.write(content)

print("Replacement done.")

import re

with open('src/components/QuickAdd.tsx', 'r') as f:
    content = f.read()

# State
content = content.replace(
    "const [contactNumber, setContactNumber] = useState('');",
    "const [contactNumber, setContactNumber] = useState('');\n  const [alternateNumber, setAlternateNumber] = useState('');"
)

# Insert to db
content = content.replace(
    "contactNumber,",
    "contactNumber,\n        alternateNumber,"
)

# Clear state
content = content.replace(
    "setContactNumber('');",
    "setContactNumber('');\n      setAlternateNumber('');"
)

# UI
old_ui = """          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number*</Label>
            <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact" required className="h-10 rounded-lg" />
          </div>"""
new_ui = """          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact*</Label>
              <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Contact" required className="h-10 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alt Contact</Label>
              <Input value={alternateNumber} onChange={(e) => setAlternateNumber(e.target.value)} placeholder="Optional" className="h-10 rounded-lg" />
            </div>
          </div>"""
content = content.replace(old_ui, new_ui)

with open('src/components/QuickAdd.tsx', 'w') as f:
    f.write(content)

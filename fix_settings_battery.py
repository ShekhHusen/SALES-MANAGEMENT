import re

with open('src/pages/settings.tsx', 'r') as f:
    content = f.read()

# Update Checkbox import if not present
if "import { Checkbox } from" not in content:
    content = content.replace("import { Pencil } from 'lucide-react';", "import { Pencil } from 'lucide-react';\nimport { Checkbox } from '@/components/ui/checkbox';")

# State definition
old_state = "const [newModel, setNewModel] = useState({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '' });"
new_state = "const [newModel, setNewModel] = useState({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '', showBatteryDetails: false });"
content = content.replace(old_state, new_state)

# addModel function
old_add = """      await addDoc(collection(db, 'models'), newModel);
      setNewModel({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '' });"""
new_add = """      await addDoc(collection(db, 'models'), newModel);
      setNewModel({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '', showBatteryDetails: false });"""
content = content.replace(old_add, new_add)

# updateModel function
old_update = """        termsAndConditions: editingModel.termsAndConditions || '',
        warrantyInfo: editingModel.warrantyInfo || ''"""
new_update = """        termsAndConditions: editingModel.termsAndConditions || '',
        warrantyInfo: editingModel.warrantyInfo || '',
        showBatteryDetails: editingModel.showBatteryDetails ?? false"""
content = content.replace(old_update, new_update)

# Add Variant UI
old_add_ui_part = """                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Warranty Info (Optional)</label>
                  <Textarea 
                    placeholder="Enter warranty details specific to this model..." 
                    value={newModel.warrantyInfo}
                    onChange={(e) => setNewModel(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                    className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>"""
new_add_ui_part = """                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Warranty Info (Optional)</label>
                  <Textarea 
                    placeholder="Enter warranty details specific to this model..." 
                    value={newModel.warrantyInfo}
                    onChange={(e) => setNewModel(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                    className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="showBatteryDetails" 
                  checked={newModel.showBatteryDetails}
                  onCheckedChange={(checked) => setNewModel(prev => ({ ...prev, showBatteryDetails: checked as boolean }))}
                />
                <label
                  htmlFor="showBatteryDetails"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Print Battery Details / Serial Numbers on Quotation
                </label>
              </div>"""
content = content.replace(old_add_ui_part, new_add_ui_part)

# Edit Dialog UI
old_edit_dialog = """              <div className="space-y-2">
                <label className="text-sm font-medium">Warranty Info</label>
                <Textarea 
                  value={editingModel.warrantyInfo || ''}
                  onChange={(e) => setEditingModel({...editingModel, warrantyInfo: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>"""
new_edit_dialog = """              <div className="space-y-2">
                <label className="text-sm font-medium">Warranty Info</label>
                <Textarea 
                  value={editingModel.warrantyInfo || ''}
                  onChange={(e) => setEditingModel({...editingModel, warrantyInfo: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="editShowBatteryDetails" 
                  checked={editingModel.showBatteryDetails || false}
                  onCheckedChange={(checked) => setEditingModel({...editingModel, showBatteryDetails: checked as boolean})}
                />
                <label
                  htmlFor="editShowBatteryDetails"
                  className="text-sm font-medium leading-none"
                >
                  Print Battery Details / Serial Numbers on Quotation
                </label>
              </div>"""
content = content.replace(old_edit_dialog, new_edit_dialog)


with open('src/pages/settings.tsx', 'w') as f:
    f.write(content)


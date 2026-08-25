import re

with open('src/pages/settings.tsx', 'r') as f:
    content = f.read()

# Import Textarea
content = content.replace("import { Input } from '@/components/ui/input';", "import { Input } from '@/components/ui/input';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Pencil } from 'lucide-react';")

# State
content = content.replace("const [newModel, setNewModel] = useState({ name: '', companyId: '' });", "const [newModel, setNewModel] = useState({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '' });\n  const [editingModel, setEditingModel] = useState<Model | null>(null);")

# addModel function
add_model_old = """  const addModel = async () => {
    if (!newModel.name.trim() || !newModel.companyId) return;
    try {
      await addDoc(collection(db, 'models'), newModel);
      setNewModel({ name: '', companyId: '' });"""
add_model_new = """  const addModel = async () => {
    if (!newModel.name.trim() || !newModel.companyId) return;
    try {
      await addDoc(collection(db, 'models'), newModel);
      setNewModel({ name: '', companyId: '', termsAndConditions: '', warrantyInfo: '' });"""
content = content.replace(add_model_old, add_model_new)

# add updateModel function
update_model_code = """  const updateModel = async () => {
    if (!editingModel || !editingModel.name.trim()) return;
    try {
      await updateDoc(doc(db, 'models', editingModel.id), { 
        name: editingModel.name,
        termsAndConditions: editingModel.termsAndConditions || '',
        warrantyInfo: editingModel.warrantyInfo || ''
      });
      setEditingModel(null);
      toast.success('Model updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'models');
    }
  };
"""
content = content.replace("  const addColor", update_model_code + "\n  const addColor")

# Update Add Variant UI
old_add_ui = """              <div className="flex gap-2">
                <Input 
                  placeholder="Variant/Model Name..." 
                  value={newModel.name}
                  onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                />
                <Button onClick={addModel} className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-6" disabled={isViewer}>
                  <Plus className="h-4 w-4 mr-2" /> Add Variant
                </Button>
              </div>"""
new_add_ui = """              <div className="flex gap-2">
                <Input 
                  placeholder="Variant/Model Name..." 
                  value={newModel.name}
                  onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Terms & Conditions (Optional)</label>
                  <Textarea 
                    placeholder="Enter terms specific to this model..." 
                    value={newModel.termsAndConditions}
                    onChange={(e) => setNewModel(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Warranty Info (Optional)</label>
                  <Textarea 
                    placeholder="Enter warranty details specific to this model..." 
                    value={newModel.warrantyInfo}
                    onChange={(e) => setNewModel(prev => ({ ...prev, warrantyInfo: e.target.value }))}
                    className="min-h-[80px] rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>
              <Button onClick={addModel} className="h-11 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold w-full" disabled={isViewer}>
                <Plus className="h-4 w-4 mr-2" /> Add Variant
              </Button>"""
content = content.replace(old_add_ui, new_add_ui)


# Add edit button to table
old_table_row = """                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => attemptDeleteItem('models', model.id, model.name)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" disabled={isViewer}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>"""
new_table_row = """                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditingModel(model)} className="h-9 w-9 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors" disabled={isViewer}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => attemptDeleteItem('models', model.id, model.name)} className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors" disabled={isViewer}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>"""
content = content.replace(old_table_row, new_table_row)

# Add Edit Dialog at the end
edit_dialog_code = """      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>Modify the variant details and terms.</DialogDescription>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input 
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({...editingModel, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Terms & Conditions</label>
                <Textarea 
                  value={editingModel.termsAndConditions || ''}
                  onChange={(e) => setEditingModel({...editingModel, termsAndConditions: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Warranty Info</label>
                <Textarea 
                  value={editingModel.warrantyInfo || ''}
                  onChange={(e) => setEditingModel({...editingModel, warrantyInfo: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={updateModel} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}"""
content = content.replace("    </div>\n  );\n}", edit_dialog_code)

with open('src/pages/settings.tsx', 'w') as f:
    f.write(content)

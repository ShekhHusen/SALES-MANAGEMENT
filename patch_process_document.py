import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# Import the new component
if "CustomDrivePicker" not in content:
    content = content.replace(
        "import { useGooglePicker } from '@/hooks/useGooglePicker';",
        "import { CustomDrivePicker } from '@/components/CustomDrivePicker';\nimport { useGooglePicker } from '@/hooks/useGooglePicker';"
    )

# Add custom picker state
old_state = "  const [driveFolderInput, setDriveFolderInput] = useState<string>('');"
new_state = """  const [driveFolderInput, setDriveFolderInput] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);"""
content = content.replace(old_state, new_state)

# Update handlePickFolder to use custom picker
old_pick = """  const handlePickFolder = () => {
    showPicker((folderUrl) => {
      setDriveFolderInput(folderUrl);
    });
  };"""
new_pick = """  const handlePickFolder = () => {
    setShowCustomPicker(true);
  };"""
content = content.replace(old_pick, new_pick)

# Inject the CustomDrivePicker component near the Google Drive Folder Modal
old_dialog = "{/* Google Drive Folder Modal */}"
new_dialog = """{/* Custom Google Drive Picker */}
      <CustomDrivePicker 
        isOpen={showCustomPicker} 
        onClose={() => setShowCustomPicker(false)} 
        onSelect={(url) => setDriveFolderInput(url)} 
        accessToken={accessToken} 
      />
      
      {/* Google Drive Folder Modal */}"""
content = content.replace(old_dialog, new_dialog)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

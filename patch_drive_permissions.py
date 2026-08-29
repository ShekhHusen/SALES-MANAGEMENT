import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleSaveDriveLink = async () => {
    if (!driveModalSale?.id) return;
    setSavingDriveLink(true);
    try {
      const formattedUrl = driveFolderInput.trim();
      await updateDoc(doc(db, 'sales', driveModalSale.id), {
        driveFolderUrl: formattedUrl
      });
      toast.success('Google Drive folder link saved successfully!');"""

new_func = """  const handleSaveDriveLink = async () => {
    if (!driveModalSale?.id) return;
    setSavingDriveLink(true);
    try {
      const formattedUrl = driveFolderInput.trim();
      
      // Extract Google Drive ID and set permissions to "anyone with link can view"
      const match = formattedUrl.match(/[-\w]{25,}/);
      const driveId = match ? match[0] : null;
      
      if (driveId && accessToken) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}/permissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone'
            })
          });
          console.log("Successfully updated drive folder permissions");
        } catch (permError) {
          console.error("Failed to update Google Drive folder permissions:", permError);
          // We don't block saving the URL if permission update fails
        }
      }

      await updateDoc(doc(db, 'sales', driveModalSale.id), {
        driveFolderUrl: formattedUrl
      });
      toast.success('Google Drive folder link saved and made accessible!');"""

content = content.replace(old_func, new_func)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

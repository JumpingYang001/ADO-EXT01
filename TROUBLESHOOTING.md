# Extension Troubleshooting Guide

## Why isn't my extension appearing in Azure DevOps?

### 1. Check Extension Installation
- [ ] Go to **Organization Settings** → **Extensions**
- [ ] Check **"Shared"** tab first - if extension is there but no Install button:
  - You may already be the publisher/owner
  - Try the **"Installed"** tab - it might already be installed
  - Check if you have admin permissions
- [ ] If in **"Installed"** tab, verify it's **Enabled**
- [ ] If not found anywhere, upload the latest `.vsix` file: `PDETs-test1.cascading-multiselect-1.0.0.vsix`

#### Missing Install Button Solutions:
1. **Check Installed Tab**: Extension might already be installed
2. **Permission Issue**: You need organization admin rights to install extensions
3. **Publisher Rights**: If you're the publisher, it may auto-install or show differently
4. **Re-upload**: Try uploading a fresh `.vsix` file

### 2. Check Process Type
- [ ] Go to **Organization Settings** → **Process**
- [ ] Verify you're using a **custom/inherited process**, not a system process
- [ ] If using Agile/Scrum/CMMI (system), create an inherited process:
  1. Click "..." on your system process → "Create inherited process"
  2. Go to **Project Settings** → **Project configuration** → Change process

### 3. Check Field Configuration
- [ ] Go to **Process** → **Work Item Types** → **Task** → **Layout**
- [ ] Select a **Text field** (single or multiple lines)
- [ ] In field options, look for "Control" dropdown
- [ ] "Cascading Multi-Select" should appear in the Control list

### 4. Check Field Type Compatibility
The control works with:
- ✅ **Text (single line)**
- ✅ **Text (multiple lines)**  
- ❌ Choice fields
- ❌ Picklist fields
- ❌ Identity fields

### 5. Verify Extension Permissions
- [ ] Extension has `vso.work` and `vso.work_write` scopes
- [ ] Your user has permissions to modify work item types
- [ ] Organization admin has enabled the extension

### 6. Browser/Cache Issues
- [ ] Clear browser cache
- [ ] Try in incognito/private browsing mode
- [ ] Try different browser

## Quick Test Procedure

1. **Install Extension**:
   ```bash
   # Upload PDETs-test1.cascading-multiselect-1.0.0.vsix to your org
   ```

2. **Create Test Field**:
   - Process → Task → New field
   - Name: "Test Multi Select"
   - Type: "Text (single line)"

3. **Add Control**:
   - Edit the new field
   - Control: "Cascading Multi-Select"
   - Configure the inputs

4. **Test**:
   - Create/edit a Task work item
   - Verify the control appears

## Common Error Messages

| Error | Solution |
|-------|----------|
| "Extension not found" | Re-upload the .vsix file |
| "Control not available" | Check field type (must be text) |
| "Permission denied" | Check user permissions |
| "Process cannot be modified" | Use inherited process |

## Debug Information

**Extension Details:**
- ID: `cascading-multiselect`
- Publisher: `PDETs-test1`
- Version: `1.0.0`
- Type: `ms.vss-work-web.work-item-form-control`

**Required Configuration:**
- `parentSelectMode`: boolean
- `fieldValues`: JSON string
- `multiSelectSeparator`: string

## Still Having Issues?

1. Check browser developer console for errors
2. Verify the extension appears in Organization Settings → Extensions
3. Try creating a new inherited process
4. Test with a simple text field first

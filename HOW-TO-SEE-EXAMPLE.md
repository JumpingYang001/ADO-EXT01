# How to See Your Extension Example in Azure DevOps

## ✅ What I Added to vss-extension.json

I added a new **hub contribution** called "Extension Debug" that will make your panel-content example visible in Azure DevOps:

```json
{
  "id": "extension-debug-hub",
  "type": "ms.vss-web.hub",
  "description": "Debug and test hub for extension development",
  "targets": [
    "ms.vss-work-web.work-hub-group"
  ],
  "properties": {
    "name": "Extension Debug",
    "uri": "dist/panel-content.html",
    "icon": "icon-gear",
    "order": 100
  }
}
```

## 🔍 Where to Find Your Example in Azure DevOps

After installing your extension, you'll find the example here:

### **Location: Azure Boards Hub**
1. **Navigate to**: Your Azure DevOps project
2. **Click on**: "Boards" (left navigation)
3. **Look for**: "Extension Debug" tab
   - It will appear as a new tab in the Boards hub group
   - Should have a gear icon 🔧
   - Located after the standard tabs (Backlogs, Boards, Sprints, Queries)

### **What You'll See**
The example page will display:
- **Extension Context**: Shows configuration data passed to your extension
- **Project Context**: Shows current project information
- A React-based interface demonstrating modern Azure DevOps UI patterns

## 📋 Step-by-Step to Access

1. **Install Extension**: Upload your `.vsix` to Azure DevOps
2. **Go to Project**: Navigate to any project where extension is enabled
3. **Open Boards**: Click "Boards" in left navigation
4. **Find Tab**: Look for "Extension Debug" tab (with gear icon)
5. **Click Tab**: Opens your panel-content example

## 🎯 What This Example Demonstrates

- **React Integration**: How to use React with Azure DevOps extensions
- **SDK Usage**: Proper initialization and service calls
- **Context Access**: How to get project and configuration data
- **UI Components**: Using Azure DevOps UI library components
- **Modern Patterns**: Best practices for extension development

## 🔧 Development Benefits

This debug hub is perfect for:
- **Testing**: Quick way to test extension behavior
- **Debugging**: View context and configuration data
- **Development**: Live testing of new features
- **Learning**: Understanding Azure DevOps extension patterns

## 🚀 Next Steps

1. **Install your extension** in Azure DevOps
2. **Navigate to Boards → Extension Debug**
3. **Explore the example** to understand React patterns
4. **Use as template** for future extension features
5. **Remove or customize** when no longer needed

## 💡 Pro Tips

- **Development**: Use this hub for rapid testing during development
- **Production**: Consider removing this debug hub from production versions
- **Customization**: Modify the panel-content component to test your own features
- **Extension Points**: This demonstrates just one extension point - there are many others!

Your extension now has a visible, interactive example that demonstrates modern Azure DevOps extension development patterns!
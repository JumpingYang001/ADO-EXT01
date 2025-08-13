# Quick Start Guide

## Installation Steps

1. **Build the Extension**
   ```bash
   npm install
   npm run build
   npm run package
   ```

2. **Install in Azure DevOps**
   - Upload the generated `.vsix` file to your Azure DevOps organization
   - Go to Organization Settings → Extensions → Browse Marketplace → Upload Extension
   - Install the extension for your organization

3. **Configure Work Item Form**
   - Go to Organization Settings → Process
   - Select your process and work item type
   - Add a new field or select existing field
   - Choose "Cascading Multi-Select" as the control type

## Configuration Examples

### Option 1: Parent Selectable (Skills/Categories)
```json
[
  {
    "id": "technical",
    "name": "Technical Skills",
    "children": [
      { "id": "javascript", "name": "JavaScript" },
      { "id": "typescript", "name": "TypeScript" },
      { "id": "react", "name": "React" },
      { "id": "nodejs", "name": "Node.js" }
    ]
  },
  {
    "id": "soft_skills",
    "name": "Soft Skills",
    "children": [
      { "id": "communication", "name": "Communication" },
      { "id": "leadership", "name": "Leadership" },
      { "id": "teamwork", "name": "Teamwork" }
    ]
  }
]
```
- **Parent Selection Mode**: `true`
- **Multi-Select Separator**: `;`

### Option 2: Child-Only Selection (Specific Categories)
```json
[
  {
    "id": "frontend",
    "name": "Frontend Tasks",
    "children": [
      { "id": "ui_design", "name": "UI Design" },
      { "id": "component_dev", "name": "Component Development" },
      { "id": "responsive_design", "name": "Responsive Design" }
    ]
  },
  {
    "id": "backend",
    "name": "Backend Tasks",
    "children": [
      { "id": "api_dev", "name": "API Development" },
      { "id": "database_design", "name": "Database Design" },
      { "id": "auth_impl", "name": "Authentication Implementation" }
    ]
  }
]
```
- **Parent Selection Mode**: `false`
- **Multi-Select Separator**: `,`

## Features Summary

✅ **Two-level hierarchical selection**
✅ **Configurable parent selection mode**
✅ **Expand/collapse functionality**
✅ **Multiple selection with visual indicators**
✅ **Real-time field updates**
✅ **Customizable value separators**
✅ **Clean, Azure DevOps-styled interface**

## Support

For issues or feature requests, please check the documentation in:
- `README.md` - Main documentation
- `CONFIGURATION.md` - Detailed configuration guide

## Next Steps

1. Create your hierarchical data structure
2. Decide on selection mode (parent selectable or child-only)
3. Configure the control in your work item forms
4. Test with sample data
5. Deploy to your team

Happy coding! 🚀

# Azure DevOps Extension Configuration Guide

## Adding the Control to Work Item Forms

### Step 1: Install the Extension
1. Build and package the extension using `npm run build && npm run package`
2. Upload the `.vsix` file to your Azure DevOps organization
3. Install the extension for your organization

### Step 2: Configure Work Item Type
1. Go to Organization Settings → Process
2. Select your process (Agile, Scrum, etc.)
3. Select the work item type (User Story, Task, etc.)
4. Click "New field" or select an existing field
5. Choose the "Cascading Multi-Select" control

### Step 3: Control Configuration

#### Configuration Option 1: Parent Selectable Mode
Use this when both categories and specific items should be selectable.

**Configuration:**
- **Field Values**: 
```json
[
  {
    "id": "skills_tech",
    "name": "Technical Skills",
    "children": [
      { "id": "js", "name": "JavaScript" },
      { "id": "ts", "name": "TypeScript" },
      { "id": "python", "name": "Python" },
      { "id": "csharp", "name": "C#" }
    ]
  },
  {
    "id": "skills_soft",
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

**Use Case**: Employee skills where someone can have general "Technical Skills" or specific languages.

#### Configuration Option 2: Child-Only Selection Mode
Use this when only specific items should be selectable, with parents for organization only.

**Configuration:**
- **Field Values**:
```json
[
  {
    "id": "category_bugs",
    "name": "Bug Types",
    "children": [
      { "id": "ui_bug", "name": "UI Bug" },
      { "id": "logic_bug", "name": "Logic Bug" },
      { "id": "performance_bug", "name": "Performance Bug" }
    ]
  },
  {
    "id": "category_features",
    "name": "Feature Types",
    "children": [
      { "id": "new_feature", "name": "New Feature" },
      { "id": "enhancement", "name": "Enhancement" },
      { "id": "integration", "name": "Integration" }
    ]
  }
]
```
- **Parent Selection Mode**: `false`
- **Multi-Select Separator**: `,`

**Use Case**: Work item categorization where items must be assigned to specific types, not general categories.

## Real-World Examples

### Example 1: Project Roles Assignment
```json
[
  {
    "id": "dev_roles",
    "name": "Development Roles",
    "children": [
      { "id": "frontend_dev", "name": "Frontend Developer" },
      { "id": "backend_dev", "name": "Backend Developer" },
      { "id": "fullstack_dev", "name": "Full-Stack Developer" },
      { "id": "mobile_dev", "name": "Mobile Developer" }
    ]
  },
  {
    "id": "qa_roles",
    "name": "Quality Assurance",
    "children": [
      { "id": "manual_tester", "name": "Manual Tester" },
      { "id": "automation_tester", "name": "Automation Tester" },
      { "id": "performance_tester", "name": "Performance Tester" }
    ]
  },
  {
    "id": "ops_roles",
    "name": "Operations",
    "children": [
      { "id": "devops_engineer", "name": "DevOps Engineer" },
      { "id": "sre", "name": "Site Reliability Engineer" },
      { "id": "security_engineer", "name": "Security Engineer" }
    ]
  }
]
```

### Example 2: Technology Stack Selection
```json
[
  {
    "id": "frontend_tech",
    "name": "Frontend Technologies",
    "children": [
      { "id": "react", "name": "React" },
      { "id": "vue", "name": "Vue.js" },
      { "id": "angular", "name": "Angular" },
      { "id": "svelte", "name": "Svelte" }
    ]
  },
  {
    "id": "backend_tech",
    "name": "Backend Technologies",
    "children": [
      { "id": "nodejs", "name": "Node.js" },
      { "id": "dotnet", "name": ".NET Core" },
      { "id": "java_spring", "name": "Java Spring" },
      { "id": "python_django", "name": "Python Django" }
    ]
  },
  {
    "id": "database_tech",
    "name": "Database Technologies",
    "children": [
      { "id": "sql_server", "name": "SQL Server" },
      { "id": "postgresql", "name": "PostgreSQL" },
      { "id": "mongodb", "name": "MongoDB" },
      { "id": "redis", "name": "Redis" }
    ]
  }
]
```

## Tips and Best Practices

1. **Keep hierarchy simple**: Limit to 2 levels for best user experience
2. **Use descriptive names**: Make item names clear and unambiguous
3. **Consistent separators**: Use the same separator across similar fields
4. **Test configurations**: Always test with sample data before deploying
5. **Document choices**: Document why you chose parent-selectable vs child-only mode

## Troubleshooting

### Common Issues

1. **Field not saving values**: Check that the field name is correctly configured
2. **JSON parsing errors**: Validate your JSON structure using a JSON validator
3. **Selection not working**: Verify parent selection mode matches your intent
4. **Display issues**: Check browser console for JavaScript errors

### Debug Mode
To enable debug logging, open browser developer tools and check the console for any error messages.

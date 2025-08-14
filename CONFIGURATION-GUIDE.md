# Azure DevOps Extension Configuration Guide

## Overview

This document explains how to configure the Cascading Multi-Select control in Azure DevOps and how the configuration flows from the ADO portal to your extension code through `SDK.getConfiguration()`.

## Configuration Flow

```mermaid
graph LR
    A[ADO Admin Portal] --> B[Work Item Type]
    B --> C[Field Configuration]
    C --> D[Control Selection]
    D --> E[Input Parameters]
    E --> F[SDK.getConfiguration()]
    F --> G[Extension Code]
```

## Step-by-Step Configuration

### 1. Access Azure DevOps Process Customization

1. Navigate to **Organization Settings** → **Process**
2. Select your process (Agile, Scrum, CMMI, or custom process)
3. Choose the work item type you want to customize (e.g., User Story, Task, Bug)
4. Click on **"Layout"** tab

### 2. Add or Modify a Field

#### Option A: Create New Field
1. Click **"New field"**
2. Set **Name**: e.g., "Skills", "Categories", "Technologies"
3. Set **Type**: **"Text (single line)"** or **"Text (multiple lines)"**
4. Click **"Layout"** tab after field creation

#### Option B: Modify Existing Field
1. Select an existing text field
2. Click **"Options"** → **"Edit"**

### 3. Configure the Control

1. In the field's layout settings:
   - **Control**: Select **"Cascading Multi-Select"** (your extension)
   - This will show the configuration inputs defined in your `vss-extension.json`

### 4. Set Configuration Parameters

Your extension defines these configuration inputs:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `parentSelectMode` | Boolean | Whether parent items are selectable | `true` / `false` |
| `fieldValues` | String (JSON) | Hierarchical data structure | See examples below |
| `multiSelectSeparator` | String | Separator for multiple values | `;` or `,` |

## Configuration Examples

### Example 1: Skills Assessment (Parent Selectable)

**Configuration:**
- **Parent Selection Mode**: ✅ `true`
- **Multi-Select Separator**: `;`
- **Field Values**:

```json
[
  {
    "id": "technical_skills",
    "name": "Technical Skills",
    "expanded": true,
    "children": [
      { "id": "javascript", "name": "JavaScript" },
      { "id": "typescript", "name": "TypeScript" },
      { "id": "react", "name": "React" },
      { "id": "nodejs", "name": "Node.js" },
      { "id": "python", "name": "Python" },
      { "id": "csharp", "name": "C#" }
    ]
  },
  {
    "id": "soft_skills",
    "name": "Soft Skills",
    "children": [
      { "id": "communication", "name": "Communication" },
      { "id": "leadership", "name": "Leadership" },
      { "id": "teamwork", "name": "Teamwork" },
      { "id": "problem_solving", "name": "Problem Solving" }
    ]
  },
  {
    "id": "tools",
    "name": "Tools & Technologies",
    "children": [
      { "id": "git", "name": "Git" },
      { "id": "docker", "name": "Docker" },
      { "id": "azure", "name": "Azure DevOps" },
      { "id": "jira", "name": "Jira" }
    ]
  }
]
```

**Result**: Users can select both categories (e.g., "Technical Skills") and specific items (e.g., "JavaScript", "React").

### Example 2: Task Categorization (Child-Only Selection)

**Configuration:**
- **Parent Selection Mode**: ❌ `false`
- **Multi-Select Separator**: `,`
- **Field Values**:

```json
[
  {
    "id": "development",
    "name": "Development Tasks",
    "expanded": true,
    "children": [
      { "id": "frontend_dev", "name": "Frontend Development" },
      { "id": "backend_dev", "name": "Backend Development" },
      { "id": "api_dev", "name": "API Development" },
      { "id": "database_dev", "name": "Database Development" }
    ]
  },
  {
    "id": "testing",
    "name": "Testing Tasks",
    "children": [
      { "id": "unit_testing", "name": "Unit Testing" },
      { "id": "integration_testing", "name": "Integration Testing" },
      { "id": "e2e_testing", "name": "End-to-End Testing" },
      { "id": "performance_testing", "name": "Performance Testing" }
    ]
  },
  {
    "id": "devops",
    "name": "DevOps Tasks",
    "children": [
      { "id": "ci_cd", "name": "CI/CD Pipeline" },
      { "id": "infrastructure", "name": "Infrastructure Setup" },
      { "id": "monitoring", "name": "Monitoring & Alerting" },
      { "id": "security", "name": "Security Implementation" }
    ]
  }
]
```

**Result**: Users can only select specific tasks, not the general categories.

## How Configuration Reaches Your Code

### 1. Extension Manifest (`vss-extension.json`)

```json
{
  "contributions": [
    {
      "id": "cascading-multiselect-control",
      "type": "ms.vss-work-web.work-item-form-control",
      "properties": {
        "name": "Cascading Multi-Select",
        "inputs": [
          {
            "id": "parentSelectMode",
            "name": "Parent Selection Mode",
            "type": "boolean"
          },
          {
            "id": "fieldValues",
            "name": "Field Values",
            "type": "string"
          },
          {
            "id": "multiSelectSeparator",
            "name": "Multi-Select Separator",
            "type": "string"
          }
        ]
      }
    }
  ]
}
```

### 2. Code Implementation

```typescript
// Get configuration from the control
const config = SDK.getConfiguration();
this.log('Configuration received', config);

// Extract field name (automatically provided by ADO)
this.fieldName = config.witInputs["FieldName"] || "";

// Parse control-specific configuration
this.configuration = {
  parentSelectMode: config.witInputs["parentSelectMode"] === "true",
  fieldValues: config.witInputs["fieldValues"] || "[]",
  multiSelectSeparator: config.witInputs["multiSelectSeparator"] || ";"
};

// Parse hierarchical data
this.data = JSON.parse(this.configuration.fieldValues);
```

### 3. Configuration Object Structure

The `SDK.getConfiguration()` returns:

```typescript
{
  "witInputs": {
    "FieldName": "CustomField_12345",           // Auto-generated by ADO
    "parentSelectMode": "true",                 // Your boolean input as string
    "fieldValues": "[{\"id\":\"tech\",...}]",   // Your JSON as string
    "multiSelectSeparator": ";"                 // Your separator string
  }
}
```

## Data Storage Format

### Field Value Examples

The selected values are stored in the work item field as a delimited string:

| Selection Type | Example Value | Description |
|----------------|---------------|-------------|
| Single item | `"javascript"` | One child selected |
| Multiple children | `"javascript;react;nodejs"` | Multiple children selected |
| Parent + children | `"technical_skills;javascript;react"` | Parent and children (if parent selectable) |
| Mixed categories | `"javascript;communication;git"` | Items from different categories |

### Parsing Logic

```typescript
// Loading existing values
const currentValue = await this.workItemFormService.getFieldValue(this.fieldName);
if (currentValue) {
  const values = currentValue.split(this.configuration.multiSelectSeparator);
  this.selectedValues = new Set(values.map(v => v.trim()).filter(v => v));
}

// Saving new values
const value = Array.from(this.selectedValues).join(this.configuration.multiSelectSeparator);
await this.workItemFormService.setFieldValue(this.fieldName, value);
```

## Best Practices

### 1. JSON Structure Guidelines

- **Keep IDs unique** across all levels
- **Use descriptive names** for better user experience
- **Limit hierarchy depth** to 2 levels for optimal performance
- **Set `expanded: true`** for categories you want open by default

### 2. Separator Selection

| Separator | Best For | Avoid When |
|-----------|----------|------------|
| `;` | General use, clean separation | Data contains semicolons |
| `,` | CSV-like data | Data contains commas |
| `\|` | Special characters in data | Data contains pipes |

### 3. Parent Selection Mode

| Mode | Use Case | Example |
|------|----------|---------|
| `true` | Skills, competencies, flexible categorization | Employee skills, project technologies |
| `false` | Strict categorization, work classification | Task types, bug categories |

## Troubleshooting

### Common Configuration Issues

1. **Invalid JSON**: Use a JSON validator before inputting
2. **Duplicate IDs**: Ensure all `id` values are unique
3. **Wrong separator**: Check for conflicts with your data
4. **Field type mismatch**: Use text fields, not choice fields

### Debug Configuration

Add this to your extension for debugging:

```typescript
private log(message: string, data?: any): void {
  if (CascadingMultiSelectControl.DEBUG) {
    console.log(`[CascadingMultiSelect] ${message}`, data || '');
  }
}

// In initialize method
this.log('Configuration received', config);
this.log('Configuration parsed', this.configuration);
this.log('Hierarchical data parsed', this.data);
```

## Summary

The configuration flow ensures that:
1. **Administrators** can customize control behavior without code changes
2. **Users** get a tailored experience based on their organization's needs
3. **Developers** have a clean API through `SDK.getConfiguration()`
4. **Data integrity** is maintained through proper parsing and validation

This flexible configuration system makes the Cascading Multi-Select control adaptable to various organizational needs while maintaining a consistent user experience.

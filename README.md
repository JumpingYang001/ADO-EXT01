# Cascading Multi-Select Azure DevOps Extension

A configurable cascading multi-selection control for Azure DevOps work items that supports two-level hierarchical data with flexible selection modes.

## Features

- **Two Selection Modes:**
  1. **Parent Selectable Mode**: Both parent and child items can be selected independently
  2. **Child-Only Mode**: Only child (leaf) items can be selected, parents are for organization only

- **Hierarchical Display**: Clean tree-like interface with expand/collapse functionality
- **Multi-Selection**: Support for selecting multiple items with visual indicators
- **Configurable Separator**: Customize how multiple values are stored in the field
- **Real-time Updates**: Selected values are immediately saved to the work item field

## Installation

1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. Package the extension:
   ```bash
   npm run package
   ```

3. Upload the `.vsix` file to your Azure DevOps organization

## Configuration

When adding the control to a work item form, configure these inputs:

### Required Inputs

- **Field Values** (`fieldValues`): JSON string defining the hierarchical data structure

### Optional Inputs

- **Parent Selection Mode** (`parentSelectMode`): 
  - `true`: Parent items are selectable (default: false)
  - `false`: Only child items are selectable
- **Multi-Select Separator** (`multiSelectSeparator`): Character(s) to separate multiple values (default: ";")

## Data Structure

The `fieldValues` input should be a JSON string with the following structure:

```json
[
  {
    "id": "category1",
    "name": "Development",
    "children": [
      { "id": "dev1", "name": "Frontend Development" },
      { "id": "dev2", "name": "Backend Development" },
      { "id": "dev3", "name": "Database Development" }
    ]
  },
  {
    "id": "category2",
    "name": "Testing",
    "children": [
      { "id": "test1", "name": "Unit Testing" },
      { "id": "test2", "name": "Integration Testing" },
      { "id": "test3", "name": "Performance Testing" }
    ]
  },
  {
    "id": "category3",
    "name": "Documentation",
    "children": [
      { "id": "doc1", "name": "User Documentation" },
      { "id": "doc2", "name": "Technical Documentation" }
    ]
  }
]
```

## Usage Examples

### Example 1: Skills Selection (Parent Selectable)
Configure a "Skills" field where both technology categories and specific skills can be selected:

- **Parent Selection Mode**: `true`
- **Field Values**: Skills hierarchy JSON
- **Use Case**: Employee can select "Frontend Development" as a general skill or specific skills like "React" and "TypeScript"

### Example 2: Task Categories (Child-Only Selection)
Configure a "Task Type" field where only specific task types can be selected:

- **Parent Selection Mode**: `false`
- **Field Values**: Task categories hierarchy JSON
- **Use Case**: Work items must be assigned to specific task types, not general categories

## Field Value Format

Selected values are stored as a delimited string in the target field:
- Single selection: `"dev1"`
- Multiple selections: `"dev1;test2;doc1"` (using semicolon separator)

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- tfx-cli (for packaging)

### Build Commands
```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean

# Package extension
npm run package
```

### Project Structure
```
├── src/
│   ├── CascadingMultiSelect.ts    # Main control logic
│   └── CascadingMultiSelect.html  # Control UI template
├── dist/                          # Build output
├── images/                        # Extension icons
├── vss-extension.json            # Extension manifest
├── package.json                  # Dependencies and scripts
├── webpack.config.js             # Build configuration
└── tsconfig.json                 # TypeScript configuration
```

## Browser Support

- Microsoft Edge (Chromium)
- Google Chrome
- Mozilla Firefox
- Safari (latest versions)

## License

MIT License - see LICENSE file for details.

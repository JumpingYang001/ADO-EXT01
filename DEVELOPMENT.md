# Azure DevOps Extension Development Guide

This extension has been enhanced with development tools and examples from the azure-devops-extension-sample.

## New Features Added

### 1. Enhanced Development Environment
- **React Support**: Added React and TypeScript support for modern UI development
- **Testing Framework**: Jest testing setup with coverage reporting
- **Development Server**: Webpack dev server for hot reloading
- **SCSS Support**: Enhanced styling capabilities

### 2. New Development Scripts
```bash
# Building
npm run build          # Production build with tests
npm run build:dev      # Development build
npm run dev            # Development watch mode
npm run start:dev      # Start development server

# Testing
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode

# Packaging
npm run package        # Create extension package
npm run package:dev    # Create development package
```

### 3. Example Components
- **Panel Content Example**: Located in `src/Examples/panel-content/`
  - Demonstrates React-based extension development
  - Shows how to use Azure DevOps SDK with React
  - Example of context retrieval and display

### 4. Enhanced TypeScript Configuration
- Added JSX support
- React types and dependencies
- Better module resolution

### 5. Testing Infrastructure
- Jest configuration for unit testing
- Mock files for assets and styles
- Test coverage reporting
- Example test file in `src/Tests/`

## Project Structure
```
src/
├── CascadingMultiSelect.ts    # Your original control
├── IdentityMultiSelect.ts     # Your original control
├── Examples/                  # React-based examples
│   ├── Common.tsx            # Shared React utilities
│   ├── Common.scss           # Shared styles
│   └── panel-content/        # Panel content example
├── Tests/                    # Unit tests
└── __mocks__/               # Jest mocks
```

## Development Workflow

### For Traditional Extensions (Current Approach)
Continue using your existing TypeScript files:
- `CascadingMultiSelect.ts`
- `IdentityMultiSelect.ts`

### For New React-Based Extensions
Use the example in `src/Examples/panel-content/` as a template:
1. Create component directory under `src/Examples/`
2. Add TypeScript React component (.tsx)
3. Add corresponding HTML template
4. Update webpack.config.js to include new entry point

### Testing
1. Write tests in `src/Tests/` directory
2. Run `npm run test` to execute tests
3. View coverage reports in `coverage/` directory

## Next Steps

1. **Install Dependencies**: Run `npm install` to get all new packages
2. **Build**: Run `npm run build:dev` to test the enhanced build process
3. **Test**: Run `npm run test` to verify testing setup
4. **Explore Examples**: Look at the panel-content example for React patterns

## Migration Benefits

- **Better Developer Experience**: Hot reloading, testing, modern tooling
- **Modern UI Framework**: React with Azure DevOps UI components
- **Code Quality**: Linting, testing, and coverage reporting
- **Scalability**: Better project structure for larger extensions
- **Community Patterns**: Following Microsoft's recommended practices

Your existing extension functionality remains unchanged, but you now have enhanced development capabilities for future features.
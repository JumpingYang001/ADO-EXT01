# Debugging Azure DevOps Extension Locally

## Overview

Debugging Azure DevOps extensions locally requires a combination of development builds, browser developer tools, and sometimes a local test environment. Here are the main approaches:

## 1. Development Build with Watch Mode

First, use the development build to get unminified code and source maps:

```bash
npm run dev
```

This will:
- Build in development mode (unminified)
- Watch for file changes and rebuild automatically
- Generate source maps for easier debugging

## 2. Browser Developer Tools Debugging

### Method 1: Debug in Azure DevOps (Recommended)

1. **Install the extension** in your Azure DevOps organization
2. **Configure a work item form** with your control
3. **Open a work item** that uses your control
4. **Open browser developer tools** (F12)
5. **Check the Console tab** for any JavaScript errors
6. **Use the Sources tab** to set breakpoints in your TypeScript code

### Method 2: Local HTML Testing

Create a test HTML file to debug the control in isolation:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Cascading Multi-Select Test</title>
    <script src="https://dev.azure.com/mseng/_apis/public/gallery/extensionSDK/3.0.0/SDK.js"></script>
</head>
<body>
    <div id="cascading-multiselect-container"></div>
    <script src="dist/CascadingMultiSelect.js"></script>
    <script>
        // Mock Azure DevOps SDK for local testing
        if (!window.SDK) {
            window.SDK = {
                init: () => Promise.resolve(),
                ready: () => Promise.resolve(),
                getConfiguration: () => ({
                    witInputs: {
                        parentSelectMode: "true",
                        fieldValues: JSON.stringify([
                            {
                                "id": "test1",
                                "name": "Test Category 1",
                                "children": [
                                    { "id": "test1_1", "name": "Test Item 1.1" },
                                    { "id": "test1_2", "name": "Test Item 1.2" }
                                ]
                            }
                        ]),
                        multiSelectSeparator: ";"
                    }
                }),
                getService: () => Promise.resolve({
                    getFieldValue: () => Promise.resolve(""),
                    setFieldValue: () => Promise.resolve()
                }),
                notifyLoadSucceeded: () => {},
                notifyLoadFailed: () => {}
            };
        }
    </script>
</body>
</html>
```

## 3. Enhanced Debugging Scripts

Let me add some debugging scripts to your package.json:

```json
{
  "scripts": {
    "dev:debug": "webpack --mode development --devtool source-map --watch",
    "serve": "npx http-server dist -p 8080 -o",
    "debug:local": "npm run build:debug && npm run serve"
  }
}
```

## 4. Adding Debug Logging

Update your TypeScript code to include debug logging:

```typescript
class CascadingMultiSelectControl {
  private static DEBUG = true; // Set to false for production
  
  private log(message: string, data?: any): void {
    if (CascadingMultiSelectControl.DEBUG) {
      console.log(`[CascadingMultiSelect] ${message}`, data || '');
    }
  }
  
  private async initialize(): Promise<void> {
    this.log('Initializing control...');
    try {
      await SDK.init();
      this.log('SDK initialized');
      await SDK.ready();
      this.log('SDK ready');
      
      // ... rest of your code
    } catch (error) {
      this.log('Initialization failed', error);
      console.error('Control initialization error:', error);
    }
  }
}
```

## 5. Debugging Common Issues

### Issue: Extension not loading
**Debug steps:**
1. Check browser console for errors
2. Verify extension is properly installed
3. Check vss-extension.json configuration
4. Verify file paths in manifest

### Issue: Field values not saving
**Debug steps:**
1. Check if `getFieldValue`/`setFieldValue` calls are working
2. Verify field name configuration
3. Check Azure DevOps permissions
4. Add logging to field update methods

### Issue: Configuration not loading
**Debug steps:**
1. Verify `getConfiguration()` returns expected values
2. Check JSON parsing in fieldValues
3. Add logging to configuration loading

## 6. Live Debugging Setup

For real-time debugging while the extension runs in Azure DevOps:

1. **Use development build:**
   ```bash
   npm run dev
   ```

2. **Enable source maps in webpack.config.js:**
   ```javascript
   module.exports = {
     mode: 'development',
     devtool: 'source-map',
     // ... rest of config
   };
   ```

3. **Set breakpoints in browser:**
   - Open DevTools → Sources
   - Find your TypeScript files under `webpack://`
   - Set breakpoints directly in TypeScript code

## 7. Mock Testing Environment

Create a complete mock environment for offline testing:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Debug Environment</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
        .debug-panel { background: #f5f5f5; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="debug-panel">
        <h3>Debug Controls</h3>
        <button onclick="toggleDebugMode()">Toggle Debug Mode</button>
        <button onclick="simulateFieldChange()">Simulate Field Change</button>
        <button onclick="logCurrentState()">Log Current State</button>
    </div>
    
    <div id="cascading-multiselect-container"></div>
    
    <script src="dist/CascadingMultiSelect.js"></script>
    <script>
        // Mock SDK and debug functions
        let debugMode = true;
        
        function toggleDebugMode() {
            debugMode = !debugMode;
            console.log('Debug mode:', debugMode);
        }
        
        function simulateFieldChange() {
            console.log('Simulating field change...');
            // Trigger your control's field change logic
        }
        
        function logCurrentState() {
            console.log('Current control state:', {
                // Log your control's current state
            });
        }
    </script>
</body>
</html>
```

## 8. Performance Debugging

Add performance monitoring:

```typescript
private performanceLog(operation: string, startTime: number): void {
  const endTime = performance.now();
  console.log(`[Performance] ${operation}: ${endTime - startTime}ms`);
}

// Usage:
const startTime = performance.now();
await this.loadCurrentValue();
this.performanceLog('loadCurrentValue', startTime);
```

## Quick Debug Commands

```bash
# Development build with watch
npm run dev

# Serve locally for testing
npm run serve

# Build and package for testing in ADO
npm run build && npm run package

# Clean and rebuild
npm run clean && npm run build
```

## Debugging Checklist

- [ ] Enable development mode and source maps
- [ ] Add console.log statements at key points
- [ ] Test with mock data locally
- [ ] Verify configuration parsing
- [ ] Check field value read/write operations
- [ ] Test expand/collapse functionality
- [ ] Verify selection state management
- [ ] Check for memory leaks in long-running sessions

This approach will help you debug both the logic and UI interactions effectively!

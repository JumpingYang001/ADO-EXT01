// Declare VSS global for Azure DevOps environment
declare var VSS: any;

// Add VSS ServiceIds if not available
if (typeof VSS !== 'undefined' && !VSS.ServiceIds) {
  VSS.ServiceIds = {
    WorkItemFormService: 'ms.vss-work-web.work-item-form'
  };
}

interface HierarchicalItem {
  id: string;
  name: string;
  children?: HierarchicalItem[];
}

interface ControlConfiguration {
  parentSelectMode: boolean;
  fieldValues: string;
  multiSelectSeparator: string;
}

class CascadingMultiSelectControl {
  private container: HTMLElement;
  private configuration!: ControlConfiguration;
  private data: HierarchicalItem[] = [];
  private selectedValues: Set<string> = new Set();
  private expandedItems: Set<string> = new Set();
  private workItemFormService: any;
  private fieldName!: string;
  private instanceId: string;
  private treeVisible: boolean = false;
  private popupActive: boolean = false;

  constructor(containerId?: string) {
    console.log('CascadingMultiSelectControl constructor called');
    
    // Generate a unique instance ID for this control instance
    this.instanceId = containerId || `cascading-multiselect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Look for container with specific ID, or use the default
    this.container = document.getElementById(containerId || "cascading-multiselect-container") as HTMLElement;
    
    if (!this.container) {
      console.error('Container element not found:', containerId || "cascading-multiselect-container");
      return;
    }

    // IMPORTANT: Assign a unique ID to this container if it doesn't have one or if it's the default
    if (!this.container.id || this.container.id === "cascading-multiselect-container") {
      const uniqueId = `cascading-multiselect-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.container.id = uniqueId;
      this.instanceId = uniqueId;
      console.log('Assigned unique container ID:', uniqueId);
    }

    // Add instance ID as data attribute for debugging
    this.container.setAttribute('data-instance-id', this.instanceId);
    
    console.log('Control instance created with ID:', this.instanceId);

    // Wait for VSS to be ready, then initialize
    if (typeof VSS !== 'undefined') {
      this.initializeControl();
    } else {
      // Listen for VSS ready event
      window.addEventListener('vssReady', () => {
        this.initializeControl();
      });
      
      // Also try checking periodically in case event was missed
      this.waitForVSS().then(() => {
        this.initializeControl();
      }).catch(() => {
        console.log('VSS not available, using fallback mode');
        this.initializeFallback();
      });
    }
  }

  private waitForVSS(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // Increase attempts
      const checkInterval = 200;
      
      const checkVSS = () => {
        attempts++;
        
        // Check direct VSS availability
        if (typeof VSS !== 'undefined') {
          console.log('VSS framework detected');
          resolve();
          return;
        }
        
        // Check parent window (this is the most common scenario in Azure DevOps)
        if (window.parent && window.parent !== window) {
          try {
            if (typeof (window.parent as any).VSS !== 'undefined') {
              console.log('VSS found in parent window');
              (window as any).VSS = (window.parent as any).VSS;
              resolve();
              return;
            }
          } catch (e) {
            // Cross-origin access might be blocked, but that's expected in some cases
          }
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error(`VSS framework not available after ${maxAttempts} attempts`));
          return;
        }
        
        setTimeout(checkVSS, checkInterval);
      };
      
      checkVSS();
    });
  }

  private async initializeControl(): Promise<void> {
    try {
      console.log('Starting control initialization with VSS...');
      
      // VSS should be available now
      if (typeof VSS === 'undefined') {
        throw new Error('VSS is not available');
      }

      // Wait for VSS to be ready if not already
      if (!(window as any).VSSReady) {
        console.log('Waiting for VSS ready...');
        await new Promise<void>((resolve) => {
          VSS.ready(() => {
            console.log('VSS is now ready');
            resolve();
          });
        });
      }

      // Register the extension properly to handle VSS communication
      console.log('Registering extension with VSS for instance:', this.instanceId);
      
      // Debug: Check what contribution ID we're getting
      let contributionId;
      try {
        contributionId = VSS.getContribution().id;
        console.log('Contribution ID:', contributionId);
      } catch (error) {
        console.error('Error getting contribution ID:', error);
        // Fallback to the known contribution ID
        contributionId = 'PDETs-test1.cascading-multiselect.cascading-multiselect-control-v2';
        console.log('Using fallback contribution ID:', contributionId);
      }
      
      // Create a unique registration object for this instance
      const registrationObject = {
        // This is the proper way to register a work item form control
        onLoaded: async () => {
          console.log(`Extension onLoaded callback called for instance: ${this.instanceId}`);
          
          // CRITICAL: Early check to prevent Rule Engine errors
          try {
            const config = VSS.getConfiguration();
            const hasValidFieldBinding = config?.fieldName || 
                                       config?.fieldRefName || 
                                       config?.witInputs?.FieldName ||
                                       config?.id;
            
            if (!hasValidFieldBinding) {
              console.warn('⚠️ No valid field binding detected - skipping field operations');
              console.warn('⚠️ Control will render but not interact with work item fields');
              
              // Set fieldName to empty to prevent all field operations
              this.fieldName = "";
              
              // Load configuration without field operations
              await this.loadConfiguration();
              return;
            }
          } catch (error) {
            console.error('Error during early field binding check:', error);
            this.fieldName = "";
          }
          
          await this.loadConfiguration();
        },
        
        onFieldChanged: (args: any) => {
          console.log(`Field changed for instance ${this.instanceId}:`, args);
          // Handle field change events if needed
        },
        
        onSaved: (args: any) => {
          console.log(`Work item saved for instance ${this.instanceId}:`, args);
          // Handle save events if needed
        },
        
        onRefreshed: (args: any) => {
          console.log(`Work item refreshed for instance ${this.instanceId}:`, args);
          // Handle refresh events if needed
        },
        
        onReset: (args: any) => {
          console.log(`Work item reset for instance ${this.instanceId}:`, args);
          // Handle reset events if needed
        },
        
        onUnloaded: (args: any) => {
          console.log(`Extension unloaded for instance ${this.instanceId}:`, args);
          // Clean up if needed
        }
      };
      
      VSS.register(contributionId, registrationObject);
      
      console.log('Extension registered successfully for instance:', this.instanceId);
      
      // Alternative approach: Load configuration directly after registration
      // Some extensions don't wait for onLoaded callback
      console.log('Loading configuration...');
      this.loadConfiguration().catch(error => {
        console.error('Error loading configuration:', error);
        this.renderError('Failed to load configuration: ' + (error instanceof Error ? error.message : String(error)));
      });
      
    } catch (error) {
      console.error('Error during control initialization:', error);
      this.renderError('Failed to initialize control: ' + (error instanceof Error ? error.message : String(error)));
      
      // If VSS registration failed, notify failure
      this.initializeFallback();
      if (typeof VSS !== 'undefined' && VSS.notifyLoadFailed) {
        VSS.notifyLoadFailed(error instanceof Error ? error : new Error(String(error)));
      } else {
        console.error('Cannot notify VSS of load failure - VSS not available');
      }
    }
  }

  private async loadConfiguration(): Promise<void> {
    try {
      console.log('Loading configuration...');
      
      // Get configuration from the VSS framework
      const config = VSS.getConfiguration();
      console.log('Raw configuration received:', config);
      
      // Validate configuration structure
      if (!config) {
        throw new Error('No configuration object received from VSS');
      }
      
      if (!config.witInputs) {
        console.warn('No witInputs in configuration, using defaults');
        config.witInputs = {};
      }
      
      // Debug: Log all available properties in config
      console.log('Config keys:', Object.keys(config));
      console.log('Config.witInputs keys:', Object.keys(config.witInputs || {}));
      
      // Extract field name from various possible locations
      // In Azure DevOps, field name is typically in these locations:
      this.fieldName = config.witInputs["FieldName"] ||    // Custom input
                      config.fieldName ||                   // Direct property
                      config.fieldRefName ||                // Reference name
                      config.id ||                          // Fallback to ID
                      config.contribution?.id ||            // Contribution ID
                      "";
      
      // Additional debug information
      console.log('Field name sources check:');
      console.log('- config.witInputs.FieldName:', config.witInputs["FieldName"]);
      console.log('- config.fieldName:', config.fieldName);
      console.log('- config.fieldRefName:', config.fieldRefName);
      console.log('- config.id:', config.id);
      console.log('- config.contribution?.id:', config.contribution?.id);
      console.log('Field name extracted:', this.fieldName);
      
      // Debug the full configuration context
      console.log('=== CONFIGURATION DEBUG ===');
      console.log('Instance ID:', this.instanceId);
      console.log('Container ID:', this.container.id);
      console.log('Field Name:', this.fieldName);
      console.log('Parent Select Mode:', config.witInputs["parentSelectMode"]);
      console.log('Field Values:', config.witInputs["fieldValues"]?.substring(0, 100) + '...');
      console.log('=== END CONFIG DEBUG ===');
      
      // If still no field name, try getting it from the work item form service
      if (!this.fieldName && this.workItemFormService) {
        try {
          // Try to get field information from the service
          const formService = this.workItemFormService;
          console.log('Trying to get field name from work item form service...');
          
          // Check if there's a way to get the current field context
          if (formService.getFields) {
            const fields = await formService.getFields();
            console.log('Available fields:', fields?.map((f: any) => f.referenceName));
          }
          
          // Try getting current field if available
          if (formService.getCurrentFieldName) {
            this.fieldName = await formService.getCurrentFieldName();
            console.log('Field name from getCurrentFieldName:', this.fieldName);
          }
        } catch (e) {
          console.log('Could not get field name from work item form service:', e);
        }
      }
      
      // If STILL no field name, check if we're in a work item context
      if (!this.fieldName) {
        console.warn('⚠️  FIELD NAME ISSUE DETECTED ⚠️');
        console.warn('No field name available. This usually means:');
        console.warn('1. The control is not properly bound to a work item field');
        console.warn('2. You need to configure the field binding in your work item form');
        console.warn('3. The control might be running in demo/preview mode');
        console.warn('');
        console.warn('TO FIX THIS:');
        console.warn('1. Go to your Azure DevOps project settings');
        console.warn('2. Navigate to Work > Process > [Your Process] > [Work Item Type]');
        console.warn('3. Add this control to a field (not just the form)');
        console.warn('4. When adding the control, select a specific field to bind it to');
        console.warn('5. Save your changes and test with a real work item');
        console.warn('');
        
        // IMPORTANT: Don't use synthetic field names as they cause Rule Engine errors
        // Instead, set fieldName to empty to prevent any field operations
        this.fieldName = "";
        console.warn('⚠️ Field operations disabled until proper field binding');
        console.warn('⚠️ Control will work but values will NOT persist');
        console.warn('⚠️ This prevents Azure DevOps Rule Engine errors');
      }
      const parentSelectMode = config.witInputs["parentSelectMode"];
      const fieldValues = config.witInputs["fieldValues"];
      const multiSelectSeparator = config.witInputs["multiSelectSeparator"];
      
      this.configuration = {
        parentSelectMode: parentSelectMode === "true" || parentSelectMode === true,
        fieldValues: fieldValues || "[]",
        multiSelectSeparator: multiSelectSeparator || ";"
      };
      
      console.log('Configuration parsed:', this.configuration);

      // Parse and validate the hierarchical data
      try {
        const parsedData = JSON.parse(this.configuration.fieldValues);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          this.data = parsedData;
          console.log('Hierarchical data parsed successfully:', this.data.length, 'items');
        } else {
          console.warn('Invalid or empty field values, using default data');
          this.data = this.getDefaultData();
        }
      } catch (e) {
        console.error("Invalid JSON in fieldValues configuration:", e);
        console.log('Using default data due to JSON parse error');
        this.data = this.getDefaultData();
      }

      // Get work item form service - only if we have a valid field name
      if (this.fieldName) {
        this.getWorkItemFormService();
      } else {
        console.warn('⚠️ Skipping work item form service initialization - no field name');
        console.warn('⚠️ Control will work in demo mode without field persistence');
        
        // Still render the control but without field operations
        this.render();
        
        // CRITICAL: Notify Azure DevOps that loading is complete even in demo mode
        console.log('✅ Demo mode loading complete - notifying Azure DevOps');
        VSS.notifyLoadSucceeded();
      }
      
    } catch (error) {
      console.error('Error loading configuration:', error);
      
      // Set fallback configuration - DON'T use synthetic field names (causes Rule Engine errors)
      this.fieldName = ""; // Empty field name prevents field operations and Rule Engine errors
      this.configuration = {
        parentSelectMode: false,
        fieldValues: "[]",
        multiSelectSeparator: ";"
      };
      this.data = this.getDefaultData();
      
      this.renderError('Failed to load configuration, using defaults: ' + (error instanceof Error ? error.message : String(error)));
      this.render();
      
      // CRITICAL: Notify Azure DevOps that loading is complete even in error mode
      console.log('✅ Error mode loading complete - notifying Azure DevOps');
      VSS.notifyLoadSucceeded();
    }
  }

  private async getWorkItemFormService(): Promise<void> {
    try {
      console.log('Getting work item form service...');
      
      // If we don't have a field name, use demo mode
      if (!this.fieldName) {
        console.log('No field name available, rendering in demo mode');
        this.render();
        VSS.notifyLoadSucceeded();
        return;
      }
      
      // Try the most reliable method first (based on what's working in the logs)
      const serviceIds = [
        'ms.vss-work-web.work-item-form',
        VSS.ServiceIds?.WorkItemFormService,
        'ms.vss-work-web.work-item-form-service'
      ].filter(Boolean); // Remove undefined values
      
      let serviceObtained = false;
      
      for (const serviceId of serviceIds) {
        try {
          console.log('Attempting to get service with ID:', serviceId);
          this.workItemFormService = await VSS.getService(serviceId);
          
          // Verify service has required methods
          if (this.workItemFormService && 
              this.workItemFormService.getFieldValue && 
              this.workItemFormService.setFieldValue) {
            console.log('Service obtained with ID:', serviceId);
            serviceObtained = true;
            break;
          }
        } catch (error) {
          // Don't log errors for expected failures - just continue to next method
          console.log(`Service ID ${serviceId} not available, trying next...`);
        }
      }
      
      if (!serviceObtained) {
        console.log('Standard service methods failed, trying VSS.require fallback...');
        await this.tryAlternativeServiceMethods();
        return;
      }
      
      console.log('Work item form service verified and ready');
      
      // Load current field value and render
      await this.loadCurrentValue();
      this.render();
      
      // Notify VSS that the extension loaded successfully
      console.log('Notifying VSS of successful load');
      VSS.notifyLoadSucceeded();
      
    } catch (error) {
      console.error('Error getting work item form service:', error);
      
      // Final fallback
      await this.tryAlternativeServiceMethods();
    }
  }

  private async tryAlternativeServiceMethods(): Promise<void> {
    console.log('Trying alternative service methods...');
    
    // Method 1: Try VSS.require only if window.require exists
    if (typeof (window as any).require === 'function') {
      try {
        await new Promise<void>((resolve, reject) => {
          VSS.require([
            'TFS/WorkItemTracking/Services'
          ], (Services: any) => {
            try {
              this.workItemFormService = Services.WorkItemFormService.getService();
              if (this.workItemFormService?.getFieldValue && this.workItemFormService?.setFieldValue) {
                console.log('Work item form service obtained via VSS.require');
                resolve();
              } else {
                reject(new Error('Service methods not available'));
              }
            } catch (err) {
              reject(err);
            }
          }, reject);
        });
        
        // If we got here, service is working
        await this.loadCurrentValue();
        this.render();
        VSS.notifyLoadSucceeded();
        return;
        
      } catch (error) {
        console.log('VSS.require method not available or failed');
      }
    } else {
      console.log('VSS.require method not available (expected in this environment)');
    }
    
    // If all methods fail, show error but still render in demo mode
    console.log('All service methods failed, rendering in demo mode');
    this.renderError('Could not connect to work item service. Extension running in demo mode.');
    this.render();
    VSS.notifyLoadSucceeded(); // Still notify success to prevent infinite loading
  }

  private initializeFallback(): void {
    console.log('Using fallback initialization...');
    
    // Create a basic mock configuration for demonstration
    this.fieldName = 'System.Title';
    this.configuration = {
      parentSelectMode: false,
      fieldValues: JSON.stringify([
        {
          id: "cat1",
          name: "Demo Category 1",
          children: [
            { id: "item1", name: "Demo Item 1" },
            { id: "item2", name: "Demo Item 2" }
          ]
        },
        {
          id: "cat2",
          name: "Demo Category 2", 
          children: [
            { id: "item3", name: "Demo Item 3" },
            { id: "item4", name: "Demo Item 4" }
          ]
        }
      ]),
      multiSelectSeparator: ';'
    };
    
    try {
      this.data = JSON.parse(this.configuration.fieldValues);
    } catch (e) {
      this.data = this.getDefaultData();
    }
    
    this.render();
    
    // Show a message that this is in demo mode
    const demoMessage = document.createElement('div');
    demoMessage.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 12px;';
    demoMessage.innerHTML = '<strong>Demo Mode:</strong> Extension is running in fallback mode. Configuration and field updates may not work properly.';
    this.container.insertBefore(demoMessage, this.container.firstChild);
  }

  private getDefaultData(): HierarchicalItem[] {
    return [
      {
        id: "category1",
        name: "Category 1",
        children: [
          { id: "item1", name: "Item 1" },
          { id: "item2", name: "Item 2" }
        ]
      },
      {
        id: "category2",
        name: "Category 2",
        children: [
          { id: "item3", name: "Item 3" },
          { id: "item4", name: "Item 4" }
        ]
      }
    ];
  }

  private async loadCurrentValue(): Promise<void> {
    try {
      console.log(`Loading current field value for instance ${this.instanceId}, field: ${this.fieldName}`);
      
      if (this.fieldName && this.workItemFormService) {
        const currentValue = await this.workItemFormService.getFieldValue(this.fieldName);
        console.log(`Current field value for ${this.fieldName} (instance ${this.instanceId}):`, currentValue);
        
        if (currentValue) {
          const values = currentValue.toString().split(this.configuration.multiSelectSeparator)
            .map((v: string) => v.trim())
            .filter((v: string) => v.length > 0);
          this.selectedValues = new Set(values);
          console.log(`Selected values loaded for instance ${this.instanceId}:`, Array.from(this.selectedValues));
        } else {
          this.selectedValues.clear();
        }
        
        // Re-render if the control is already rendered
        if (this.container.children.length > 0) {
          this.render();
        }
      }
    } catch (error) {
      console.error(`Error loading current field value for instance ${this.instanceId}:`, error);
    }
  }

  private async updateFieldValue(): Promise<void> {
    try {
      if (this.fieldName && this.workItemFormService) {
        const newValue = Array.from(this.selectedValues).join(this.configuration.multiSelectSeparator);
        console.log(`Updating field ${this.fieldName} (instance ${this.instanceId}) to:`, newValue);
        
        await this.workItemFormService.setFieldValue(this.fieldName, newValue);
        console.log(`Field value updated successfully for instance ${this.instanceId}`);
      }
    } catch (error) {
      console.error(`Error updating field value for instance ${this.instanceId}:`, error);
    }
  }

  private render(): void {
    if (!this.container) return;

    const html = `
      <div class="control-title">Cascading Multi-Select</div>
      <div class="control-info">Field: ${this.fieldName} | Parent Selectable: ${this.configuration.parentSelectMode ? 'Yes' : 'No'}</div>
      ${this.renderSelectedValues()}
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();

    // If tree should be visible, create and position the popup
    if (this.treeVisible) {
      this.showTreePopup();
    }
  }

  private renderTreeItems(items: HierarchicalItem[], level: number): string {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = this.expandedItems.has(item.id);
      const isSelected = this.selectedValues.has(item.id);
      const canSelect = this.configuration.parentSelectMode || !hasChildren;

      return `
        <div class="tree-item level-${level}">
          <div class="item-content">
            ${hasChildren 
              ? `<button class="expand-button" data-item-id="${item.id}">
                   ${isExpanded ? '▼' : '▶'}
                 </button>`
              : '<div class="expand-spacer"></div>'
            }
            ${canSelect 
              ? `<input type="checkbox" class="item-checkbox" 
                        data-item-id="${item.id}" 
                        ${isSelected ? 'checked' : ''}>`
              : ''
            }
            <span class="item-label">${item.name}</span>
          </div>
          ${hasChildren && isExpanded 
            ? `<div class="children-container">
                 ${this.renderTreeItems(item.children!, level + 1)}
               </div>`
            : ''
          }
        </div>
      `;
    }).join('');
  }

  private renderSelectedValues(): string {
    const selectedItems = Array.from(this.selectedValues);
    
    if (selectedItems.length === 0) {
      return `
        <div class="selected-values">
          <div class="selected-title">Selected Items:</div>
          <div class="no-selection" data-action="toggle-tree">No selection made</div>
        </div>
      `;
    }

    const renderedItems = selectedItems.map(id => {
      const itemName = this.getItemName(id);
      return `
        <div class="selected-item">
          ${itemName}<button class="remove-button" data-item-id="${id}">×</button>
        </div>
      `;
    }).join('');

    const result = `
      <div class="selected-values">
        <div class="selected-title">Selected Items (${selectedItems.length}):</div>
        <div class="selected-list">
          ${renderedItems}
          <button class="add-button" data-action="toggle-tree">+</button>
        </div>
      </div>
    `;
    
    return result;
  }

  private getItemName(id: string): string {
    const findItem = (items: HierarchicalItem[]): string | null => {
      for (const item of items) {
        if (item.id === id) return item.name;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findItem(this.data) || id;
  }

  private attachEventListeners(): void {
    if (!this.container) return;

    // Remove existing event listeners to avoid duplicates
    // Clone the container to remove all event listeners
    const newContainer = this.container.cloneNode(true) as HTMLElement;
    this.container.parentNode?.replaceChild(newContainer, this.container);
    this.container = newContainer;

    // Expand/collapse buttons
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('expand-button')) {
        const itemId = target.dataset.itemId;
        if (itemId) {
          this.toggleExpanded(itemId);
        }
      }
      
      if (target.classList.contains('remove-button')) {
        const itemId = target.dataset.itemId;
        if (itemId) {
          this.selectedValues.delete(itemId);
          this.updateFieldValue();
          this.render();
        }
      }

      if (target.dataset.action === 'toggle-tree') {
        e.stopPropagation(); // Prevent this click from reaching document level
        console.log('Stopping propagation for toggle-tree click');
        this.toggleTreeVisibility();
      }
    });
  }

  private toggleExpanded(itemId: string): void {
    console.log('toggleExpanded called for:', itemId);
    
    // Quick check using popup active flag
    if (!this.popupActive) {
      console.log('Cannot update popup - popup not active (flag check)');
      return;
    }
    
    // Check if popup is actually active and exists in DOM (check popup container, not just body)
    const popup = (this.container as any).popupElement;
    const popupContainer = (this.container as any).popupContainer;
    const popupExistsInDOM = popup && (
      document.body.contains(popup) || 
      (popupContainer && popupContainer.contains(popup))
    );
    
    console.log('toggleExpanded - popup exists:', !!popup);
    console.log('toggleExpanded - popup container exists:', !!popupContainer);
    console.log('toggleExpanded - popup in DOM:', popupExistsInDOM);
    console.log('toggleExpanded - treeVisible:', this.treeVisible);
    console.log('toggleExpanded - popupActive flag:', this.popupActive);
    
    // Don't process if popup doesn't exist or isn't in DOM
    if (!popup || !popupExistsInDOM) {
      console.log('Cannot update popup - popup not active or not in DOM');
      this.popupActive = false; // Reset flag if popup is gone
      return;
    }
    
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
      console.log('Collapsing item:', itemId);
    } else {
      this.expandedItems.add(itemId);
      console.log('Expanding item:', itemId);
    }
    
    console.log('Updating popup content from toggleExpanded');
    this.updatePopupContent(popup);
  }

  private toggleTreeVisibility(): void {
    this.treeVisible = !this.treeVisible;
    if (this.treeVisible) {
      // Don't call render() here, just show the popup directly
      this.showTreePopup();
    } else {
      this.hideTreePopup();
    }
  }

  private showTreePopup(): void {
    // Remove any existing popup
    this.hideTreePopup();

    const addButton = this.container.querySelector('.add-button') as HTMLElement;
    const noSelection = this.container.querySelector('.no-selection') as HTMLElement;
    const trigger = addButton || noSelection;

    if (!trigger) return;

    // Create a unique popup container for this control instance to avoid conflicts
    let popupContainer = document.getElementById(`popup-container-${this.instanceId}`);
    if (!popupContainer) {
      popupContainer = document.createElement('div');
      popupContainer.id = `popup-container-${this.instanceId}`;
      popupContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(popupContainer);
      console.log(`Created popup container for control ${this.instanceId}`);
    }

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'popup-backdrop';
    backdrop.style.pointerEvents = 'auto'; // Enable clicks on backdrop
    popupContainer.appendChild(backdrop);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'tree-popup';
    popup.innerHTML = this.renderTreeItems(this.data, 0);
    popup.style.pointerEvents = 'auto'; // Enable clicks on popup content
    popupContainer.appendChild(popup);

    // Pre-calculate height constraints - try to use parent window dimensions if in iframe
    const triggerRect = trigger.getBoundingClientRect();
    let viewportHeight = window.innerHeight;
    
    // Check if we're in an iframe and can access parent window
    try {
      if (window !== window.parent && window.parent && window.parent.innerHeight) {
        const parentHeight = window.parent.innerHeight;
        console.log(`Detected iframe - parent height: ${parentHeight}px, current height: ${viewportHeight}px`);
        // Use parent height if it's significantly larger (suggests we're in a constrained iframe)
        if (parentHeight > viewportHeight * 1.5) {
          viewportHeight = parentHeight;
          console.log(`Using parent window height: ${viewportHeight}px`);
        }
      }
    } catch (e) {
      console.log('Cannot access parent window (cross-origin), using current window height');
    }
    
    // In constrained environments, be more aggressive about height
    const spaceBelow = viewportHeight - (triggerRect.bottom + 4);
    const spaceAbove = triggerRect.top - 10;
    
    // Choose the larger available space
    const useAbovePositioning = spaceAbove > spaceBelow && spaceAbove > 50;
    const availableSpace = useAbovePositioning ? spaceAbove : spaceBelow;
    
    // Allow popup to use most of the available space, with generous height
    const maxHeight = Math.max(80, Math.min(300, availableSpace - 15));
    
    if (useAbovePositioning) {
      // Position above the trigger first
      popup.style.top = `${triggerRect.top - maxHeight - 4}px`;
      console.log(`Pre-positioning above trigger for better space utilization`);
    }
    
    popup.style.maxHeight = `${maxHeight}px`;
    popup.style.overflowY = 'auto';
    popup.style.height = 'auto';
    
    console.log(`Pre-set popup maxHeight: ${maxHeight}px (spaceBelow: ${spaceBelow}px, spaceAbove: ${spaceAbove}px, viewportHeight: ${viewportHeight}px, positioned: ${useAbovePositioning ? 'above' : 'below'})`);

    // Position popup relative to trigger
    console.log('Trigger position:', {
      left: triggerRect.left,
      top: triggerRect.top,
      bottom: triggerRect.bottom,
      right: triggerRect.right
    });

    // Use setAttribute to force the positioning with !important via CSS
    popup.style.position = 'fixed';
    popup.style.left = `${triggerRect.left}px`;
    // Only set top if not already set above
    if (!popup.style.top) {
      popup.style.top = `${triggerRect.bottom + 4}px`;
    }
    popup.style.zIndex = '999999';
    
    console.log('Popup positioned at:', {
      left: popup.style.left,
      top: popup.style.top,
      zIndex: popup.style.zIndex
    });

    // Also check computed styles
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(popup);
      const finalRect = popup.getBoundingClientRect();
      console.log('Popup computed position:', {
        position: computedStyle.position,
        left: computedStyle.left,
        top: computedStyle.top,
        zIndex: computedStyle.zIndex
      });
      console.log('Popup final position:', {
        left: finalRect.left,
        top: finalRect.top,
        right: finalRect.right,
        bottom: finalRect.bottom,
        width: finalRect.width,
        height: finalRect.height
      });
      console.log('Popup is fully visible:', {
        withinViewport: finalRect.bottom <= window.innerHeight && finalRect.right <= window.innerWidth,
        viewportHeight: window.innerHeight,
        popupBottom: finalRect.bottom
      });
    }, 100);

    // Adjust position if popup goes off screen
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    console.log('Viewport size:', { width: viewportWidth, height: viewportHeight });
    console.log('Popup size:', { width: popupRect.width, height: popupRect.height });

    if (popupRect.right > viewportWidth) {
      const newLeft = triggerRect.right - popupRect.width;
      popup.style.left = `${newLeft}px`;
      console.log('Adjusted left position to avoid overflow:', popup.style.left);
    }

    // Height adjustment was already done above, but check if we need alternative positioning
    if (popupRect.bottom > viewportHeight) {
      console.log('Warning: Popup still extends beyond viewport despite height adjustment');
      
      // Try positioning above the trigger if there's more space there
      const spaceAbove = triggerRect.top - 10; // 10px margin from top
      const spaceBelowActual = viewportHeight - triggerRect.bottom - 4;
      
      console.log(`Space above: ${spaceAbove}px, space below: ${spaceBelowActual}px`);
      
      if (spaceAbove > spaceBelowActual && spaceAbove > 60) { // Lowered threshold from 100 to 60
        // Position popup above the trigger
        const popupHeight = Math.min(200, spaceAbove - 10);
        popup.style.top = `${triggerRect.top - popupHeight - 4}px`;
        popup.style.maxHeight = `${popupHeight}px`;
        console.log(`Repositioned popup above trigger: top=${popup.style.top}, maxHeight=${popupHeight}px`);
      } else {
        // As a last resort, reduce height even more but keep below
        const finalMaxHeight = Math.max(60, viewportHeight - (triggerRect.bottom + 4) - 5);
        popup.style.maxHeight = `${finalMaxHeight}px`;
        console.log(`Emergency height adjustment: ${finalMaxHeight}px`);
      }
    }

    // Add event listeners for the popup
    this.attachPopupEventListeners(popup);

    // Add backdrop click listener to close popup
    const backdropClickHandler = (e: Event) => {
      if (e.target === backdrop) {
        this.hideTreePopup();
      }
    };
    backdrop.addEventListener('click', backdropClickHandler);

    // Add document click listener to close popup when clicking outside
    // Create document click handler that only responds to THIS control's events
    const documentClickHandler = (e: Event) => {
      const target = e.target as Node;
      const clickEvent = e as MouseEvent;
      
      console.log('Document click handler fired for control', this.instanceId, 
                  'target:', (target as any).tagName, (target as any).className,
                  'coordinates:', clickEvent.clientX, clickEvent.clientY);
      
      // Only handle clicks if this control's popup is active
      if (!this.popupActive) {
        console.log('Popup not active, ignoring document click');
        return;
      }
      
      // Check if popup was just created (add grace period to avoid immediate closure)
      const popupAge = Date.now() - ((this.container as any).popupCreatedTime || 0);
      if (popupAge < 200) { // Increased to 200ms grace period
        console.log(`Popup too new (${popupAge}ms), ignoring document click`);
        return;
      }
      
      // Ignore clicks that don't have proper mouse coordinates (likely synthetic/programmatic)
      if (clickEvent.clientX === 0 && clickEvent.clientY === 0) {
        console.log('Ignoring synthetic click event (0,0 coordinates)');
        return;
      }
      
      // Check if click is inside the popup (including all child elements)
      if (popup.contains(target)) {
        console.log(`Click detected inside popup for control ${this.instanceId} - keeping popup open`);
        return; // Click is inside popup, don't close
      }
      
      // Check if click is on the trigger that opens the popup
      if (trigger.contains(target)) {
        console.log(`Click detected on trigger for control ${this.instanceId} - keeping popup open`);
        return; // Click is on trigger, don't close
      }
      
      // Check if the clicked element is part of this control's container
      if (this.container.contains(target)) {
        console.log(`Click detected on control element for ${this.instanceId} - keeping popup open`);
        return; // Click is on control itself, don't close popup
      }
      
      // Click is outside both popup and trigger - close popup
      console.log(`Document click detected outside control ${this.instanceId} - hiding popup`);
      this.hideTreePopup();
    };
    
    // Store instance reference for cleanup
    (documentClickHandler as any).controlInstanceId = this.instanceId;
    
    // Add document click handler during bubble phase (capture: false) 
    // so popup's stopPropagation() can prevent it
    document.addEventListener('click', documentClickHandler, false);
    console.log('Document click handler attached for control', this.instanceId);

    // Store popup references and handlers for cleanup
    (this.container as any).popupElement = popup;
    (this.container as any).popupBackdrop = backdrop;
    (this.container as any).popupContainer = popupContainer;
    (this.container as any).popupCreatedTime = Date.now(); // Track creation time
    (this.container as any).backdropClickHandler = backdropClickHandler;
    (this.container as any).documentClickHandler = documentClickHandler;
    
    // Set treeVisible to true after popup is created
    this.treeVisible = true;
    this.popupActive = true;
    console.log('Popup created and marked as active');
  }

  private hideTreePopup(): void {
    console.log('hideTreePopup called - checking if popup actually needs to be hidden');
    
    const popup = (this.container as any).popupElement;
    const backdrop = (this.container as any).popupBackdrop;
    const popupContainer = (this.container as any).popupContainer;
    const backdropClickHandler = (this.container as any).backdropClickHandler;
    const documentClickHandler = (this.container as any).documentClickHandler;
    
    // Only set flags to false if popup actually exists and will be removed
    if (popup || backdrop) {
      console.log('Setting treeVisible and popupActive to false - popup will be removed');
      this.treeVisible = false;
      this.popupActive = false;
    } else {
      console.log('hideTreePopup called but no popup to hide - keeping flags unchanged');
      return; // Nothing to hide, keep current state
    }

    // Clear references immediately to prevent stale access
    delete (this.container as any).popupElement;
    delete (this.container as any).popupBackdrop;
    delete (this.container as any).popupContainer;
    delete (this.container as any).popupCreatedTime;
    delete (this.container as any).backdropClickHandler;
    delete (this.container as any).documentClickHandler;

    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
      console.log('Removed document click listener for control', this.instanceId);
    }

    // Remove the entire popup container (which contains both popup and backdrop)
    if (popupContainer) {
      console.log('Removing popup container for control', this.instanceId);
      popupContainer.remove();
    } else {
      // Fallback: remove individual elements if container reference is lost
      if (popup) {
        console.log('Removing popup from DOM');
        popup.remove();
      }
      
      if (backdrop) {
        if (backdropClickHandler) {
          backdrop.removeEventListener('click', backdropClickHandler);
        }
        console.log('Removing backdrop from DOM');
        backdrop.remove();
      }
    }
  }

  private updatePopupContent(popup: HTMLElement): void {
    console.log('Updating popup content...');
    console.log('Current expanded items before update:', Array.from(this.expandedItems));
    
    // Store current scroll position
    const scrollTop = popup.scrollTop;
    
    // Update content - this automatically removes old event listeners
    const newContent = this.renderTreeItems(this.data, 0);
    console.log('Generated content preview:', newContent.substring(0, 200) + '...');
    popup.innerHTML = newContent;
    
    // Force a reflow to ensure DOM updates are applied
    popup.offsetHeight;
    
    // Restore scroll position
    popup.scrollTop = scrollTop;
    
    console.log('Popup content updated - event listeners are already delegated, no need to re-attach');
  }

  private attachPopupEventListeners(popup: HTMLElement): void {
    console.log('🔧 Attaching popup event listeners to popup element:', popup.id, popup.className);
    
    // Test if the popup element is properly accessible
    const testButtons = popup.querySelectorAll('.expand-button');
    console.log('🔧 Found expand buttons in popup:', testButtons.length);
    
    // Use event delegation - attach listeners only once to the popup container
    // These will work even when innerHTML is updated
    
    // Handle all clicks in the popup
    const clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      
      console.log('🔵 POPUP CLICK - Element:', target.tagName, 'Class:', target.className, 'Event phase:', e.eventPhase);
      console.log('🔵 POPUP CLICK - Target has expand-button class:', target.classList.contains('expand-button'));
      console.log('🔵 POPUP CLICK - Data attributes:', target.dataset);
      
      // Stop propagation to prevent closing
      e.stopPropagation();
      console.log('🔵 POPUP CLICK - Event propagation stopped');
      
      if (target.classList.contains('expand-button')) {
        e.preventDefault();
        console.log('🔵 EXPAND BUTTON CLICK - prevented default and stopped propagation');
        
        const itemId = target.dataset.itemId;
        if (itemId) {
          console.log('🔵 EXPAND BUTTON - Calling toggleExpanded for item:', itemId);
          this.toggleExpanded(itemId);
        } else {
          console.log('🔵 EXPAND BUTTON - Warning: no itemId found');
        }
      } else {
        console.log('🔵 POPUP CLICK - Not an expand button, just stopped propagation');
      }
    };
    
    popup.addEventListener('click', clickHandler, false); // Use bubbling phase
    console.log('🔧 Click event listener attached to popup');
    
    // Store reference to handler for debugging
    (popup as any).clickHandler = clickHandler;

    // Handle checkbox changes
    popup.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      
      if (target.classList.contains('item-checkbox')) {
        const itemId = target.dataset.itemId;
        if (itemId) {
          if (target.checked) {
            this.selectedValues.add(itemId);
          } else {
            this.selectedValues.delete(itemId);
          }
          
          this.updateFieldValue();
          
          // Update the main view to show selected items
          const selectedValuesContainer = this.container.querySelector('.selected-values');
          if (selectedValuesContainer) {
            selectedValuesContainer.outerHTML = this.renderSelectedValues();
            this.attachEventListeners();
          }
        }
      }
    });
  }

  private renderError(message: string): void {
    if (this.container) {
      this.container.innerHTML = `
        <div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px;">
          <strong>Error:</strong> ${message}
        </div>
      `;
    }
  }
}

// Store instances globally to prevent conflicts
(window as any).CascadingMultiSelectInstances = (window as any).CascadingMultiSelectInstances || new Map();

// Initialize the control when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, creating control...');
  initializeCascadingMultiSelectControl();
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading
} else {
  // DOM is already loaded
  console.log('DOM already loaded, creating control...');
  initializeCascadingMultiSelectControl();
}

function initializeCascadingMultiSelectControl() {
  // Look for all potential container elements
  const containers = document.querySelectorAll('[id*="cascading-multiselect"]');
  
  if (containers.length === 0) {
    // Fallback: create with default container ID
    const defaultContainer = document.getElementById("cascading-multiselect-container");
    if (defaultContainer) {
      const instanceId = defaultContainer.id;
      if (!(window as any).CascadingMultiSelectInstances.has(instanceId)) {
        console.log('Creating control instance for:', instanceId);
        const control = new CascadingMultiSelectControl(instanceId);
        (window as any).CascadingMultiSelectInstances.set(instanceId, control);
      }
    } else {
      console.log('No cascading multiselect containers found, creating default...');
      const control = new CascadingMultiSelectControl();
      (window as any).CascadingMultiSelectInstances.set('default', control);
    }
  } else {
    // Create instances for each container found
    containers.forEach((container) => {
      const instanceId = container.id;
      if (!(window as any).CascadingMultiSelectInstances.has(instanceId)) {
        console.log('Creating control instance for:', instanceId);
        const control = new CascadingMultiSelectControl(instanceId);
        (window as any).CascadingMultiSelectInstances.set(instanceId, control);
      }
    });
  }
}

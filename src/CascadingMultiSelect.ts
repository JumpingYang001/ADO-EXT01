import * as SDK from "azure-devops-extension-sdk";
import { IWorkItemFormService, WorkItemTrackingServiceIds } from "azure-devops-extension-api/WorkItemTracking";

interface HierarchicalItem {
  id: string;
  name: string;
  children?: HierarchicalItem[];
  selected?: boolean;
  expanded?: boolean;
}

interface ControlConfiguration {
  parentSelectMode: boolean; // true = parent selectable, false = only children selectable
  fieldValues: string; // JSON string of hierarchical data
  multiSelectSeparator: string; // separator for multiple values
}

class CascadingMultiSelectControl {
  private static DEBUG = true; // Set to false for production
  private container: HTMLElement;
  private configuration!: ControlConfiguration;
  private data: HierarchicalItem[] = [];
  private selectedValues: Set<string> = new Set();
  private workItemFormService!: IWorkItemFormService;
  private fieldName!: string;

  constructor() {
    this.container = document.getElementById("cascading-multiselect-container") as HTMLElement;
    this.initialize();
  }

  private log(message: string, data?: any): void {
    if (CascadingMultiSelectControl.DEBUG) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] [CascadingMultiSelect] ${message}`, data || '');
    }
  }

  private async initialize(): Promise<void> {
    this.log('Initializing control...');
    try {
      await SDK.init();
      this.log('SDK initialized');
      await SDK.ready();
      this.log('SDK ready');

      // Get the work item form service
      this.workItemFormService = await SDK.getService<IWorkItemFormService>(
        WorkItemTrackingServiceIds.WorkItemFormService
      );
      this.log('Work item form service acquired');

      // Get configuration from the control
      const config = SDK.getConfiguration();
      this.log('Configuration received', config);
      
      this.fieldName = config.witInputs["FieldName"] || "";
      
      this.configuration = {
        parentSelectMode: config.witInputs["parentSelectMode"] === "true",
        fieldValues: config.witInputs["fieldValues"] || "[]",
        multiSelectSeparator: config.witInputs["multiSelectSeparator"] || ";"
      };
      this.log('Configuration parsed', this.configuration);

      // Parse the hierarchical data
      try {
        this.data = JSON.parse(this.configuration.fieldValues);
        this.log('Hierarchical data parsed', this.data);
      } catch (e) {
        this.log('Error parsing fieldValues JSON', e);
        console.error("Invalid JSON in fieldValues configuration:", e);
        this.data = [];
      }

      // Load current field value
      await this.loadCurrentValue();

      // Render the control
      this.render();

      // Notify that the control is ready
      SDK.notifyLoadSucceeded();
      this.log('Control initialization completed successfully');
    } catch (error) {
      this.log('Initialization failed', error);
      console.error("Failed to initialize control:", error);
      SDK.notifyLoadFailed(error as any);
    }
  }

  private async loadCurrentValue(): Promise<void> {
    this.log('Loading current field value...');
    try {
      if (this.fieldName) {
        const currentValue = await this.workItemFormService.getFieldValue(this.fieldName) as string;
        this.log('Current field value loaded', currentValue);
        if (currentValue) {
          const values = currentValue.split(this.configuration.multiSelectSeparator);
          this.selectedValues = new Set(values.map(v => v.trim()).filter(v => v));
          this.log('Selected values parsed', Array.from(this.selectedValues));
          this.updateDataWithSelection();
        }
      } else {
        this.log('No field name configured');
      }
    } catch (error) {
      this.log('Failed to load current field value', error);
      console.error("Failed to load current field value:", error);
    }
  }

  private updateDataWithSelection(): void {
    const updateSelection = (items: HierarchicalItem[]): void => {
      items.forEach(item => {
        item.selected = this.selectedValues.has(item.id);
        if (item.children) {
          updateSelection(item.children);
        }
      });
    };
    updateSelection(this.data);
  }

  private render(): void {
    this.container.innerHTML = "";
    
    // Add title
    const title = document.createElement("div");
    title.className = "control-title";
    title.textContent = "Cascading Multi-Select";
    this.container.appendChild(title);

    // Add configuration info
    const info = document.createElement("div");
    info.className = "control-info";
    info.textContent = this.configuration.parentSelectMode 
      ? "Parent items are selectable" 
      : "Only child items are selectable";
    this.container.appendChild(info);

    // Create the tree container
    const treeContainer = document.createElement("div");
    treeContainer.className = "tree-container";
    this.container.appendChild(treeContainer);

    // Render the tree
    this.renderTree(this.data, treeContainer, 0);

    // Add selected values display
    this.renderSelectedValues();
  }

  private renderTree(items: HierarchicalItem[], container: HTMLElement, level: number): void {
    items.forEach(item => {
      const itemElement = document.createElement("div");
      itemElement.className = `tree-item level-${level}`;

      // Create the item content
      const itemContent = document.createElement("div");
      itemContent.className = "item-content";

      // Add expand/collapse button if has children
      if (item.children && item.children.length > 0) {
        const expandButton = document.createElement("button");
        expandButton.className = "expand-button";
        expandButton.textContent = item.expanded ? "▼" : "▶";
        expandButton.onclick = (e) => {
          e.stopPropagation();
          this.toggleExpand(item);
        };
        itemContent.appendChild(expandButton);
      } else {
        // Add spacer for alignment
        const spacer = document.createElement("span");
        spacer.className = "expand-spacer";
        itemContent.appendChild(spacer);
      }

      // Add checkbox if item is selectable
      const isSelectable = this.configuration.parentSelectMode || !item.children || item.children.length === 0;
      if (isSelectable) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "item-checkbox";
        checkbox.checked = item.selected || false;
        checkbox.onchange = () => this.toggleSelection(item);
        itemContent.appendChild(checkbox);
      }

      // Add item label
      const label = document.createElement("span");
      label.className = "item-label";
      label.textContent = item.name;
      if (isSelectable) {
        label.onclick = () => this.toggleSelection(item);
        label.style.cursor = "pointer";
      }
      itemContent.appendChild(label);

      itemElement.appendChild(itemContent);

      // Add children if expanded
      if (item.children && item.children.length > 0 && item.expanded) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "children-container";
        this.renderTree(item.children, childrenContainer, level + 1);
        itemElement.appendChild(childrenContainer);
      }

      container.appendChild(itemElement);
    });
  }

  private toggleExpand(item: HierarchicalItem): void {
    item.expanded = !item.expanded;
    this.render();
  }

  private toggleSelection(item: HierarchicalItem): void {
    this.log('Toggling selection for item', item);
    if (item.selected) {
      this.selectedValues.delete(item.id);
      item.selected = false;
      this.log('Item deselected', item.id);
    } else {
      this.selectedValues.add(item.id);
      item.selected = true;
      this.log('Item selected', item.id);
    }

    this.log('Current selected values', Array.from(this.selectedValues));
    this.updateField();
    this.renderSelectedValues();
  }

  private async updateField(): Promise<void> {
    this.log('Updating field value...');
    try {
      if (this.fieldName) {
        const value = Array.from(this.selectedValues).join(this.configuration.multiSelectSeparator);
        this.log('Setting field value', { fieldName: this.fieldName, value });
        await this.workItemFormService.setFieldValue(this.fieldName, value);
        this.log('Field value updated successfully');
      } else {
        this.log('No field name configured for update');
      }
    } catch (error) {
      this.log('Failed to update field value', error);
      console.error("Failed to update field value:", error);
    }
  }

  private renderSelectedValues(): void {
    // Remove existing selected values display
    const existing = this.container.querySelector(".selected-values");
    if (existing) {
      existing.remove();
    }

    if (this.selectedValues.size > 0) {
      const selectedContainer = document.createElement("div");
      selectedContainer.className = "selected-values";
      
      const title = document.createElement("div");
      title.className = "selected-title";
      title.textContent = "Selected values:";
      selectedContainer.appendChild(title);

      const valuesList = document.createElement("div");
      valuesList.className = "selected-list";
      
      Array.from(this.selectedValues).forEach(value => {
        const valueItem = document.createElement("span");
        valueItem.className = "selected-item";
        valueItem.textContent = this.getItemNameById(value) || value;
        
        const removeButton = document.createElement("button");
        removeButton.className = "remove-button";
        removeButton.textContent = "×";
        removeButton.onclick = () => {
          this.selectedValues.delete(value);
          this.updateDataWithSelection();
          this.updateField();
          this.render();
        };
        
        valueItem.appendChild(removeButton);
        valuesList.appendChild(valueItem);
      });

      selectedContainer.appendChild(valuesList);
      this.container.appendChild(selectedContainer);
    }
  }

  private getItemNameById(id: string): string | null {
    const findItem = (items: HierarchicalItem[]): string | null => {
      for (const item of items) {
        if (item.id === id) {
          return item.name;
        }
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findItem(this.data);
  }

  // Public method for debugging - reinitialize with new configuration
  public async reinitialize(): Promise<void> {
    this.log('Reinitializing control...');
    this.selectedValues.clear();
    this.data = [];
    await this.initialize();
  }
}

// Global instance holder
let globalControlInstance: CascadingMultiSelectControl | null = null;

// Expose the class and functions globally for debugging (immediately available)
(window as any).CascadingMultiSelectControl = CascadingMultiSelectControl;
(window as any).initializeCascadingControl = () => {
  const container = document.getElementById("cascading-multiselect-container");
  if (container) {
    container.innerHTML = '';
    globalControlInstance = new CascadingMultiSelectControl();
    return globalControlInstance;
  }
  return null;
};

// Initialize the control when the page loads (only if not in debug mode)
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're in debug mode by looking for the debug environment
  const isDebugEnvironment = document.querySelector('.debug-panel') !== null;
  
  if (!isDebugEnvironment) {
    // Normal initialization for production use
    globalControlInstance = new CascadingMultiSelectControl();
  } else {
    // In debug mode, don't auto-initialize, let the debug environment handle it
    console.log('[CascadingMultiSelect] Debug environment detected, skipping auto-initialization');
  }
});

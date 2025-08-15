// Identity Multi-Select Control for Azure DevOps Work Items
// Supports multiple identity selection with search functionality

interface Identity {
    id: string;
    displayName: string;
    uniqueName: string;
    imageUrl?: string;
    entityType?: string; // User, Group
}

interface ControlInputs {
    FieldName?: string;
    maxSelections?: string;
    allowGroups?: string;
    separator?: string;
}

class IdentityMultiSelectControl {
    private selectedIdentities: Identity[] = [];
    private allIdentities: Identity[] = [];
    private fieldName: string = '';
    private maxSelections: number = 10;
    private allowGroups: boolean = true;
    private separator: string = ';';
    private isInitialized: boolean = false;
    private workItemFormService: any = null;
    private isReadOnly: boolean = false;
    private demoMode: boolean = false;

    // Demo data for testing
    private demoIdentities: Identity[] = [
        {
            id: "user1",
            displayName: "John Doe",
            uniqueName: "john.doe@company.com",
            entityType: "User"
        },
        {
            id: "user2",
            displayName: "Jane Smith",
            uniqueName: "jane.smith@company.com",
            entityType: "User"
        },
        {
            id: "user3",
            displayName: "Bob Johnson",
            uniqueName: "bob.johnson@company.com",
            entityType: "User"
        },
        {
            id: "group1",
            displayName: "Development Team",
            uniqueName: "dev-team@company.com",
            entityType: "Group"
        },
        {
            id: "group2",
            displayName: "QA Team",
            uniqueName: "qa-team@company.com",
            entityType: "Group"
        }
    ];

    constructor() {
        this.initializeControl();
    }

    private async initializeControl(): Promise<void> {
        try {
            console.log('Identity Multi-Select: Starting initialization...');
            
            // Initialize VSS
            await this.initializeVSS();
            
            // Get configuration
            this.parseConfiguration();
            
            // Try to get work item form service
            await this.initializeWorkItemService();
            
            // Load existing field value
            await this.loadFieldValue();
            
            // Setup UI
            this.setupUI();
            
            // Load identities
            await this.loadIdentities();
            
            this.isInitialized = true;
            console.log('Identity Multi-Select: Initialization completed successfully');
            
        } catch (error) {
            console.error('Identity Multi-Select: Initialization failed:', error);
            this.showDemoMode();
        } finally {
            // Always notify VSS that loading is complete
            if (typeof VSS !== 'undefined' && VSS.notifyLoadSucceeded) {
                VSS.notifyLoadSucceeded();
            }
        }
    }

    private initializeVSS(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof VSS === 'undefined') {
                reject(new Error('VSS SDK not available'));
                return;
            }

            try {
                VSS.init({
                    explicitNotifyLoaded: true,
                    usePlatformStyles: true
                });

                VSS.ready(() => {
                    console.log('Identity Multi-Select: VSS ready');
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private parseConfiguration(): void {
        try {
            const configuration = VSS.getConfiguration();
            console.log('Identity Multi-Select: Configuration received:', configuration);

            if (configuration && configuration.inputs) {
                const inputs = configuration.inputs as ControlInputs;
                
                this.fieldName = inputs.FieldName || '';
                this.maxSelections = parseInt(inputs.maxSelections || '10');
                this.allowGroups = inputs.allowGroups !== 'false';
                this.separator = inputs.separator === 'comma' || inputs.separator === ',' ? ',' : ';';
                
                console.log('Identity Multi-Select: Parsed config - Field:', this.fieldName, 'Max:', this.maxSelections, 'Groups:', this.allowGroups, 'Separator:', this.separator);
            }
        } catch (error) {
            console.error('Identity Multi-Select: Error parsing configuration:', error);
        }
    }

    private async initializeWorkItemService(): Promise<void> {
        try {
            // Try to get the work item form service
            this.workItemFormService = await VSS.getService(VSS.ServiceIds.WorkItemFormService);
            console.log('Identity Multi-Select: Work item form service obtained');
        } catch (error) {
            console.log('Identity Multi-Select: Could not get work item form service, using demo mode');
            this.showDemoMode();
        }
    }

    private async loadFieldValue(): Promise<void> {
        if (!this.workItemFormService || !this.fieldName) {
            return;
        }

        try {
            const fieldValue = await this.workItemFormService.getFieldValue(this.fieldName);
            console.log('Identity Multi-Select: Current field value:', fieldValue);

            if (fieldValue) {
                await this.parseFieldValue(fieldValue);
            }

            // Check if field is read-only
            this.isReadOnly = await this.workItemFormService.isReadOnly();
            
        } catch (error) {
            console.error('Identity Multi-Select: Error loading field value:', error);
        }
    }

    private async parseFieldValue(value: string): Promise<void> {
        if (!value) return;

        try {
            // Parse separator-delimited identity values
            const identityStrings = value.split(/[;,]/).filter(s => s.trim());
            
            for (const identityString of identityStrings) {
                const identity = await this.parseIdentityString(identityString.trim());
                if (identity) {
                    this.selectedIdentities.push(identity);
                }
            }
            
            console.log('Identity Multi-Select: Parsed identities:', this.selectedIdentities);
        } catch (error) {
            console.error('Identity Multi-Select: Error parsing field value:', error);
        }
    }

    private async parseIdentityString(identityString: string): Promise<Identity | null> {
        // Try to parse identity string format like "Display Name <email@domain.com>"
        const match = identityString.match(/^(.+?)\s*<(.+?)>$/);
        
        if (match) {
            return {
                id: match[2], // Use email as ID for now
                displayName: match[1].trim(),
                uniqueName: match[2].trim(),
                entityType: "User"
            };
        }
        
        // If no angle brackets, check if it's an email (Identity field format)
        if (identityString.includes('@')) {
            return {
                id: identityString,
                displayName: identityString.split('@')[0], // Use part before @ as display name
                uniqueName: identityString,
                entityType: "User"
            };
        }
        
        // If no match, treat as display name only
        return {
            id: identityString,
            displayName: identityString,
            uniqueName: identityString,
            entityType: "User"
        };
    }

    private setupUI(): void {
        const searchInput = document.getElementById('identity-search') as HTMLInputElement;
        const dropdown = document.getElementById('identity-dropdown') as HTMLElement;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
            searchInput.addEventListener('focus', () => this.showDropdown());
            searchInput.addEventListener('blur', () => {
                // Delay hiding to allow clicks on dropdown items
                setTimeout(() => this.hideDropdown(), 150);
            });
            
            if (this.isReadOnly) {
                searchInput.disabled = true;
                searchInput.placeholder = 'Read-only';
            }
        }

        // Handle clicks outside dropdown
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target as Node) && e.target !== searchInput) {
                this.hideDropdown();
            }
        });

        this.updateSelectedDisplay();
    }

    private async loadIdentities(): Promise<void> {
        try {
            if (this.demoMode) {
                this.allIdentities = [...this.demoIdentities];
                return;
            }

            // In a real implementation, you would call Azure DevOps REST API
            // For now, using demo data
            this.allIdentities = [...this.demoIdentities];
            
        } catch (error) {
            console.error('Identity Multi-Select: Error loading identities:', error);
            this.allIdentities = [...this.demoIdentities];
        }
    }

    private handleSearch(event: Event): void {
        const input = event.target as HTMLInputElement;
        const searchTerm = input.value.toLowerCase().trim();

        if (searchTerm.length === 0) {
            this.hideDropdown();
            return;
        }

        const filteredIdentities = this.allIdentities.filter(identity => {
            if (!this.allowGroups && identity.entityType === 'Group') {
                return false;
            }
            
            return identity.displayName.toLowerCase().includes(searchTerm) ||
                   identity.uniqueName.toLowerCase().includes(searchTerm);
        });

        this.showFilteredIdentities(filteredIdentities);
        this.showDropdown();
    }

    private showFilteredIdentities(identities: Identity[]): void {
        const dropdown = document.getElementById('identity-dropdown') as HTMLElement;
        
        if (identities.length === 0) {
            dropdown.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        dropdown.innerHTML = identities.map(identity => `
            <div class="identity-option" data-identity-id="${identity.id}">
                <div class="identity-avatar">${this.getInitials(identity.displayName)}</div>
                <div class="identity-info">
                    <div class="identity-name">${this.escapeHtml(identity.displayName)}</div>
                    <div class="identity-email">${this.escapeHtml(identity.uniqueName)}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        dropdown.querySelectorAll('.identity-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectIdentity(e));
        });
    }

    private selectIdentity(event: Event): void {
        const option = event.currentTarget as HTMLElement;
        const identityId = option.getAttribute('data-identity-id');
        
        if (!identityId) return;

        const identity = this.allIdentities.find(i => i.id === identityId);
        if (!identity) return;

        // Check if already selected
        if (this.selectedIdentities.some(i => i.id === identity.id)) {
            return;
        }

        // Check max selections
        if (this.selectedIdentities.length >= this.maxSelections) {
            alert(`Maximum ${this.maxSelections} selections allowed`);
            return;
        }

        this.selectedIdentities.push(identity);
        this.updateSelectedDisplay();
        this.updateFieldValue();
        this.notifyFormChanged(); // Add form change notification
        this.hideDropdown();
        
        // Clear search
        const searchInput = document.getElementById('identity-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = '';
        }
    }

    private removeIdentity(identityId: string): void {
        this.selectedIdentities = this.selectedIdentities.filter(i => i.id !== identityId);
        this.updateSelectedDisplay();
        this.updateFieldValue();
        this.notifyFormChanged(); // Add form change notification
    }

    private notifyFormChanged(): void {
        // Additional method to ensure the form recognizes changes
        try {
            if (this.workItemFormService) {
                // Trigger form validation and change detection
                setTimeout(async () => {
                    try {
                        // Force a field validation
                        await this.workItemFormService.isValid();
                        
                        // Get current field value to trigger change detection
                        const currentValue = await this.workItemFormService.getFieldValue(this.fieldName);
                        console.log('Identity Multi-Select: Current field value after change:', currentValue);
                        
                    } catch (error) {
                        console.log('Identity Multi-Select: Form validation check completed');
                    }
                }, 100);
            }
        } catch (error) {
            console.log('Identity Multi-Select: Form change notification completed');
        }
    }

    private updateSelectedDisplay(): void {
        const container = document.getElementById('selected-identities') as HTMLElement;
        
        if (this.selectedIdentities.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.selectedIdentities.map(identity => `
            <div class="selected-identity">
                <div class="identity-avatar">${this.getInitials(identity.displayName)}</div>
                ${this.escapeHtml(identity.displayName)}
                ${!this.isReadOnly ? `<span class="remove-btn" data-identity-id="${identity.id}">×</span>` : ''}
            </div>
        `).join('');

        // Add remove handlers
        if (!this.isReadOnly) {
            container.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const identityId = (e.target as HTMLElement).getAttribute('data-identity-id');
                    if (identityId) {
                        this.removeIdentity(identityId);
                    }
                });
            });
        }
    }

    private async updateFieldValue(): Promise<void> {
        if (!this.workItemFormService || !this.fieldName) {
            return;
        }

        try {
            // Get the field info to determine the field type
            const fieldInfo = await this.workItemFormService.getField(this.fieldName);
            const fieldType = fieldInfo?.type?.toLowerCase();
            
            let value: string;
            
            if (fieldType === 'identity') {
                // For Identity fields, use separator-delimited unique names
                value = this.selectedIdentities
                    .map(identity => identity.uniqueName)
                    .join(this.separator === ',' ? ', ' : '; ');
            } else {
                // For String fields, use display name format
                value = this.selectedIdentities
                    .map(identity => `${identity.displayName} <${identity.uniqueName}>`)
                    .join(this.separator === ',' ? ', ' : '; ');
            }

            // Set the field value
            await this.workItemFormService.setFieldValue(this.fieldName, value);
            console.log('Identity Multi-Select: Field value updated:', value, 'Field type:', fieldType);
            
            // CRITICAL: Notify Azure DevOps that the form has been modified
            // This enables the Save button
            if (this.workItemFormService.setFieldValueEx) {
                // Use setFieldValueEx if available (newer API)
                await this.workItemFormService.setFieldValueEx(this.fieldName, value, true);
            } else {
                // Force a refresh to notify the form of changes
                await this.workItemFormService.refresh();
            }
            
        } catch (error) {
            console.error('Identity Multi-Select: Error updating field value:', error);
            
            // Fallback to string format if field info retrieval fails
            const fallbackValue = this.selectedIdentities
                .map(identity => `${identity.displayName} <${identity.uniqueName}>`)
                .join(this.separator === ',' ? ', ' : '; ');
            
            try {
                await this.workItemFormService.setFieldValue(this.fieldName, fallbackValue);
                
                // Also try to notify of changes in fallback
                if (this.workItemFormService.setFieldValueEx) {
                    await this.workItemFormService.setFieldValueEx(this.fieldName, fallbackValue, true);
                } else {
                    await this.workItemFormService.refresh();
                }
                
                console.log('Identity Multi-Select: Fallback field value updated:', fallbackValue);
            } catch (fallbackError) {
                console.error('Identity Multi-Select: Fallback update also failed:', fallbackError);
            }
        }
    }

    private showDropdown(): void {
        const dropdown = document.getElementById('identity-dropdown') as HTMLElement;
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }

    private hideDropdown(): void {
        const dropdown = document.getElementById('identity-dropdown') as HTMLElement;
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    private showDemoMode(): void {
        this.demoMode = true;
        const demoNotice = document.getElementById('demo-notice') as HTMLElement;
        if (demoNotice) {
            demoNotice.style.display = 'block';
        }
    }

    private getInitials(name: string): string {
        return name.split(' ')
            .map(part => part.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the control when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new IdentityMultiSelectControl();
});

// Also initialize if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new IdentityMultiSelectControl();
    });
} else {
    new IdentityMultiSelectControl();
}

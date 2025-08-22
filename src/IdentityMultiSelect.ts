// Identity Multi-Select Control for Azure DevOps Work Items
// Uses native Azure DevOps Identity Picker for better user directory access

interface Identity {
    id: string;
    displayName: string;
    uniqueName: string;
    imageUrl?: string;
    entityType?: string; // User, Group
    descriptor?: string; // Azure DevOps identity descriptor
}

interface ControlInputs {
    FieldName?: string;            // String field for storage
    identitySourceField?: string;  // Identity field for picker UI
    maxSelections?: string;
    allowGroups?: string;
    separator?: string;
}

// Azure DevOps Identity Picker interfaces
interface IIdentityPickerSearchOptions {
    filterByScope?: boolean;
    scope?: string;
    multiIdentitySearch?: boolean;
    showMru?: boolean;
    showGroups?: boolean;
    showManageLink?: boolean;
    showContactCard?: boolean;
    size?: string; // 'small', 'medium', 'large'
}

interface IIdentityPickerOptions {
    operationScope?: { IMS: boolean; Source: boolean };
    identityType?: { User: boolean; Group: boolean };
    multiSelect?: boolean;
    showMruTriangle?: boolean;
    showContactCard?: boolean;
    size?: string;
    callbacks?: {
        onItemSelect?: (identity: any) => void;
        preDropdownRender?: (entityList: any[]) => any[];
    };
}

class IdentityMultiSelectControl {
    private selectedIdentities: Identity[] = [];
    private fieldName: string = '';  // String field for storage
    private identitySourceFieldName: string = '';  // Identity field for UI picker
    private maxSelections: number = 10;
    private allowGroups: boolean = true;
    private parseTimeout: NodeJS.Timeout | null = null;
    private separator: string = ';';
    private isInitialized: boolean = false;
    private workItemFormService: any = null;
    private isReadOnly: boolean = false;
    private identityPickerControls: any = null; // Identity Picker Controls module

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
            console.log('Identity Multi-Select: Using fallback mode due to initialization error');
        } finally {
            // Register the control object so Azure DevOps can communicate with it
            this.registerControl();
            
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
            console.log('Identity Multi-Select: Full configuration object:', JSON.stringify(configuration, null, 2));

            // Handle both configuration formats: configuration.inputs and configuration.witInputs
            let inputs: ControlInputs | undefined;
            
            if (configuration && configuration.witInputs) {
                inputs = configuration.witInputs as ControlInputs;
                console.log('Identity Multi-Select: Using witInputs format');
            } else if (configuration && configuration.inputs) {
                inputs = configuration.inputs as ControlInputs;
                console.log('Identity Multi-Select: Using inputs format');
            }

            if (inputs) {
                this.fieldName = inputs.FieldName || '';  // String field for storage
                this.identitySourceFieldName = inputs.identitySourceField || '';  // Identity field for picker
                this.maxSelections = parseInt(inputs.maxSelections || '10');
                this.allowGroups = inputs.allowGroups !== 'false';
                this.separator = inputs.separator === 'comma' || inputs.separator === ',' ? ',' : ';';
                
                console.log('Identity Multi-Select: Parsed config - Storage Field:', this.fieldName, 'Source Field:', this.identitySourceFieldName, 'Max:', this.maxSelections, 'Groups:', this.allowGroups, 'Separator:', this.separator);
                
                // Validation
                if (!this.fieldName) {
                    console.warn('Identity Multi-Select: WARNING - No storage field name configured!');
                }
                if (!this.identitySourceFieldName) {
                    console.warn('Identity Multi-Select: WARNING - No identity source field configured!');
                }
                if (!this.fieldName || !this.identitySourceFieldName) {
                    console.log('Identity Multi-Select: Available inputs:', Object.keys(inputs));
                }
            } else {
                console.warn('Identity Multi-Select: No configuration inputs found');
                console.log('Identity Multi-Select: Configuration structure:', configuration);
            }
        } catch (error) {
            console.error('Identity Multi-Select: Error parsing configuration:', error);
        }
    }

    private async initializeWorkItemService(): Promise<void> {
        try {
            console.log('Identity Multi-Select: Getting work item form service...');
            
            // Use the same approach as the working CascadingMultiSelect
            // Try multiple service IDs in sequence
            const serviceIds = [
                'ms.vss-work-web.work-item-form',
                VSS.ServiceIds?.WorkItemFormService,
                'ms.vss-work-web.work-item-form-service'
            ].filter(Boolean); // Remove undefined values
            
            let serviceObtained = false;
            
            for (const serviceId of serviceIds) {
                try {
                    console.log('Identity Multi-Select: Attempting to get service with ID:', serviceId);
                    this.workItemFormService = await VSS.getService(serviceId);
                    
                    // Verify service has required methods (like CascadingMultiSelect does)
                    if (this.workItemFormService && 
                        this.workItemFormService.getFieldValue && 
                        this.workItemFormService.setFieldValue) {
                        console.log('Identity Multi-Select: Service obtained with ID:', serviceId);
                        serviceObtained = true;
                        break;
                    }
                } catch (error) {
                    // Don't log errors for expected failures - just continue to next method
                    console.log(`Identity Multi-Select: Service ID ${serviceId} not available, trying next...`);
                }
            }
            
            if (!serviceObtained) {
                console.log('Identity Multi-Select: Standard service methods failed, trying VSS.require fallback...');
                await this.tryAlternativeServiceMethods();
                return;
            }
            
            console.log('Identity Multi-Select: Work item form service verified and ready');
            
        } catch (error) {
            console.log('Identity Multi-Select: Error getting work item form service:', error);
            await this.tryAlternativeServiceMethods();
        }
    }

    private async tryAlternativeServiceMethods(): Promise<void> {
        console.log('Identity Multi-Select: Trying alternative service methods...');
        
        // Method 1: Try VSS.require only if window.require exists (same as CascadingMultiSelect)
        if (typeof (window as any).require === 'function') {
            try {
                await new Promise<void>((resolve, reject) => {
                    VSS.require([
                        'TFS/WorkItemTracking/Services'
                    ], (Services: any) => {
                        try {
                            this.workItemFormService = Services.WorkItemFormService.getService();
                            if (this.workItemFormService?.getFieldValue && this.workItemFormService?.setFieldValue) {
                                console.log('Identity Multi-Select: Work item form service obtained via VSS.require');
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
                await this.loadFieldValue();
                
                console.log('Identity Multi-Select: Successfully obtained service via VSS.require');
                return;
                
            } catch (error) {
                console.log('Identity Multi-Select: VSS.require method not available or failed');
            }
        } else {
            console.log('Identity Multi-Select: VSS.require method not available (expected in this environment)');
        }
        
        // If all methods fail, go to demo mode but still notify success
        console.log('Identity Multi-Select: All service methods failed, using demo mode');
        console.log('Identity Multi-Select: All service methods failed, using fallback mode');
    }

    private async loadFieldValue(): Promise<void> {
        if (!this.workItemFormService) {
            console.warn('Identity Multi-Select: No work item form service available');
            return;
        }
        
        if (!this.fieldName) {
            console.warn('Identity Multi-Select: No field name configured');
            return;
        }

        try {
            console.log('Identity Multi-Select: Attempting to load field value for:', this.fieldName);
            console.log('Identity Multi-Select: Field name being used:', this.fieldName);
            
            // Don't try to get field info - just get the value directly
            const fieldValue = await this.workItemFormService.getFieldValue(this.fieldName);
            console.log('Identity Multi-Select: Current field value:', fieldValue, 'Type:', typeof fieldValue);

            if (fieldValue) {
                await this.parseFieldValue(fieldValue);
            }

            // Check if field is read-only - use defensive approach
            try {
                // Try different approaches for readonly check since method signatures vary
                if (this.workItemFormService.isReadOnly) {
                    // Some versions require field name, others don't
                    try {
                        this.isReadOnly = await this.workItemFormService.isReadOnly(this.fieldName);
                    } catch (paramError) {
                        // Fallback to no-parameter version
                        this.isReadOnly = await this.workItemFormService.isReadOnly();
                    }
                } else {
                    this.isReadOnly = false;
                }
                console.log('Identity Multi-Select: Field read-only status:', this.isReadOnly);
            } catch (readOnlyError) {
                console.log('Identity Multi-Select: Could not check read-only status:', readOnlyError);
                this.isReadOnly = false;
            }
            
        } catch (error) {
            console.error('Identity Multi-Select: Error loading field value:', error);
            console.error('Identity Multi-Select: Field name being used:', this.fieldName);
        }
    }

    private async parseFieldValue(value: string): Promise<void> {
        if (!value) return;

        try {
            // Parse line-separated identity values (one per line) or fallback to separator-based for backward compatibility
            let identityStrings: string[];
            
            if (value.includes('\n')) {
                // Multi-line format: split by line breaks
                identityStrings = value.split(/\r?\n/).filter(s => s.trim());
            } else {
                // Fallback: split by semicolon or comma for backward compatibility
                identityStrings = value.split(/[;,]/).filter(s => s.trim());
            }
            
            for (const identityString of identityStrings) {
                const identity = await this.parseIdentityString(identityString.trim());
                if (identity) {
                    // Use addIdentityIfNotExists to check for duplicates
                    this.addIdentityIfNotExists(identity);
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

    private async setupUI(): Promise<void> {
        try {
            console.log('Identity Multi-Select: Setting up dual-field identity picker...');
            console.log('Identity Multi-Select: Storage field:', this.fieldName, 'Source field:', this.identitySourceFieldName);
            
            // Setup identity source field monitoring (the native identity picker)
            await this.setupIdentitySourceFieldBinding();
            
            // Update the initial display
            this.updateSelectedDisplay();
            
        } catch (error) {
            console.error('Identity Multi-Select: Error setting up UI:', error);
            this.showFallbackMessage();
        }
    }

    private async loadIdentityPickerModules(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                // Use VSS.require to load Azure DevOps Identity Picker modules
                VSS.require([
                    'VSS/Identities/Picker/Controls',
                    'VSS/Identities/Picker/Services',
                    'VSS/Identities/RestClient'
                ], (IdentityPickerControls: any, IdentityPickerServices: any, IdentityRestClient: any) => {
                    console.log('Identity Multi-Select: Identity Picker modules loaded');
                    this.identityPickerControls = IdentityPickerControls;
                    resolve();
                }, (error: any) => {
                    console.log('Identity Multi-Select: Could not load Identity Picker modules, trying alternative approach');
                    this.tryAlternativeIdentityPicker().then(resolve).catch(reject);
                });
            } catch (error) {
                console.log('Identity Multi-Select: VSS.require not available, trying alternative approach');
                this.tryAlternativeIdentityPicker().then(resolve).catch(reject);
            }
        });
    }

    private async tryAlternativeIdentityPicker(): Promise<void> {
        // The native Azure DevOps Identity Picker is not available to extensions
        // We'll create a functional HTML-based identity picker instead
        console.log('Identity Multi-Select: Native identity picker not available to extensions, using HTML fallback');
        
        // Create HTML-based identity picker
        this.createHtmlIdentityPicker();
    }

    private async createNativeIdentityPicker(): Promise<void> {
        const pickerContainer = document.getElementById('native-identity-picker');
        
        if (!pickerContainer) {
            throw new Error('Identity picker container not found');
        }

        if (this.identityPickerControls && this.identityPickerControls.IdentityPickerSearchControl) {
            try {
                console.log('Identity Multi-Select: Creating native identity picker control...');
                
                const pickerOptions: IIdentityPickerOptions = {
                    operationScope: { IMS: true, Source: true },
                    identityType: { 
                        User: true, 
                        Group: this.allowGroups 
                    },
                    multiSelect: true,
                    showMruTriangle: true,
                    showContactCard: true,
                    size: 'medium',
                    callbacks: {
                        onItemSelect: (identity: any) => {
                            this.onIdentitySelected(identity);
                        },
                        preDropdownRender: (entityList: any[]) => {
                            // Filter results if needed
                            return entityList.slice(0, 50); // Limit to 50 results
                        }
                    }
                };

                // Placeholder for where identity picker would be created
                console.log('Identity Multi-Select: Skipping deprecated identity picker creation');
                
            } catch (error) {
                console.error('Identity Multi-Select: Error creating native identity picker:', error);
                throw error;
            }
        } else {
            throw new Error('Identity Picker Controls not available');
        }
    }

    private createHtmlIdentityPicker(): void {
        const pickerContainer = document.getElementById('native-identity-picker');
        
        if (!pickerContainer) return;
        
        console.log('Identity Multi-Select: Creating enhanced HTML identity picker...');
        
        // Get current user for suggestions
        const webContext = VSS.getWebContext();
        const currentUser = webContext.user;
        
        pickerContainer.innerHTML = `
            <div class="html-identity-picker">
                <div class="identity-input-container">
                    <input type="text" 
                           id="identity-search-input" 
                           placeholder="Type name or email to search..." 
                           class="identity-search-input" 
                           ${this.isReadOnly ? 'disabled' : ''} />
                    <div class="search-hint">Start typing to search for users</div>
                </div>
                <div id="identity-search-dropdown" class="identity-search-dropdown" style="display: none;">
                    <div class="current-user-suggestion" data-user-id="${currentUser?.id || ''}" data-user-name="${currentUser?.name || ''}" data-user-email="${currentUser?.email || currentUser?.uniqueName || ''}">
                        <div class="identity-avatar">${this.getInitials(currentUser?.name || 'U')}</div>
                        <div class="identity-info">
                            <div class="identity-name">${this.escapeHtml(currentUser?.name || 'Current User')}</div>
                            <div class="identity-email">${this.escapeHtml(currentUser?.email || currentUser?.uniqueName || '')}</div>
                        </div>
                        <div class="user-type">You</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event handlers for HTML identity picker
        const searchInput = document.getElementById('identity-search-input') as HTMLInputElement;
        if (searchInput && !this.isReadOnly) {
            searchInput.addEventListener('input', (e) => this.handleIdentitySearch(e));
            searchInput.addEventListener('focus', () => this.showCurrentUserSuggestion());
            searchInput.addEventListener('blur', () => {
                setTimeout(() => this.hideSearchDropdown(), 150);
            });
        }
        
        // Add click handler for current user suggestion
        const currentUserSuggestion = pickerContainer.querySelector('.current-user-suggestion');
        if (currentUserSuggestion && !this.isReadOnly) {
            currentUserSuggestion.addEventListener('click', () => {
                const userId = currentUserSuggestion.getAttribute('data-user-id');
                const userName = currentUserSuggestion.getAttribute('data-user-name');
                const userEmail = currentUserSuggestion.getAttribute('data-user-email');
                
                if (userId && userName) {
                    this.onIdentitySelected({
                        id: userId,
                        displayName: userName,
                        uniqueName: userEmail || userName,
                        entityType: 'User'
                    });
                }
            });
        }
    }

    private onIdentitySelected(identity: any): void {
        try {
            console.log('Identity Multi-Select: Identity selected:', identity);
            
            // Convert Azure DevOps identity to our format
            const normalizedIdentity: Identity = {
                id: identity.entityId || identity.id || identity.uniqueName,
                displayName: identity.displayName || identity.name,
                uniqueName: identity.uniqueName || identity.mail || identity.email,
                imageUrl: identity.imageUrl,
                entityType: identity.entityType || (identity.isGroup ? 'Group' : 'User'),
                descriptor: identity.descriptor
            };
            
            // Use the centralized method that handles duplicates and max selections
            const wasAdded = this.addIdentityIfNotExists(normalizedIdentity);
            
            if (wasAdded) {
                this.updateSelectedDisplay();
                this.updateFieldValue();
                console.log('Identity Multi-Select: Identity added to selection:', normalizedIdentity.displayName);
            }
            
        } catch (error) {
            console.error('Identity Multi-Select: Error handling identity selection:', error);
        }
    }

    private async handleIdentitySearch(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const searchTerm = input.value.trim();
        
        if (searchTerm.length === 0) {
            this.showCurrentUserSuggestion();
            return;
        }
        
        if (searchTerm.length < 2) {
            this.hideSearchDropdown();
            return;
        }
        
        // For now, we can only suggest the current user if it matches
        // In a real implementation, you would call Azure DevOps APIs to search
        const webContext = VSS.getWebContext();
        const currentUser = webContext.user;
        const suggestions: Identity[] = [];
        
        if (currentUser && (
            currentUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (currentUser.email && currentUser.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (currentUser.uniqueName && currentUser.uniqueName.toLowerCase().includes(searchTerm.toLowerCase()))
        )) {
            suggestions.push({
                id: currentUser.id,
                displayName: currentUser.name,
                uniqueName: currentUser.email || currentUser.uniqueName,
                entityType: 'User'
            });
        }
        
        this.showSearchResults(suggestions);
    }

    private showCurrentUserSuggestion(): void {
        const dropdown = document.getElementById('identity-search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }

    private showSearchResults(identities: Identity[]): void {
        const dropdown = document.getElementById('identity-search-dropdown');
        if (!dropdown) return;
        
        if (identities.length === 0) {
            dropdown.innerHTML = `
                <div class="search-message">
                    <p>Use the native Azure DevOps identity picker above for full directory search.</p>
                    <p>This fallback search has limited capabilities.</p>
                </div>
            `;
        } else {
            dropdown.innerHTML = identities.map(identity => `
                <div class="identity-result" data-id="${identity.id}">
                    <div class="identity-avatar">${this.getInitials(identity.displayName)}</div>
                    <div class="identity-info">
                        <div class="identity-name">${this.escapeHtml(identity.displayName)}</div>
                        <div class="identity-email">${this.escapeHtml(identity.uniqueName)}</div>
                    </div>
                </div>
            `).join('');
            
            // Add click handlers
            dropdown.querySelectorAll('.identity-result').forEach(result => {
                result.addEventListener('click', (e) => {
                    const identityId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                    const identity = identities.find(i => i.id === identityId);
                    if (identity) {
                        this.onIdentitySelected(identity);
                    }
                });
            });
        }
        
        this.showSearchDropdown();
    }

    private showSearchDropdown(): void {
        const dropdown = document.getElementById('identity-search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
        }
    }

    private hideSearchDropdown(): void {
        const dropdown = document.getElementById('identity-search-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    private showMessage(message: string): void {
        // Simple message display - in a real implementation you might want to use Azure DevOps UI components
        alert(message);
    }

    private showFallbackUI(): void {
        console.log('Identity Multi-Select: Showing fallback UI');
        const demoNotice = document.getElementById('demo-notice') as HTMLElement;
        if (demoNotice) {
            demoNotice.textContent = 'Using fallback identity picker - native picker could not be loaded.';
            demoNotice.style.display = 'block';
        }
        
        this.createHtmlIdentityPicker();
    }

    private loadIdentities(): void {
        // With native identity picker, we don't need to pre-load all identities
        // The native picker handles search and loading as needed
        console.log('Identity Multi-Select: Using native Azure DevOps identity picker - no pre-loading needed');
    }

    private async loadRealIdentities(): Promise<Identity[]> {
        const webContext = VSS.getWebContext();
        const realIdentities: Identity[] = [];
        
        // Always include current user first
        if (webContext.user) {
            realIdentities.push({
                id: webContext.user.id,
                displayName: webContext.user.name,
                uniqueName: webContext.user.email || webContext.user.uniqueName,
                entityType: "User"
            });
        }
        
        try {
            console.log('Identity Multi-Select: Attempting to load identities via VSS services...');
            
            // Method 1: Try VSS.getService() for identity services (same pattern as CascadingMultiSelect)
            const identityServiceIds = [
                'ms.vss-web.identity-service',
                'ms.vss-tfs-web.tfs-identity-service',
                'VSS/Identities/Picker/Services',
                'TFS/WorkItemTracking/Services',
                'VSS/Service'
            ];
            
            for (const serviceId of identityServiceIds) {
                try {
                    console.log('Identity Multi-Select: Attempting to get identity service with ID:', serviceId);
                    const identityService = await VSS.getService(serviceId);
                    
                    if (identityService) {
                        console.log('Identity Multi-Select: Identity service obtained with ID:', serviceId);
                        
                        // Try to get identities from the service
                        if (identityService.getIdentities) {
                            const identities = await identityService.getIdentities();
                            if (identities && identities.length > 0) {
                                console.log('Identity Multi-Select: Found', identities.length, 'identities from service');
                                identities.forEach((identity: any) => {
                                    if (identity && identity.id !== webContext.user?.id) {
                                        realIdentities.push({
                                            id: identity.id,
                                            displayName: identity.displayName || identity.name,
                                            uniqueName: identity.uniqueName || identity.email,
                                            entityType: identity.entityType || "User"
                                        });
                                    }
                                });
                            }
                        }
                        
                        // Try searchIdentities method
                        if (identityService.searchIdentities) {
                            try {
                                const searchResults = await identityService.searchIdentities("", 50);
                                if (searchResults && searchResults.length > 0) {
                                    console.log('Identity Multi-Select: Found', searchResults.length, 'identities from search');
                                    searchResults.forEach((identity: any) => {
                                        if (identity && identity.id !== webContext.user?.id && 
                                            !realIdentities.find(u => u.id === identity.id)) {
                                            realIdentities.push({
                                                id: identity.id,
                                                displayName: identity.displayName || identity.name,
                                                uniqueName: identity.uniqueName || identity.email,
                                                entityType: identity.entityType || "User"
                                            });
                                        }
                                    });
                                }
                            } catch (searchError) {
                                console.log('Identity Multi-Select: Search identities failed:', searchError);
                            }
                        }
                        
                        // Try getIdentitiesByScope method if available  
                        if (identityService.getIdentitiesByScope) {
                            try {
                                const scopedResults = await identityService.getIdentitiesByScope("project");
                                if (scopedResults && scopedResults.length > 0) {
                                    console.log('Identity Multi-Select: Found', scopedResults.length, 'identities by scope');
                                    scopedResults.forEach((identity: any) => {
                                        if (identity && identity.id !== webContext.user?.id && 
                                            !realIdentities.find(u => u.id === identity.id)) {
                                            realIdentities.push({
                                                id: identity.id,
                                                displayName: identity.displayName || identity.name,
                                                uniqueName: identity.uniqueName || identity.email,
                                                entityType: identity.entityType || "User"
                                            });
                                        }
                                    });
                                }
                            } catch (scopeError) {
                                console.log('Identity Multi-Select: Get identities by scope failed:', scopeError);
                            }
                        }
                        
                        break; // Exit loop if we got a working service
                    }
                } catch (error) {
                    console.log(`Identity Multi-Select: Service ID ${serviceId} not available, trying next...`);
                }
            }
            
            // Method 2: Try VSS.require only if window.require exists (same as CascadingMultiSelect)
            if (realIdentities.length === 1 && typeof (window as any).require === 'function') {
                try {
                    await new Promise<void>((resolve, reject) => {
                        VSS.require([
                            'VSS/Identities/Picker/Services',
                            'VSS/Identities/RestClient',
                            'TFS/Core/RestClient'
                        ], (IdentityServices: any, IdentityClient: any, CoreClient: any) => {
                            try {
                                console.log('Identity Multi-Select: VSS.require services loaded');
                                
                                if (IdentityServices && IdentityServices.IdentityService) {
                                    const identityService = IdentityServices.IdentityService.getService();
                                    console.log('Identity Multi-Select: Identity service obtained via VSS.require');
                                }
                                
                                if (CoreClient) {
                                    const coreClient = CoreClient.getClient();
                                    console.log('Identity Multi-Select: Core client obtained via VSS.require');
                                }
                                
                                resolve();
                            } catch (err) {
                                console.log('Identity Multi-Select: VSS.require services not functional:', err);
                                resolve(); // Continue anyway
                            }
                        }, () => {
                            console.log('Identity Multi-Select: VSS.require services not available');
                            resolve(); // Continue anyway
                        });
                    });
                } catch (err) {
                    console.log('Identity Multi-Select: VSS.require method failed:', err);
                }
            } else {
                console.log('Identity Multi-Select: VSS.require method not available or already have identities');
            }
            
            // Method 3: Try to get team information from work item service
            if (this.workItemFormService && realIdentities.length === 1) {
                try {
                    console.log('Identity Multi-Select: Attempting to get team context...');
                    
                    // Try to get project information
                    const projectId = webContext.project?.id;
                    const teamId = webContext.team?.id;
                    
                    if (projectId) {
                        console.log('Identity Multi-Select: Project ID available:', projectId);
                        // In a real implementation, you might use REST client to get team members
                    }
                    
                } catch (err) {
                    console.log('Identity Multi-Select: Could not get team context:', err);
                }
            }
            
            console.log('Identity Multi-Select: Using available identities to avoid CORS issues');
            
        } catch (error) {
            console.log('Identity Multi-Select: Error loading additional identities:', error);
        }
        
        console.log('Identity Multi-Select: Loaded real identities:', realIdentities.map(u => u.displayName));
        return realIdentities;
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
        console.log('Identity Multi-Select: updateSelectedDisplay called');
        console.log('Identity Multi-Select: selectedIdentities array:', this.selectedIdentities);
        console.log('Identity Multi-Select: selectedIdentities count:', this.selectedIdentities.length);
        
        const container = document.getElementById('selected-identities') as HTMLElement;
        console.log('Identity Multi-Select: selected-identities container found:', !!container);
        
        if (!container) {
            console.error('Identity Multi-Select: selected-identities container not found in DOM!');
            return;
        }
        
        if (this.selectedIdentities.length === 0) {
            console.log('Identity Multi-Select: No identities to display, clearing container');
            container.innerHTML = '';
            return;
        }

        console.log('Identity Multi-Select: Updating display with', this.selectedIdentities.length, 'identities');
        
        const html = this.selectedIdentities.map(identity => {
            const avatarInitials = this.getInitials(identity.displayName);
            const displayName = this.escapeHtml(identity.displayName);
            const removeBtn = !this.isReadOnly ? `<span class="remove-btn" data-identity-id="${identity.id}">×</span>` : '';
            
            console.log('Identity Multi-Select: Creating HTML for identity:', identity.displayName);
            
            return `
            <div class="selected-identity">
                <div class="identity-avatar">${avatarInitials}</div>
                ${displayName}
                ${removeBtn}
            </div>`;
        }).join('');

        console.log('Identity Multi-Select: Setting container HTML:', html);
        container.innerHTML = html;

        // Add remove handlers
        if (!this.isReadOnly) {
            const removeButtons = container.querySelectorAll('.remove-btn');
            console.log('Identity Multi-Select: Adding event handlers to', removeButtons.length, 'remove buttons');
            
            removeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const identityId = (e.target as HTMLElement).getAttribute('data-identity-id');
                    console.log('Identity Multi-Select: Remove button clicked for identity:', identityId);
                    if (identityId) {
                        this.removeIdentity(identityId);
                    }
                });
            });
        }
        
        console.log('Identity Multi-Select: Display update completed');
    }

    private async updateFieldValue(): Promise<void> {
        console.log('Identity Multi-Select: updateFieldValue called');
        console.log('Identity Multi-Select: workItemFormService:', this.workItemFormService);
        console.log('Identity Multi-Select: fieldName:', this.fieldName);
        console.log('Identity Multi-Select: selectedIdentities:', this.selectedIdentities);
        
        if (!this.workItemFormService || !this.fieldName) {
            console.warn('Identity Multi-Select: Cannot update field - missing service or field name');
            console.warn('Identity Multi-Select: Service available:', !!this.workItemFormService);
            console.warn('Identity Multi-Select: Field name available:', !!this.fieldName);
            console.warn('Identity Multi-Select: Field name value:', this.fieldName);
            
            // Try to get the service again
            if (!this.workItemFormService) {
                console.log('Identity Multi-Select: Attempting to get work item form service again...');
                try {
                    this.workItemFormService = await VSS.getService(VSS.ServiceIds.WorkItemFormService);
                    console.log('Identity Multi-Select: Successfully obtained work item form service on retry');
                } catch (retryError) {
                    console.error('Identity Multi-Select: Retry failed:', retryError);
                    return;
                }
            }
            
            // If still no field name, cannot proceed
            if (!this.fieldName) {
                console.error('Identity Multi-Select: No field name available, cannot update field');
                return;
            }
        }

        try {
            console.log('Identity Multi-Select: Starting field update for:', this.fieldName);
            console.log('Identity Multi-Select: Selected identities:', this.selectedIdentities);
            
            // MULTI-LINE APPROACH: Use line-separated format for better readability
            // Each identity on its own line in "Display Name <email>" format
            
            let value: string;
            
            if (this.selectedIdentities.length === 0) {
                value = '';
            } else {
                // Create multi-line string with identity format: "Display Name <email>"
                value = this.selectedIdentities
                    .map(identity => `${identity.displayName} <${identity.uniqueName}>`)
                    .join('\n');
            }

            console.log('Identity Multi-Select: Setting field value (multi-line):', value);
            
            // Set the field value using the standard method
            await this.workItemFormService.setFieldValue(this.fieldName, value);
            console.log('Identity Multi-Select: Field value set successfully');
            
            // Verify the value was set
            const verifyValue = await this.workItemFormService.getFieldValue(this.fieldName);
            console.log('Identity Multi-Select: Verification - field now contains:', verifyValue);
            
            // Notify Azure DevOps that the field has changed
            this.notifyFieldChange(value);
            
        } catch (error) {
            console.error('Identity Multi-Select: Error updating field value:', error);
            console.error('Identity Multi-Select: Field name:', this.fieldName);
            console.error('Identity Multi-Select: Selected identities:', this.selectedIdentities);
        }
    }



    private notifyFieldChange(value: string): void {
        try {
            console.log('Identity Multi-Select: Notifying field change with value:', value);
            
            // Method 1: Direct event dispatch
            const event = new CustomEvent('fieldChanged', {
                detail: {
                    fieldName: this.fieldName,
                    value: value
                }
            });
            window.dispatchEvent(event);
            
            // Method 2: Try parent window communication
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'fieldChanged',
                    fieldName: this.fieldName,
                    value: value
                }, '*');
            }
            
            console.log('Identity Multi-Select: Field change notifications sent');
            
        } catch (error) {
            console.log('Identity Multi-Select: Could not notify field change:', error);
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

    private setupHiddenIdentityField(): void {
        console.log('Identity Multi-Select: Setting up native identity field for Azure DevOps picker...');
        
        const nativeInput = document.getElementById('native-identity-input') as HTMLInputElement;
        if (!nativeInput) {
            console.warn('Identity Multi-Select: Native identity input not found');
            return;
        }

        try {
            // Monitor changes to the native field to detect identity selections
            nativeInput.addEventListener('change', (e) => this.handleNativeFieldChange(e));
            nativeInput.addEventListener('input', (e) => this.handleNativeFieldChange(e));
            nativeInput.addEventListener('blur', (e) => this.handleNativeFieldChange(e));
            
            // Try to trigger Azure DevOps to enhance the field
            setTimeout(() => {
                console.log('Identity Multi-Select: Attempting to trigger Azure DevOps identity enhancement...');
                
                // Focus and blur to trigger enhancement
                nativeInput.focus();
                setTimeout(() => {
                    nativeInput.blur();
                    console.log('Identity Multi-Select: Identity field focus/blur cycle completed');
                }, 200);
                
                // Try to dispatch initialization events
                const initEvent = new CustomEvent('vss-identity-init', { bubbles: true });
                nativeInput.dispatchEvent(initEvent);
                
            }, 500);
            
            console.log('Identity Multi-Select: Native identity field configured successfully');
        } catch (error) {
            console.log('Identity Multi-Select: Could not setup native identity field:', error);
        }
    }

    private setupPickerControls(): void {
        const searchInput = document.getElementById('identity-search-input') as HTMLInputElement;
        const pickerButton = document.getElementById('native-picker-button') as HTMLButtonElement;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
            searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
            
            if (this.isReadOnly) {
                searchInput.disabled = true;
                searchInput.placeholder = 'Read-only';
            }
        }

        if (pickerButton) {
            pickerButton.addEventListener('click', () => this.openNativePicker());
            
            if (this.isReadOnly) {
                pickerButton.disabled = true;
            }
        }
    }

    private handleNativeFieldChange(event: Event): void {
        const nativeInput = event.target as HTMLInputElement;
        const value = nativeInput.value.trim();
        
        console.log('Identity Multi-Select: Native identity field changed:', value);
        
        // Ignore empty values or single characters (keystrokes)
        if (!value || value.length <= 2) {
            return;
        }
        
        // Ignore if it looks like partial typing (no complete identity format)
        if (!this.isCompleteIdentityFormat(value)) {
            console.log('Identity Multi-Select: Ignoring incomplete identity format:', value);
            return;
        }
        
        // Debounce the processing to avoid handling every keystroke
        if (this.parseTimeout) {
            clearTimeout(this.parseTimeout);
        }
        
        this.parseTimeout = setTimeout(() => {
            this.processNativeFieldValue(value, nativeInput);
        }, 500); // Wait 500ms after user stops typing
    }

    private isCompleteIdentityFormat(value: string): boolean {
        // Check if the value contains a complete identity format
        // Either: "Display Name <email@domain.com>" or just "email@domain.com"
        const emailRegex = /\S+@\S+\.\S+/;
        const displayNameFormat = /^.+\s*<\S+@\S+\.\S+>$/;
        
        return emailRegex.test(value) || displayNameFormat.test(value) || 
               value.includes(';') || value.includes(','); // Multiple identities
    }

    private processNativeFieldValue(value: string, nativeInput: HTMLInputElement): void {
        try {
            console.log('Identity Multi-Select: Processing native field value:', value);
            
            const beforeCount = this.selectedIdentities.length;
            this.parseHiddenFieldValue(value);
            
            // If we successfully parsed identities, clear the native field
            if (this.selectedIdentities.length > beforeCount) {
                nativeInput.value = '';
                this.updateSelectedDisplay();
                this.updateFieldValue();
            }
        } catch (error) {
            console.error('Identity Multi-Select: Error processing native field value:', error);
        }
    }

    private parseHiddenFieldValue(value: string): void {
        console.log('Identity Multi-Select: Parsing hidden field value:', value);
        
        // Azure DevOps identity fields can contain various formats
        if (value.includes('<') && value.includes('>')) {
            const identities = this.parseDisplayNameFormat(value);
            identities.forEach(identity => this.addIdentityIfNotExists(identity));
        } else if (value.startsWith('[') || value.startsWith('{')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => this.addIdentityFromObject(item));
                } else {
                    this.addIdentityFromObject(parsed);
                }
            } catch (error) {
                const identities = this.parseDisplayNameFormat(value);
                identities.forEach(identity => this.addIdentityIfNotExists(identity));
            }
        } else {
            const identities = this.parseDisplayNameFormat(value);
            identities.forEach(identity => this.addIdentityIfNotExists(identity));
        }
    }

    private parseDisplayNameFormat(value: string): Identity[] {
        const identities: Identity[] = [];
        const parts = value.split(/[;,]/).map(s => s.trim()).filter(s => s);
        
        for (const part of parts) {
            const match = part.match(/^(.*?)\s*<([^>]+)>$/);
            if (match) {
                const displayName = match[1].trim();
                const uniqueName = match[2].trim();
                
                identities.push({
                    id: uniqueName,
                    displayName: displayName,
                    uniqueName: uniqueName,
                    entityType: 'User'
                });
            } else if (part.includes('@')) {
                identities.push({
                    id: part,
                    displayName: part,
                    uniqueName: part,
                    entityType: 'User'
                });
            } else {
                identities.push({
                    id: part,
                    displayName: part,
                    uniqueName: part,
                    entityType: 'User'
                });
            }
        }
        
        return identities;
    }

    private addIdentityFromObject(obj: any): void {
        if (obj && (obj.displayName || obj.name)) {
            const identity: Identity = {
                id: obj.id || obj.uniqueName || obj.email || obj.displayName,
                displayName: obj.displayName || obj.name,
                uniqueName: obj.uniqueName || obj.email || obj.displayName,
                entityType: obj.entityType || (obj.isGroup ? 'Group' : 'User'),
                imageUrl: obj.imageUrl
            };
            
            this.addIdentityIfNotExists(identity);
        }
    }

    private addIdentityIfNotExists(identity: Identity): boolean {
        // Check for duplicates using multiple criteria for better accuracy
        const isDuplicate = this.selectedIdentities.some(i => 
            i.id === identity.id || 
            i.uniqueName === identity.uniqueName ||
            (i.uniqueName && identity.uniqueName && i.uniqueName.toLowerCase() === identity.uniqueName.toLowerCase()) ||
            (i.displayName === identity.displayName && i.displayName.toLowerCase() === identity.displayName.toLowerCase())
        );
        
        if (isDuplicate) {
            console.log('Identity Multi-Select: Identity already exists:', identity.displayName);
            return false;
        }
        
        if (this.selectedIdentities.length >= this.maxSelections) {
            console.warn(`Identity Multi-Select: Maximum ${this.maxSelections} selections reached`);
            this.showMessage(`Maximum ${this.maxSelections} selections allowed`);
            return false;
        }
        
        this.selectedIdentities.push(identity);
        console.log('Identity Multi-Select: Added identity:', identity.displayName);
        return true;
    }

    private showSuccessMessage(message: string): void {
        console.log('Identity Multi-Select: Success -', message);
        
        // Try to show a temporary success message in the UI
        try {
            const container = document.querySelector('.identity-container') as HTMLElement;
            if (container) {
                const successDiv = document.createElement('div');
                successDiv.style.cssText = `
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    color: #155724;
                    padding: 8px 12px;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    font-size: 14px;
                    position: relative;
                `;
                successDiv.textContent = message;
                
                // Insert at the top of the container
                container.insertBefore(successDiv, container.firstChild);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    if (successDiv && successDiv.parentNode) {
                        successDiv.parentNode.removeChild(successDiv);
                    }
                }, 3000);
            }
        } catch (error) {
            // Fallback to console only
            console.log('Identity Multi-Select: Could not show UI message, using console only');
        }
    }

    private openNativePicker(): void {
        console.log('Identity Multi-Select: Focusing on native identity field...');
        
        const nativeInput = document.getElementById('native-identity-input') as HTMLInputElement;
        if (nativeInput) {
            // Clear and focus the native identity field
            nativeInput.value = '';
            nativeInput.focus();
            
            // Try to trigger dropdown if it exists
            setTimeout(() => {
                nativeInput.click();
                
                // Try to trigger identity picker dropdown
                const keyEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    code: 'ArrowDown',
                    bubbles: true,
                    cancelable: true
                });
                nativeInput.dispatchEvent(keyEvent);
                
                // Also try space key which sometimes triggers dropdowns
                const spaceEvent = new KeyboardEvent('keydown', {
                    key: ' ',
                    code: 'Space',
                    bubbles: true,
                    cancelable: true
                });
                nativeInput.dispatchEvent(spaceEvent);
                
            }, 100);
            
            console.log('Identity Multi-Select: Native field focused and triggered');
        } else {
            console.warn('Identity Multi-Select: Native input not found');
        }
    }

    private handleSearchInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const searchTerm = input.value.trim();
        
        if (searchTerm.length >= 2) {
            console.log('Identity Multi-Select: Search input:', searchTerm);
        }
    }

    private handleSearchKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.target as HTMLInputElement;
            const searchTerm = input.value.trim();
            
            if (searchTerm) {
                this.addManualIdentity(searchTerm);
                input.value = '';
            }
        }
    }

    private addManualIdentity(value: string): void {
        const identities = this.parseDisplayNameFormat(value);
        if (identities.length > 0) {
            identities.forEach(identity => this.addIdentityIfNotExists(identity));
            this.updateSelectedDisplay();
            this.updateFieldValue();
            console.log('Identity Multi-Select: Added manual identity:', value);
        }
    }

    private showFallbackMessage(): void {
        console.log('Identity Multi-Select: Using enhanced mode');
        const demoNotice = document.getElementById('demo-notice') as HTMLElement;
        if (demoNotice) {
            demoNotice.textContent = 'Dual-field identity picker - use the identity field above to search, or add manually below.';
            demoNotice.style.display = 'block';
        }
    }

    private async setupIdentitySourceFieldBinding(): Promise<void> {
        console.log('Identity Multi-Select: Setting up identity source field binding...');
        
        if (!this.identitySourceFieldName || !this.workItemFormService) {
            console.warn('Identity Multi-Select: Cannot setup identity source - missing field name or service');
            console.warn('Identity Multi-Select: identitySourceFieldName:', this.identitySourceFieldName);
            console.warn('Identity Multi-Select: workItemFormService:', !!this.workItemFormService);
            return;
        }

        try {
            console.log('Identity Multi-Select: Setting up polling-based field monitoring for:', this.identitySourceFieldName);
            
            // Start monitoring the identity source field with polling since addFieldValueChangedListener isn't available
            this.startFieldMonitoring();

            console.log('Identity Multi-Select: Identity source field monitoring started for:', this.identitySourceFieldName);
        } catch (error) {
            console.error('Identity Multi-Select: Error setting up identity source field binding:', error);
        }
    }

    private startFieldMonitoring(): void {
        let lastValue: any = null;
        
        const checkFieldValue = async () => {
            try {
                if (!this.workItemFormService || !this.identitySourceFieldName) {
                    return;
                }

                const currentValue = await this.workItemFormService.getFieldValue(this.identitySourceFieldName);
                
                // Check if value has changed and is not empty
                if (currentValue !== lastValue && currentValue) {
                    console.log('Identity Multi-Select: Field value changed from', lastValue, 'to', currentValue);
                    lastValue = currentValue;
                    await this.handleIdentitySourceFieldChange(currentValue);
                } else if (!currentValue && lastValue) {
                    // Field was cleared
                    console.log('Identity Multi-Select: Field was cleared');
                    lastValue = currentValue;
                }
            } catch (error) {
                console.log('Identity Multi-Select: Error checking field value:', error);
            }
        };

        // Check every 500ms for field changes
        setInterval(checkFieldValue, 500);
        
        // Also check immediately
        checkFieldValue();
    }

    // Manual entry controls removed since we're using native Azure DevOps identity picker

    private async handleIdentitySourceFieldChange(newValue: any): Promise<void> {
        console.log('Identity Multi-Select: Identity source field changed to:', newValue);
        console.log('Identity Multi-Select: Value type:', typeof newValue);
        console.log('Identity Multi-Select: Value details:', JSON.stringify(newValue, null, 2));
        
        if (!newValue) {
            console.log('Identity Multi-Select: No value provided, skipping');
            return;
        }

        try {
            // Parse the identity value from the source field
            let identities: Identity[] = [];
            
            if (typeof newValue === 'string') {
                console.log('Identity Multi-Select: Parsing string value:', newValue);
                // Parse string representation - could be various formats
                if (newValue.includes('<') && newValue.includes('>')) {
                    // Format: "Display Name <email@domain.com>"
                    identities = this.parseDisplayNameFormat(newValue);
                } else if (newValue.includes('@')) {
                    // Format: just email
                    identities = [{
                        id: newValue,
                        displayName: newValue.split('@')[0],
                        uniqueName: newValue,
                        entityType: 'User'
                    }];
                } else {
                    // Format: just display name
                    identities = [{
                        id: newValue,
                        displayName: newValue,
                        uniqueName: newValue,
                        entityType: 'User'
                    }];
                }
            } else if (Array.isArray(newValue)) {
                console.log('Identity Multi-Select: Parsing array value with', newValue.length, 'items');
                // Handle array of identity objects
                newValue.forEach((item, index) => {
                    console.log('Identity Multi-Select: Processing array item', index, ':', item);
                    if (item && (item.displayName || item.name || item.uniqueName || item.email)) {
                        identities.push({
                            id: item.id || item.uniqueName || item.email || item.displayName || item.name,
                            displayName: item.displayName || item.name || item.uniqueName || item.email,
                            uniqueName: item.uniqueName || item.email || item.displayName || item.name,
                            entityType: item.entityType || (item.isGroup ? 'Group' : 'User'),
                            imageUrl: item.imageUrl
                        });
                    }
                });
            } else if (typeof newValue === 'object' && (newValue.displayName || newValue.name || newValue.uniqueName || newValue.email)) {
                console.log('Identity Multi-Select: Parsing object value:', newValue);
                // Single identity object
                identities.push({
                    id: newValue.id || newValue.uniqueName || newValue.email || newValue.displayName || newValue.name,
                    displayName: newValue.displayName || newValue.name || newValue.uniqueName || newValue.email,
                    uniqueName: newValue.uniqueName || newValue.email || newValue.displayName || newValue.name,
                    entityType: newValue.entityType || (newValue.isGroup ? 'Group' : 'User'),
                    imageUrl: newValue.imageUrl
                });
            } else {
                console.warn('Identity Multi-Select: Unrecognized value format:', newValue);
                // Try to convert to string and parse
                const stringValue = String(newValue);
                if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
                    identities = [{
                        id: stringValue,
                        displayName: stringValue,
                        uniqueName: stringValue,
                        entityType: 'User'
                    }];
                }
            }

            console.log('Identity Multi-Select: Parsed', identities.length, 'identities:', identities.map(i => i.displayName));

            if (identities.length === 0) {
                console.log('Identity Multi-Select: No identities parsed from value');
                return;
            }

            // Add the new identities
            let addedCount = 0;
            identities.forEach(identity => {
                const wasAdded = this.addIdentityIfNotExists(identity);
                if (wasAdded) addedCount++;
            });

            if (addedCount > 0) {
                console.log('Identity Multi-Select: Added', addedCount, 'new identities');
                
                // Update display and save to storage field
                this.updateSelectedDisplay();
                await this.updateStorageField();

                // Show success message
                this.showSuccessMessage(`Added ${addedCount} identity(ies)`);
            } else {
                console.log('Identity Multi-Select: No new identities added (may be duplicates or at limit)');
            }

            // Clear the identity source field for next selection
            setTimeout(async () => {
                try {
                    console.log('Identity Multi-Select: Clearing identity source field for next selection...');
                    await this.workItemFormService.setFieldValue(this.identitySourceFieldName, '');
                    console.log('Identity Multi-Select: Identity source field cleared successfully');
                } catch (error) {
                    console.log('Identity Multi-Select: Could not clear identity source field:', error);
                }
            }, 1000); // Increased timeout to ensure the selection is processed first

        } catch (error) {
            console.error('Identity Multi-Select: Error handling identity source field change:', error);
        }
    }

    private async updateStorageField(): Promise<void> {
        if (!this.fieldName || !this.workItemFormService) {
            return;
        }

        try {
            // Use multi-line format: one identity per line
            const value = this.selectedIdentities.map(identity => 
                `${identity.displayName} <${identity.uniqueName}>`
            ).join('\n');

            await this.workItemFormService.setFieldValue(this.fieldName, value);
            console.log('Identity Multi-Select: Updated storage field with (multi-line):', value);
        } catch (error) {
            console.error('Identity Multi-Select: Error updating storage field:', error);
        }
    }

    private registerControl(): void {
        try {
            // Register the control object with VSS so Azure DevOps can communicate with it
            VSS.register(VSS.getContribution().id, {
                // Required method: called when the control should be updated
                onFieldChanged: (args: any) => {
                    console.log('Identity Multi-Select: onFieldChanged called', args);
                },
                
                // Required method: called when Azure DevOps wants to validate the field
                isValid: () => {
                    console.log('Identity Multi-Select: isValid called');
                    return true;
                },
                
                // Required method: called when Azure DevOps wants to get the current value
                getValue: () => {
                    console.log('Identity Multi-Select: getValue called');
                    return this.getCurrentFieldValue();
                },
                
                // Required method: called when Azure DevOps wants to set a value
                setValue: (value: string) => {
                    console.log('Identity Multi-Select: setValue called with:', value);
                    this.setFieldValueFromExternal(value);
                }
            });
            
            console.log('Identity Multi-Select: Control registered successfully');
        } catch (error) {
            console.error('Identity Multi-Select: Error registering control:', error);
        }
    }

    private getCurrentFieldValue(): string {
        // Return the current field value in the appropriate format
        try {
            if (this.selectedIdentities.length === 0) {
                return '';
            }

            // Use multi-line format for multiple identities
            return this.selectedIdentities
                .map(identity => `${identity.displayName} <${identity.uniqueName}>`)
                .join('\n');
        } catch (error) {
            console.error('Identity Multi-Select: Error getting current field value:', error);
            return '';
        }
    }

    private async setFieldValueFromExternal(value: string): Promise<void> {
        try {
            console.log('Identity Multi-Select: Setting value from external:', value);
            
            // Clear current selections to avoid duplicates
            this.selectedIdentities = [];
            
            // Parse the new value
            if (value) {
                await this.parseFieldValue(value);
            }
            
            // Update the UI
            this.updateSelectedDisplay();
            
        } catch (error) {
            console.error('Identity Multi-Select: Error setting field value from external:', error);
        }
    }
}

// Global variable to hold the control instance
let identityControlInstance: IdentityMultiSelectControl | null = null;

// Initialize the control only once
function initializeControl() {
    if (identityControlInstance) {
        console.log('Identity Multi-Select: Control already initialized, skipping');
        return;
    }
    
    console.log('Identity Multi-Select: Initializing control instance');
    identityControlInstance = new IdentityMultiSelectControl();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeControl);
} else {
    // DOM is already ready
    initializeControl();
}

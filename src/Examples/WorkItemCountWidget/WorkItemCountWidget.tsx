import "./WorkItemCountWidget.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";

// Declare VSS as global
declare const VSS: any;

// Add console logging helper
const logger = {
    log: (message: string, data?: any) => {
        console.log(`[WorkItemCountWidget] ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
        console.error(`[WorkItemCountWidget ERROR] ${message}`, error || '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WorkItemCountWidget WARN] ${message}`, data || '');
    }
};

// Mock data for display
const mockWorkItemData = {
    projectName: "Sample Project",
    totalCount: 142,
    bugCount: 23,
    taskCount: 67,
    userStoryCount: 52
};

interface IWorkItemCountWidgetState {
    title: string;
    totalCount: number;
    bugCount: number;
    taskCount: number;
    userStoryCount: number;
    loading: boolean;
    error?: string;
}

// Dashboard Widget Component
class WorkItemCountWidgetComponent extends React.Component<{}, IWorkItemCountWidgetState> {
    
    constructor(props: {}) {
        super(props);
        logger.log("Widget component constructor called");
        this.state = {
            title: "Work Item Count",
            totalCount: 0,
            bugCount: 0,
            taskCount: 0,
            userStoryCount: 0,
            loading: true
        };
        logger.log("Widget component constructor completed", this.state);
    }

    public componentDidMount() {
        logger.log("Widget component componentDidMount called");
        this.loadMockData();
        logger.log("Widget component componentDidMount completed");
    }

    public loadMockData() {
        logger.log("Loading mock work item data...");
        setTimeout(() => {
            this.setState({
                totalCount: mockWorkItemData.totalCount,
                bugCount: mockWorkItemData.bugCount,
                taskCount: mockWorkItemData.taskCount,
                userStoryCount: mockWorkItemData.userStoryCount,
                loading: false
            });
            logger.log("Mock data loaded successfully", this.state);
        }, 1000);
    }

    public render(): JSX.Element {
        logger.log("render called", this.state);
        const { totalCount, bugCount, taskCount, userStoryCount, loading, error } = this.state;

        if (loading) {
            logger.log("Rendering loading state");
            return (
                <div style={{ padding: "16px", textAlign: "center", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>Loading work items...</div>
                </div>
            );
        }

        if (error) {
            logger.log("Rendering error state", error);
            return (
                <div style={{ padding: "16px", textAlign: "center", color: "#d83b01", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div>
                        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Widget Error</div>
                        <div style={{ fontSize: "12px" }}>{error}</div>
                    </div>
                </div>
            );
        }

        logger.log("Rendering success state with count", totalCount);
        return (
            <div style={{ 
                padding: "12px", 
                fontFamily: "Segoe UI, sans-serif",
                backgroundColor: "#ffffff",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
            }}>
                {/* Header */}
                <div style={{ 
                    textAlign: "center",
                    marginBottom: "12px"
                }}>
                    <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "bold", 
                        color: "#323130",
                        marginBottom: "4px"
                    }}>
                        Work Item Summary
                    </div>
                    <div style={{ 
                        fontSize: "11px",
                        color: "#605e5c"
                    }}>
                        {mockWorkItemData.projectName}
                    </div>
                </div>

                {/* Main Count */}
                <div style={{
                    textAlign: "center",
                    marginBottom: "16px"
                }}>
                    <div style={{ 
                        fontSize: "36px", 
                        fontWeight: "bold", 
                        color: "#106ebe",
                        marginBottom: "4px"
                    }}>
                        {totalCount}
                    </div>
                    <div style={{ 
                        fontSize: "12px",
                        color: "#605e5c"
                    }}>
                        Total Work Items
                    </div>
                </div>

                {/* Breakdown */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-around",
                    fontSize: "11px"
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ 
                            fontSize: "18px", 
                            fontWeight: "bold", 
                            color: "#d83b01" 
                        }}>{bugCount}</div>
                        <div style={{ color: "#605e5c" }}>Bugs</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ 
                            fontSize: "18px", 
                            fontWeight: "bold", 
                            color: "#107c10" 
                        }}>{taskCount}</div>
                        <div style={{ color: "#605e5c" }}>Tasks</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ 
                            fontSize: "18px", 
                            fontWeight: "bold", 
                            color: "#8764b8" 
                        }}>{userStoryCount}</div>
                        <div style={{ color: "#605e5c" }}>Stories</div>
                    </div>
                </div>
            </div>
        );
    }
}

// Initialize widget following Microsoft documentation pattern
logger.log("Initializing Work Item Count Widget");

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformStyles: true
});

VSS.require(["TFS/Dashboards/WidgetHelpers"], function (WidgetHelpers: any) {
    logger.log("WidgetHelpers loaded, applying styles");
    WidgetHelpers.IncludeWidgetStyles();
    
    VSS.register("work-item-count-widget", function () {
        logger.log("Widget registration function called");
        
        return {
            load: function (widgetSettings: any) {
                logger.log("Widget load function called", widgetSettings);
                
                // Set the title from widget settings
                const title = widgetSettings.name || "Work Item Count";
                
                // Render the React component
                const container = document.getElementById('widget-container') || document.body;
                ReactDOM.render(<WorkItemCountWidgetComponent />, container);
                
                logger.log("Widget loaded successfully");
                return WidgetHelpers.WidgetStatusHelper.Success();
            }
        };
    });
    
    logger.log("Widget registered, notifying load succeeded");
    VSS.notifyLoadSucceeded();
});
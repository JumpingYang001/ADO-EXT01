import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { showRootComponent } from "./Common";
import { Page } from "azure-devops-ui/Page";
import { Card } from "azure-devops-ui/Card";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { Header, TitleSize } from "azure-devops-ui/Header";

interface IExampleItem {
    name: string;
    description: string;
    category: string;
    type: string;
    file: string;
}

const examples: IExampleItem[] = [
    // SampleExamples
    { name: "Hub", description: "Complete hub example with tabs", category: "SampleExamples", type: "Hub", file: "SampleExamples/Hub/Hub.html" },
    { name: "Panel", description: "Panel example with React", category: "SampleExamples", type: "Panel", file: "SampleExamples/Panel/Panel.html" },
    { name: "Feature", description: "Feature flag example", category: "SampleExamples", type: "Feature", file: "SampleExamples/Feature/Feature.html" },
    { name: "Work Item Form Group", description: "Work item form extensions", category: "SampleExamples", type: "Work Item", file: "SampleExamples/WorkItemFormGroup/index.html" },
    { name: "Work Item Open", description: "Work item opening example", category: "SampleExamples", type: "Work Item", file: "SampleExamples/WorkItemOpen/WorkItemOpen.html" },
    { name: "Menu", description: "Context menu example", category: "SampleExamples", type: "Menu", file: "SampleExamples/Menu/Menu.html" },
    { name: "Pivot", description: "Pivot tab example", category: "SampleExamples", type: "Tab", file: "SampleExamples/Pivot/Pivot.html" },
    { name: "Pills", description: "Pills navigation example", category: "SampleExamples", type: "Navigation", file: "SampleExamples/Pills/Pills.html" },
    
    // Samples - Hub Groups
    { name: "Work Hub Group", description: "Custom work hub", category: "Samples", type: "Hub Group", file: "Samples/work-hub-group/work-hub-group.html" },
    { name: "Code Hub Group", description: "Custom code hub", category: "Samples", type: "Hub Group", file: "Samples/code-hub-group/code-hub-group.html" },
    { name: "Test Hub Group", description: "Custom test hub", category: "Samples", type: "Hub Group", file: "Samples/test-hub-group/test-hub-group.html" },
    { name: "Build Release Hub", description: "Build/Release hub", category: "Samples", type: "Hub Group", file: "Samples/build-release-hub-group/build-release-hub-group.html" },
    
    // Samples - Tabs
    { name: "Product Backlog Tabs", description: "Custom backlog tabs", category: "Samples", type: "Tab", file: "Samples/product-backlog-tabs/product-backlog-tabs.html" },
    { name: "Sprint Board Tabs", description: "Sprint board tabs", category: "Samples", type: "Tab", file: "Samples/iteration-backlog-tabs/iteration-backlog-tabs.html" },
    { name: "PR Tabs", description: "Pull request tabs", category: "Samples", type: "Tab", file: "Samples/pr-tabs/pr-tabs.html" },
    { name: "Query Tabs", description: "Query result tabs", category: "Samples", type: "Tab", file: "Samples/query-tabs/query-tabs.html" },
    
    // Samples - Menus
    { name: "Work Item Menu", description: "Work item context menu", category: "Samples", type: "Menu", file: "Samples/work-item-toolbar-menu/work-item-toolbar-menu.html" },
    { name: "Backlog Item Menu", description: "Backlog item menu", category: "Samples", type: "Menu", file: "Samples/backlog-item-menu/backlog-item-menu.html" },
    { name: "Source Item Menu", description: "Source code item menu", category: "Samples", type: "Menu", file: "Samples/source-item-menu/source-item-menu.html" },
    { name: "Pull Request Menu", description: "PR action menu", category: "Samples", type: "Menu", file: "Samples/pull-request-action-menu/pull-request-action-menu.html" },
    
    // Samples - Other
    { name: "Panel Content", description: "Panel content example", category: "Samples", type: "Panel", file: "Samples/panel-content/panel-content.html" },
    { name: "Widget Catalog", description: "Dashboard widget", category: "Samples", type: "Widget", file: "Samples/widget-catalog/widget-catalog.html" },
    { name: "Widget Configuration", description: "Widget config", category: "Samples", type: "Widget", file: "Samples/widget-configuration/widget-configuration.html" },
    { name: "Command", description: "Command contribution", category: "Samples", type: "Command", file: "Samples/command/command.html" },
];

class ExampleBrowser extends React.Component<{}, {}> {

    constructor(props: {}) {
        super(props);
    }

    public componentDidMount() {
        SDK.init();
        SDK.ready().then(() => {
            console.log("Example Browser ready");
            SDK.resize(800, 600);
        });
    }

    private renderExampleCard = (example: IExampleItem, index: number): JSX.Element => {
        return (
            <div key={index} style={{ margin: "8px" }}>
                <Card className="example-card">
                    <div style={{ padding: "16px" }}>
                        <div style={{ marginBottom: "8px" }}>
                            <h3 style={{ margin: "0 0 4px 0", color: "#106ebe" }}>{example.name}</h3>
                            <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                                <span style={{ background: "#f3f2f1", padding: "2px 6px", borderRadius: "3px", marginRight: "8px" }}>
                                    {example.type}
                                </span>
                                <span style={{ background: "#e1dfdd", padding: "2px 6px", borderRadius: "3px" }}>
                                    {example.category}
                                </span>
                            </div>
                        </div>
                        <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>{example.description}</p>
                        <div style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
                            📁 {example.file}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    public render(): JSX.Element {
        const sampleExamples = examples.filter(e => e.category === "SampleExamples");
        const samplesExamples = examples.filter(e => e.category === "Samples");

        return (
            <Surface background={SurfaceBackground.neutral}>
                <Page className="sample-hub flex-grow">
                    <Header title="Azure DevOps Extension Examples" 
                           titleSize={TitleSize.Large} 
                           description="Browse and explore all available extension examples" />
                    
                    <div className="page-content" style={{ padding: "16px" }}>
                        
                        <div style={{ marginBottom: "24px" }}>
                            <h2 style={{ marginBottom: "16px", color: "#323130" }}>📚 SampleExamples (Complete Examples)</h2>
                            <p style={{ marginBottom: "16px", color: "#605e5c" }}>
                                Ready-to-use React components with full functionality and modern Azure DevOps UI patterns.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "8px" }}>
                                {sampleExamples.map(this.renderExampleCard)}
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <h2 style={{ marginBottom: "16px", color: "#323130" }}>🔧 Samples (Contribution Points)</h2>
                            <p style={{ marginBottom: "16px", color: "#605e5c" }}>
                                Specific extension points showing how to integrate with different areas of Azure DevOps.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "8px" }}>
                                {samplesExamples.map(this.renderExampleCard)}
                            </div>
                        </div>
                        
                        <div style={{ marginTop: "24px" }}>
                            <Card className="info-card">
                                <div style={{ padding: "20px", background: "#fff4ce" }}>
                                    <h3 style={{ margin: "0 0 16px 0", color: "#323130" }}>🚀 How to Use These Examples</h3>
                                    <ol style={{ margin: "0 0 16px 0", paddingLeft: "20px" }}>
                                        <li><strong>Choose an example</strong> that matches your needs</li>
                                        <li><strong>Copy the JSON</strong> from the example's .json file to your vss-extension.json contributions array</li>
                                        <li><strong>Add webpack entry</strong> in webpack.config.js for the example files</li>
                                        <li><strong>Build and test</strong> your extension with npm run build:dev</li>
                                        <li><strong>Install in Azure DevOps</strong> to see the example in action</li>
                                    </ol>
                                    
                                    <h4 style={{ margin: "16px 0 8px 0", color: "#323130" }}>📂 File Locations:</h4>
                                    <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "14px" }}>
                                        <li><code>src/SampleExamples/</code> - Complete React examples</li>
                                        <li><code>src/Samples/</code> - Specific contribution examples</li>
                                        <li>Each example has: <code>.html</code>, <code>.json</code>, and <code>.ts/.tsx</code> files</li>
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </div>
                </Page>
            </Surface>
        );
    }
}

showRootComponent(<ExampleBrowser />);
export interface BaseMessage {
    content: string;
    [key: string]: any;
}

export interface AgentState {
    messages: BaseMessage[];
    data: Record<string, any>;
    metadata: Record<string, any>;
}
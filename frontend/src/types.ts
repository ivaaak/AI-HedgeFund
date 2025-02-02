export enum AnalystType {
    VALUATION = 'valuation',
    SENTIMENT = 'sentiment',
    FUNDAMENTALS = 'fundamentals',
    TECHNICAL = 'technical'
}

export enum ActionType {
    BUY = 'BUY',
    SELL = 'SELL',
    HOLD = 'HOLD'
}

export enum NodeType {
    START = 'start',
    ANALYST = 'analyst',
    RISK_MANAGER = 'risk',
    PORTFOLIO_MANAGER = 'portfolio',
    ACTION = 'action'
}

export interface Signal {
    type: AnalystType;
    value: number;
    confidence: number;
    timestamp: number;
}

export interface RiskAssessment {
    riskScore: number;
    factors: string[];
    recommendations: string[];
}

export interface Decision {
    action: ActionType;
    confidence: number;
    reasoning: string;
    timestamp: number;
}

export interface PerformanceData {
    timestamp: number;
    value: number;
    change: number;
}

export interface SystemState {
    activeNodes: NodeType[];
    signals: {
        [key in AnalystType]?: Signal;
    };
    riskAssessment?: RiskAssessment;
    decision?: Decision;
    performance: PerformanceData[];
}

export interface WebSocketMessage {
    type: 'STATE_UPDATE' | 'ERROR' | 'SIGNAL' | 'DECISION';
    payload: Partial<SystemState>;
    timestamp: number;
}
import { Action } from "./Action";

export interface PortfolioDecision {
    action: Action;
    quantity: number;
    confidence: number;
    reasoning: string;
}
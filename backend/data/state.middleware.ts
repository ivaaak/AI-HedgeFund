import { NextFunction } from "express";
import { AgentState } from "./state";
import { AgentStateService } from "../services/agent-state.service";


export const agentStateMiddleware = (
    req: Request & { agentState?: AgentState },
    res: Response,
    next: NextFunction
) => {
    const agentStateService = new AgentStateService();

    if (!req.agentState) {
        req.agentState = agentStateService.createAgentState();
    }

    next();
};
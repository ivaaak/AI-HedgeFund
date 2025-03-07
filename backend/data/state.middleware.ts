import { NextFunction } from "express";
import { AgentStateService } from "../services/agentstate.service";
import { AgentState } from "./models";


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
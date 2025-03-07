import { Request, Response } from 'express';
import { FundamentalsService } from '../services/fundamentals.service';
import { AgentState } from '../data/models';

export class FundamentalsController {
    private fundamentalsService: FundamentalsService;

    constructor() {
        this.fundamentalsService = new FundamentalsService();
    }

    public analyze = async (req: Request, res: Response): Promise<void> => {
        try {
            const state: AgentState = req.body;
            const result = await this.fundamentalsService.analyzeFundamentals(state);
            res.json(result);
        } catch (error) {
            console.error('Analysis Error:', error);
            res.status(500).json({ error: 'Failed to analyze fundamentals' });
        }
    };
}
import { PortfolioPosition } from "./PortfolioPosition";

export interface Portfolio {
    cash: number;
    positions: {
        [ticker: string]: PortfolioPosition;
    };
}
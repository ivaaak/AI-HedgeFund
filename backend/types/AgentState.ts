import { Portfolio } from "./Portfolio";

export interface AgentState {
    data: {
      end_date: string;
      portfolio: Portfolio;
      analyst_signals: {
        [agent: string]: {
          [ticker: string]: {
            signal: string;
            confidence: number;
            [key: string]: any;
          };
        };
      };
      tickers: string[];
    };
    messages: Array<{
      content: string;
      name: string;
    }>;
    metadata: {
      show_reasoning: boolean;
    };
  }
// mockDataGenerator.ts
import { 
    AnalystType, 
    ActionType, 
    NodeType, 
    Signal, 
    RiskAssessment,
    Decision,
    SystemState
  } from './types';
  
  export class MockDataGenerator {
    private baseValue = 1000;
    private currentValue: number;
  
    constructor() {
      this.currentValue = this.baseValue;
    }
  
    private generateSignal(type: AnalystType): Signal {
      return {
        type,
        value: Math.random() * 100,
        confidence: 50 + Math.random() * 50,
        timestamp: Date.now()
      };
    }
  
    private generateRiskAssessment(): RiskAssessment {
      return {
        riskScore: Math.random() * 100,
        factors: [
          'Market Volatility',
          'Sector Performance',
          'Economic Indicators',
          'Technical Patterns'
        ],
        recommendations: [
          'Adjust Position Sizes',
          'Hedge Market Risk',
          'Diversify Portfolio'
        ]
      };
    }
  
    private generateDecision(): Decision {
      const actions = Object.values(ActionType);
      return {
        action: actions[Math.floor(Math.random() * actions.length)],
        confidence: 50 + Math.random() * 50,
        reasoning: 'Based on analysis of market conditions',
        timestamp: Date.now()
      };
    }
  
    private updateValue(): number {
      const change = (Math.random() - 0.5) * 20;
      this.currentValue = Math.max(0, this.currentValue + change);
      return this.currentValue;
    }
  
    public generateSystemState(): SystemState {
      // Generate signals for each analyst
      const signals = Object.values(AnalystType).reduce((acc, type) => ({
        ...acc,
        [type]: this.generateSignal(type)
      }), {});
  
      return {
        activeNodes: [NodeType.ANALYST],
        signals,
        riskAssessment: this.generateRiskAssessment(),
        decision: this.generateDecision(),
        performance: [{
          timestamp: Date.now(),
          value: this.updateValue(),
          change: 0
        }]
      };
    }
  
    public generateStateUpdate(): Partial<SystemState> {
      // Randomly choose which parts of the state to update
      const updateType = Math.random();
      
      if (updateType < 0.3) {
        // Update signals
        return {
          activeNodes: [NodeType.ANALYST],
          signals: Object.values(AnalystType).reduce((acc, type) => ({
            ...acc,
            [type]: this.generateSignal(type)
          }), {})
        };
      } else if (updateType < 0.6) {
        // Update risk assessment
        return {
          activeNodes: [NodeType.RISK_MANAGER],
          riskAssessment: this.generateRiskAssessment()
        };
      } else {
        // Update decision
        return {
          activeNodes: [NodeType.PORTFOLIO_MANAGER],
          decision: this.generateDecision(),
          performance: [{
            timestamp: Date.now(),
            value: this.updateValue(),
            change: 0
          }]
        };
      }
    }
  }
import { AgentState, BaseMessage } from "../data/state";

export class AgentStateService {
    /**
     * Merges two dictionaries/objects
     */
    public mergeDicts<T extends Record<string, any>>(a: T, b: T): T {
        return { ...a, ...b };
    }

    /**
     * Converts complex objects into JSON-serializable format
     */
    private convertToSerializable(obj: any): any {
        // Handle basic types
        if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean' || obj === null) {
            return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToSerializable(item));
        }

        // Handle objects
        if (typeof obj === 'object') {
            // Handle objects with toJSON method (like Date)
            if (obj.toJSON) {
                return obj.toJSON();
            }

            // Handle regular objects
            const result: Record<string, any> = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = this.convertToSerializable(obj[key]);
                }
            }
            return result;
        }

        // Fallback to string representation
        return String(obj);
    }

    /**
     * Displays agent reasoning in a formatted way
     */
    public showAgentReasoning(output: any, agentName: string): void {
        const separator = '='.repeat(10);
        const title = agentName.padStart((28 + agentName.length) / 2).padEnd(28);
        console.log(`\n${separator} ${title} ${separator}`);

        let displayOutput: string;

        if (typeof output === 'object') {
            const serializable = this.convertToSerializable(output);
            displayOutput = JSON.stringify(serializable, null, 2);
        } else {
            try {
                const parsed = JSON.parse(output);
                displayOutput = JSON.stringify(parsed, null, 2);
            } catch {
                displayOutput = String(output);
            }
        }

        console.log(displayOutput);
        console.log('='.repeat(48));
    }

    /**
     * Creates a new agent state
     */
    public createAgentState(): AgentState {
        return {
            messages: [],
            data: {},
            metadata: {}
        };
    }

    /**
     * Updates an agent state
     */
    public updateAgentState(
        currentState: AgentState,
        newMessages: BaseMessage[] = [],
        newData: Record<string, any> = {},
        newMetadata: Record<string, any> = {}
    ): AgentState {
        return {
            messages: [...currentState.messages, ...newMessages],
            data: this.mergeDicts(currentState.data, newData),
            metadata: this.mergeDicts(currentState.metadata, newMetadata)
        };
    }
}

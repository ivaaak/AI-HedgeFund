export class ProgressService {
    /**
     * Updates status for an agent/ticker
     * @param agent The agent name
     * @param ticker The ticker symbol (or null for general agent status)
     * @param status The status message
     */
    public updateStatus(agent: string, ticker: string | null, status: string): void {
        const statusMessage = ticker
            ? `${agent} - ${ticker}: ${status}`
            : `${agent}: ${status}`;

        console.log(statusMessage);
    }
}
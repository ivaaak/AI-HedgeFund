export class ProgressService {
    public updateStatus(agent: string, ticker: string, status: string): void {
        console.log(`${agent} - ${ticker}: ${status}`);
    }
}
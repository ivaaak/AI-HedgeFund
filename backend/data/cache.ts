import { CacheItem } from "../types/CacheData";

export class CacheService {
    private static instance: CacheService;
    private pricesCache: Map<string, CacheItem[]>;
    private financialMetricsCache: Map<string, CacheItem[]>;
    private lineItemsCache: Map<string, CacheItem[]>;
    private insiderTradesCache: Map<string, CacheItem[]>;
    private companyNewsCache: Map<string, CacheItem[]>;

    private constructor() {
        this.pricesCache = new Map();
        this.financialMetricsCache = new Map();
        this.lineItemsCache = new Map();
        this.insiderTradesCache = new Map();
        this.companyNewsCache = new Map();
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    private mergeData(
        existing: CacheItem[] | undefined,
        newData: CacheItem[],
        keyField: string
    ): CacheItem[] {
        if (!existing || existing.length === 0) {
            return newData;
        }

        // Create a Set of existing keys for O(1) lookup
        const existingKeys = new Set(existing.map(item => item[keyField]));

        // Only add items that don't exist yet
        const merged = [...existing];
        const newItems = newData.filter(item => !existingKeys.has(item[keyField]));
        merged.push(...newItems);

        return merged;
    }

    // Prices
    public getPrices(ticker: string): CacheItem[] | undefined {
        return this.pricesCache.get(ticker);
    }

    public setPrices(ticker: string, data: CacheItem[]): void {
        const merged = this.mergeData(
            this.pricesCache.get(ticker),
            data,
            'time'
        );
        this.pricesCache.set(ticker, merged);
    }

    // Financial Metrics
    public getFinancialMetrics(ticker: string): CacheItem[] | undefined {
        return this.financialMetricsCache.get(ticker);
    }

    public setFinancialMetrics(ticker: string, data: CacheItem[]): void {
        const merged = this.mergeData(
            this.financialMetricsCache.get(ticker),
            data,
            'report_period'
        );
        this.financialMetricsCache.set(ticker, merged);
    }

    // Line Items
    public getLineItems(ticker: string): CacheItem[] | undefined {
        return this.lineItemsCache.get(ticker);
    }

    public setLineItems(ticker: string, data: CacheItem[]): void {
        const merged = this.mergeData(
            this.lineItemsCache.get(ticker),
            data,
            'report_period'
        );
        this.lineItemsCache.set(ticker, merged);
    }

    // Insider Trades
    public getInsiderTrades(ticker: string): CacheItem[] | undefined {
        return this.insiderTradesCache.get(ticker);
    }

    public setInsiderTrades(ticker: string, data: CacheItem[]): void {
        const merged = this.mergeData(
            this.insiderTradesCache.get(ticker),
            data,
            'filing_date'
        );
        this.insiderTradesCache.set(ticker, merged);
    }

    // Company News
    public getCompanyNews(ticker: string): CacheItem[] | undefined {
        return this.companyNewsCache.get(ticker);
    }

    public setCompanyNews(ticker: string, data: CacheItem[]): void {
        const merged = this.mergeData(
            this.companyNewsCache.get(ticker),
            data,
            'date'
        );
        this.companyNewsCache.set(ticker, merged);
    }

    // Optional: Method to clear specific cache
    public clearCache(type: 'prices' | 'financialMetrics' | 'lineItems' | 'insiderTrades' | 'companyNews'): void {
        switch (type) {
            case 'prices':
                this.pricesCache.clear();
                break;
            case 'financialMetrics':
                this.financialMetricsCache.clear();
                break;
            case 'lineItems':
                this.lineItemsCache.clear();
                break;
            case 'insiderTrades':
                this.insiderTradesCache.clear();
                break;
            case 'companyNews':
                this.companyNewsCache.clear();
                break;
        }
    }

    // Optional: Method to clear all caches
    public clearAllCaches(): void {
        this.pricesCache.clear();
        this.financialMetricsCache.clear();
        this.lineItemsCache.clear();
        this.insiderTradesCache.clear();
        this.companyNewsCache.clear();
    }
}

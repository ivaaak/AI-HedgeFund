// Alpha Vantage API response interfaces

export interface AlphaVantageDailyPrice {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  }
  
  export interface AlphaVantageDailyResponse {
    "Meta Data": {
      "1. Information": string;
      "2. Symbol": string;
      "3. Last Refreshed": string;
      "4. Output Size": string;
      "5. Time Zone": string;
    };
    "Time Series (Daily)": {
      [date: string]: AlphaVantageDailyPrice;
    };
  }
  
  export interface AlphaVantageOverview {
    Symbol: string;
    AssetType: string;
    Name: string;
    Exchange: string;
    Currency: string;
    Country: string;
    Sector: string;
    Industry: string;
    MarketCapitalization: string;
    EBITDA: string;
    PERatio: string;
    PEGRatio: string;
    BookValue: string;
    DividendPerShare: string;
    DividendYield: string;
    EPS: string;
    RevenuePerShareTTM: string;
    ProfitMargin: string;
    QuarterlyEarningsGrowthYOY: string;
    QuarterlyRevenueGrowthYOY: string;
    AnalystTargetPrice: string;
    TrailingPE: string;
    ForwardPE: string;
    PriceToSalesRatioTTM: string;
    PriceToBookRatio: string;
    EVToRevenue: string;
    EVToEBITDA: string;
    Beta: string;
    "52WeekHigh": string;
    "52WeekLow": string;
    "50DayMovingAverage": string;
    "200DayMovingAverage": string;
    SharesOutstanding: string;
    ReturnOnAssetsTTM: string;
    ReturnOnEquityTTM: string;
    OperatingMarginTTM: string;
    CurrentRatio: string;
    QuickRatio: string;
    PayoutRatio: string;
    DividendDate: string;
    ExDividendDate: string;
  }
  
  export interface AlphaVantageFinancialReport {
    fiscalDateEnding: string;
    reportedCurrency: string;
    grossProfit: string;
    totalRevenue: string;
    operatingIncome: string;
    netIncome: string;
    operatingExpenses: string;
    interestExpense: string;
    ebitda: string;
    incomeBeforeTax: string;
    incomeTaxExpense: string;
    [key: string]: string;
  }
  
  export interface AlphaVantageIncomeStatement {
    symbol: string;
    annualReports: AlphaVantageFinancialReport[];
    quarterlyReports: AlphaVantageFinancialReport[];
  }
  
  export interface AlphaVantageBalanceSheetReport {
    fiscalDateEnding: string;
    reportedCurrency: string;
    totalAssets: string;
    totalCurrentAssets: string;
    cashAndCashEquivalentsAtCarryingValue: string;
    cashAndShortTermInvestments: string;
    inventory: string;
    currentNetReceivables: string;
    totalLiabilities: string;
    totalCurrentLiabilities: string;
    currentDebt: string;
    shortTermDebt: string;
    longTermDebt: string;
    totalShareholderEquity: string;
    [key: string]: string;
  }
  
  export interface AlphaVantageBalanceSheet {
    symbol: string;
    annualReports: AlphaVantageBalanceSheetReport[];
    quarterlyReports: AlphaVantageBalanceSheetReport[];
  }
  
  export interface AlphaVantageCashFlowReport {
    fiscalDateEnding: string;
    reportedCurrency: string;
    operatingCashflow: string;
    paymentsForOperatingActivities: string;
    capitalExpenditures: string;
    cashflowFromInvestment: string;
    cashflowFromFinancing: string;
    netIncome: string;
    [key: string]: string;
  }
  
  export interface AlphaVantageCashFlow {
    symbol: string;
    annualReports: AlphaVantageCashFlowReport[];
    quarterlyReports: AlphaVantageCashFlowReport[];
  }
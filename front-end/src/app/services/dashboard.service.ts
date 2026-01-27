import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RiskyAccount {
  accountId: string;
  book: string;
  netExposure: number;
  marginUtilization: number;
}

export interface SystemHealth {
  status: string;
  avgLatencyMs: number;
  downstreamHealthyCount: number;
  downstreamTotalCount: number;
}

export interface RiskSummary {
  totalNetExposure: number;
  maxMarginUtilization: number;
}

export interface TradingSummary {
  openOrders: number;
  filledToday: number;
  realizedPnl: number;
}

export interface LatencyMetrics {
  riskServiceMs: number;
  tradingServiceMs: number;
  ledgerServiceMs: number;
}

export interface RiskAccount {
  accountId: string;
  book: string;
  exposure: number;
  utilization: number;
}

export interface RiskMetric {
  metricType: string;
  value: number;
  status: string;
}

export interface TradingOrder {
  orderId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
}

export interface TradingFill {
  fillId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  pnl: number;
}

export interface AccountBalance {
  accountId: string;
  currency: string;
  cashBalance: number;
  marginUsed: number;
  availableMargin: number;
}

export interface Transaction {
  transactionId: string;
  accountId: string;
  transactionType: string;
  currency: string;
  amount: number;
  status: string;
}

export interface DashboardViewModel {
  topRiskyAccounts: RiskyAccount[];
  health: SystemHealth;
  riskSummary: RiskSummary;
  tradingSummary: TradingSummary;
  latencyMetrics: LatencyMetrics;
  riskAccounts: RiskAccount[];
  riskMetrics: RiskMetric[];
  openOrders: TradingOrder[];
  recentFills: TradingFill[];
  accountBalances: AccountBalance[];
  recentTransactions: Transaction[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  // Use relative URL for SSR compatibility
  // The server.ts will proxy /api requests to the BFF
  private readonly apiUrl = '/api/dashboard';

  /**
   * Fetches dashboard data from the BFF.
   * In SSR mode, this will be called during server-side rendering.
   */
  getDashboardData(): Observable<DashboardViewModel> {
    return this.http.get<DashboardViewModel>(this.apiUrl);
  }
}

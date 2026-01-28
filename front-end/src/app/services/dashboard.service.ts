import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Observable, of, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

const DASHBOARD_DATA_KEY = makeStateKey<DashboardViewModel>('dashboardData');

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
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isServer = isPlatformServer(this.platformId);
  // Use relative URL for SSR compatibility
  // The server.ts will proxy /api requests to the BFF
  private readonly apiUrl = '/api/dashboard';

  /**
   * Fetches dashboard data from the BFF.
   * In SSR mode, data is fetched on the server and stored in TransferState.
   * On the client, data is retrieved from TransferState to avoid duplicate requests.
   */
  getDashboardData(): Observable<DashboardViewModel> {
    // Check if data is already available in TransferState (from SSR)
    // TransferState.get requires a default value matching the type, so we use a type assertion
    const cachedData = this.transferState.get<DashboardViewModel>(DASHBOARD_DATA_KEY, undefined as unknown as DashboardViewModel);
    
    if (cachedData) {
      // Data was pre-loaded during SSR, use it immediately
      this.transferState.remove(DASHBOARD_DATA_KEY); // Remove after first use
      return of(cachedData);
    }

    // Fetch data from API (client-side fallback or if SSR didn't provide data)
    return this.http.get<DashboardViewModel>(this.apiUrl).pipe(
      tap(data => {
        // Store data in TransferState during SSR for client hydration
        if (this.isServer) {
          this.transferState.set(DASHBOARD_DATA_KEY, data);
        }
      }),
      catchError(error => {
        console.error('Error fetching dashboard data:', error);
        // Return empty data structure to prevent complete failure
        const emptyData: DashboardViewModel = {
          topRiskyAccounts: [],
          health: { status: 'UNKNOWN', avgLatencyMs: 0, downstreamHealthyCount: 0, downstreamTotalCount: 0 },
          riskSummary: { totalNetExposure: 0, maxMarginUtilization: 0 },
          tradingSummary: { openOrders: 0, filledToday: 0, realizedPnl: 0 },
          latencyMetrics: { riskServiceMs: 0, tradingServiceMs: 0, ledgerServiceMs: 0 },
          riskAccounts: [],
          riskMetrics: [],
          openOrders: [],
          recentFills: [],
          accountBalances: [],
          recentTransactions: []
        };
        return of(emptyData);
      })
    );
  }

  /**
   * Pre-loads dashboard data during SSR.
   * This method should be called before rendering to ensure data is available.
   * Returns true if data was successfully loaded, false otherwise.
   */
  async preloadDashboardData(): Promise<boolean> {
    if (this.isServer) {
      try {
        console.log('[SSR] Preloading dashboard data from:', this.apiUrl);
        const data = await firstValueFrom(
          this.http.get<DashboardViewModel>(this.apiUrl).pipe(
            catchError(error => {
              console.error('[SSR] Error fetching dashboard data:', error);
              throw error;
            })
          )
        );
        console.log('[SSR] Successfully preloaded dashboard data:', {
          hasData: !!data,
          healthStatus: data?.health?.status,
          riskAccountsCount: data?.riskAccounts?.length
        });
        this.transferState.set(DASHBOARD_DATA_KEY, data);
        return true;
      } catch (error) {
        console.error('[SSR] Failed to preload dashboard data:', error);
        // Return false to indicate failure, but don't throw
        // This allows SSR to continue and show error message
        return false;
      }
    }
    return false; // Not on server, no preload needed
  }
}

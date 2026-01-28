import { mergeApplicationConfig, ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { DashboardService } from './services/dashboard.service';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Preload dashboard data during SSR initialization.
 * This ensures data is available before the component renders.
 */
function preloadDashboardData(dashboardService: DashboardService) {
  return () => dashboardService.preloadDashboardData();
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Ensure HTTP client is available on the server with fetch support
    provideHttpClient(withFetch()),
    // Preload dashboard data during SSR
    {
      provide: APP_INITIALIZER,
      useFactory: preloadDashboardData,
      deps: [DashboardService],
      multi: true
    }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

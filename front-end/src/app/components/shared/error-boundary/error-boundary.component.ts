import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Error boundary component for displaying user-friendly error messages.
 * Provides retry functionality and consistent error UI across the application.
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container" [class.compact]="compact">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="error-content">
        <h3 class="error-title">{{ title }}</h3>
        <p class="error-message">{{ message }}</p>
        <div class="error-details" *ngIf="details">
          <code>{{ details }}</code>
        </div>
      </div>
      <div class="error-actions" *ngIf="showRetry">
        <button class="retry-button" (click)="onRetry()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd" />
          </svg>
          Retry
        </button>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
      border: 1px solid #fc8181;
      border-radius: 8px;
      text-align: center;
      min-height: 200px;
    }
    
    .error-container.compact {
      min-height: auto;
      padding: 1rem;
    }
    
    .error-icon {
      width: 48px;
      height: 48px;
      color: #c53030;
      margin-bottom: 1rem;
    }
    
    .compact .error-icon {
      width: 32px;
      height: 32px;
    }
    
    .error-icon svg {
      width: 100%;
      height: 100%;
    }
    
    .error-content {
      max-width: 400px;
    }
    
    .error-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #c53030;
    }
    
    .compact .error-title {
      font-size: 1rem;
    }
    
    .error-message {
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: #742a2a;
    }
    
    .error-details {
      background: #fff;
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    
    .error-details code {
      font-size: 0.75rem;
      color: #666;
      word-break: break-all;
    }
    
    .error-actions {
      margin-top: 0.5rem;
    }
    
    .retry-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #c53030;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .retry-button:hover {
      background: #9b2c2c;
    }
    
    .retry-button svg {
      width: 16px;
      height: 16px;
    }
  `]
})
export class ErrorBoundaryComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'An unexpected error occurred. Please try again.';
  @Input() details?: string;
  @Input() showRetry = true;
  @Input() compact = false;
  
  @Output() retry = new EventEmitter<void>();
  
  onRetry(): void {
    this.retry.emit();
  }
}

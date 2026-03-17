import { LogEntry } from '@/types';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: this.formatTimestamp(),
      metadata,
    };
  }

  private log(entry: LogEntry): void {
    const { level, message, timestamp, metadata } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Console output with appropriate method
    switch (level) {
      case 'error':
        console.error(prefix, message, metadata || '');
        break;
      case 'warn':
        console.warn(prefix, message, metadata || '');
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(prefix, message, metadata || '');
        }
        break;
      case 'info':
      default:
        console.log(prefix, message, metadata || '');
        break;
    }

    // In production, you would send logs to a service like:
    // - Sentry
    // - LogRocket
    // - CloudWatch
    // - Datadog
    if (!this.isDevelopment && level === 'error') {
      // TODO: Implement external error logging service
      // Example: Sentry.captureException(new Error(message), { extra: metadata });
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, metadata);
    this.log(entry);
  }

  /**
   * Log warning messages
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, metadata);
    this.log(entry);
  }

  /**
   * Log error messages
   */
  error(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, metadata);
    this.log(entry);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, metadata);
    this.log(entry);
  }

  /**
   * Log API requests
   */
  apiRequest(
    method: string,
    path: string,
    metadata?: Record<string, any>
  ): void {
    this.info(`API Request: ${method} ${path}`, metadata);
  }

  /**
   * Log API responses
   */
  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    metadata?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? 'error' : 'info';
    const message = `API Response: ${method} ${path} - ${statusCode}`;

    if (level === 'error') {
      this.error(message, metadata);
    } else {
      this.info(message, metadata);
    }
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, metadata?: Record<string, any>): void {
    this.debug(`Database: ${operation} on ${table}`, metadata);
  }

  /**
   * Log AI operations
   */
  ai(operation: string, provider: string, metadata?: Record<string, any>): void {
    this.info(`AI: ${operation} using ${provider}`, metadata);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export default Logger;

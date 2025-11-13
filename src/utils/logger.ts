/**
 * Logging utility for the MCP Codebase Index server
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = LogLevel.INFO, prefix = '') {
    this.level = level;
    this.prefix = prefix;
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      this.level = this.parseLogLevel(level);
    } else {
      this.level = level;
    }
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Format log message with timestamp and prefix
   */
  private format(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const prefixPart = this.prefix ? `[${this.prefix}] ` : '';
    return `${timestamp} [${level}] ${prefixPart}${message}`;
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', message), ...args);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', message), ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message), ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', message), ...args);
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger(this.level, childPrefix);
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Initialize logger with configuration
 */
export function initLogger(level: string): void {
  logger.setLevel(level);
}

import winston from 'winston';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development (colored and pretty)
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}: ${message}${metaStr}`;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' })
  ),
  transports: [
    // File transport for all logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: json()
    }),
    // File transport for errors only
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: json()
    })
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Add console transport with pretty formatting for non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss.SSS' }),
      devFormat
    )
  }));
} else {
  // Production console output (structured JSON)
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp(),
      json()
    )
  }));
}

export default logger; 
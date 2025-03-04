# Health Check Module

This module provides health check endpoints for the Proof Concierge backend application.

## Basic Health Endpoints

### GET /health

Returns a comprehensive health check of the application, including:
- Database connectivity
- Disk storage usage
- Memory usage (heap and RSS)

Example response (healthy):
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "storage": {
      "status": "up",
      "message": "Storage usage is at 65%, below the 90% threshold"
    },
    "memory_heap": {
      "status": "up",
      "message": "Memory heap usage is at 150MB, below the 300MB threshold"
    },
    "memory_rss": {
      "status": "up",
      "message": "Memory RSS usage is at 200MB, below the 300MB threshold"
    }
  }
}
```

### GET /health/ping

A simple ping endpoint that returns a status of "ok" and the current timestamp.

Example response:
```json
{
  "status": "ok",
  "timestamp": "2025-02-28T09:45:12.345Z"
}
```

## Advanced Health Endpoints

### GET /health/advanced

Returns a more comprehensive health check that includes:
- All basic health checks
- External API connectivity (Firebase)
- Frontend application connectivity
- Custom donor queries health check

Example response:
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "firebase": {
      "status": "up"
    },
    "frontend": {
      "status": "up"
    },
    "donor_queries": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "storage": {
      "status": "up",
      "message": "Storage usage is at 65%, below the 90% threshold"
    },
    "memory_heap": {
      "status": "up",
      "message": "Memory heap usage is at 150MB, below the 300MB threshold"
    },
    "memory_rss": {
      "status": "up",
      "message": "Memory RSS usage is at 200MB, below the 300MB threshold"
    },
    "firebase": {
      "status": "up"
    },
    "frontend": {
      "status": "up"
    },
    "donor_queries": {
      "status": "up",
      "queryCount": 42,
      "mostRecentQueryDate": "2025-02-28T09:30:00.000Z"
    }
  }
}
```

### GET /health/advanced/detailed

Returns detailed system information about the application, including:
- Timestamp
- Uptime
- Environment
- Memory usage details
- CPU usage
- Node.js version
- Dependency versions

Example response:
```json
{
  "timestamp": "2025-02-28T09:45:12.345Z",
  "uptime": 3600.123,
  "environment": "development",
  "memory": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321,
    "external": 12345678,
    "arrayBuffers": 1234567
  },
  "cpu": {
    "user": 123456,
    "system": 654321
  },
  "versions": {
    "node": "v18.15.0",
    "dependencies": {
      "nestjs": "10.0.0",
      "typescript": "5.1.3"
    }
  }
}
```

## Custom Health Indicators

The application includes custom health indicators for specific application components:

### DonorQueriesHealthIndicator

This indicator checks the health of the donor queries service by:
- Verifying that the donor queries table can be queried
- Retrieving the most recent query
- Providing information about the number of queries and the date of the most recent query

## Integration with Monitoring Tools

These health check endpoints can be integrated with monitoring tools like:
- Kubernetes liveness and readiness probes
- AWS ELB health checks
- Prometheus/Grafana
- Datadog
- New Relic

## Configuration

The health check thresholds can be adjusted in the `health.controller.ts` and `advanced-health.controller.ts` files:
- Disk storage threshold: Currently set to 90%
- Memory heap threshold: Currently set to 300MB
- Memory RSS threshold: Currently set to 300MB

## Environment Variables

The advanced health checks use the following environment variables:
- `FRONTEND_URL`: URL of the frontend application (defaults to http://localhost:3000) 
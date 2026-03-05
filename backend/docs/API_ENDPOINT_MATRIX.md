# API Endpoint Matrix

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| GET | /api/health | No | Public | Health check |
| POST | /api/register | No | Public | Register user |
| POST | /api/login | No | Public | Login + token |
| POST | /api/logout | Yes | user/admin | Revoke current token |
| GET | /api/dashboard | Yes | user/admin | Dashboard summary/trend |
| POST | /api/statements/upload | Yes | user/admin | Upload CSV, queue processing |
| GET | /api/transactions | Yes | user/admin | List transactions (filter/paginate) |
| DELETE | /api/transactions/{id} | Yes | owner/admin | Soft-delete transaction |
| GET | /api/daily-closings | Yes | user/admin | List daily closings |
| GET | /api/bank-accounts | Yes | user/admin | List user bank accounts |
| POST | /api/bank-accounts | Yes | user/admin | Create bank account |
| PATCH | /api/bank-accounts/{id} | Yes | owner/admin | Update bank account |
| DELETE | /api/bank-accounts/{id} | Yes | owner/admin | Delete bank account (non-default) |
| GET | /api/admin/users | Yes | admin | List users |
| PATCH | /api/admin/users/{id}/role | Yes | admin | Update user role |
| GET | /api/admin/diagnostics | Yes | admin | Queue/db counters |

## Response Envelope

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

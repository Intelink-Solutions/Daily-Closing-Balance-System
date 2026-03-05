# API Smoke Tests

Base URL: `https://api.your-domain.com`

## 1) Register
```bash
curl -X POST "$BASE/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Demo User",
    "email":"demo@example.com",
    "password":"password123",
    "password_confirmation":"password123"
  }'
```

## 2) Login
```bash
curl -X POST "$BASE/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```
Save token from response as `TOKEN`.

## 3) Upload statement
```bash
curl -X POST "$BASE/api/statements/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/statement.csv"
```

## 4) List transactions
```bash
curl "$BASE/api/transactions?per_page=20" \
  -H "Authorization: Bearer $TOKEN"
```

## 5) List daily closings
```bash
curl "$BASE/api/daily-closings" \
  -H "Authorization: Bearer $TOKEN"
```

## 6) Logout
```bash
curl -X POST "$BASE/api/logout" \
  -H "Authorization: Bearer $TOKEN"
```

Expected response envelope:
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

# Frontend Integration Guide (Laravel API)

## 1) Configure API URL
Set frontend env:

```env
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## 2) Authentication flow
- Call `POST /api/login` with email/password.
- Store `token` from response in secure frontend storage.
- Send header on every protected request:
  - `Authorization: Bearer <token>`

## 3) Upload flow
- Use `multipart/form-data`.
- Field name must be `file`.
- Optional: `bank_account_id`.
- Endpoint: `POST /api/statements/upload`.

## 4) Recommended API client behavior
- On `401`, clear token and redirect to login.
- On `422`, display validation errors.
- On `429`, show retry message (rate limit).

## 5) Standard response parsing
Expect envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Use `data` as payload source for UI state.

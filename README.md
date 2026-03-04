# DCBS Frontend

## Email delivery integration

The UI now calls a backend endpoint for email-channel notifications.

- Set `VITE_API_BASE_URL` in `.env` (see `.env.example`)
- Implement `POST /notifications/email`

Expected payload:

```json
{
	"providerName": "DCBS Mailer",
	"fromAddress": "no-reply@dcbs.com",
	"replyTo": "support@dcbs.com",
	"recipients": ["staff@dcbs.com"],
	"subject": "Notification title",
	"message": "Notification body"
}
```

If the endpoint is unavailable, the app continues showing system notifications in-app.

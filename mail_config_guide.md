# System Mail Configuration & SMTP Logic Guide

This guide explains how the application handles administrator authentication, how SMTP credentials are configured dynamically through the admin interface, and how the system dynamically retrieves these credentials to dispatch system emails.

---

## 1. Administrator Authentication & Authorization

To perform administrative tasks—such as updating system-wide mail settings or triggering system emails—users must log in and be authorized as an administrator.

### A. OTP-Based Authentication Flow
Rather than using static passwords, administrative and faculty accounts use a secure One-Time Password (OTP) verification:
1. **Requesting the OTP**:
   * The user enters their registered institutional email address in the Login form.
   * The client sends a request to the `/api/auth/request-otp` endpoint.
   * The system generates a temporary, 6-digit verification code with a 5-minute expiration window, records it in the database, and emails it to the user.
2. **Submitting the OTP**:
   * The user enters the received 6-digit code.
   * The client posts the code to the `/api/auth/login` endpoint.
   * The backend validates the code, removes the temporary OTP record, and verifies the user's role from their account record.
   * Upon success, the server issues secure JWT sessions (Access and Refresh tokens) to authorize subsequent requests.

### B. Role-Based Access Control (RBAC)
Every restricted configuration and email endpoint enforces authorization checks:
```python
if getattr(current_user, "role", "faculty") != "admin":
    raise HTTPException(status_code=403, detail="Access Denied: Administrative privileges required.")
```

---

## 2. Dynamic SMTP Mail Configuration (Admin Setup)

Administrators configure the outgoing system email server directly from the management console.

### A. SMTP Configuration Input Fields
The following fields are collected from the admin interface to set up or modify connection credentials:

| Configuration Key | Input Type | Description |
| :--- | :--- | :--- |
| **SMTP Host** | Text | The hostname of the outgoing mail server (e.g. `smtp.gmail.com` or `smtp.office365.com`). |
| **SMTP Port** | Text | The port number used to connect (e.g., `465` for SSL or `587` for TLS). |
| **SMTP Username** | Text | The username or email account used to authenticate with the mail server. |
| **SMTP Password** | Password | The password or secure app-specific password. |
| **Connection Security** | Dropdown Select | Security protocol: `ssl` (implicit SSL), `tls` (STARTTLS upgrade), or `none` (plaintext). |

### B. Setup Management Actions
* **Get Current Settings**: The frontend retrieves configurations via `GET /api/settings/smtp`. The actual password is masked (`has_password: true/false` flag returned) to prevent exposing secrets.
* **Update Settings**: The backend receives inputs via `PUT /api/settings/smtp`. If the user submits the masked password placeholder (`********`), the system ignores the field to retain the existing password.
* **Connection Testing**: Admins can input a test recipient email address and trigger `POST /api/settings/smtp/test` to dispatch a mock email, confirming the credentials work before saving.
* **Reset Settings**: System configurations can be wiped via `DELETE /api/settings/smtp` to revert configurations back to default configurations.

---

## 3. Core Email Dispatch & Fallback Resolution Logic

When an operation triggers an automated email, the application uses a dynamic fallback strategy to resolve SMTP credentials.

### A. Dynamic Configuration Lookup
When sending an email, the backend queries the database first and falls back to environment configurations if database settings are empty:
1. **Database Lookup**: Queries the `SystemSetting` table for stored `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, and `smtp_secure` keys.
2. **Environment Fallback**: If keys are missing in the database settings, the system checks `.env` variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SECURE`).
3. **Validation**: If both lookups fail to find a host, username, or password, it raises a validation exception preventing dispatch.

### B. Secure Transport Execution
Depending on the connection security type requested (`ssl`, `tls`, or `none`), the system opens the network sockets accordingly:
* **SSL (`ssl`)**: Connects using `smtplib.SMTP_SSL` with an SSL context.
* **TLS / STARTTLS (`tls`)**: Connects using standard `smtplib.SMTP`, commands `ehlo()`, upgrades the connection using `starttls()`, and identifies itself again.
* **Plaintext (`none`)**: Establishes a standard unencrypted TCP link.

# IPRS Integration

This backend isolates IPRS SOAP communication behind a REST/JSON module:

Frontend -> Express routes -> IPRS controller -> IPRS services -> SOAP or mock client -> IPRS.

The frontend never receives IPRS credentials, WSDL details, SOAP payloads, fingerprints, signatures, or raw personal-data responses.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill environment-specific values.
3. Use `IPRS_PROVIDER=mock` for local development without VPN.
4. Use `IPRS_PROVIDER=real` only where the IPRS private network/VPN is reachable.
5. Run migrations with `npm run migrate`.
6. Start the API with `npm start`.

## Environment Variables

`IPRS_ENABLED` toggles the integration.
`IPRS_PROVIDER` supports `mock` and `real`.
`IPRS_ENVIRONMENT` supports `development`, `uat`, and `production`.
`IPRS_WSDL_URL` points to the private IPRS WSDL.
`IPRS_USERNAME` and `IPRS_PASSWORD` are never committed.
`IPRS_TIMEOUT`, `IPRS_MAX_RETRIES`, and `IPRS_RETRY_DELAY` control transient failure behavior.
`IPRS_ALLOWED_OPERATIONS` limits operations enabled for this deployment.
`IPRS_AUDIT_ENABLED=false` can be used only for local tests/mock development when no database is available.

The provided documentation lists:

`http://10.10.13.5:9003/IPRSServerwcf?wsdl` for wsHttpBinding.
`http://10.10.13.5:9004/IPRSServerwcf?wsdl` for basicHttpBinding, which is the Node.js default in this scaffold.

## REST Endpoints

`GET /api/v1/iprs/health`
`POST /api/v1/iprs/verify/id`
`POST /api/v1/iprs/verify/passport`
`POST /api/v1/iprs/verify/alien-card`
`POST /api/v1/iprs/verify/birth-certificate`
`POST /api/v1/iprs/verify/death-certificate`
`GET /api/v1/iprs/verifications/:id`

Verification endpoints require authentication and one of:

`SYSTEM_ADMIN`, `SACCO_ADMIN`, `REGISTRATION_OFFICER`, `LOAN_OFFICER`.

Audit lookup requires:

`SYSTEM_ADMIN`, `SACCO_ADMIN`, `AUDITOR`.

The temporary auth middleware reads `x-user-id` and `x-user-role`; replace it with the SACCO backend's real authentication middleware.

For Postman, create a backend session first:

`POST /api/v1/auth/session`

Body:

```json
{
  "username": "value-from-.env",
  "password": "value-from-.env"
}
```

Then copy `data.token` and send it on protected requests:

`Authorization: Bearer <token>`

Alternative protected request headers:

`x-user-id: 11111111-1111-4111-8111-111111111111`
`x-user-role: REGISTRATION_OFFICER`

The session endpoint reads the real `.env`. `.env.example` is only a placeholder template.

Example Postman/curl request:

```bash
curl -X POST http://localhost:3000/api/v1/iprs/verify/id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"idNumber\":\"12345678\"}"
```

## Supported Operations

The client is prepared for:

`Login`, `GetDataByIdCard`, `GetDataByPin`, `GetDataByPassport`, `GetDataByBirthCertificate`, `GetDataByDeathCertificate`, `GetDataByAlienCard`, `VerificationByIDCard`, `VerificationByPassport`, and `VerificationByAlienCard`.

Sign operations should be enabled only after confirming they are authorized for the organization.

## Audit Model

The `iprs_verifications` table stores request metadata only:

`request_id`, `member_id`, `verification_type`, `identifier_hash`, `status`, `iprs_error_code`, `iprs_response_status`, `verification_method`, `verified_at`, and `requested_by`.

It does not store raw SOAP requests, raw SOAP responses, passwords, fingerprint payloads, photos, or signatures.

## Security Notes

Never commit `.env`.
Never log SOAP XML in production.
Do not store biometric payloads unless explicitly permitted by the IPRS agreement.
Do not call IPRS every time a member profile is viewed; store the verification audit result and use IPRS mainly during onboarding or required re-verification.

## Testing

Run unit and integration tests with `npm test`. Tests use the mock provider and must not call production IPRS.

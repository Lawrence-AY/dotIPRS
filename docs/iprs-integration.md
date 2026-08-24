# IPRS Integration

This backend isolates IPRS SOAP communication behind a REST/JSON module:

Frontend -> Express routes -> IPRS controller -> IPRS services -> SOAP or mock client -> IPRS.

The frontend never receives IPRS credentials, WSDL details, or SOAP payloads. Raw biometric values remain excluded unless `IPRS_INCLUDE_BIOMETRICS=true` is explicitly enabled for an authorized deployment.

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
`IPRS_WSDL_URL` points to the reachable IPRS WSDL. For the firewall route, use `https://197.232.142.204:9443/IPRSServerwcf?wsdl`.
`IPRS_USERNAME` and `IPRS_PASSWORD` are never committed.
`IPRS_TIMEOUT`, `IPRS_MAX_RETRIES`, and `IPRS_RETRY_DELAY` control transient failure behavior.
`IPRS_ALLOWED_OPERATIONS` limits operations enabled for this deployment.
`IPRS_INCLUDE_BIOMETRICS=true` includes base64 photo, passport photo, signature, and fingerprint values in authorized API responses. Keep it disabled unless this disclosure is approved and access is tightly controlled.
`IPRS_AUDIT_ENABLED=true` enables an in-memory audit trail for the lifetime of the running process. It is disabled by default and does not require a database.
`AUTH_SESSION_USERNAME` and `AUTH_SESSION_PASSWORD` can define separate gateway login credentials. If they are not set, `POST /api/v1/auth/session` accepts `IPRS_USERNAME` and `IPRS_PASSWORD`.
`IPRS_DIAGNOSTICS_ENDPOINT=true` enables `GET /api/v1/iprs/diagnostics/connection` for temporary deployment debugging. It generates a gateway bearer token and checks where IPRS connectivity breaks, so disable it after testing.

The provided documentation lists:

`http://10.10.13.5:9003/IPRSServerwcf?wsdl` for wsHttpBinding.
`http://10.10.13.5:9004/IPRSServerwcf?wsdl` for basicHttpBinding, which is the Node.js default in this scaffold.
`https://197.232.142.204:9443/IPRSServerwcf?wsdl` for the configured firewall endpoint.

## REST Endpoints

`GET /api/v1/iprs/health`
`GET /api/v1/iprs/diagnostics/connection`
`POST /api/v1/iprs/verify/id`
`POST /api/v1/iprs/verify/pin`
`POST /api/v1/iprs/verify/passport`
`POST /api/v1/iprs/verify/alien-card`
`POST /api/v1/iprs/verify/birth-certificate`
`POST /api/v1/iprs/verify/death-certificate`
`GET /api/v1/iprs/verifications/:id`

Verification endpoints require authentication and one of:

`VERIFY_ID`, `IDENTITY_ID`, `IDENTITY_PIN`, `VERIFY_PASSPORT`, `VERIFY_ALIEN_CARD`, `IDENTITY_BIRTH_CERTIFICATE`, and `IDENTITY_DEATH_CERTIFICATE`.

Audit lookup requires:

`AUDIT_READ`.

Protected endpoints accept only a valid bearer token issued by `POST /api/v1/auth/session`. Do not expose the gateway-session credentials to browser clients.

Create a backend session first:

`POST /api/v1/auth/session`

Body:

```json
{
  "username": "value-from-AUTH_SESSION_USERNAME-or-IPRS_USERNAME",
  "password": "value-from-AUTH_SESSION_PASSWORD-or-IPRS_PASSWORD"
}
```

Then copy `data.token` and send it on protected requests:

`Authorization: Bearer <token>`

The session endpoint reads the real `.env`. `.env.example` is only a placeholder template.
This does not change the upstream connection: `IPRS_WSDL_URL` remains necessary because it is the address of the IPRS SOAP service, not a session endpoint.

Example Postman/curl request:

```bash
curl -X POST http://localhost:3000/api/v1/iprs/verify/id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"idNumber\":\"12345678\"}"
```

To invoke IPRS `VerificationByIDCard`, include one or more Base64-encoded BMP
fingerprints. Supplying `fingerprint` preserves compatibility with a single
captured image; use `fingerprints` for multiple images. Without either field,
`/verify/id` performs an ID-record lookup (`GetDataByIdCard`).

```json
{
  "idNumber": "12345678",
  "serialNumber": "ABC123",
  "fingerprints": [
    "<base64-encoded-bmp-fingerprint-1>",
    "<base64-encoded-bmp-fingerprint-2>"
  ]
}
```

For a PIN lookup, prefer the dedicated endpoint:

```json
POST /api/v1/iprs/verify/pin
{
  "pin": "A001234567B"
}
```

`POST /api/v1/iprs/verify/id` also accepts the same PIN-only body for backwards compatibility. Send either `idNumber` or `pin`, never both.

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

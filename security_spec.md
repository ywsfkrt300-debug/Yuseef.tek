# Firestore Security Specification - SyriaPay

## Data Invariants
1. A transaction must always belong to the user who created it (enforced by `request.auth.uid == incoming().userId`).
2. Only admins can list all users or update service properties.
3. Users can only update their own profile data (name, phone, etc.), not their wallet balance.
4. Services are publicly viewable but only admins can create or delete them.
5. Notification creation is restricted to admins only.

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing**: Attempting to create a transaction for another user.
   - Payload: `{ userId: "stolen_uid", amount: 100, ... }`
   - Result: PERMISSION_DENIED (Rule 147)

2. **Privilege Escalation**: A user trying to set their own role to 'admin' without knowing the password (though the current app allows it if they call the API directly, usually we block it. My rules currently allow it if merged with updatedAt, which is the "backdoor" used by AdminLayout).
   - Actually, I should Harden this. Only the hardcoded Gmail or an existing admin should be able to set roles.

3. **Wallet Injection**: User trying to increase their own walletBalance.
   - Payload: `{ walletBalance: 9999999, updatedAt: request.time }`
   - Result: PERMISSION_DENIED (Rule 58)

4. **Service Hijacking**: Non-admin trying to update a service price.
   - Payload: `{ price: 0, ... }`
   - Result: PERMISSION_DENIED (Rule 129)

5. **Resource Poisoning**: Large string ID (1MB).
   - ID: `a...[1MB]...z`
   - Result: PERMISSION_DENIED (Rule 20/21)

6. **Shadow Update**: Adding a field not in the schema.
   - Payload: `{ name: "Service", ghostField: true, ... }`
   - Result: PERMISSION_DENIED (for collections with `hasOnly`)

7. **PII Leak**: Unauthorized 'get' on another user's document.
   - Action: `get(/users/someone_else)`
   - Result: PERMISSION_DENIED (Rule 34)

8. **State Shortcutting**: Updating a transaction status directly to 'مكتمل' as a user.
   - Result: PERMISSION_DENIED (Rule 159 - update is isAdmin only)

9. **Terminal State Lock**: Trying to update a completed service (N/A yet but good practice).

10. **Email Spoofing**: Signed in as `attacker@gmail.com` but sending `email: 'ywsfkrt300@gmail.com'` in payload.
    - Result: PERMISSION_DENIED (Rule 60)

11. **Client-Side Delegation**: Trying to list users without being an admin.
    - Action: `list(/users)`
    - Result: PERMISSION_DENIED (Rule 36)

12. **Timestamp Forgery**: Sending a client-side date for `createdAt`.
    - Payload: `{ createdAt: "2020-01-01", ... }`
    - Result: PERMISSION_DENIED (Rule 46/156)

## Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|--------------------|--------------------|
| users      | Secured           | Secured            | Secured            |
| services   | Admin Only        | Admin Only         | Secured            |
| transactions| Secured (Owner)  | Admin Only         | Secured            |
| notifications| Admin Only      | Admin Only         | Secured            |

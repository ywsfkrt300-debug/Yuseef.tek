# Firebase Security Rules - Security Spec

## 1. Data Invariants
- `users`: Users can only read/update their own profile. Admins can read/update all profiles. The `role` and `walletBalance` fields are restricted and cannot be modified by the user directly.
- `services`: Only admins can create, update, or delete services. All authenticated users can read.
- `saved_services` (Subcollection of `users`): Users can only read/write their own saved services. `userId` in document must match subcollection path.
- `transactions`: Users can create pending transactions and read their own. Only admins (or backend) can update transaction status.
- `notifications` (Subcollection of `users`): Users can read their own, and only update `isRead` status. Backend/admins can create.

## 2. The "Dirty Dozen" Payloads

1. **Spoofed User Create**: Unauthenticated user trying to create a user profile.
2. **Ghost Admin Escalation**: A user trying to set their `role` to 'admin' during profile creation or update.
3. **Wallet Inflation**: A user trying to update their `walletBalance` directly.
4. **Service Tampering**: A user trying to update a service price.
5. **Cross-User Saved Service**: A user trying to create a saved service in another user's subcollection.
6. **ID Poisoning**: Injecting an extremely long string for a document ID (e.g., `savedServiceId`).
7. **Type Mismatch**: Trying to write a string into the `walletBalance` number field.
8. **Transaction Status Spoofing**: A user trying to create a transaction with `status: 'completed'`.
9. **Transaction Modification**: A user trying to update an existing transaction to change its amount.
10. **Blanket List Attack**: Attempting to read all transactions without restricting the query to `userId == request.auth.uid`.
11. **Shadow Fields**: Creating a notification with an arbitrary unauthorized field `spambotUrl`.
12. **Notification Read Spoofing**: Changing a notification's `message` when only `isRead` update is allowed.

## 3. Test Runner
Will be implemented in `firestore.rules.test.ts`.

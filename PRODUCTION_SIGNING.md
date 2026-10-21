# Production Android signing

The workflow keeps debug signing and production signing separate. Debug builds generate a standard CI-only debug keystore. Production builds use a keystore supplied at runtime from the protected GitHub `production` Environment; no production keystore, password, or alias is committed to the repository.

## One-time GitHub setup

1. Create or import the production upload/release keystore outside the repository. Back it up in an approved password manager or HSM-backed process.
2. Encode the keystore without adding a newline:

   ```bash
   base64 -w 0 release.keystore > release.keystore.b64
   ```

3. In **Settings → Environments → production**, create the following required secrets:

   - `ANDROID_KEYSTORE_BASE64`: the contents of `release.keystore.b64`.
   - `ANDROID_KEYSTORE_PASSWORD`: the keystore password.
   - `ANDROID_KEY_ALIAS`: the signing key alias.
   - `ANDROID_KEY_PASSWORD`: the key password.

4. Add required reviewers to the `production` Environment. The signing job cannot run until the Environment approval rules are satisfied.
5. Restrict who can create or approve production tags and workflow-dispatch runs. Treat those permissions as release authority.

The workflow materializes the keystore under the ephemeral runner directory with mode `0600`, sets the path through `ANDROID_KEYSTORE_PATH`, and deletes it with the runner after the job. GitHub masks configured secret values, but the workflow still avoids printing them.

## Release behavior

The production job runs only for a `v*` tag push or a manually dispatched workflow. It waits for the debug job’s checks to pass, verifies the hosted Android toolchain, restores pnpm/Gradle/native CMake caches, and builds both:

- a signed APK at `android/app/build/outputs/apk/release/`; and
- a signed Android App Bundle at `android/app/build/outputs/bundle/release/`.

The build sets `versionCode` from the GitHub Actions run number and `versionName` from the tag or dispatch ref. It uploads both artifacts plus `SHA256SUMS.txt` as one short-retention workflow artifact. The AAB is the preferred artifact for Google Play distribution; the APK is useful for controlled direct deployment.

A release task fails before signing if any signing variable is missing. It does not fall back to the debug key.

## Rotation and incident response

To rotate the signing key, follow the organization’s Android app-signing policy and update the four Environment secrets together. For Google Play, use Play App Signing and treat the CI key as the approved upload key when applicable. Revoke or replace compromised credentials immediately, suspend the `production` Environment, and preserve the privileged-action disclosure record for the incident.

Do not place keystores in GitHub repository files, issue comments, build logs, artifacts, `.env` files, or pull-request outputs. Do not use the production signing job as a mechanism to unlock bootloaders, flash devices, bypass Android authentication, or execute arbitrary commands.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Adhi Arena desktop application

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f3b9aaf3-c7b0-4904-9eba-4be293f6bbec

## Run locally

**Prerequisites:** Node.js 20+ and a MongoDB connection string.


1. Install dependencies:
   `npm install`
2. Optionally set `MONGO_URI` as a Windows environment variable (or in your shell) to override the embedded database URI.
3. Run the web development version:
   `npm run dev`

## Build the Windows installer

Run `npm run installer`. The versioned installer is written to the `release` directory.
It installs per-machine under Program Files and creates Desktop and Start Menu shortcuts.

## Administrator-controlled updates

Installed applications check the public GitHub Releases feed for
`Venkey3011/ADHI-ARENA-V2`. When an administrator publishes a higher version:

1. Users are notified and choose whether to download it.
2. Download progress is shown in the application.
3. After download, users are asked for permission to restart and install.
4. Update prompts and installation are deferred while a student is attending a test.

Administrators can select **Publish Update** in the app header. This opens the protected
GitHub Actions workflow; the application never stores a GitHub token. In GitHub:

1. Select **Run workflow**.
2. Enter a new higher semantic version.
3. Select `main`, or a known-good older commit for rollback.
4. Start with a 5–10% rollout and increase to 100% after verification.

Rollback is performed safely as a forward release: select the last known-good commit and
publish it with a version higher than the faulty release. For example, roll back faulty
`1.1.2` by rebuilding the good commit as `1.1.3`.

For trusted Windows update prompts, configure these repository secrets:

- `WINDOWS_CERTIFICATE_BASE64`
- `WINDOWS_CERTIFICATE_PASSWORD`

The release workflow publishes the NSIS installer, blockmap, and `latest.yml` together.

## In-app network recovery

The desktop header contains a **Network** panel available before and after login. It can:

- scan nearby Wi-Fi networks;
- reconnect saved Windows Wi-Fi profiles;
- connect to WPA2 personal networks after the user enters the password;
- open Windows Location Settings when Windows blocks nearby-network scanning.

Passwords are passed directly to Windows profile management and are never sent to MongoDB.
Enterprise/802.1X Wi-Fi should be configured by the institution in Windows before the exam.

## Local coding-language requirements

Adhi Arena does not send student code to an online execution service. It detects and uses:

- Java: `JAVA_HOME\bin\java` and `javac`, falling back to `PATH`
- Python: `python`, `python3`, or the Windows `py` launcher on `PATH`
- JavaScript: `node` on `PATH`
- C: `gcc` or `clang` on `PATH`
- C++: `g++` or `clang++` on `PATH`

`GET /api/system/compilers` returns the detected status. Each submission runs in a temporary
directory with a time limit and output limit. For untrusted/high-stakes code, also run the
application in a restricted Windows account or virtual machine; this is not a complete OS sandbox.

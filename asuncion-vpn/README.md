# ASUNCION VPN

**Private • Secure • Connected**

ASUNCION VPN is a planned Android VPN client. The first release will use the established WireGuard protocol rather than custom cryptography.

## MVP goals

- Android app with Connect / Disconnect controls
- WireGuard tunnel integration using the official WireGuard Android tunnel library
- Clear connection states: Disconnected, Connecting, Connected, Error
- Server profile selection (only configured, verified servers)
- Basic session information and data-usage display where supported
- No claim of protection until the OS confirms an active VPN tunnel

## Security principles

- Never invent or hard-code a fake server endpoint or private key.
- Do not collect browsing history, DNS queries, or traffic contents.
- Keep private keys and configuration secrets out of source control and build logs.
- Explain that a VPN does not guarantee anonymity or protect against phishing, malware, or account compromise.
- Test DNS handling, IPv4/IPv6 behavior, reconnect behavior, and leak resistance before public release.

## Development stages

1. Confirm app requirements and package identity.
2. Build the Android UI and app skeleton.
3. Integrate WireGuard's supported Android tunnel API.
4. Provision a real VPN server and create a test profile securely.
5. Test on a physical Android device.
6. Review privacy disclosures and prepare a release build.

## Current status

Project setup only. No VPN server is provisioned and no live VPN tunnel is available yet.

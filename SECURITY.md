# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Tetromino for Obsidian, please report it responsibly through a private channel rather than using the public issue tracker.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Contact Us Privately

- **GitHub Private Vulnerability Reporting**: Use GitHub's built-in [private vulnerability reporting](https://github.com/frostmute/Tetromino/security/advisories/new) if available.
- **Email**: Contact the maintainers directly via the contact information in [MAINTAINERS.md](MAINTAINERS.md) or through the email listed on the lead maintainer's GitHub profile.

When reporting a vulnerability, please include:
- A clear description of the vulnerability
- Steps to reproduce it (if applicable)
- Potential impact
- Any suggested fixes or mitigations

We will acknowledge your report within **48 hours** and work with you to understand and address the issue.

## Response Timeline

Once a vulnerability is confirmed, we aim to address it according to the following timeline:

| Severity | Target Fix Time | Description |
|----------|----------------|-------------|
| **Critical** | ASAP (within 48 hours) | Vulnerabilities that could lead to data loss, unauthorized access, or system compromise. |
| **High** | Within 1 week | Vulnerabilities that significantly impact security but have limited exploitability or require specific conditions. |
| **Medium** | Within 2 weeks | Vulnerabilities with moderate impact or those that require non-standard configurations to exploit. |
| **Low** | Next scheduled release | Minor issues, defense-in-depth improvements, or informational findings. |

If a fix will take longer than the target timeline, we will communicate the delay and provide interim mitigations or workarounds when possible.

## Security Advisories

To stay updated on security issues:

- **Watch this repository**: Enable GitHub notifications (Watch → Custom → Security alerts) to receive alerts about published security advisories.
- **Check GitHub Security Advisories**: Visit the [Security Advisories](https://github.com/frostmute/Tetromino/security/advisories) page for a history of disclosed vulnerabilities.
- **Read release notes**: Security fixes are clearly marked in [CHANGELOG.md](CHANGELOG.md) with a `### Security` section.
- **Enable Dependabot alerts**: If you fork this repository, ensure Dependabot alerts are enabled to receive notifications about dependency vulnerabilities.

## Disclosure Policy

We are committed to transparent communication about security issues:

- **What we disclose**: When a vulnerability is fixed and disclosed, we will explain what was affected, the severity, the versions impacted, and how to upgrade or mitigate.
- **Timeline**: We follow a coordinated disclosure approach. After a fix is released, we will publish a security advisory within 7 days, giving users time to update before full technical details are shared.
- **Credit**: We will credit the reporter by name (or pseudonym, if requested) in the security advisory and release notes, unless they prefer to remain anonymous.
- **No retaliation**: We will not take legal action or retaliate against anyone who reports a vulnerability in good faith.

## Security Considerations

### API Token Handling
- **Storage**: API tokens are stored in Obsidian's plugin data file (`data.json`) inside your vault. This file is part of your vault and is not encrypted by Obsidian by default—protect your vault as you would any sensitive local data.
- **Transmission**: Tokens are sent to Are.na's API over HTTPS only. Never transmitted over unencrypted connections.
- **Display**: Tokens are masked in the settings UI using password-type input fields.
- **Best Practice**: Treat your API token like a password. Never share it or commit it to version control.

### Input Validation
- Channel slugs and folder paths are validated to prevent directory traversal attacks.
- File names are sanitized to remove dangerous characters before writing to disk.
- API responses are validated before processing.

### Data Handling
- The plugin only fetches and stores data from Are.na channels you explicitly configure.
- No telemetry or analytics data is collected.
- No personal information is transmitted beyond what's necessary for the Are.na API.
- Downloaded files are stored locally in your vault and not transmitted elsewhere.

### Permissions
- The plugin requires read/write access to your vault's file system.
- The plugin requires network access to reach the Are.na API at `https://api.are.na`.
- The plugin respects Obsidian's file system sandbox on mobile devices.

## Out of Scope

The following are **not** the responsibility of this plugin:

- **Obsidian's internal security**: Obsidian handles encryption and security of the vault itself. Report Obsidian security issues to Obsidian directly.
- **Are.na's API security**: Report security issues with Are.na's API or service to Are.na's security team.
- **Network security**: We assume HTTPS connections are secure. Report network-level attacks to your ISP or network provider.
- **User's system security**: We assume your computer and Obsidian installation are secure.

## Supported Versions

Only the latest version of Tetromino receives security updates. We recommend always updating to the latest version as soon as possible.

## Security Practices

This project follows these security practices:

1. **Dependency Updates**: Development dependencies are kept reasonably up-to-date to patch known vulnerabilities.
2. **Code Review**: All changes are reviewed before merging.
3. **Type Safety**: Strict TypeScript checks help prevent entire classes of bugs.
4. **Error Handling**: Errors are logged with context for debugging without exposing sensitive information.
5. **Minimal Dependencies**: The plugin has zero production dependencies to minimize attack surface.

## Changelog

Security fixes will be clearly marked in the CHANGELOG.md with a `### Security` section.

## Questions?

If you have security-related questions that aren't vulnerabilities, feel free to open a discussion on GitHub or contact the maintainers.

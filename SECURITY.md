# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not** create a public GitHub issue.

Instead, please report it privately by:

1. **Email**: Contact the maintainer directly (see repository owner)
2. **GitHub Security Advisory**: Use GitHub's [private vulnerability reporting](https://github.com/omichalo/teamup/security/advisories/new) feature if available

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Time

We commit to:
- Acknowledging receipt within **48 hours**
- Providing an initial assessment within **7 days**
- Fixing critical vulnerabilities within **30 days**

### Disclosure Policy

- We will credit security researchers (if desired)
- We will coordinate public disclosure after a fix is available
- We will not take legal action against security researchers acting in good faith

## Security Best Practices

For developers working on this project:

- See [docs/SECURITY.md](./docs/SECURITY.md) for detailed security guidelines
- Never commit secrets or credentials
- Use environment variables for sensitive configuration
- Keep dependencies up to date
- Review pull requests for security issues

## Known Security Considerations

- **Firebase Public Keys**: The `NEXT_PUBLIC_*` variables are intentionally public and secured by Firebase domain restrictions
- **CSRF Protection**: Enabled via `CSRF_SECRET` environment variable
- **Rate Limiting**: Implemented on sensitive endpoints (email sending, authentication)
- **Input Validation**: All user inputs are validated using Zod schemas

For more details, see [docs/SECURITY.md](./docs/SECURITY.md).

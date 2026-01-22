# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please follow responsible disclosure practices:

1. **Do not disclose the vulnerability publicly** until a fix has been released.
2. Submit a detailed report via email to **alwalxed@proton.me** with the following information:
   - Clear description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and affected components
   - Suggested remediation (optional)
3. You will receive an acknowledgment of your report within **72 hours**.
4. Confirmed vulnerabilities will be addressed and patched in a timely manner.

## Disclosure Policy

- Security vulnerabilities will be publicly disclosed after a fix has been released and deployed.
- If a fix cannot be provided within **90 days** of the initial report, the vulnerability will be disclosed at that time regardless of patch status.

## Supported Versions

Security updates and patches are provided exclusively for the **latest stable release**. Previous versions are not supported and will not receive security updates.

## Security Best Practices

When deploying this project, ensure that:

- Database credentials and API keys are stored securely and not committed to version control
- All dependencies are kept up to date
- Access to administrative interfaces is properly restricted
- HTTPS is enforced for all production deployments
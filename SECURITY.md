# Security

## Threat Model

fin is a skill: instructions plus a local CLI (`scripts/fin.mjs`) that your agent runs. It makes read-only HTTPS requests to public data sources (sec.gov, and a price endpoint for unofficial quotes) and writes only its credentials file and cache.

- **Credentials.** Your SEC identity (name and email) is stored in `~/.config/fin/credentials.json` with mode `0600` and sent only to sec.gov as the User-Agent. `SEC_EDGAR_IDENTITY` overrides the file.
- **Agent permissions.** fin runs with whatever access your agent grants shell commands. Sandboxing is the agent's job, not fin's.

### Out of Scope

| Category | Rationale |
| --- | --- |
| **Agent behavior** | What your agent does with fin's output is governed by the agent and its permission model |
| **LLM provider data handling** | Data sent to your model provider is governed by their policies |
| **Upstream data accuracy** | fin reports what sources publish and labels each `official` or `unofficial` |
| **Local file tampering** | Users control their own skill folder, credentials and cache |

## Reporting Security Issues

Use the GitHub Security Advisory ["Report a Vulnerability"](https://github.com/bilalbayram/fin/security/advisories/new) tab. We'll reply with next steps and keep you updated through the fix. We appreciate responsible disclosure.

# Security policy

Report a vulnerability in dsiab privately, through the Security tab of this repository, and never in a public issue or pull request. The current release and the current release candidate receive fixes, and the response is best effort.

## Supported versions

dsiab is below 1.0. Two versions receive security fixes:

| Version | Supported |
| --- | --- |
| The current release on the `latest` tag | Yes |
| The current release candidate on the `next` tag | Yes |
| Any earlier version | No |

## How to report

Open the **Security** tab of this repository and choose **Report a vulnerability**. With GitHub private vulnerability reporting, only you and the maintainer can read the report.

Never report a vulnerability in an issue, a pull request or a discussion, because those are public.

## What to include

- The affected version, and the command or component involved
- Steps to reproduce, with a minimal example where you have one
- The impact as you understand it: what an attacker gains, and under what conditions
- Any fix or mitigation you suggest

## In scope

- Unsafe URL handling in components, such as an `href` or `src` that accepts a `javascript:` URL
- CLI commands that write into a consumer's project, such as `dsiab init` and `ds-check --init`
- Install-time behaviour of the package
- Agent-instruction files shipped to consumers, such as the rules and the skills
- Release automation for this repository

## Out of scope

- Bugs in Radix Themes, React, Phosphor or the bundled fonts. Report those upstream.
- Advisories in devDependencies that never reach `dist`
- Accessibility defects. Report those in an issue, where they get a public fix.
- An app that passes untrusted HTML into its own components

## What happens next

The response is best effort, with no promised response time. A confirmed vulnerability gets a fix and coordinated disclosure through a GitHub security advisory on this repository. The advisory credits you on request. There is no bug bounty.

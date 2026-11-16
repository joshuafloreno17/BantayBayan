# Pull Request Automation Demo

This file demonstrates the BantayBayan Pull Request Automation workflow.

When a pull request targets the `bantaybayans` branch, GitHub Actions automatically runs:

1. JavaScript syntax validation
2. Project tests
3. Build validation
4. GitHub Secret configuration verification

The Docker publishing job is skipped for pull requests.

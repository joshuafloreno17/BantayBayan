# BantayBayan

A community reporting and flood monitoring web application designed to help residents report local concerns and help community officials monitor and respond to reported issues.

## Project Overview

BantayBayan provides a platform for community residents to submit reports and monitor their status. It also provides officials with tools to review reports and monitor flood-related incidents.

## Key Features

- Resident issue reporting
- Photo attachments for reports
- Flood monitoring and reporting
- Interactive map integration
- Official report management
- Report status monitoring
- Firebase integration

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Cloud Firestore
- Leaflet Maps
- OpenStreetMap
- Docker
- Nginx
- GitHub Actions
- GitHub Container Registry (GHCR)

## CI/CD Pipeline

The project uses GitHub Actions to automate the following processes:

1. JavaScript syntax validation
2. Automated project tests
3. Build validation
4. Docker image build
5. Publishing the Docker image to GHCR

## Running Locally

Install dependencies:

```bash
npm ci
```

Run validation:

```bash
npm run lint
npm test
npm run build
```

## Docker

Build the Docker image:

```bash
docker build -t bantaybayan:local .
```

Run the container:

```bash
docker run -d --name bantaybayan-test -p 8080:80 bantaybayan:local
```

Open http://localhost:8080 in your browser.

## Published Docker Image

GitHub Container Registry:

`ghcr.io/joshuafloreno17/bantaybayan`

Pull the published image:

```bash
docker pull ghcr.io/joshuafloreno17/bantaybayan:latest
```

## GitHub Repository

https://github.com/joshuafloreno17/BantayBayan
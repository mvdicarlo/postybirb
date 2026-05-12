# Postybirb

<div style='flex: 1'>
<a href="https://discord.com/invite/FUdN7JCr2f">
<img alt="Static Badge" src="https://img.shields.io/badge/discord-%2323272a?logo=discord">
</a>
<a href="https://github.com/mvdicarlo/postybirb/releases/latest">
<img alt="GitHub Downloads (all assets, latest release)" src="https://img.shields.io/github/downloads/mvdicarlo/postybirb/latest/total">
</a>
<a href="https://hosted.weblate.org/engage/postybirb/">
<img src="https://hosted.weblate.org/widget/postybirb/svg-badge.svg" alt="Translation status" />
</a>
<img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/mvdicarlo/postybirb/build.yml">
</div>

## About

PostyBirb is an application that helps artists post art and other multimedia to
multiple websites more quickly. The overall goal of PostyBirb is to cut down on
the time it takes to post submissions to multiple websites.

## Features

PostyBirb supports a wide range of websites, see the full list [here](./apps/client-server/src/app/websites/implementations).

- 🌐 Submission templates – Configure default values for each website once, reuse across submissions.
- 🏷️ Tag groups – Save and apply multiple tags at once.
- 🔄 Tag converters – Automatically rewrite tags per website.
- 🔗 Username shortcuts – Tag people on socials easily.
- ♻️ Username converters – Automatically rewrite usernames per website.
- ⚡ Custom shortcuts – Create your own text snippets for descriptions.
- ✍️ Description formatting – Apply bold, italics, color, etc. PostyBirb converts formatting to match each website's capabilities.
- 🚀 Description preview – See how any of the features above with look with website specific formatting applied. 
- 📐 Autoscaling – Scales images automatically.
- 📄 File & notification posts – Supports both media uploads and text‑only posts.
- 📅 Scheduling – Post at exact dates or repeating intervals. Login credentials stay on your device, and PostyBirb must be running for scheduled posts to go out - your credentials remain private and under your control.
- 🐳 Docker self‑host / remote – Advanced users can run PostyBirb on their own server with Docker. Scheduled posts work even when your main device is off, and you can access the same instance from multiple devices (e.g., start a draft on desktop, finish and schedule it from a laptop). [Detailed documentation on remote, Docker, and headless setup](./docs/DOCKER.md)
- 👁️ Directory watcher – Automatically creates a submission when a new file appears in a watched directory.

## V4 Initiative

v4 sets out to be more flexible for adding new features and updates not easily
supported on v3. It also aims to be more contributor friendly and ease the
implementation of websites where possible.

## Looking for v3 (PostyBirb+)?

You can find v3 [here](https://github.com/mvdicarlo/postybirb-plus).

## Translation

![Translation status badge](https://hosted.weblate.org/widget/postybirb/postybirb/287x66-black.png)

PostyBirb uses [Weblate](https://hosted.weblate.org/projects/postybirb/postybirb/) as transltion service

Learn more: [Translation guide](./TRANSLATION.md)

## Contributing

Please write clean code.

Follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Project Setup

1. Ensure your NodeJS version is 24.6.0 or higher
2. Clone project using git
3. Ensure corepack is installed: `npm --global install corepack` (This is tool used for managing package manager's versions)
4. `corepack enable` Makes NodeJS use the yarn version specific to the project (from package.json)
5. `yarn install` Installs dependencies
6. If it fails with `➤ YN0009: │ better-sqlite3@npm:11.8.0 couldn't be built successfully`: <summary>

  <details>
       If you're on windows run

```
winget install -e --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools;includeRecommended"
```

If you're on linux or other OS please create an issue with log from the unsucessfull build. It will have instructions on which packages are required and we will add them there. But generally it should work out of box if you have C++ compiler installed

  </details>

</summary>

6. `yarn run setup` Installs hooks/husky
7. `yarn start` Starts app

## Common commands:

- Run tests/format/lint: `yarn test`/`yarn format`/`yarn lint`
- Build & Package app: `yarn dist`

### Recommended Plugins (VSCode)

- Nx Console
- Jest Runner
- Prettier

### Add website

To add a new website [see this guide](./contributing/add-a-website)

## Primary Modules (/apps)

### Client-Server

The "Back end" of the application. This houses all website implementations, data models, user settings,
posting logic, etc.

#### Primary Technologies Used

- NestJS
- Drizzle (sqlite3)

### Postybirb

The Electron part of the application that contains initialization logic and
app setup.

#### Primary Technologies Used

- Electron

### PostyBirb-UI

The user interface for the application that talks with Client-Server through
web-socket and https.

#### Primary Technologies Used

- React
- TipTap (Text editor)
- Mantine (UI Framework)

### PostyBirb-Cloud-Server

Used for functions that are impossible to implement without having a dedicated server (e.g. hosting images for Instagram uploads)

---

This project was generated using [Nx](https://nx.dev).

# Postybirb

<div style='flex: 1'>
<a href="https://discord.gg/bN2rwvTs">
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
multiple websites more quickly.The overall goal of PostyBirb is to cut down on
the time it takes to post submissions to multiple websites.

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

## Project Setup

1. `yarn install` Installs dependencies
2. `yarn run setup` Installs hooks/husky
3. `yarn start` Starts app

### Recommended Plugins (VSCode)

- Nx Console
- Jest Runner
- Prettier

## Contributing

Please write clean code.

To add new websites use `node scripts/add-website.js`

Follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Primary Modules (/apps)

### Client-Server

The "Back end" of the application. This houses all data models, user settings,
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
- Blocknote/TipTap (Text editor)

-----------------

This project was generated using [Nx](https://nx.dev).

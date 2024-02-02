# Postybirb
![Translated badge](https://hosted.weblate.org/widgets/postybirb/?component=27943)

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

PostyBirb uses [Weblate](https://hosted.weblate.org/projects/postybirb/postybirb/) as transltion service

Learn more: [Translation guide](./TRANSLATION.md)

## Project Setup

1. `yarn install` Installs dependencies
2. `yarn run setup` Installs hooks/husky
3. `yarn start` Starts app

### Recommended Plugins (VSCode)

- Nx Console
- Jest Runner

## Contributing

Please write clean code.

Follow [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Primary Modules (/apps)

### Client-Server

The "Back end" of the application. This houses all data models, user settings,
posting logic, etc.

#### Primary Technologies Used

- NestJS
- MikroOrm (sqlite3)

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

-----------------

This project was generated using [Nx](https://nx.dev).

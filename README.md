# Athelete Mobile

React Native CLI foundation for the future Athelete mobile app.

## Core docs

- [Project foundation](./docs/PROJECT_FOUNDATION.md)
- [.env example](./.env.example)

## Commands

```sh
npm start
npm run android
npm run ios
npm run lint
npm test
```

## iOS pods

After pulling native dependency changes, run:

```sh
bundle install
bundle exec pod install
```

## Current scope

This repo is intentionally focused on foundation only:

- scalable `src/` architecture
- auth/onboarding/main-tab navigation scaffold
- provider composition
- Supabase integration base
- reusable UI primitives
- connected placeholder screens

Porting real product screens and business logic comes next.
# AtheleteApp

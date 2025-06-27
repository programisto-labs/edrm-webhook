# EDRM Webhook mangement module

## Table of Contents
- [Description](#description)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Routes](#routes)
- [Requierements](#requierements)


## Description
This module provides a complete set of tools to manage and trigger webhooks inside an Endurance-based backend.  
It is built using TypeScript and designed for integration with internal events.

## Features
- Register a new webhook
- Update or delete existing webhook
- Trigger a webhook when internal event is emitted
- External listener registration (optional hook-in system)

## Installation

   ```bash
   npm install edrm-webhook
   ```


## Environment Variables
None


## Routes
- /webhook (Default Rest CRUD) : Manage webhooks


## Requierements
- endurance-core ≥ 0.5.x

- mongoose ≥ 8.x

- Node.js ≥ 18

- TypeScript ≥ 5
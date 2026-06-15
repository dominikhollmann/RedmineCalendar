#!/bin/bash
set -e

# SSH server
sudo apt-get install -y openssh-server

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Project dependencies
npm install

# Playwright
npx playwright install --with-deps chromium

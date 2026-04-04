#!/usr/bin/env pwsh
Set-Location -Path "$PSScriptRoot"
docker compose up -d --build analytics-api

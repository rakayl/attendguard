#!/bin/sh
# Run this script once after cloning to generate go.sum
# Requires Go 1.21+ installed
set -e
echo "Generating go.sum..."
go mod tidy
echo "✓ go.sum generated"

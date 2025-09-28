#!/bin/bash
quasar build -m electron
cp -Rf dist/electron/Taskmaster\ 2000-darwin-arm64/Taskmaster\ 2000.app ~/Applications
cp ~/Projects/Taskmaster2000/server/protos/*.proto ~/Applications/Taskmaster\ 2000.app/Contents/Resources/ 

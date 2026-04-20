#!/usr/bin/env bash
# Find the user's UE 5.7 install and open Abyss.uproject in it.
# Works on macOS. Windows users: just double-click the .uproject.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPROJECT="$HERE/../Abyss.uproject"

# Common install paths for UE 5.x on macOS.
CANDIDATES=(
  "/Users/Shared/Epic Games/UE_5.7/Engine/Binaries/Mac/UnrealEditor.app"
  "/Users/Shared/Epic Games/UE_5.6/Engine/Binaries/Mac/UnrealEditor.app"
  "/Users/Shared/Epic Games/UE_5.5/Engine/Binaries/Mac/UnrealEditor.app"
  "/Users/Shared/Epic Games/UE_5.4/Engine/Binaries/Mac/UnrealEditor.app"
  "/Applications/Epic Games/UE_5.7/Engine/Binaries/Mac/UnrealEditor.app"
)

UE=""
for C in "${CANDIDATES[@]}"; do
  if [ -d "$C" ]; then UE="$C"; break; fi
done

if [ -z "$UE" ]; then
  echo "Couldn't find UnrealEditor.app. Searched:"
  printf '  %s\n' "${CANDIDATES[@]}"
  echo ""
  echo "Find your install with:"
  echo "  find /Users/Shared '/Applications/Epic Games' -name UnrealEditor.app 2>/dev/null"
  exit 1
fi

echo "Opening Abyss in $UE"
open -a "$UE" "$UPROJECT"

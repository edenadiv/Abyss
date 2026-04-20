#pragma once

#include "CoreMinimal.h"

/* Thin Steamworks bridge. Uses UE's OnlineSubsystemSteam under the hood,
   so this file's job is mostly to provide a clean call site from the
   GameInstance without pulling OnlineSubsystem headers everywhere. */

class ABYSS_API FAbyssSteam
{
public:
    static void Init();
    static void Shutdown();

    static bool IsSteamRunning();

    static void UnlockAchievement(const FString& Id);
    static void SetRichPresence(const FString& Key, const FString& Value);
    static void ClearRichPresence();
};

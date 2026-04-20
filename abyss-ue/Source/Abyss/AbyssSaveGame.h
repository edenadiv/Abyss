#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "AbyssTypes.h"
#include "AbyssSaveGame.generated.h"

/* UAbyssSaveGame — UE's save subclass. One instance per save slot.
   Steam Cloud syncs the .sav files automatically when configured on
   the Steamworks partner portal; no extra code needed here. */

UCLASS(BlueprintType)
class ABYSS_API UAbyssSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category="Abyss") FAbyssRunState Run;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,  Category="Abyss") int64 UpdatedAt = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly,  Category="Abyss") int32 SchemaVersion = 1;

    static FString SlotNameFor(int32 Slot) { return FString::Printf(TEXT("abyss_slot_%d"), Slot); }
    static FString SettingsSlotName() { return TEXT("abyss_settings"); }
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssSettingsSave : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") FAbyssSettings Settings;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abyss") int64 UpdatedAt = 0;
};

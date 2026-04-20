#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "AbyssTypes.h"
#include "AbyssGameInstance.generated.h"

class UAbyssSaveGame;
class UAbyssSettingsSave;

/* UAbyssGameInstance — lives for the whole app lifetime. Owns the run
   state, current slot, and settings; brokers save/load via USaveGame. */

UCLASS()
class ABYSS_API UAbyssGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    virtual void Init() override;
    virtual void Shutdown() override;

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    TArray<int32> GetExistingSlots() const;

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    bool HasSaveInSlot(int32 Slot) const;

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    bool LoadSlot(int32 Slot);

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    void NewRun(int32 Slot);

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    void PersistRun();

    UFUNCTION(BlueprintCallable, Category="Abyss|Save")
    void DeleteSlot(int32 Slot);

    UFUNCTION(BlueprintCallable, Category="Abyss|Settings")
    void ApplySettings(const FAbyssSettings& NewSettings);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss")
    const FAbyssRunState& GetRun() const { return Run; }

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss")
    const FAbyssSettings& GetSettings() const { return Settings; }

    /* Hand outcome hook — games call this with a breath delta. Updates
       state, tier, outfit, meta. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Gameplay")
    void ApplyResult(int32 Delta);

    /* Ending hook — games / world call this when an ending triggers.
       Updates meta, unlocks Steam achievement, optionally wipes slot. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Gameplay")
    void TriggerEnding(EAbyssEndingKind Kind);

    UPROPERTY(BlueprintReadWrite, Category="Abyss") FAbyssRunState Run;

private:
    UPROPERTY() int32 ActiveSlot = 1;
    UPROPERTY() FAbyssSettings Settings;

    void LoadSettings();
    void SaveSettings();
    void RecomputeTierOutfit();
};

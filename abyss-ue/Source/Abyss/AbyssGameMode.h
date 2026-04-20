#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "AbyssGameMode.generated.h"

// AAbyssGameMode — spawns the first-person pawn + casino + post-process
// volume on StartPlay if they're not already in the level. The practical
// effect: open any empty level, set GameMode override to this, press Play,
// and you walk through the casino. No Place Actors required.

UCLASS(Blueprintable)
class ABYSS_API AAbyssGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AAbyssGameMode();

    virtual void StartPlay() override;

protected:
    UPROPERTY(EditDefaultsOnly, Category="Abyss") bool bAutoSpawnCasino = true;
    UPROPERTY(EditDefaultsOnly, Category="Abyss") bool bAutoSpawnPostProcess = true;
    UPROPERTY(EditDefaultsOnly, Category="Abyss") bool bAutoSpawnPlayerStart = true;

private:
    void EnsureCasino();
    void EnsurePostProcess();
    void EnsurePlayerStart();
};

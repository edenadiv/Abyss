#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "AbyssGameMode.generated.h"

/* AAbyssGameMode — spawns the first-person pawn, wires the default
   controller. Blueprints can subclass to inject custom HUD widgets. */

UCLASS(Blueprintable)
class ABYSS_API AAbyssGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AAbyssGameMode();
};

#include "AbyssGameMode.h"
#include "AbyssCharacter.h"

AAbyssGameMode::AAbyssGameMode()
{
    DefaultPawnClass = AAbyssCharacter::StaticClass();
    // PlayerControllerClass stays at engine default; swap in a Blueprint
    // subclass if we need HUD widget injection from Blueprint land.
}

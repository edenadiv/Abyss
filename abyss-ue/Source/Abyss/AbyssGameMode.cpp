#include "AbyssGameMode.h"
#include "AbyssCharacter.h"
#include "AbyssCasinoBuilder.h"
#include "EngineUtils.h"
#include "Engine/World.h"
#include "Engine/PostProcessVolume.h"
#include "GameFramework/PlayerStart.h"

AAbyssGameMode::AAbyssGameMode()
{
    DefaultPawnClass = AAbyssCharacter::StaticClass();
}

void AAbyssGameMode::StartPlay()
{
    // Spawn the world's missing pieces *before* Super::StartPlay fires
    // BeginPlay on actors — that way the casino geometry builds itself
    // and the PlayerStart is in place by the time the pawn is spawned.
    if (bAutoSpawnCasino)        EnsureCasino();
    if (bAutoSpawnPostProcess)   EnsurePostProcess();
    if (bAutoSpawnPlayerStart)   EnsurePlayerStart();

    Super::StartPlay();
}

void AAbyssGameMode::EnsureCasino()
{
    UWorld* World = GetWorld();
    if (!World) return;
    for (TActorIterator<AAbyssCasinoBuilder> It(World); It; ++It) return; // already present
    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    World->SpawnActor<AAbyssCasinoBuilder>(AAbyssCasinoBuilder::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator, Params);
    UE_LOG(LogTemp, Log, TEXT("[AbyssGameMode] auto-spawned AbyssCasinoBuilder at origin"));
}

void AAbyssGameMode::EnsurePostProcess()
{
    UWorld* World = GetWorld();
    if (!World) return;
    for (TActorIterator<APostProcessVolume> It(World); It; ++It) return;
    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    APostProcessVolume* Volume = World->SpawnActor<APostProcessVolume>(APostProcessVolume::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator, Params);
    if (!Volume) return;
    Volume->bUnbound = true;
    Volume->Priority = 0;

    // Subtle baseline: warm tone, mild bloom, light grain. Per-ending
    // cinematics override this via their own PPVs in Sequencer.
    FPostProcessSettings& P = Volume->Settings;
    P.bOverride_BloomIntensity = 1;  P.BloomIntensity = 0.65f;
    P.bOverride_VignetteIntensity = 1; P.VignetteIntensity = 0.35f;
    P.bOverride_FilmGrainIntensity = 1; P.FilmGrainIntensity = 0.2f;
    P.bOverride_ColorSaturation = 1; P.ColorSaturation = FVector4(0.95f, 0.97f, 1.0f, 1.0f);
    P.bOverride_ColorContrast = 1;   P.ColorContrast   = FVector4(1.06f, 1.06f, 1.06f, 1.0f);
    P.bOverride_AutoExposureBias = 1; P.AutoExposureBias = 0.2f;
    P.bOverride_AmbientOcclusionIntensity = 1; P.AmbientOcclusionIntensity = 0.65f;
    UE_LOG(LogTemp, Log, TEXT("[AbyssGameMode] auto-spawned PostProcessVolume (unbound)"));
}

void AAbyssGameMode::EnsurePlayerStart()
{
    UWorld* World = GetWorld();
    if (!World) return;
    for (TActorIterator<APlayerStart> It(World); It; ++It) return;
    // Drop the player just outside the southern exit door, looking toward the stage.
    const FVector Loc(0.f, 2200.f, 170.f);
    const FRotator Rot(0.f, -90.f, 0.f); // face -Y (toward origin / stage)
    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    World->SpawnActor<APlayerStart>(APlayerStart::StaticClass(), Loc, Rot, Params);
    UE_LOG(LogTemp, Log, TEXT("[AbyssGameMode] auto-spawned PlayerStart at %s"), *Loc.ToString());
}

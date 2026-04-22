#include "AbyssGameMode.h"
#include "AbyssCharacter.h"
#include "AbyssCasinoBuilder.h"
#include "EngineUtils.h"
#include "Engine/World.h"
#include "Engine/PostProcessVolume.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Atmosphere/AtmosphericFog.h"
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
    if (bAutoSpawnAtmosphere)    EnsureAtmosphere();
    if (bAutoSpawnCasino)        EnsureCasino();
    if (bAutoSpawnPostProcess)   EnsurePostProcess();
    if (bAutoSpawnPlayerStart)   EnsurePlayerStart();

    Super::StartPlay();
}

void AAbyssGameMode::EnsureAtmosphere()
{
    UWorld* World = GetWorld();
    if (!World) return;

    // Directional moonlight — cool, low, shadow-casting. Gives Lumen a
    // primary bounce source coming through windows / door.
    bool bHasDirLight = false;
    for (TActorIterator<ADirectionalLight> It(World); It; ++It) { bHasDirLight = true; break; }
    if (!bHasDirLight)
    {
        FActorSpawnParameters P;
        P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        ADirectionalLight* Sun = World->SpawnActor<ADirectionalLight>(
            ADirectionalLight::StaticClass(),
            FVector(0, 0, 2000.f), FRotator(-42.f, 140.f, 0.f), P);
        if (Sun)
        {
            if (UDirectionalLightComponent* C = Sun->GetComponent())
            {
                C->SetMobility(EComponentMobility::Movable);
                C->SetIntensity(3.5f);
                C->SetLightColor(FLinearColor(0.55f, 0.68f, 1.0f));
                C->SetUseTemperature(true);
                C->SetTemperature(7800.f);
                C->SetDynamicShadowCascades(4);
                C->SetDynamicShadowDistanceMovableLight(8000.f);
                C->SetCastShadows(true);
                C->SetAtmosphereSunLight(true);
            }
        }
    }

    // Skylight — Lumen uses this for ambient bounce. Real-time capture
    // so it picks up the emissive door/flames.
    bool bHasSkyLight = false;
    for (TActorIterator<ASkyLight> It(World); It; ++It) { bHasSkyLight = true; break; }
    if (!bHasSkyLight)
    {
        FActorSpawnParameters P;
        P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        ASkyLight* Sky = World->SpawnActor<ASkyLight>(
            ASkyLight::StaticClass(), FVector(0, 0, 1000.f), FRotator::ZeroRotator, P);
        if (Sky)
        {
            if (USkyLightComponent* C = Sky->GetLightComponent())
            {
                C->SetMobility(EComponentMobility::Movable);
                C->SetRealTimeCaptureEnabled(true);
                C->SetIntensity(1.2f);
                C->SetLightColor(FLinearColor(0.20f, 0.30f, 0.55f));
                C->SetLowerHemisphereColor(FLinearColor(0.01f, 0.01f, 0.02f));
                C->RecaptureSky();
            }
        }
    }

    // Exponential height fog — volumetric, blue-tinted. Depth cueing
    // across the chamber, light shafts from the door.
    bool bHasFog = false;
    for (TActorIterator<AExponentialHeightFog> It(World); It; ++It) { bHasFog = true; break; }
    if (!bHasFog)
    {
        FActorSpawnParameters P;
        P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
        AExponentialHeightFog* Fog = World->SpawnActor<AExponentialHeightFog>(
            AExponentialHeightFog::StaticClass(),
            FVector(0, 0, 0.f), FRotator::ZeroRotator, P);
        if (Fog)
        {
            if (UExponentialHeightFogComponent* C = Fog->GetComponent())
            {
                C->SetFogDensity(0.04f);
                C->SetFogHeightFalloff(0.2f);
                C->SetStartDistance(300.f);
                C->SetFogInscatteringColor(FLinearColor(0.20f, 0.38f, 0.55f));
                C->SetVolumetricFog(true);
                C->SetVolumetricFogScatteringDistribution(0.6f);
                C->SetVolumetricFogExtinctionScale(1.0f);
                C->SetVolumetricFogAlbedo(FColor(200, 210, 230));
                C->SetVolumetricFogEmissive(FLinearColor(0.002f, 0.004f, 0.008f));
            }
        }
    }
    UE_LOG(LogTemp, Log, TEXT("[AbyssGameMode] atmosphere: dir-light + skylight + volumetric fog spawned"));
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

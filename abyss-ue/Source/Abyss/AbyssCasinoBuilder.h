#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "AbyssCasinoBuilder.generated.h"

class UStaticMeshComponent;
class UPointLightComponent;
class USpotLightComponent;
class UMaterialInterface;

/* AAbyssCasinoBuilder — drop one of these into a level and it spawns
   the entire octagonal casino chamber on BeginPlay: walls, columns,
   chandeliers, candelabra, 7 tables, stage, exit door.

   Pure-code scene construction means the user can open UE, open an
   empty Casino.umap, drag the AAbyssCasinoBuilder actor in, hit Play,
   and see a full casino. Then they can progressively swap the
   engine-primitive meshes for proper static mesh assets (Nanite-enabled)
   as they're authored. */

UCLASS(Blueprintable)
class ABYSS_API AAbyssCasinoBuilder : public AActor
{
    GENERATED_BODY()

public:
    AAbyssCasinoBuilder();
    virtual void BeginPlay() override;

    /* Meshes — set in Blueprint if you want higher-fidelity assets; defaults
       are the engine basic shapes so it still builds with zero asset work. */
    UPROPERTY(EditAnywhere, Category="Abyss|Meshes") UStaticMesh* CubeMesh;      // /Engine/BasicShapes/Cube
    UPROPERTY(EditAnywhere, Category="Abyss|Meshes") UStaticMesh* CylinderMesh;  // /Engine/BasicShapes/Cylinder
    UPROPERTY(EditAnywhere, Category="Abyss|Meshes") UStaticMesh* PlaneMesh;     // /Engine/BasicShapes/Plane
    UPROPERTY(EditAnywhere, Category="Abyss|Meshes") UStaticMesh* SphereMesh;    // /Engine/BasicShapes/Sphere
    UPROPERTY(EditAnywhere, Category="Abyss|Meshes") UStaticMesh* ConeMesh;      // /Engine/BasicShapes/Cone

    /* Materials — override in Blueprint or leave null to use engine defaults.
       BP_AbyssCasinoBuilder populates these with M_Marble, M_Brass, etc. */
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* FloorMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* WallMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* WallAccentMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* CeilingMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* BrassMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* VelvetMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* WoodMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* FeltMat;
    UPROPERTY(EditAnywhere, Category="Abyss|Materials") UMaterialInterface* FlameMat;

    /* Dimensions — world-space in UE units (centimeters). Defaults match
       the abyss-desktop layout scaled 100× (metres → cm). */
    UPROPERTY(EditAnywhere, Category="Abyss|Layout") float ChamberRadius = 3000.f;
    UPROPERTY(EditAnywhere, Category="Abyss|Layout") float ChamberHeight = 1500.f;
    UPROPERTY(EditAnywhere, Category="Abyss|Layout") int32 WallSegments  = 8;
    UPROPERTY(EditAnywhere, Category="Abyss|Layout") float TableRing     = 1400.f;

private:
    UPROPERTY() TArray<UStaticMeshComponent*> SpawnedMeshes;
    UPROPERTY() TArray<USceneComponent*> SpawnedLights;

    void BuildFloorAndCeiling();
    void BuildWallsAndColumns();
    void BuildCentralStage();
    void BuildTables();
    void BuildChandeliers();
    void BuildExitDoor();

    UStaticMeshComponent* SpawnMesh(const FString& Name, UStaticMesh* Mesh, const FVector& Loc, const FRotator& Rot, const FVector& Scale, UMaterialInterface* Material = nullptr);
    UStaticMeshComponent* SpawnTinted(const FString& Name, UStaticMesh* Mesh, const FVector& Loc, const FRotator& Rot, const FVector& Scale, const FLinearColor& Tint, float Metallic = 0.f, float Roughness = 0.85f, float Emissive = 0.f);
    UPointLightComponent* SpawnPointLight(const FString& Name, const FVector& Loc, const FLinearColor& Color, float Intensity, float AttenRadius);

    void BuildPaintings();
    void BuildChipStacks();
    void BuildFloorTiles();
    void BuildDealers();
    void SpawnDealer(int32 Index, const FVector& Loc, float Yaw, const FLinearColor& SkinTone, const FLinearColor& BowTie);
};

#include "AbyssCasinoBuilder.h"
#include "Components/StaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SpotLightComponent.h"
#include "Materials/MaterialInterface.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"

AAbyssCasinoBuilder::AAbyssCasinoBuilder()
{
    PrimaryActorTick.bCanEverTick = false;
    // Engine default shapes — so the scene populates with ZERO imported assets.
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeF(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderF(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> PlaneF(TEXT("/Engine/BasicShapes/Plane.Plane"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereF(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> ConeF(TEXT("/Engine/BasicShapes/Cone.Cone"));
    if (CubeF.Succeeded())     CubeMesh = CubeF.Object;
    if (CylinderF.Succeeded()) CylinderMesh = CylinderF.Object;
    if (PlaneF.Succeeded())    PlaneMesh = PlaneF.Object;
    if (SphereF.Succeeded())   SphereMesh = SphereF.Object;
    if (ConeF.Succeeded())     ConeMesh = ConeF.Object;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);
}

void AAbyssCasinoBuilder::BeginPlay()
{
    Super::BeginPlay();
    BuildFloorAndCeiling();
    BuildWallsAndColumns();
    BuildCentralStage();
    BuildTables();
    BuildChandeliers();
    BuildExitDoor();
    UE_LOG(LogTemp, Log, TEXT("[AbyssCasino] built %d meshes, %d lights"), SpawnedMeshes.Num(), SpawnedLights.Num());
}

UStaticMeshComponent* AAbyssCasinoBuilder::SpawnMesh(const FString& Name, UStaticMesh* Mesh, const FVector& Loc, const FRotator& Rot, const FVector& Scale, UMaterialInterface* Material)
{
    UStaticMeshComponent* M = NewObject<UStaticMeshComponent>(this, *Name);
    if (!M) return nullptr;
    M->SetupAttachment(RootComponent);
    M->RegisterComponent();
    if (Mesh) M->SetStaticMesh(Mesh);
    M->SetRelativeLocation(Loc);
    M->SetRelativeRotation(Rot);
    M->SetRelativeScale3D(Scale);
    if (Material) M->SetMaterial(0, Material);
    M->SetMobility(EComponentMobility::Static);
    M->SetCastShadow(true);
    SpawnedMeshes.Add(M);
    return M;
}

UPointLightComponent* AAbyssCasinoBuilder::SpawnPointLight(const FString& Name, const FVector& Loc, const FLinearColor& Color, float Intensity, float AttenRadius)
{
    UPointLightComponent* L = NewObject<UPointLightComponent>(this, *Name);
    if (!L) return nullptr;
    L->SetupAttachment(RootComponent);
    L->RegisterComponent();
    L->SetRelativeLocation(Loc);
    L->SetLightColor(Color);
    L->SetIntensity(Intensity);
    L->SetAttenuationRadius(AttenRadius);
    L->SetMobility(EComponentMobility::Stationary);
    L->SetCastShadows(false); // mood lights — no cube-map shadow cost
    SpawnedLights.Add(L);
    return L;
}

void AAbyssCasinoBuilder::BuildFloorAndCeiling()
{
    // Floor — 60m square flat plane scaled to cover the chamber.
    const float R = ChamberRadius / 100.f;
    SpawnMesh(TEXT("Floor"), PlaneMesh, FVector::ZeroVector, FRotator::ZeroRotator,
              FVector(R * 2.2f, R * 2.2f, 1.f), FloorMat);

    // Ceiling — same plane flipped at HEIGHT.
    SpawnMesh(TEXT("Ceiling"), PlaneMesh, FVector(0, 0, ChamberHeight), FRotator(180, 0, 0),
              FVector(R * 2.2f, R * 2.2f, 1.f), CeilingMat ? CeilingMat : WallAccentMat);
}

void AAbyssCasinoBuilder::BuildWallsAndColumns()
{
    const int32 Segs = FMath::Max(3, WallSegments);
    for (int32 i = 0; i < Segs; ++i)
    {
        const float A1 = (float)i / Segs * PI * 2.f;
        const float A2 = (float)(i + 1) / Segs * PI * 2.f;
        const float X1 = FMath::Cos(A1) * ChamberRadius;
        const float Y1 = FMath::Sin(A1) * ChamberRadius;
        const float X2 = FMath::Cos(A2) * ChamberRadius;
        const float Y2 = FMath::Sin(A2) * ChamberRadius;
        const float Len = FMath::Sqrt(FMath::Square(X2 - X1) + FMath::Square(Y2 - Y1));
        const FVector Mid((X1 + X2) * 0.5f, (Y1 + Y2) * 0.5f, ChamberHeight * 0.5f);
        const float Yaw = FMath::Atan2(Y2 - Y1, X2 - X1) * 180.f / PI;
        // Wall panel — cube stretched to segment length × HEIGHT × thin depth
        UMaterialInterface* Mat = (i % 2 == 0) ? WallMat : (WallAccentMat ? WallAccentMat : WallMat);
        SpawnMesh(FString::Printf(TEXT("Wall_%d"), i), CubeMesh, Mid, FRotator(0, Yaw, 0),
                  FVector(Len / 100.f, 0.2f, ChamberHeight / 100.f), Mat);

        // Column at the seam (on point A1)
        SpawnMesh(FString::Printf(TEXT("Col_%d"), i), CylinderMesh,
                  FVector(X1, Y1, ChamberHeight * 0.5f), FRotator::ZeroRotator,
                  FVector(0.8f, 0.8f, ChamberHeight / 100.f), WallAccentMat ? WallAccentMat : WallMat);
        // Brass capital at the top
        SpawnMesh(FString::Printf(TEXT("ColCap_%d"), i), CubeMesh,
                  FVector(X1, Y1, ChamberHeight - 30.f), FRotator::ZeroRotator,
                  FVector(1.0f, 1.0f, 0.3f), BrassMat);
    }
}

void AAbyssCasinoBuilder::BuildCentralStage()
{
    // Stage disk — cylinder scaled flat
    SpawnMesh(TEXT("Stage"), CylinderMesh, FVector(0, 0, 30.f), FRotator::ZeroRotator,
              FVector(6.2f, 6.2f, 0.3f), VelvetMat ? VelvetMat : WallAccentMat);
    // Brass urn on the stage — tall cylinder w/ flame cone on top
    SpawnMesh(TEXT("StageUrn"), CylinderMesh, FVector(0, 0, 90.f), FRotator::ZeroRotator,
              FVector(0.8f, 0.8f, 1.0f), BrassMat);
    SpawnMesh(TEXT("StageFlame"), ConeMesh, FVector(0, 0, 220.f), FRotator::ZeroRotator,
              FVector(0.5f, 0.5f, 0.9f), FlameMat);
    // Stage spot
    USpotLightComponent* Spot = NewObject<USpotLightComponent>(this, TEXT("StageSpot"));
    Spot->SetupAttachment(RootComponent);
    Spot->RegisterComponent();
    Spot->SetRelativeLocation(FVector(0, 0, 1000.f));
    Spot->SetRelativeRotation(FRotator(-90, 0, 0));
    Spot->SetLightColor(FLinearColor(1.0f, 0.82f, 0.52f));
    Spot->SetIntensity(100000.f);
    Spot->SetAttenuationRadius(1800.f);
    Spot->SetOuterConeAngle(35.f);
    Spot->SetInnerConeAngle(15.f);
    Spot->SetMobility(EComponentMobility::Stationary);
    SpawnedLights.Add(Spot);

    // Warm glow from the urn
    SpawnPointLight(TEXT("UrnLight"), FVector(0, 0, 200.f), FLinearColor(0.4f, 0.9f, 1.0f), 3000.f, 600.f);
}

void AAbyssCasinoBuilder::BuildTables()
{
    const int32 Count = 7;
    const TArray<FLinearColor> Accents = {
        FLinearColor(0.16f, 0.06f, 0.07f),
        FLinearColor(0.10f, 0.16f, 0.23f),
        FLinearColor(0.16f, 0.09f, 0.06f),
        FLinearColor(0.23f, 0.10f, 0.16f),
        FLinearColor(0.10f, 0.13f, 0.06f),
        FLinearColor(0.16f, 0.13f, 0.06f),
        FLinearColor(0.10f, 0.10f, 0.16f),
    };
    for (int32 i = 0; i < Count; ++i)
    {
        const float A = (float)i / Count * PI * 2.f + PI * 0.1f;
        const float X = FMath::Cos(A) * TableRing;
        const float Y = FMath::Sin(A) * TableRing;
        // Pedestal (wood)
        SpawnMesh(FString::Printf(TEXT("Ped_%d"), i), CylinderMesh,
                  FVector(X, Y, 45.f), FRotator::ZeroRotator,
                  FVector(1.5f, 1.5f, 0.45f), WoodMat ? WoodMat : WallMat);
        // Felt top (color tinted accent)
        UStaticMeshComponent* Top = SpawnMesh(FString::Printf(TEXT("Top_%d"), i), CylinderMesh,
                  FVector(X, Y, 96.f), FRotator::ZeroRotator,
                  FVector(1.55f, 1.55f, 0.06f), FeltMat);
        // Brass rim
        SpawnMesh(FString::Printf(TEXT("Rim_%d"), i), CylinderMesh,
                  FVector(X, Y, 104.f), FRotator::ZeroRotator,
                  FVector(1.6f, 1.6f, 0.01f), BrassMat);
        // Warm over-table lamp
        SpawnPointLight(FString::Printf(TEXT("TLamp_%d"), i),
                        FVector(X, Y, 340.f), FLinearColor(1.0f, 0.72f, 0.42f), 2500.f, 550.f);
    }
}

void AAbyssCasinoBuilder::BuildChandeliers()
{
    const TArray<FVector2D> Pos = {
        FVector2D(-ChamberRadius * 0.55f, -ChamberRadius * 0.55f),
        FVector2D( ChamberRadius * 0.55f, -ChamberRadius * 0.55f),
        FVector2D(-ChamberRadius * 0.55f,  ChamberRadius * 0.55f),
        FVector2D( ChamberRadius * 0.55f,  ChamberRadius * 0.55f),
    };
    for (int32 i = 0; i < Pos.Num(); ++i)
    {
        const FVector Base(Pos[i].X, Pos[i].Y, ChamberHeight - 220.f);
        // Rod + ring + disk (brass)
        SpawnMesh(FString::Printf(TEXT("ChandRod_%d"), i), CylinderMesh,
                  Base + FVector(0, 0, 150.f), FRotator::ZeroRotator,
                  FVector(0.06f, 0.06f, 3.0f), BrassMat);
        SpawnMesh(FString::Printf(TEXT("ChandRing_%d"), i), CylinderMesh,
                  Base, FRotator::ZeroRotator,
                  FVector(2.4f, 2.4f, 0.08f), BrassMat);
        // 8 candle+flame pairs around the ring
        for (int32 k = 0; k < 8; ++k)
        {
            const float A = (float)k / 8.f * PI * 2.f;
            const FVector CPos = Base + FVector(FMath::Cos(A) * 120.f, FMath::Sin(A) * 120.f, 18.f);
            SpawnMesh(FString::Printf(TEXT("ChandCandle_%d_%d"), i, k), CylinderMesh,
                      CPos, FRotator::ZeroRotator,
                      FVector(0.16f, 0.16f, 0.3f), BrassMat);
            SpawnMesh(FString::Printf(TEXT("ChandFlame_%d_%d"), i, k), ConeMesh,
                      CPos + FVector(0, 0, 24.f), FRotator::ZeroRotator,
                      FVector(0.12f, 0.12f, 0.18f), FlameMat);
        }
        SpawnPointLight(FString::Printf(TEXT("ChandLight_%d"), i),
                        Base, FLinearColor(1.0f, 0.76f, 0.48f), 6000.f, 1000.f);
    }
}

void AAbyssCasinoBuilder::BuildExitDoor()
{
    const float DoorZ = -ChamberRadius + 30.f;
    // Frame
    SpawnMesh(TEXT("DoorFrame"), CubeMesh, FVector(0, DoorZ, 220.f), FRotator::ZeroRotator,
              FVector(2.6f, 0.5f, 4.4f), BrassMat);
    // Glow panel
    SpawnMesh(TEXT("DoorInner"), PlaneMesh, FVector(0, DoorZ + 8.f, 210.f), FRotator(90, 0, 0),
              FVector(2.0f, 3.4f, 1.f), nullptr);
    // Door light
    SpawnPointLight(TEXT("DoorLight"), FVector(0, DoorZ + 120.f, 300.f),
                    FLinearColor(0.35f, 0.75f, 1.0f), 4000.f, 600.f);
}

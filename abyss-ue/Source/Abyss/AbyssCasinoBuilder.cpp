#include "AbyssCasinoBuilder.h"
#include "Components/StaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SpotLightComponent.h"
#include "Materials/MaterialInterface.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"

// Engine's BasicShapeMaterial carries a `Color` vector parameter that's
// the standard way to tint primitive shapes without importing art. We
// cache it in the constructor so every SpawnMesh call can spin up a
// colored dynamic instance.
static const TCHAR* BASIC_MAT_PATH = TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial");

// Palette — linear colors (not sRGB). Chosen to read as deep interior
// museum-after-hours once Lumen + bloom + tonemap run over them.
namespace AbyssPalette
{
    const FLinearColor FloorMarble    = FLinearColor(0.020f, 0.024f, 0.032f, 1.f);
    const FLinearColor CeilingStone   = FLinearColor(0.010f, 0.012f, 0.020f, 1.f);
    const FLinearColor WallWarm       = FLinearColor(0.070f, 0.045f, 0.030f, 1.f);
    const FLinearColor WallCool       = FLinearColor(0.040f, 0.038f, 0.060f, 1.f);
    const FLinearColor Brass          = FLinearColor(0.680f, 0.480f, 0.180f, 1.f);
    const FLinearColor BrassDim       = FLinearColor(0.360f, 0.250f, 0.090f, 1.f);
    const FLinearColor Wood           = FLinearColor(0.090f, 0.045f, 0.022f, 1.f);
    const FLinearColor Velvet         = FLinearColor(0.280f, 0.040f, 0.075f, 1.f);
    const FLinearColor Drape          = FLinearColor(0.160f, 0.030f, 0.060f, 1.f);
    const FLinearColor FlameCore      = FLinearColor(5.500f, 2.400f, 0.600f, 1.f);
    const FLinearColor DoorGlow       = FLinearColor(0.900f, 2.200f, 3.200f, 1.f);
}

AAbyssCasinoBuilder::AAbyssCasinoBuilder()
{
    PrimaryActorTick.bCanEverTick = false;

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

// Tint a mesh with a dynamic instance of BasicShapeMaterial that has a
// "Color" vector parameter. Fallback to nothing if the material can't
// be found (shouldn't happen on a valid UE install).
static void ApplyTint(UStaticMeshComponent* M, const FLinearColor& Tint)
{
    if (!M) return;
    UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, BASIC_MAT_PATH);
    if (!Base) return;
    UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Base, M);
    if (!MID) return;
    MID->SetVectorParameterValue(TEXT("Color"), Tint);
    M->SetMaterial(0, MID);
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

UStaticMeshComponent* AAbyssCasinoBuilder::SpawnTinted(const FString& Name, UStaticMesh* Mesh, const FVector& Loc, const FRotator& Rot, const FVector& Scale, const FLinearColor& Tint)
{
    UStaticMeshComponent* M = SpawnMesh(Name, Mesh, Loc, Rot, Scale, nullptr);
    ApplyTint(M, Tint);
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
    L->SetCastShadows(false);
    SpawnedLights.Add(L);
    return L;
}

void AAbyssCasinoBuilder::BuildFloorAndCeiling()
{
    const float R = ChamberRadius / 100.f;
    SpawnTinted(TEXT("Floor"), PlaneMesh, FVector::ZeroVector, FRotator::ZeroRotator,
                FVector(R * 2.2f, R * 2.2f, 1.f), AbyssPalette::FloorMarble);
    SpawnTinted(TEXT("Ceiling"), PlaneMesh, FVector(0, 0, ChamberHeight), FRotator(180, 0, 0),
                FVector(R * 2.2f, R * 2.2f, 1.f), AbyssPalette::CeilingStone);
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

        const FLinearColor WallTint = (i % 2 == 0) ? AbyssPalette::WallWarm : AbyssPalette::WallCool;
        SpawnTinted(FString::Printf(TEXT("Wall_%d"), i), CubeMesh, Mid, FRotator(0, Yaw, 0),
                    FVector(Len / 100.f, 0.2f, ChamberHeight / 100.f), WallTint);

        SpawnTinted(FString::Printf(TEXT("Col_%d"), i), CylinderMesh,
                    FVector(X1, Y1, ChamberHeight * 0.5f), FRotator::ZeroRotator,
                    FVector(0.8f, 0.8f, ChamberHeight / 100.f), AbyssPalette::WallWarm);

        SpawnTinted(FString::Printf(TEXT("ColCap_%d"), i), CubeMesh,
                    FVector(X1, Y1, ChamberHeight - 30.f), FRotator::ZeroRotator,
                    FVector(1.0f, 1.0f, 0.3f), AbyssPalette::Brass);
    }
}

void AAbyssCasinoBuilder::BuildCentralStage()
{
    SpawnTinted(TEXT("Stage"), CylinderMesh, FVector(0, 0, 30.f), FRotator::ZeroRotator,
                FVector(6.2f, 6.2f, 0.3f), AbyssPalette::Velvet);

    SpawnTinted(TEXT("StageUrn"), CylinderMesh, FVector(0, 0, 90.f), FRotator::ZeroRotator,
                FVector(0.8f, 0.8f, 1.0f), AbyssPalette::Brass);

    SpawnTinted(TEXT("StageFlame"), ConeMesh, FVector(0, 0, 220.f), FRotator::ZeroRotator,
                FVector(0.5f, 0.5f, 0.9f), AbyssPalette::FlameCore);

    // Stage spot from above
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

    SpawnPointLight(TEXT("UrnLight"), FVector(0, 0, 240.f),
                    FLinearColor(1.0f, 0.88f, 0.56f), 5000.f, 800.f);
}

void AAbyssCasinoBuilder::BuildTables()
{
    const int32 Count = 7;
    // Per-table felt accents — matches the TS content data's `accent` colors.
    const TArray<FLinearColor> FeltAccents = {
        FLinearColor(0.180f, 0.050f, 0.060f, 1.f),  // blackjack: blood
        FLinearColor(0.050f, 0.110f, 0.190f, 1.f),  // roulette: deep blue
        FLinearColor(0.160f, 0.070f, 0.040f, 1.f),  // baccarat: burnt umber
        FLinearColor(0.220f, 0.080f, 0.160f, 1.f),  // slots: aubergine
        FLinearColor(0.070f, 0.120f, 0.040f, 1.f),  // poker: dark moss
        FLinearColor(0.180f, 0.130f, 0.050f, 1.f),  // dice: gilded mustard
        FLinearColor(0.080f, 0.080f, 0.180f, 1.f),  // coin: twilight
    };
    for (int32 i = 0; i < Count; ++i)
    {
        const float A = (float)i / Count * PI * 2.f + PI * 0.1f;
        const float X = FMath::Cos(A) * TableRing;
        const float Y = FMath::Sin(A) * TableRing;

        SpawnTinted(FString::Printf(TEXT("Ped_%d"), i), CylinderMesh,
                    FVector(X, Y, 45.f), FRotator::ZeroRotator,
                    FVector(1.5f, 1.5f, 0.45f), AbyssPalette::Wood);
        SpawnTinted(FString::Printf(TEXT("Top_%d"), i), CylinderMesh,
                    FVector(X, Y, 96.f), FRotator::ZeroRotator,
                    FVector(1.55f, 1.55f, 0.06f), FeltAccents[i]);
        SpawnTinted(FString::Printf(TEXT("Rim_%d"), i), CylinderMesh,
                    FVector(X, Y, 104.f), FRotator::ZeroRotator,
                    FVector(1.6f, 1.6f, 0.01f), AbyssPalette::Brass);

        SpawnPointLight(FString::Printf(TEXT("TLamp_%d"), i),
                        FVector(X, Y, 340.f),
                        FLinearColor(1.0f, 0.72f, 0.42f), 2500.f, 550.f);
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

        SpawnTinted(FString::Printf(TEXT("ChandRod_%d"), i), CylinderMesh,
                    Base + FVector(0, 0, 150.f), FRotator::ZeroRotator,
                    FVector(0.06f, 0.06f, 3.0f), AbyssPalette::Brass);
        SpawnTinted(FString::Printf(TEXT("ChandRing_%d"), i), CylinderMesh,
                    Base, FRotator::ZeroRotator,
                    FVector(2.4f, 2.4f, 0.08f), AbyssPalette::Brass);

        for (int32 k = 0; k < 8; ++k)
        {
            const float A = (float)k / 8.f * PI * 2.f;
            const FVector CPos = Base + FVector(FMath::Cos(A) * 120.f, FMath::Sin(A) * 120.f, 18.f);
            SpawnTinted(FString::Printf(TEXT("ChandCandle_%d_%d"), i, k), CylinderMesh,
                        CPos, FRotator::ZeroRotator,
                        FVector(0.16f, 0.16f, 0.3f), AbyssPalette::BrassDim);
            SpawnTinted(FString::Printf(TEXT("ChandFlame_%d_%d"), i, k), ConeMesh,
                        CPos + FVector(0, 0, 24.f), FRotator::ZeroRotator,
                        FVector(0.12f, 0.12f, 0.18f), AbyssPalette::FlameCore);
        }

        SpawnPointLight(FString::Printf(TEXT("ChandLight_%d"), i),
                        Base, FLinearColor(1.0f, 0.76f, 0.48f), 6000.f, 1000.f);
    }
}

void AAbyssCasinoBuilder::BuildExitDoor()
{
    const float DoorZ = -ChamberRadius + 30.f;
    SpawnTinted(TEXT("DoorFrame"), CubeMesh, FVector(0, DoorZ, 220.f), FRotator::ZeroRotator,
                FVector(2.6f, 0.5f, 4.4f), AbyssPalette::Brass);
    SpawnTinted(TEXT("DoorInner"), PlaneMesh, FVector(0, DoorZ + 8.f, 210.f), FRotator(90, 0, 0),
                FVector(2.0f, 3.4f, 1.f), AbyssPalette::DoorGlow);

    SpawnPointLight(TEXT("DoorLight"), FVector(0, DoorZ + 120.f, 300.f),
                    FLinearColor(0.35f, 0.75f, 1.0f), 6000.f, 800.f);
}

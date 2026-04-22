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
    BuildFloorTiles();
    BuildWallsAndColumns();
    BuildCentralStage();
    BuildTables();
    BuildChipStacks();
    BuildChandeliers();
    BuildExitDoor();
    BuildPaintings();
    UE_LOG(LogTemp, Log, TEXT("[AbyssCasino] built %d meshes, %d lights"), SpawnedMeshes.Num(), SpawnedLights.Num());
}

// Tint a mesh with a dynamic instance of BasicShapeMaterial. We also
// feed Metallic + Roughness parameters when present (silently ignored
// if the material doesn't expose them) so brass reads metallic, marble
// reads polished, velvet reads rough.
static void ApplyTint(UStaticMeshComponent* M, const FLinearColor& Tint, float Metallic = 0.f, float Roughness = 0.85f, float Emissive = 0.f)
{
    if (!M) return;
    UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, BASIC_MAT_PATH);
    if (!Base) return;
    UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Base, M);
    if (!MID) return;
    MID->SetVectorParameterValue(TEXT("Color"),     Tint);
    MID->SetScalarParameterValue(TEXT("Metallic"),  Metallic);
    MID->SetScalarParameterValue(TEXT("Roughness"), Roughness);
    // Emissive: piggyback on vertex color amplification if the material
    // supports it; otherwise it's a no-op. Bright flame tints (>1) still
    // read as hot via bloom.
    MID->SetScalarParameterValue(TEXT("Emissive"),  Emissive);
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

UStaticMeshComponent* AAbyssCasinoBuilder::SpawnTinted(const FString& Name, UStaticMesh* Mesh, const FVector& Loc, const FRotator& Rot, const FVector& Scale, const FLinearColor& Tint, float Metallic, float Roughness, float Emissive)
{
    UStaticMeshComponent* M = SpawnMesh(Name, Mesh, Loc, Rot, Scale, nullptr);
    ApplyTint(M, Tint, Metallic, Roughness, Emissive);
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
    // Marble floor: nearly-polished — Lumen bounces the warm table lamps
    // back up as low specular glints.
    SpawnTinted(TEXT("Floor"), PlaneMesh, FVector::ZeroVector, FRotator::ZeroRotator,
                FVector(R * 2.2f, R * 2.2f, 1.f), AbyssPalette::FloorMarble, 0.0f, 0.22f);
    // Ceiling: rough stone, swallows light.
    SpawnTinted(TEXT("Ceiling"), PlaneMesh, FVector(0, 0, ChamberHeight), FRotator(180, 0, 0),
                FVector(R * 2.2f, R * 2.2f, 1.f), AbyssPalette::CeilingStone, 0.0f, 0.95f);

    // Crown molding + skirting board — brass rings that catch light.
    for (int32 i = 0; i < 64; ++i)
    {
        const float A = (float)i / 64.f * PI * 2.f;
        const float X = FMath::Cos(A) * ChamberRadius * 0.99f;
        const float Y = FMath::Sin(A) * ChamberRadius * 0.99f;
        const float Yaw = A * 180.f / PI;
        SpawnTinted(FString::Printf(TEXT("Crown_%d"), i), CubeMesh,
                    FVector(X, Y, ChamberHeight - 15.f), FRotator(0, Yaw, 0),
                    FVector(0.65f, 0.18f, 0.12f), AbyssPalette::Brass, 0.9f, 0.25f);
        SpawnTinted(FString::Printf(TEXT("Skirt_%d"), i), CubeMesh,
                    FVector(X, Y, 8.f), FRotator(0, Yaw, 0),
                    FVector(0.65f, 0.14f, 0.08f), AbyssPalette::BrassDim, 0.85f, 0.35f);
    }
}

void AAbyssCasinoBuilder::BuildFloorTiles()
{
    // Radial brass inlays across the marble — 12 thin spokes fanning from
    // stage to walls. Costs nothing (engine batches), reads as "expensive
    // hotel lobby" at first glance.
    const int32 Spokes = 12;
    for (int32 i = 0; i < Spokes; ++i)
    {
        const float A = (float)i / Spokes * PI * 2.f;
        const FVector Pos(FMath::Cos(A) * ChamberRadius * 0.5f,
                          FMath::Sin(A) * ChamberRadius * 0.5f, 1.5f);
        const float Yaw = A * 180.f / PI;
        SpawnTinted(FString::Printf(TEXT("FloorSpoke_%d"), i), CubeMesh,
                    Pos, FRotator(0, Yaw, 0),
                    FVector(ChamberRadius / 100.f * 0.9f, 0.06f, 0.02f),
                    AbyssPalette::Brass, 1.0f, 0.18f);
    }
    // Concentric brass ring around the stage.
    const int32 RingSegs = 48;
    for (int32 i = 0; i < RingSegs; ++i)
    {
        const float A1 = (float)i / RingSegs * PI * 2.f;
        const float A2 = (float)(i + 1) / RingSegs * PI * 2.f;
        const float X1 = FMath::Cos(A1) * 750.f;
        const float Y1 = FMath::Sin(A1) * 750.f;
        const float X2 = FMath::Cos(A2) * 750.f;
        const float Y2 = FMath::Sin(A2) * 750.f;
        const float L = FMath::Sqrt(FMath::Square(X2 - X1) + FMath::Square(Y2 - Y1));
        const FVector Mid((X1 + X2) * 0.5f, (Y1 + Y2) * 0.5f, 2.f);
        const float Yaw = FMath::Atan2(Y2 - Y1, X2 - X1) * 180.f / PI;
        SpawnTinted(FString::Printf(TEXT("FloorRing_%d"), i), CubeMesh,
                    Mid, FRotator(0, Yaw, 0),
                    FVector(L / 100.f, 0.06f, 0.015f),
                    AbyssPalette::Brass, 1.0f, 0.18f);
    }
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
                    FVector(Len / 100.f, 0.2f, ChamberHeight / 100.f), WallTint, 0.02f, 0.75f);

        // Dado rail — horizontal brass molding at 1.1m
        SpawnTinted(FString::Printf(TEXT("Dado_%d"), i), CubeMesh, FVector(Mid.X, Mid.Y, 110.f),
                    FRotator(0, Yaw, 0),
                    FVector(Len / 100.f, 0.25f, 0.06f), AbyssPalette::Brass, 0.95f, 0.22f);
        // Picture rail at 2.4m
        SpawnTinted(FString::Printf(TEXT("PicRail_%d"), i), CubeMesh, FVector(Mid.X, Mid.Y, 240.f),
                    FRotator(0, Yaw, 0),
                    FVector(Len / 100.f, 0.25f, 0.04f), AbyssPalette::BrassDim, 0.9f, 0.3f);

        // Column: wood base, fluted shaft via scaled cylinder stack,
        // brass plinth + capital.
        SpawnTinted(FString::Printf(TEXT("ColBase_%d"), i), CubeMesh,
                    FVector(X1, Y1, 12.f), FRotator::ZeroRotator,
                    FVector(1.2f, 1.2f, 0.25f), AbyssPalette::BrassDim, 0.9f, 0.25f);
        SpawnTinted(FString::Printf(TEXT("Col_%d"), i), CylinderMesh,
                    FVector(X1, Y1, ChamberHeight * 0.5f), FRotator::ZeroRotator,
                    FVector(0.8f, 0.8f, ChamberHeight / 100.f * 0.9f), AbyssPalette::WallWarm,
                    0.05f, 0.55f);
        SpawnTinted(FString::Printf(TEXT("ColCap_%d"), i), CubeMesh,
                    FVector(X1, Y1, ChamberHeight - 30.f), FRotator::ZeroRotator,
                    FVector(1.0f, 1.0f, 0.3f), AbyssPalette::Brass, 1.0f, 0.18f);
        // Small sconce between every second column
        if (i % 2 == 0)
        {
            const FVector WallMid((FMath::Cos((A1+A2)*0.5f)) * (ChamberRadius - 15.f),
                                  (FMath::Sin((A1+A2)*0.5f)) * (ChamberRadius - 15.f),
                                  170.f);
            SpawnTinted(FString::Printf(TEXT("Sconce_%d"), i), SphereMesh,
                        WallMid, FRotator::ZeroRotator,
                        FVector(0.25f, 0.25f, 0.35f),
                        FLinearColor(4.0f, 2.1f, 0.7f, 1.f), 0.0f, 0.4f, 2.0f);
            SpawnPointLight(FString::Printf(TEXT("SconceLight_%d"), i),
                            WallMid, FLinearColor(1.0f, 0.72f, 0.42f), 1800.f, 420.f);
        }
    }
}

void AAbyssCasinoBuilder::BuildCentralStage()
{
    // Stage: brass rim + velvet top + 3-step base
    for (int32 s = 0; s < 3; ++s)
    {
        const float Sc = 6.8f - s * 0.25f;
        SpawnTinted(FString::Printf(TEXT("StageStep_%d"), s), CylinderMesh,
                    FVector(0, 0, 10.f + s * 12.f), FRotator::ZeroRotator,
                    FVector(Sc, Sc, 0.12f), AbyssPalette::Velvet, 0.0f, 0.9f);
    }
    SpawnTinted(TEXT("Stage"), CylinderMesh, FVector(0, 0, 52.f), FRotator::ZeroRotator,
                FVector(6.2f, 6.2f, 0.3f), AbyssPalette::Velvet, 0.0f, 0.95f);
    SpawnTinted(TEXT("StageRim"), CylinderMesh, FVector(0, 0, 65.f), FRotator::ZeroRotator,
                FVector(6.25f, 6.25f, 0.02f), AbyssPalette::Brass, 1.0f, 0.15f);

    // Urn: stacked cylinders giving a fluted silhouette
    SpawnTinted(TEXT("UrnFoot"), CylinderMesh, FVector(0, 0, 75.f), FRotator::ZeroRotator,
                FVector(1.0f, 1.0f, 0.12f), AbyssPalette::Brass, 1.0f, 0.18f);
    SpawnTinted(TEXT("StageUrn"), CylinderMesh, FVector(0, 0, 115.f), FRotator::ZeroRotator,
                FVector(0.8f, 0.8f, 1.1f), AbyssPalette::Brass, 1.0f, 0.28f);
    SpawnTinted(TEXT("UrnNeck"), CylinderMesh, FVector(0, 0, 210.f), FRotator::ZeroRotator,
                FVector(0.5f, 0.5f, 0.15f), AbyssPalette::Brass, 1.0f, 0.22f);

    // Flame — bright emissive cone, warm point light halo
    SpawnTinted(TEXT("StageFlame"), ConeMesh, FVector(0, 0, 250.f), FRotator::ZeroRotator,
                FVector(0.6f, 0.6f, 1.1f), AbyssPalette::FlameCore, 0.0f, 0.5f, 3.0f);

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

        // Three-part pedestal: brass foot, dark wood column, brass capital
        SpawnTinted(FString::Printf(TEXT("PedFoot_%d"), i), CylinderMesh,
                    FVector(X, Y, 8.f), FRotator::ZeroRotator,
                    FVector(1.7f, 1.7f, 0.08f), AbyssPalette::Brass, 1.0f, 0.2f);
        SpawnTinted(FString::Printf(TEXT("Ped_%d"), i), CylinderMesh,
                    FVector(X, Y, 45.f), FRotator::ZeroRotator,
                    FVector(1.5f, 1.5f, 0.42f), AbyssPalette::Wood, 0.0f, 0.45f);
        SpawnTinted(FString::Printf(TEXT("PedCap_%d"), i), CylinderMesh,
                    FVector(X, Y, 90.f), FRotator::ZeroRotator,
                    FVector(1.65f, 1.65f, 0.04f), AbyssPalette::Brass, 1.0f, 0.2f);
        // Felt — rough, absorbs light
        SpawnTinted(FString::Printf(TEXT("Top_%d"), i), CylinderMesh,
                    FVector(X, Y, 96.f), FRotator::ZeroRotator,
                    FVector(1.55f, 1.55f, 0.06f), FeltAccents[i], 0.0f, 0.95f);
        // Brass rim — polished mirror
        SpawnTinted(FString::Printf(TEXT("Rim_%d"), i), CylinderMesh,
                    FVector(X, Y, 104.f), FRotator::ZeroRotator,
                    FVector(1.6f, 1.6f, 0.015f), AbyssPalette::Brass, 1.0f, 0.12f);
        // Candlestick on the table
        const float CandleA = A + 0.4f;
        const FVector CandleP(X + FMath::Cos(CandleA) * 80.f, Y + FMath::Sin(CandleA) * 80.f, 108.f);
        SpawnTinted(FString::Printf(TEXT("CandleBase_%d"), i), CylinderMesh,
                    CandleP, FRotator::ZeroRotator,
                    FVector(0.15f, 0.15f, 0.04f), AbyssPalette::Brass, 1.0f, 0.2f);
        SpawnTinted(FString::Printf(TEXT("CandleStick_%d"), i), CylinderMesh,
                    CandleP + FVector(0, 0, 14.f), FRotator::ZeroRotator,
                    FVector(0.06f, 0.06f, 0.22f), FLinearColor(0.9f, 0.85f, 0.8f, 1.f), 0.0f, 0.6f);
        SpawnTinted(FString::Printf(TEXT("CandleFlame_%d"), i), ConeMesh,
                    CandleP + FVector(0, 0, 40.f), FRotator::ZeroRotator,
                    FVector(0.05f, 0.05f, 0.1f), AbyssPalette::FlameCore, 0.0f, 0.5f, 2.5f);
        SpawnPointLight(FString::Printf(TEXT("CandleLight_%d"), i),
                        CandleP + FVector(0, 0, 30.f),
                        FLinearColor(1.0f, 0.72f, 0.42f), 400.f, 180.f);

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
                    FVector(0.06f, 0.06f, 3.0f), AbyssPalette::Brass, 1.0f, 0.18f);
        SpawnTinted(FString::Printf(TEXT("ChandRing_%d"), i), CylinderMesh,
                    Base, FRotator::ZeroRotator,
                    FVector(2.4f, 2.4f, 0.08f), AbyssPalette::Brass, 1.0f, 0.18f);
        // Inner ring + cross arms — gives the chandelier real silhouette
        SpawnTinted(FString::Printf(TEXT("ChandInner_%d"), i), CylinderMesh,
                    Base + FVector(0, 0, -30.f), FRotator::ZeroRotator,
                    FVector(1.4f, 1.4f, 0.04f), AbyssPalette::Brass, 1.0f, 0.2f);
        for (int32 arm = 0; arm < 4; ++arm)
        {
            const float ArmA = (float)arm / 4.f * PI * 2.f;
            SpawnTinted(FString::Printf(TEXT("ChandArm_%d_%d"), i, arm), CubeMesh,
                        Base, FRotator(0, ArmA * 180.f / PI, 0),
                        FVector(2.2f, 0.06f, 0.04f), AbyssPalette::Brass, 1.0f, 0.2f);
        }
        // Central crystal drop
        SpawnTinted(FString::Printf(TEXT("ChandCrystal_%d"), i), SphereMesh,
                    Base + FVector(0, 0, -90.f), FRotator::ZeroRotator,
                    FVector(0.45f, 0.45f, 0.8f),
                    FLinearColor(2.5f, 1.8f, 0.8f, 1.f), 0.0f, 0.15f, 1.5f);

        for (int32 k = 0; k < 8; ++k)
        {
            const float A = (float)k / 8.f * PI * 2.f;
            const FVector CPos = Base + FVector(FMath::Cos(A) * 120.f, FMath::Sin(A) * 120.f, 18.f);
            SpawnTinted(FString::Printf(TEXT("ChandCandle_%d_%d"), i, k), CylinderMesh,
                        CPos, FRotator::ZeroRotator,
                        FVector(0.16f, 0.16f, 0.3f), AbyssPalette::BrassDim, 0.85f, 0.3f);
            SpawnTinted(FString::Printf(TEXT("ChandFlame_%d_%d"), i, k), ConeMesh,
                        CPos + FVector(0, 0, 24.f), FRotator::ZeroRotator,
                        FVector(0.12f, 0.12f, 0.18f), AbyssPalette::FlameCore, 0.0f, 0.5f, 2.8f);
        }

        SpawnPointLight(FString::Printf(TEXT("ChandLight_%d"), i),
                        Base, FLinearColor(1.0f, 0.76f, 0.48f), 6000.f, 1000.f);
    }
}

void AAbyssCasinoBuilder::BuildExitDoor()
{
    const float DoorZ = -ChamberRadius + 30.f;
    // Step + threshold
    SpawnTinted(TEXT("DoorStep"), CubeMesh, FVector(0, DoorZ + 6.f, 5.f), FRotator::ZeroRotator,
                FVector(3.2f, 0.6f, 0.1f), AbyssPalette::Brass, 1.0f, 0.2f);
    // Frame built as three cubes (header + two jambs) for silhouette
    SpawnTinted(TEXT("DoorHeader"), CubeMesh, FVector(0, DoorZ, 430.f), FRotator::ZeroRotator,
                FVector(3.0f, 0.5f, 0.3f), AbyssPalette::Brass, 1.0f, 0.18f);
    SpawnTinted(TEXT("DoorJambL"), CubeMesh, FVector(-140.f, DoorZ, 220.f), FRotator::ZeroRotator,
                FVector(0.3f, 0.5f, 4.2f), AbyssPalette::Brass, 1.0f, 0.18f);
    SpawnTinted(TEXT("DoorJambR"), CubeMesh, FVector( 140.f, DoorZ, 220.f), FRotator::ZeroRotator,
                FVector(0.3f, 0.5f, 4.2f), AbyssPalette::Brass, 1.0f, 0.18f);
    // Inner glow pane — emissive blue
    SpawnTinted(TEXT("DoorInner"), PlaneMesh, FVector(0, DoorZ + 8.f, 210.f), FRotator(90, 0, 0),
                FVector(2.4f, 4.0f, 1.f), AbyssPalette::DoorGlow, 0.0f, 0.6f, 3.5f);

    SpawnPointLight(TEXT("DoorLight"), FVector(0, DoorZ + 120.f, 250.f),
                    FLinearColor(0.35f, 0.75f, 1.0f), 8000.f, 900.f);
}

void AAbyssCasinoBuilder::BuildPaintings()
{
    // 8 wall-mounted painting placeholders (dark frames, muted canvases)
    // spaced between columns. Real imported art replaces the plane later.
    const int32 N = 8;
    const TArray<FLinearColor> Canvases = {
        FLinearColor(0.22f, 0.12f, 0.08f, 1.f),
        FLinearColor(0.08f, 0.14f, 0.22f, 1.f),
        FLinearColor(0.28f, 0.18f, 0.08f, 1.f),
        FLinearColor(0.12f, 0.08f, 0.20f, 1.f),
        FLinearColor(0.16f, 0.20f, 0.10f, 1.f),
        FLinearColor(0.24f, 0.10f, 0.16f, 1.f),
        FLinearColor(0.10f, 0.18f, 0.20f, 1.f),
        FLinearColor(0.20f, 0.16f, 0.10f, 1.f),
    };
    for (int32 i = 0; i < N; ++i)
    {
        const float A = (float)i / N * PI * 2.f + PI / N;
        const float X = FMath::Cos(A) * (ChamberRadius - 25.f);
        const float Y = FMath::Sin(A) * (ChamberRadius - 25.f);
        const float Yaw = A * 180.f / PI + 90.f;
        // Outer frame — brass, fat
        SpawnTinted(FString::Printf(TEXT("PaintFrame_%d"), i), CubeMesh,
                    FVector(X, Y, 175.f), FRotator(0, Yaw, 0),
                    FVector(0.12f, 1.7f, 1.25f), AbyssPalette::Brass, 1.0f, 0.25f);
        // Canvas plane inset
        SpawnTinted(FString::Printf(TEXT("PaintCanvas_%d"), i), CubeMesh,
                    FVector(X - FMath::Cos(A) * 6.f, Y - FMath::Sin(A) * 6.f, 175.f),
                    FRotator(0, Yaw, 0),
                    FVector(0.04f, 1.5f, 1.05f), Canvases[i], 0.0f, 0.75f);
        // Picture lamp above
        SpawnTinted(FString::Printf(TEXT("PaintLamp_%d"), i), CylinderMesh,
                    FVector(X - FMath::Cos(A) * 10.f, Y - FMath::Sin(A) * 10.f, 240.f),
                    FRotator(0, Yaw + 90.f, 0),
                    FVector(0.6f, 0.15f, 0.08f), AbyssPalette::Brass, 1.0f, 0.22f);
        SpawnPointLight(FString::Printf(TEXT("PaintLight_%d"), i),
                        FVector(X - FMath::Cos(A) * 20.f, Y - FMath::Sin(A) * 20.f, 220.f),
                        FLinearColor(1.0f, 0.78f, 0.5f), 800.f, 250.f);
    }
}

void AAbyssCasinoBuilder::BuildChipStacks()
{
    // Small chip stacks distributed around each table. Disc colors rotate
    // per chip denomination (red/blue/green/black/white).
    const TArray<FLinearColor> ChipColors = {
        FLinearColor(0.42f, 0.04f, 0.05f, 1.f),
        FLinearColor(0.05f, 0.06f, 0.35f, 1.f),
        FLinearColor(0.05f, 0.30f, 0.08f, 1.f),
        FLinearColor(0.02f, 0.02f, 0.03f, 1.f),
        FLinearColor(0.85f, 0.82f, 0.76f, 1.f),
    };
    const int32 Count = 7;
    for (int32 i = 0; i < Count; ++i)
    {
        const float A = (float)i / Count * PI * 2.f + PI * 0.1f;
        const float X = FMath::Cos(A) * TableRing;
        const float Y = FMath::Sin(A) * TableRing;
        for (int32 stack = 0; stack < 3; ++stack)
        {
            const float StackA = A + (stack - 1) * 0.25f;
            const float Rad = 65.f;
            const FVector StackBase(X + FMath::Cos(StackA + PI * 0.5f) * Rad,
                                    Y + FMath::Sin(StackA + PI * 0.5f) * Rad,
                                    103.f);
            const int32 Height = 4 + (i + stack) % 4;
            for (int32 c = 0; c < Height; ++c)
            {
                const FLinearColor ChipC = ChipColors[(i + stack + c) % ChipColors.Num()];
                SpawnTinted(FString::Printf(TEXT("Chip_%d_%d_%d"), i, stack, c), CylinderMesh,
                            StackBase + FVector(0, 0, c * 2.8f), FRotator::ZeroRotator,
                            FVector(0.22f, 0.22f, 0.012f),
                            ChipC, 0.0f, 0.6f);
            }
        }
    }
}

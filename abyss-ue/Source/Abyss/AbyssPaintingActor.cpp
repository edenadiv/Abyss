#include "AbyssPaintingActor.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInterface.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/StaticMesh.h"
#include "Engine/Texture2D.h"
#include "UObject/ConstructorHelpers.h"

AAbyssPaintingActor::AAbyssPaintingActor()
{
    PrimaryActorTick.bCanEverTick = false;

    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeF(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> PlaneF(TEXT("/Engine/BasicShapes/Plane.Plane"));
    if (CubeF.Succeeded())  CubeMesh  = CubeF.Object;
    if (PlaneF.Succeeded()) PlaneMesh = PlaneF.Object;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);
}

void AAbyssPaintingActor::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    // Rebuild so edits in the editor repopulate the frame.
    for (UStaticMeshComponent* M : FrameBars) if (M) M->DestroyComponent();
    FrameBars.Reset();
    if (Canvas) { Canvas->DestroyComponent(); Canvas = nullptr; }
    RebuildFrame();
}

void AAbyssPaintingActor::BeginPlay()
{
    Super::BeginPlay();
    LoadPaintingTexture();
}

void AAbyssPaintingActor::RebuildFrame()
{
    if (!PlaneMesh || !CubeMesh) return;
    const float W = Width;
    const float H = Width * Aspect;

    Canvas = NewObject<UStaticMeshComponent>(this, TEXT("Canvas"));
    Canvas->SetupAttachment(RootComponent);
    Canvas->RegisterComponent();
    Canvas->SetStaticMesh(PlaneMesh);
    Canvas->SetRelativeScale3D(FVector(W / 100.f, H / 100.f, 1.f));
    Canvas->SetRelativeRotation(FRotator(90, 0, 0));
    if (CanvasMat) Canvas->SetMaterial(0, CanvasMat);

    // Brass frame — 4 bars
    const float T = 9.f, D = 6.f;
    const TArray<TTuple<FVector, FVector>> Bars = {
        { FVector(0, 0,  H * 0.5f + T * 0.5f), FVector((W + T * 2) / 100.f, T / 100.f, D / 100.f) }, // top
        { FVector(0, 0, -H * 0.5f - T * 0.5f), FVector((W + T * 2) / 100.f, T / 100.f, D / 100.f) }, // bottom
        { FVector(0, -W * 0.5f - T * 0.5f, 0), FVector(T / 100.f, H / 100.f, D / 100.f) },            // left
        { FVector(0,  W * 0.5f + T * 0.5f, 0), FVector(T / 100.f, H / 100.f, D / 100.f) },            // right
    };
    for (const auto& Pair : Bars)
    {
        UStaticMeshComponent* M = NewObject<UStaticMeshComponent>(this);
        M->SetupAttachment(RootComponent);
        M->RegisterComponent();
        M->SetStaticMesh(CubeMesh);
        M->SetRelativeLocation(Pair.Get<0>() + FVector(-D * 0.1f, 0, 0));
        M->SetRelativeScale3D(Pair.Get<1>());
        if (BrassMat) M->SetMaterial(0, BrassMat);
        FrameBars.Add(M);
    }
}

void AAbyssPaintingActor::LoadPaintingTexture()
{
    if (!Canvas || Slug.IsEmpty()) return;
    const FString Path = FString::Printf(TEXT("/Game/Art/T_%s.T_%s"), *Slug, *Slug);
    if (UTexture2D* Tex = LoadObject<UTexture2D>(nullptr, *Path))
    {
        CanvasMID = Canvas->CreateAndSetMaterialInstanceDynamic(0);
        if (CanvasMID) CanvasMID->SetTextureParameterValue(TEXT("Painting"), Tex);
    }
    else
    {
        UE_LOG(LogTemp, Log, TEXT("[Painting] %s not found at %s — showing placeholder material"), *Slug, *Path);
    }
}

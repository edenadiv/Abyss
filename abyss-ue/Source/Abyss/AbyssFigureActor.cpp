#include "AbyssFigureActor.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInterface.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/Texture2D.h"
#include "UObject/ConstructorHelpers.h"

AAbyssFigureActor::AAbyssFigureActor()
{
    PrimaryActorTick.bCanEverTick = false;
    static ConstructorHelpers::FObjectFinder<UStaticMesh> PlaneF(TEXT("/Engine/BasicShapes/Plane.Plane"));
    if (PlaneF.Succeeded()) PlaneMesh = PlaneF.Object;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);
}

void AAbyssFigureActor::BeginPlay()
{
    Super::BeginPlay();
    if (!PlaneMesh) return;

    Plane = NewObject<UStaticMeshComponent>(this, TEXT("Plane"));
    Plane->SetupAttachment(RootComponent);
    Plane->RegisterComponent();
    Plane->SetStaticMesh(PlaneMesh);
    // Billboard facing +X (will be rotated by Yaw to face camera later via Blueprint)
    Plane->SetRelativeScale3D(FVector(Width / 100.f, Height / 100.f, 1.f));
    Plane->SetRelativeRotation(FRotator(90, 0, 0));
    if (FigureMat) Plane->SetMaterial(0, FigureMat);
    MID = Plane->CreateAndSetMaterialInstanceDynamic(0);

    SetOutfitTier(EAbyssOutfitTier::Soft);
}

UTexture2D* AAbyssFigureActor::LoadTierTexture(EAbyssOutfitTier Tier) const
{
    const FString Suffix = (Tier == EAbyssOutfitTier::Chain) ? TEXT("chain")
                         : (Tier == EAbyssOutfitTier::Teeth) ? TEXT("teeth")
                         : (Tier == EAbyssOutfitTier::Hero)  ? TEXT("hero")
                         : TEXT("soft");

    // Try /Game/Characters/T_<figure>_<tier>.T_<figure>_<tier>
    const FString Path = FString::Printf(TEXT("/Game/Characters/T_%s_%s.T_%s_%s"),
        *FigureId, *Suffix, *FigureId, *Suffix);
    if (UTexture2D* Tex = LoadObject<UTexture2D>(nullptr, *Path)) return Tex;

    // Fall back to a painting slug (full figure already present in the source art)
    if (!FallbackPaintingSlug.IsEmpty())
    {
        const FString FallPath = FString::Printf(TEXT("/Game/Art/T_%s.T_%s"),
            *FallbackPaintingSlug, *FallbackPaintingSlug);
        if (UTexture2D* Tex = LoadObject<UTexture2D>(nullptr, *FallPath)) return Tex;
    }
    return nullptr;
}

void AAbyssFigureActor::SetOutfitTier(EAbyssOutfitTier Tier)
{
    if (!MID) return;
    UTexture2D* Tex = LoadTierTexture(Tier);
    if (Tex) MID->SetTextureParameterValue(TEXT("Figure"), Tex);
    else UE_LOG(LogTemp, Log, TEXT("[Figure %s] no texture found for tier — keeping current"), *FigureId);
}

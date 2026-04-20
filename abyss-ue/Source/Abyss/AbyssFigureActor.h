#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "AbyssTypes.h"
#include "AbyssFigureActor.generated.h"

class UStaticMeshComponent;
class UMaterialInstanceDynamic;
class UTexture2D;

/* AAbyssFigureActor — painted-sprite billboard NPC. Attach a figure id
   ("siren", "mirror", "gambler", "muse", "charmkeeper", "merchant",
   "confessor") and the actor swaps textures based on the house-edge
   outfit tier. Falls back to the figure's `paintingSlug` if a baked
   character sprite isn't available yet. */

UCLASS(Blueprintable)
class ABYSS_API AAbyssFigureActor : public AActor
{
    GENERATED_BODY()

public:
    AAbyssFigureActor();
    virtual void BeginPlay() override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") FString FigureId = TEXT("gambler");
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") FString FallbackPaintingSlug = TEXT("cardplayers");
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") float Width  = 200.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") float Height = 480.f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UStaticMesh* PlaneMesh;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UMaterialInterface* FigureMat;

    UFUNCTION(BlueprintCallable, Category="Abyss")
    void SetOutfitTier(EAbyssOutfitTier Tier);

private:
    UPROPERTY() UStaticMeshComponent* Plane;
    UPROPERTY() UMaterialInstanceDynamic* MID;

    UTexture2D* LoadTierTexture(EAbyssOutfitTier Tier) const;
};

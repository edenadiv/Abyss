#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "AbyssPaintingActor.generated.h"

class UStaticMeshComponent;
class UMaterialInstanceDynamic;
class UTexture2D;

/* AAbyssPaintingActor — brass frame + plane carrying a painting texture.

   Drop one of these in the level, set `Slug` to one of the 22 painting
   slugs (e.g. "mermaid", "ulysses-sirens"), and the actor builds frame
   geometry from engine primitives + auto-loads /Game/Art/T_<Slug>.uasset
   if it exists. If the texture hasn't been imported yet, the frame still
   renders with a dark placeholder so the scene reads. */

UCLASS(Blueprintable)
class ABYSS_API AAbyssPaintingActor : public AActor
{
    GENERATED_BODY()

public:
    AAbyssPaintingActor();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void BeginPlay() override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") FString Slug = TEXT("mermaid");
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") float Width  = 220.f;   // UE units (cm)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") float Aspect = 1.3f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UStaticMesh* CubeMesh;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UStaticMesh* PlaneMesh;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UMaterialInterface* BrassMat;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Abyss") UMaterialInterface* CanvasMat;

private:
    UPROPERTY() UStaticMeshComponent* Canvas;
    UPROPERTY() TArray<UStaticMeshComponent*> FrameBars;
    UPROPERTY() UMaterialInstanceDynamic* CanvasMID;

    void RebuildFrame();
    void LoadPaintingTexture();
};

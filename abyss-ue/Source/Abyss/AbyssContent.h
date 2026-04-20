#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "AbyssTypes.h"
#include "AbyssContent.generated.h"

/* Content subsystem — loads data from ThirdParty/data/*.json at startup.
   Blueprints and other C++ modules pull fragments / trinkets / endings
   from here by id, so nothing else needs to know about JSON paths. */

UCLASS()
class ABYSS_API UAbyssContent : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category="Abyss")
    const TArray<FAbyssFragment>& GetFragments() const { return Fragments; }

    UFUNCTION(BlueprintCallable, Category="Abyss")
    const TArray<FAbyssTrinket>& GetTrinkets() const { return Trinkets; }

    UFUNCTION(BlueprintCallable, Category="Abyss")
    const TArray<FAbyssTable>& GetTables() const { return Tables; }

    UFUNCTION(BlueprintCallable, Category="Abyss")
    const TArray<FAbyssEndingCard>& GetEndings() const { return Endings; }

    UFUNCTION(BlueprintCallable, Category="Abyss")
    FAbyssFragment FindFragment(const FString& Id) const;

    UFUNCTION(BlueprintCallable, Category="Abyss")
    FAbyssTrinket FindTrinket(const FString& Id) const;

    UFUNCTION(BlueprintCallable, Category="Abyss")
    FAbyssEndingCard FindEnding(EAbyssEndingKind Kind) const;

    /* House-edge curve — mirrors abyss-desktop/src/content/house-edge.ts. */
    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss")
    static EAbyssTier EffectiveHouseEdge(EAbyssTier BaseTier, int32 HandsPlayed);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss")
    static float EdgeBias(EAbyssTier Tier);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss")
    static EAbyssOutfitTier OutfitForTier(EAbyssTier Tier);

private:
    UPROPERTY() TArray<FAbyssFragment> Fragments;
    UPROPERTY() TArray<FAbyssTrinket> Trinkets;
    UPROPERTY() TArray<FAbyssTable> Tables;
    UPROPERTY() TArray<FAbyssEndingCard> Endings;

    void LoadFromJson();
    bool LoadJsonFile(const FString& FileName, FString& OutContents) const;
};

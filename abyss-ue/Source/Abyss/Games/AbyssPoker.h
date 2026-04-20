#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssDeck.h"
#include "AbyssPoker.generated.h"

UENUM(BlueprintType)
enum class EAbyssPokerPhase : uint8
{
    Ante   UMETA(DisplayName="Ante"),
    Deal   UMETA(DisplayName="Deal"),
    Draw   UMETA(DisplayName="Draw"),
    Showdown UMETA(DisplayName="Showdown"),
    Done   UMETA(DisplayName="Done"),
};

USTRUCT(BlueprintType)
struct FAbyssPokerState
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) EAbyssPokerPhase Phase = EAbyssPokerPhase::Ante;
    UPROPERTY(BlueprintReadOnly) int32 Ante = 0;
    UPROPERTY(BlueprintReadOnly) TArray<FAbyssCard> Hand;
    UPROPERTY(BlueprintReadOnly) TArray<FAbyssCard> Dealer;
    UPROPERTY(BlueprintReadOnly) FAbyssPokerResult PlayerRank;
    UPROPERTY(BlueprintReadOnly) FAbyssPokerResult DealerRank;
    UPROPERTY(BlueprintReadOnly) int32 LastDelta = 0;
    UPROPERTY(BlueprintReadOnly) FString Outcome;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssPoker : public UObject
{
    GENERATED_BODY()

public:
    /* Simplified 5-card draw vs a ghost dealer. Ante → deal both hands →
       player chooses which indices to discard → replace → showdown. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Poker")
    void Reset();

    UFUNCTION(BlueprintCallable, Category="Abyss|Poker")
    bool PlaceAnte(int32 Amount);

    UFUNCTION(BlueprintCallable, Category="Abyss|Poker")
    void Deal();

    UFUNCTION(BlueprintCallable, Category="Abyss|Poker")
    void Draw(const TArray<int32>& DiscardIndices);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Poker")
    const FAbyssPokerState& GetState() const { return State; }

private:
    UPROPERTY() TArray<FAbyssCard> Deck;
    UPROPERTY() FAbyssPokerState State;

    void Showdown();
};

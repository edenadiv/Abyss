#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssDeck.h"
#include "AbyssBlackjack.generated.h"

UENUM(BlueprintType)
enum class EAbyssBJPhase : uint8
{
    Bet     UMETA(DisplayName="Place Bet"),
    Play    UMETA(DisplayName="Player Turn"),
    Dealer  UMETA(DisplayName="Dealer Turn"),
    Done    UMETA(DisplayName="Hand Over"),
};

UENUM(BlueprintType)
enum class EAbyssBJOutcome : uint8
{
    Pending     UMETA(DisplayName="Pending"),
    Blackjack   UMETA(DisplayName="Blackjack"),
    Win         UMETA(DisplayName="Win"),
    Push        UMETA(DisplayName="Push"),
    Lose        UMETA(DisplayName="Lose"),
    Bust        UMETA(DisplayName="Bust"),
};

USTRUCT(BlueprintType)
struct FAbyssBJState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) EAbyssBJPhase Phase = EAbyssBJPhase::Bet;
    UPROPERTY(BlueprintReadOnly) TArray<FAbyssCard> Player;
    UPROPERTY(BlueprintReadOnly) TArray<FAbyssCard> Dealer;
    UPROPERTY(BlueprintReadOnly) int32 Bet = 0;
    UPROPERTY(BlueprintReadOnly) EAbyssBJOutcome Outcome = EAbyssBJOutcome::Pending;
    UPROPERTY(BlueprintReadOnly) int32 LastDelta = 0;
};

/* Blackjack engine — pure state machine. Blueprint widgets observe the
   state and drive UI, but all rule logic lives here so the game is
   deterministic, testable, and independent of UI code. */
UCLASS(BlueprintType)
class ABYSS_API UAbyssBlackjack : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    void Reset();

    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    bool PlaceBet(int32 Amount);

    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    void Deal();

    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    void Hit();

    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    void Stand();

    UFUNCTION(BlueprintCallable, Category="Abyss|Blackjack")
    void AdvanceDealer();

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Blackjack")
    const FAbyssBJState& GetState() const { return State; }

private:
    UPROPERTY() TArray<FAbyssCard> Deck;
    UPROPERTY() FAbyssBJState State;

    void Finish(EAbyssBJOutcome Outcome);
};

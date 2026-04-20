#pragma once

#include "CoreMinimal.h"
#include "AbyssDeck.generated.h"

UENUM(BlueprintType)
enum class EAbyssSuit : uint8
{
    Spades   UMETA(DisplayName="♠"),
    Hearts   UMETA(DisplayName="♥"),
    Diamonds UMETA(DisplayName="♦"),
    Clubs    UMETA(DisplayName="♣"),
};

USTRUCT(BlueprintType)
struct FAbyssCard
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Rank;   // "A" | "2..10" | "J" | "Q" | "K"
    UPROPERTY(EditAnywhere, BlueprintReadOnly) EAbyssSuit Suit = EAbyssSuit::Spades;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bRed = false;
};

UENUM(BlueprintType)
enum class EAbyssPokerRank : uint8
{
    High          UMETA(DisplayName="High card"),
    Pair          UMETA(DisplayName="Pair"),
    TwoPair       UMETA(DisplayName="Two pair"),
    Trips         UMETA(DisplayName="Three of a kind"),
    Straight      UMETA(DisplayName="Straight"),
    Flush         UMETA(DisplayName="Flush"),
    FullHouse     UMETA(DisplayName="Full house"),
    Quads         UMETA(DisplayName="Four of a kind"),
    StraightFlush UMETA(DisplayName="Straight flush"),
};

USTRUCT(BlueprintType)
struct FAbyssPokerResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) EAbyssPokerRank Rank = EAbyssPokerRank::High;
    UPROPERTY(BlueprintReadOnly) int32 Score = 0;
    UPROPERTY(BlueprintReadOnly) FString Name;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssDeck : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Deck")
    static TArray<FAbyssCard> BuildDeck(int32 DeckCount = 1);

    UFUNCTION(BlueprintCallable, Category="Abyss|Deck")
    static void Shuffle(UPARAM(ref) TArray<FAbyssCard>& Cards);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Deck")
    static int32 CardValue(const FAbyssCard& Card);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Deck")
    static int32 HandValue(const TArray<FAbyssCard>& Cards);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Deck")
    static FAbyssPokerResult PokerEvaluate(const TArray<FAbyssCard>& Hand);
};

#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssBaccarat.generated.h"

UENUM(BlueprintType)
enum class EAbyssBacBet : uint8
{
    Player UMETA(DisplayName="Player"),
    Banker UMETA(DisplayName="Banker"),
    Tie    UMETA(DisplayName="Tie"),
};

USTRUCT(BlueprintType)
struct FAbyssBacResult
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) EAbyssBacBet Outcome = EAbyssBacBet::Player;
    UPROPERTY(BlueprintReadOnly) int32 Delta = 0;
    UPROPERTY(BlueprintReadOnly) int32 PlayerScore = 0;
    UPROPERTY(BlueprintReadOnly) int32 BankerScore = 0;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssBaccarat : public UObject
{
    GENERATED_BODY()

public:
    /* Simplified baccarat — models the actual Punto-Banco distribution
       without dealing cards. Payouts: Player 1:1, Banker 0.95:1 (house
       commission), Tie 8:1. EdgeBias shifts player odds. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Baccarat")
    static FAbyssBacResult Play(EAbyssBacBet Bet, int32 Amount, float EdgeBias);
};

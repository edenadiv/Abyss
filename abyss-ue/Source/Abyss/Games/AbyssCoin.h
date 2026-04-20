#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssCoin.generated.h"

UENUM(BlueprintType)
enum class EAbyssCoinFace : uint8
{
    Heads UMETA(DisplayName="Heads"),
    Tails UMETA(DisplayName="Tails"),
};

USTRUCT(BlueprintType)
struct FAbyssCoinResult
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) EAbyssCoinFace Actual = EAbyssCoinFace::Heads;
    UPROPERTY(BlueprintReadOnly) bool bWon = false;
    UPROPERTY(BlueprintReadOnly) int32 Delta = 0;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssCoin : public UObject
{
    GENERATED_BODY()

public:
    /* Flip. EdgeBias > 1 means player-friendly; < 1 means house-favored. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Coin")
    static FAbyssCoinResult Flip(EAbyssCoinFace Call, int32 Bet, float EdgeBias);
};

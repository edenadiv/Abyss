#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssDice.generated.h"

UENUM(BlueprintType)
enum class EAbyssDiceCall : uint8
{
    Under7 UMETA(DisplayName="Under 7"),
    Seven  UMETA(DisplayName="Exactly 7"),
    Over7  UMETA(DisplayName="Over 7"),
};

USTRUCT(BlueprintType)
struct FAbyssDiceResult
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) int32 Die1 = 1;
    UPROPERTY(BlueprintReadOnly) int32 Die2 = 1;
    UPROPERTY(BlueprintReadOnly) int32 Total = 2;
    UPROPERTY(BlueprintReadOnly) bool bWon = false;
    UPROPERTY(BlueprintReadOnly) int32 Delta = 0;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssDice : public UObject
{
    GENERATED_BODY()

public:
    /* Two six-sided dice. Under 7 (2-6): 1:1. Seven: 4:1. Over 7 (8-12): 1:1. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Dice")
    static FAbyssDiceResult Roll(EAbyssDiceCall Call, int32 Bet);
};

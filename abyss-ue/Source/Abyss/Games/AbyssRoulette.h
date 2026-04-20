#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssRoulette.generated.h"

UENUM(BlueprintType)
enum class EAbyssRouletteBetKind : uint8
{
    Red    UMETA(DisplayName="Red"),
    Black  UMETA(DisplayName="Black"),
    Odd    UMETA(DisplayName="Odd"),
    Even   UMETA(DisplayName="Even"),
    Low    UMETA(DisplayName="1-18"),
    High   UMETA(DisplayName="19-36"),
    Number UMETA(DisplayName="Single number"),
};

USTRUCT(BlueprintType)
struct FAbyssRouletteBet
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) EAbyssRouletteBetKind Kind = EAbyssRouletteBetKind::Red;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Number = 0;     // 0-36, used when Kind == Number
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Amount = 0;
};

USTRUCT(BlueprintType)
struct FAbyssRouletteResult
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) int32 Landed = 0;
    UPROPERTY(BlueprintReadOnly) bool bRed = false;
    UPROPERTY(BlueprintReadOnly) bool bEven = false;
    UPROPERTY(BlueprintReadOnly) int32 Delta = 0;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssRoulette : public UObject
{
    GENERATED_BODY()

public:
    /* European wheel (single 0). Spin resolves all bets and returns the
       net delta + landed number for the UI to show. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Roulette")
    static FAbyssRouletteResult Spin(const TArray<FAbyssRouletteBet>& Bets);

    UFUNCTION(BlueprintCallable, BlueprintPure, Category="Abyss|Roulette")
    static bool IsRed(int32 Number);
};

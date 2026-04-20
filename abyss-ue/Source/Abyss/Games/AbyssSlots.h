#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "AbyssSlots.generated.h"

UENUM(BlueprintType)
enum class EAbyssGlyph : uint8
{
    Eye     UMETA(DisplayName="𓂀 Eye"),
    Wave    UMETA(DisplayName="〰 Wave"),
    Crown   UMETA(DisplayName="♛ Crown"),
    Key     UMETA(DisplayName="⚷ Key"),
    Skull   UMETA(DisplayName="☠ Skull"),
    Star    UMETA(DisplayName="✦ Star"),
};

USTRUCT(BlueprintType)
struct FAbyssSlotsResult
{
    GENERATED_BODY()
    UPROPERTY(BlueprintReadOnly) EAbyssGlyph Reel1 = EAbyssGlyph::Eye;
    UPROPERTY(BlueprintReadOnly) EAbyssGlyph Reel2 = EAbyssGlyph::Eye;
    UPROPERTY(BlueprintReadOnly) EAbyssGlyph Reel3 = EAbyssGlyph::Eye;
    UPROPERTY(BlueprintReadOnly) bool bWon = false;
    UPROPERTY(BlueprintReadOnly) int32 Delta = 0;
    UPROPERTY(BlueprintReadOnly) FString Label;
};

UCLASS(BlueprintType)
class ABYSS_API UAbyssSlots : public UObject
{
    GENERATED_BODY()

public:
    /* Three-reel slot. Triple match: 10× bet. Any pair: break-even.
       Otherwise: lose. EdgeBias bends the "any pair" frequency. */
    UFUNCTION(BlueprintCallable, Category="Abyss|Slots")
    static FAbyssSlotsResult Pull(int32 Bet, float EdgeBias);
};

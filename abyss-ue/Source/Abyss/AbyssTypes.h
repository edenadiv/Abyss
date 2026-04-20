#pragma once

#include "CoreMinimal.h"
#include "AbyssTypes.generated.h"

/* Mirror of abyss-desktop/src/types.ts enums. UE serialization-friendly. */

UENUM(BlueprintType)
enum class EAbyssTier : uint8
{
    Easy    UMETA(DisplayName="Easy"),
    Normal  UMETA(DisplayName="Normal"),
    Hard    UMETA(DisplayName="Hard"),
    Rigged  UMETA(DisplayName="Rigged"),
    Cruel   UMETA(DisplayName="Cruel"),
};

UENUM(BlueprintType)
enum class EAbyssOutfitTier : uint8
{
    Soft    UMETA(DisplayName="Soft"),
    Chain   UMETA(DisplayName="Chain"),
    Teeth   UMETA(DisplayName="Teeth"),
    Hero    UMETA(DisplayName="Hero"),
};

UENUM(BlueprintType)
enum class EAbyssEndingKind : uint8
{
    Drown       UMETA(DisplayName="Drown"),
    Escape      UMETA(DisplayName="Escape"),
    House       UMETA(DisplayName="House"),
    Ghost       UMETA(DisplayName="Ghost"),
    Revelation  UMETA(DisplayName="Revelation"),
    Mirror      UMETA(DisplayName="Mirror"),
    Sovereign   UMETA(DisplayName="Sovereign"),
    WalkAway    UMETA(DisplayName="Walk Away"),
};

UENUM(BlueprintType)
enum class EAbyssTableKey : uint8
{
    Blackjack   UMETA(DisplayName="Blackjack"),
    Roulette    UMETA(DisplayName="Omens Wheel"),
    Baccarat    UMETA(DisplayName="Baccarat"),
    Slots       UMETA(DisplayName="Glyphs"),
    Poker       UMETA(DisplayName="Ghost Poker"),
    Dice        UMETA(DisplayName="Bones"),
    Coin        UMETA(DisplayName="The Coin"),
};

USTRUCT(BlueprintType)
struct FAbyssFragment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Id;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Title;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Kind;      // photo | paper | metal | glass
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FLinearColor Color;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FLinearColor Emissive;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FVector Position;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Line;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Narrative;
};

USTRUCT(BlueprintType)
struct FAbyssTrinket
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Id;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Name;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Desc;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Cost = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Charges = 0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Effect;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FLinearColor Color;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bCursed = false;
};

USTRUCT(BlueprintType)
struct FAbyssOwnedTrinket
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Id;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Charges = 0;
};

USTRUCT(BlueprintType)
struct FAbyssTable
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) EAbyssTableKey Key = EAbyssTableKey::Blackjack;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Name;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Icon;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Desc;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 MinBet = 5;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FLinearColor Accent;
};

USTRUCT(BlueprintType)
struct FAbyssEndingCard
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly) EAbyssEndingKind Id = EAbyssEndingKind::Drown;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Label;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString Hint;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString PaintingSlug;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FString ClosingLine;
};

USTRUCT(BlueprintType)
struct FAbyssPlayerMeta
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Deaths = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 TotalRuns = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 HandsPlayedEver = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 BreathsSurrendered = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MaxBreathEver = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FString> FragmentsEverFound;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<EAbyssEndingKind> EndingsReached;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHasSeenRevelation = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHasSeenMirror = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHasSeenGhost = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bCreditsSeen = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 LastDeathAt = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString PlayerName;
};

USTRUCT(BlueprintType)
struct FAbyssRunState
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Breath = 200;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 GamesPlayed = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) EAbyssTier Tier = EAbyssTier::Easy;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) EAbyssOutfitTier OutfitTier = EAbyssOutfitTier::Soft;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString WorldRoom = TEXT("casino");
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bLockedIn = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FString> Fragments;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FAbyssOwnedTrinket> Trinkets;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FAbyssPlayerMeta Meta;
};

USTRUCT(BlueprintType)
struct FAbyssSettings
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Quality = TEXT("high");
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float RenderScale = 1.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float MasterVolume = 0.8f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float MusicVolume = 0.7f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float SfxVolume = 0.9f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float VoiceVolume = 0.9f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float MouseSensitivity = 1.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bInvertY = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float FieldOfView = 76.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bShowFps = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bCaptions = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bReduceMotion = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Colorblind = TEXT("off");
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHeadBob = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHardRoguelike = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 ActiveSlot = 1;
};

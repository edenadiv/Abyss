#include "AbyssGameInstance.h"
#include "AbyssSaveGame.h"
#include "AbyssContent.h"
#include "AbyssSteam.h"
#include "Kismet/GameplayStatics.h"

static constexpr int32 TARGET_BREATH = 500;

void UAbyssGameInstance::Init()
{
    Super::Init();
    LoadSettings();
    ActiveSlot = Settings.ActiveSlot;
    // Hydrate the active slot so Continue lands on the right run.
    LoadSlot(ActiveSlot);
    RecomputeTierOutfit();
    FAbyssSteam::Init();
}

void UAbyssGameInstance::Shutdown()
{
    FAbyssSteam::Shutdown();
    Super::Shutdown();
}

TArray<int32> UAbyssGameInstance::GetExistingSlots() const
{
    TArray<int32> Out;
    for (int32 N = 1; N <= 3; ++N)
    {
        if (UGameplayStatics::DoesSaveGameExist(UAbyssSaveGame::SlotNameFor(N), 0)) Out.Add(N);
    }
    return Out;
}

bool UAbyssGameInstance::HasSaveInSlot(int32 Slot) const
{
    return UGameplayStatics::DoesSaveGameExist(UAbyssSaveGame::SlotNameFor(Slot), 0);
}

bool UAbyssGameInstance::LoadSlot(int32 Slot)
{
    ActiveSlot = Slot;
    Settings.ActiveSlot = Slot;
    SaveSettings();
    USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(UAbyssSaveGame::SlotNameFor(Slot), 0);
    UAbyssSaveGame* S = Cast<UAbyssSaveGame>(Loaded);
    if (!S)
    {
        Run = FAbyssRunState();
        return false;
    }
    Run = S->Run;
    RecomputeTierOutfit();
    return true;
}

void UAbyssGameInstance::NewRun(int32 Slot)
{
    ActiveSlot = Slot;
    DeleteSlot(Slot);
    Run = FAbyssRunState();
    Run.Meta.TotalRuns = 1;
    RecomputeTierOutfit();
    Settings.ActiveSlot = Slot;
    SaveSettings();
    PersistRun();
}

void UAbyssGameInstance::PersistRun()
{
    UAbyssSaveGame* S = Cast<UAbyssSaveGame>(UGameplayStatics::CreateSaveGameObject(UAbyssSaveGame::StaticClass()));
    if (!S) return;
    S->Run = Run;
    S->UpdatedAt = FDateTime::UtcNow().ToUnixTimestamp();
    UGameplayStatics::SaveGameToSlot(S, UAbyssSaveGame::SlotNameFor(ActiveSlot), 0);
}

void UAbyssGameInstance::DeleteSlot(int32 Slot)
{
    UGameplayStatics::DeleteGameInSlot(UAbyssSaveGame::SlotNameFor(Slot), 0);
}

void UAbyssGameInstance::ApplySettings(const FAbyssSettings& NewSettings)
{
    Settings = NewSettings;
    SaveSettings();
}

void UAbyssGameInstance::LoadSettings()
{
    USaveGame* Loaded = UGameplayStatics::LoadGameFromSlot(UAbyssSaveGame::SettingsSlotName(), 0);
    UAbyssSettingsSave* S = Cast<UAbyssSettingsSave>(Loaded);
    if (S) Settings = S->Settings;
}

void UAbyssGameInstance::SaveSettings()
{
    UAbyssSettingsSave* S = Cast<UAbyssSettingsSave>(UGameplayStatics::CreateSaveGameObject(UAbyssSettingsSave::StaticClass()));
    if (!S) return;
    S->Settings = Settings;
    S->UpdatedAt = FDateTime::UtcNow().ToUnixTimestamp();
    UGameplayStatics::SaveGameToSlot(S, UAbyssSaveGame::SettingsSlotName(), 0);
}

void UAbyssGameInstance::RecomputeTierOutfit()
{
    Run.Tier = UAbyssContent::EffectiveHouseEdge(EAbyssTier::Normal, Run.GamesPlayed);
    Run.OutfitTier = UAbyssContent::OutfitForTier(Run.Tier);
}

void UAbyssGameInstance::ApplyResult(int32 Delta)
{
    if (Run.GamesPlayed == 0) FAbyssSteam::UnlockAchievement(TEXT("first_breath"));
    Run.Breath = FMath::Max(0, Run.Breath + Delta);
    Run.GamesPlayed++;
    Run.Meta.HandsPlayedEver++;
    if (Delta < 0) Run.Meta.BreathsSurrendered += FMath::Abs(Delta);
    Run.Meta.MaxBreathEver = FMath::Max(Run.Meta.MaxBreathEver, Run.Breath);
    RecomputeTierOutfit();
    if (Run.Breath >= 1000) FAbyssSteam::UnlockAchievement(TEXT("house_broken"));
    PersistRun();
}

void UAbyssGameInstance::TriggerEnding(EAbyssEndingKind Kind)
{
    if (!Run.Meta.EndingsReached.Contains(Kind)) Run.Meta.EndingsReached.Add(Kind);
    if (Kind == EAbyssEndingKind::Drown)
    {
        Run.Meta.Deaths++;
        Run.Meta.LastDeathAt = FDateTime::UtcNow().ToUnixTimestamp();
    }
    PersistRun();

    static const TMap<EAbyssEndingKind, FString> AchievementIds = {
        { EAbyssEndingKind::Drown,      TEXT("ending_drown") },
        { EAbyssEndingKind::Escape,     TEXT("ending_escape") },
        { EAbyssEndingKind::House,      TEXT("ending_house") },
        { EAbyssEndingKind::Ghost,      TEXT("ending_ghost") },
        { EAbyssEndingKind::Revelation, TEXT("ending_revelation") },
        { EAbyssEndingKind::Mirror,     TEXT("ending_mirror") },
        { EAbyssEndingKind::Sovereign,  TEXT("ending_sovereign") },
        { EAbyssEndingKind::WalkAway,   TEXT("ending_walk_away") },
    };
    if (const FString* Id = AchievementIds.Find(Kind)) FAbyssSteam::UnlockAchievement(*Id);
    if (Run.Meta.EndingsReached.Num() >= 8) FAbyssSteam::UnlockAchievement(TEXT("all_endings"));

    if (Settings.bHardRoguelike && Kind == EAbyssEndingKind::Drown) DeleteSlot(ActiveSlot);
}

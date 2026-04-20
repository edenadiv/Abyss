#include "AbyssSteam.h"
#include "OnlineSubsystem.h"
#include "Interfaces/OnlineAchievementsInterface.h"
#include "Interfaces/OnlinePresenceInterface.h"
#include "Interfaces/OnlineIdentityInterface.h"

static TSet<FString> GrantedCache;

static IOnlineSubsystem* Get()
{
    return IOnlineSubsystem::Get(STEAM_SUBSYSTEM);
}

void FAbyssSteam::Init()
{
    GrantedCache.Reset();
    if (!Get())
    {
        UE_LOG(LogTemp, Log, TEXT("[AbyssSteam] OnlineSubsystemSteam not available — running without Steam."));
    }
    else
    {
        UE_LOG(LogTemp, Log, TEXT("[AbyssSteam] initialized."));
    }
}

void FAbyssSteam::Shutdown()
{
    GrantedCache.Reset();
}

bool FAbyssSteam::IsSteamRunning()
{
    return Get() != nullptr;
}

void FAbyssSteam::UnlockAchievement(const FString& Id)
{
    if (Id.IsEmpty() || GrantedCache.Contains(Id)) return;
    GrantedCache.Add(Id);

    IOnlineSubsystem* OSS = Get();
    if (!OSS) { UE_LOG(LogTemp, Log, TEXT("[AbyssSteam] would unlock %s"), *Id); return; }

    auto Achievements = OSS->GetAchievementsInterface();
    auto Identity = OSS->GetIdentityInterface();
    if (!Achievements.IsValid() || !Identity.IsValid()) return;
    const auto UserId = Identity->GetUniquePlayerId(0);
    if (!UserId.IsValid()) return;

    FOnlineAchievementsWritePtr Writer = MakeShareable(new FOnlineAchievementsWrite());
    Writer->SetFloatStat(*Id, 100.0f); // 100% = fully unlocked
    FOnlineAchievementsWriteRef WriterRef = Writer.ToSharedRef();
    Achievements->WriteAchievements(*UserId, WriterRef);
}

void FAbyssSteam::SetRichPresence(const FString& Key, const FString& Value)
{
    IOnlineSubsystem* OSS = Get();
    if (!OSS) return;
    auto Presence = OSS->GetPresenceInterface();
    auto Identity = OSS->GetIdentityInterface();
    if (!Presence.IsValid() || !Identity.IsValid()) return;
    const auto UserId = Identity->GetUniquePlayerId(0);
    if (!UserId.IsValid()) return;

    FOnlineUserPresenceStatus Status;
    Status.StatusStr = Value;
    Status.Properties.Add(Key, Value);
    Presence->SetPresence(*UserId, Status);
}

void FAbyssSteam::ClearRichPresence()
{
    IOnlineSubsystem* OSS = Get();
    if (!OSS) return;
    auto Presence = OSS->GetPresenceInterface();
    auto Identity = OSS->GetIdentityInterface();
    if (!Presence.IsValid() || !Identity.IsValid()) return;
    const auto UserId = Identity->GetUniquePlayerId(0);
    if (!UserId.IsValid()) return;
    FOnlineUserPresenceStatus Status;
    Presence->SetPresence(*UserId, Status);
}

#include "AbyssContent.h"
#include "Misc/Paths.h"
#include "Misc/FileHelper.h"
#include "Serialization/JsonSerializer.h"
#include "JsonObjectConverter.h"

static EAbyssEndingKind EndingFromString(const FString& S)
{
    if (S == TEXT("drown"))      return EAbyssEndingKind::Drown;
    if (S == TEXT("escape"))     return EAbyssEndingKind::Escape;
    if (S == TEXT("house"))      return EAbyssEndingKind::House;
    if (S == TEXT("ghost"))      return EAbyssEndingKind::Ghost;
    if (S == TEXT("revelation")) return EAbyssEndingKind::Revelation;
    if (S == TEXT("mirror"))     return EAbyssEndingKind::Mirror;
    if (S == TEXT("sovereign"))  return EAbyssEndingKind::Sovereign;
    return EAbyssEndingKind::WalkAway;
}

static EAbyssTableKey TableKeyFromString(const FString& S)
{
    if (S == TEXT("blackjack")) return EAbyssTableKey::Blackjack;
    if (S == TEXT("roulette"))  return EAbyssTableKey::Roulette;
    if (S == TEXT("baccarat"))  return EAbyssTableKey::Baccarat;
    if (S == TEXT("slots"))     return EAbyssTableKey::Slots;
    if (S == TEXT("poker"))     return EAbyssTableKey::Poker;
    if (S == TEXT("dice"))      return EAbyssTableKey::Dice;
    return EAbyssTableKey::Coin;
}

void UAbyssContent::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    LoadFromJson();
    UE_LOG(LogTemp, Log, TEXT("[AbyssContent] loaded %d fragments, %d trinkets, %d tables, %d endings"),
        Fragments.Num(), Trinkets.Num(), Tables.Num(), Endings.Num());
}

void UAbyssContent::Deinitialize()
{
    Fragments.Reset();
    Trinkets.Reset();
    Tables.Reset();
    Endings.Reset();
    Super::Deinitialize();
}

bool UAbyssContent::LoadJsonFile(const FString& FileName, FString& OutContents) const
{
    // Staged build puts ThirdParty content under <project>/ThirdParty/data/
    // Editor builds: <project>/ThirdParty/data/
    TArray<FString> Candidates;
    Candidates.Add(FPaths::ProjectDir() / TEXT("ThirdParty/data") / FileName);
    Candidates.Add(FPaths::ProjectContentDir() / TEXT("Data") / FileName);
    Candidates.Add(FPaths::ProjectPluginsDir() / TEXT("ThirdParty/data") / FileName);

    for (const FString& Path : Candidates)
    {
        if (FFileHelper::LoadFileToString(OutContents, *Path)) return true;
    }
    UE_LOG(LogTemp, Warning, TEXT("[AbyssContent] could not find %s — content will be empty"), *FileName);
    return false;
}

void UAbyssContent::LoadFromJson()
{
    // --- Fragments ---
    FString Body;
    if (LoadJsonFile(TEXT("fragments.json"), Body))
    {
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Body);
        TArray<TSharedPtr<FJsonValue>> Arr;
        if (FJsonSerializer::Deserialize(Reader, Arr))
        {
            for (const auto& V : Arr)
            {
                auto Obj = V->AsObject();
                if (!Obj.IsValid()) continue;
                FAbyssFragment F;
                F.Id = Obj->GetStringField(TEXT("id"));
                F.Title = Obj->GetStringField(TEXT("title"));
                F.Kind = Obj->GetStringField(TEXT("kind"));
                const int32 Col = Obj->GetIntegerField(TEXT("color"));
                const int32 Em = Obj->GetIntegerField(TEXT("emissive"));
                F.Color = FLinearColor(((Col >> 16) & 0xff) / 255.f, ((Col >> 8) & 0xff) / 255.f, (Col & 0xff) / 255.f);
                F.Emissive = FLinearColor(((Em >> 16) & 0xff) / 255.f, ((Em >> 8) & 0xff) / 255.f, (Em & 0xff) / 255.f);
                const TArray<TSharedPtr<FJsonValue>>* PosArr = nullptr;
                if (Obj->TryGetArrayField(TEXT("pos"), PosArr) && PosArr && PosArr->Num() >= 3)
                {
                    // TS uses [x, y, z] where z is "forward". UE is left-handed Z-up;
                    // swap so ported Y-up data lands on UE's floor (Z=0).
                    F.Position = FVector((*PosArr)[0]->AsNumber() * 100.f,
                                         (*PosArr)[2]->AsNumber() * 100.f,
                                         (*PosArr)[1]->AsNumber() * 100.f);
                }
                F.Line = Obj->GetStringField(TEXT("line"));
                F.Narrative = Obj->GetStringField(TEXT("narrative"));
                Fragments.Add(F);
            }
        }
    }

    // --- Trinkets ---
    if (LoadJsonFile(TEXT("trinkets.json"), Body))
    {
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Body);
        TArray<TSharedPtr<FJsonValue>> Arr;
        if (FJsonSerializer::Deserialize(Reader, Arr))
        {
            for (const auto& V : Arr)
            {
                auto Obj = V->AsObject();
                if (!Obj.IsValid()) continue;
                FAbyssTrinket T;
                T.Id = Obj->GetStringField(TEXT("id"));
                T.Name = Obj->GetStringField(TEXT("name"));
                T.Desc = Obj->GetStringField(TEXT("desc"));
                T.Cost = Obj->GetIntegerField(TEXT("cost"));
                T.Charges = Obj->GetIntegerField(TEXT("charges"));
                T.Effect = Obj->GetStringField(TEXT("effect"));
                const FString Hex = Obj->GetStringField(TEXT("color"));
                T.Color = FLinearColor::FromSRGBColor(FColor::FromHex(Hex.Replace(TEXT("#"), TEXT(""))));
                Obj->TryGetBoolField(TEXT("cursed"), T.bCursed);
                Trinkets.Add(T);
            }
        }
    }

    // --- Tables ---
    if (LoadJsonFile(TEXT("tables.json"), Body))
    {
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Body);
        TArray<TSharedPtr<FJsonValue>> Arr;
        if (FJsonSerializer::Deserialize(Reader, Arr))
        {
            for (const auto& V : Arr)
            {
                auto Obj = V->AsObject();
                if (!Obj.IsValid()) continue;
                FAbyssTable Td;
                Td.Key = TableKeyFromString(Obj->GetStringField(TEXT("key")));
                Td.Name = Obj->GetStringField(TEXT("name"));
                Td.Icon = Obj->GetStringField(TEXT("icon"));
                Td.Desc = Obj->GetStringField(TEXT("desc"));
                Td.MinBet = Obj->GetIntegerField(TEXT("minBet"));
                const int32 Col = Obj->GetIntegerField(TEXT("accent"));
                Td.Accent = FLinearColor(((Col >> 16) & 0xff) / 255.f, ((Col >> 8) & 0xff) / 255.f, (Col & 0xff) / 255.f);
                Tables.Add(Td);
            }
        }
    }

    // --- Endings ---
    if (LoadJsonFile(TEXT("endings.json"), Body))
    {
        TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Body);
        TArray<TSharedPtr<FJsonValue>> Arr;
        if (FJsonSerializer::Deserialize(Reader, Arr))
        {
            for (const auto& V : Arr)
            {
                auto Obj = V->AsObject();
                if (!Obj.IsValid()) continue;
                FAbyssEndingCard E;
                E.Id = EndingFromString(Obj->GetStringField(TEXT("id")));
                E.Label = Obj->GetStringField(TEXT("label"));
                E.Hint = Obj->GetStringField(TEXT("hint"));
                E.PaintingSlug = Obj->GetStringField(TEXT("paintingSlug"));
                E.ClosingLine = Obj->GetStringField(TEXT("closingLine"));
                Endings.Add(E);
            }
        }
    }
}

FAbyssFragment UAbyssContent::FindFragment(const FString& Id) const
{
    for (const auto& F : Fragments) if (F.Id == Id) return F;
    return FAbyssFragment();
}

FAbyssTrinket UAbyssContent::FindTrinket(const FString& Id) const
{
    for (const auto& T : Trinkets) if (T.Id == Id) return T;
    return FAbyssTrinket();
}

FAbyssEndingCard UAbyssContent::FindEnding(EAbyssEndingKind Kind) const
{
    for (const auto& E : Endings) if (E.Id == Kind) return E;
    return FAbyssEndingCard();
}

EAbyssTier UAbyssContent::EffectiveHouseEdge(EAbyssTier BaseTier, int32 HandsPlayed)
{
    int32 Steps = 0;
    if (HandsPlayed >= 10) Steps++;
    if (HandsPlayed >= 25) Steps++;
    if (HandsPlayed >= 50) Steps++;
    if (HandsPlayed >= 80) Steps++;
    const int32 Idx = FMath::Clamp(static_cast<int32>(BaseTier) + Steps, 0, 4);
    return static_cast<EAbyssTier>(Idx);
}

float UAbyssContent::EdgeBias(EAbyssTier Tier)
{
    switch (Tier)
    {
        case EAbyssTier::Easy:   return 1.05f;
        case EAbyssTier::Normal: return 1.00f;
        case EAbyssTier::Hard:   return 0.88f;
        case EAbyssTier::Rigged: return 0.78f;
        case EAbyssTier::Cruel:  return 0.68f;
    }
    return 1.0f;
}

EAbyssOutfitTier UAbyssContent::OutfitForTier(EAbyssTier Tier)
{
    if (Tier == EAbyssTier::Easy || Tier == EAbyssTier::Normal) return EAbyssOutfitTier::Soft;
    if (Tier == EAbyssTier::Hard || Tier == EAbyssTier::Rigged) return EAbyssOutfitTier::Chain;
    return EAbyssOutfitTier::Teeth;
}

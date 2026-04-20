#include "AbyssDeck.h"

static const TArray<FString> RANKS = { TEXT("A"), TEXT("2"), TEXT("3"), TEXT("4"), TEXT("5"), TEXT("6"), TEXT("7"), TEXT("8"), TEXT("9"), TEXT("10"), TEXT("J"), TEXT("Q"), TEXT("K") };

TArray<FAbyssCard> UAbyssDeck::BuildDeck(int32 DeckCount)
{
    TArray<FAbyssCard> Out;
    for (int32 d = 0; d < FMath::Max(1, DeckCount); ++d)
    {
        for (int32 S = 0; S < 4; ++S)
        {
            for (const FString& R : RANKS)
            {
                FAbyssCard Card;
                Card.Rank = R;
                Card.Suit = static_cast<EAbyssSuit>(S);
                Card.bRed = (Card.Suit == EAbyssSuit::Hearts) || (Card.Suit == EAbyssSuit::Diamonds);
                Out.Add(Card);
            }
        }
    }
    return Out;
}

void UAbyssDeck::Shuffle(TArray<FAbyssCard>& Cards)
{
    const int32 N = Cards.Num();
    for (int32 i = N - 1; i > 0; --i)
    {
        const int32 j = FMath::RandRange(0, i);
        Cards.Swap(i, j);
    }
}

int32 UAbyssDeck::CardValue(const FAbyssCard& Card)
{
    if (Card.Rank == TEXT("A")) return 11;
    if (Card.Rank == TEXT("J") || Card.Rank == TEXT("Q") || Card.Rank == TEXT("K")) return 10;
    return FCString::Atoi(*Card.Rank);
}

int32 UAbyssDeck::HandValue(const TArray<FAbyssCard>& Cards)
{
    int32 Total = 0, Aces = 0;
    for (const FAbyssCard& C : Cards)
    {
        Total += CardValue(C);
        if (C.Rank == TEXT("A")) ++Aces;
    }
    while (Total > 21 && Aces > 0) { Total -= 10; --Aces; }
    return Total;
}

static int32 RankIndex(const FString& R)
{
    if (R == TEXT("A")) return 14;
    if (R == TEXT("K")) return 13;
    if (R == TEXT("Q")) return 12;
    if (R == TEXT("J")) return 11;
    return FCString::Atoi(*R);
}

FAbyssPokerResult UAbyssDeck::PokerEvaluate(const TArray<FAbyssCard>& Hand)
{
    FAbyssPokerResult R;
    R.Name = TEXT("High card");
    if (Hand.Num() != 5) return R;

    TArray<int32> Vals; for (const auto& C : Hand) Vals.Add(RankIndex(C.Rank));
    Vals.Sort([](int32 A, int32 B) { return A > B; });

    TSet<EAbyssSuit> Suits; for (const auto& C : Hand) Suits.Add(C.Suit);
    const bool bFlush = Suits.Num() == 1;

    TMap<int32, int32> Counts;
    for (int32 V : Vals) Counts.FindOrAdd(V)++;
    TArray<TPair<int32, int32>> Sorted;
    for (const auto& P : Counts) Sorted.Add({ P.Key, P.Value });
    Sorted.Sort([](const auto& A, const auto& B) { return A.Value > B.Value; });

    TArray<int32> Uniq;
    for (const auto& P : Counts) Uniq.Add(P.Key);
    Uniq.Sort();
    bool bStraight = (Uniq.Num() >= 5 && Uniq.Last() - Uniq[0] == 4);
    // Wheel A-2-3-4-5
    if (Vals.Contains(14) && Vals.Contains(2) && Vals.Contains(3) && Vals.Contains(4) && Vals.Contains(5)) bStraight = true;

    const int32 High = Vals[0];
    if (bStraight && bFlush) { R.Rank = EAbyssPokerRank::StraightFlush; R.Score = 900 + High; R.Name = TEXT("Straight flush"); return R; }
    if (Sorted[0].Value == 4) { R.Rank = EAbyssPokerRank::Quads; R.Score = 800 + Sorted[0].Key; R.Name = TEXT("Four of a kind"); return R; }
    if (Sorted[0].Value == 3 && Sorted[1].Value == 2) { R.Rank = EAbyssPokerRank::FullHouse; R.Score = 700 + Sorted[0].Key; R.Name = TEXT("Full house"); return R; }
    if (bFlush) { R.Rank = EAbyssPokerRank::Flush; R.Score = 600 + High; R.Name = TEXT("Flush"); return R; }
    if (bStraight) { R.Rank = EAbyssPokerRank::Straight; R.Score = 500 + High; R.Name = TEXT("Straight"); return R; }
    if (Sorted[0].Value == 3) { R.Rank = EAbyssPokerRank::Trips; R.Score = 400 + Sorted[0].Key; R.Name = TEXT("Three of a kind"); return R; }
    if (Sorted[0].Value == 2 && Sorted[1].Value == 2) { R.Rank = EAbyssPokerRank::TwoPair; R.Score = 300 + Sorted[0].Key * 15 + Sorted[1].Key; R.Name = TEXT("Two pair"); return R; }
    if (Sorted[0].Value == 2) { R.Rank = EAbyssPokerRank::Pair; R.Score = 200 + Sorted[0].Key; R.Name = TEXT("Pair"); return R; }
    R.Score = 100 + High;
    return R;
}
